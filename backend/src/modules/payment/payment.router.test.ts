import { describe, expect, it } from "@jest/globals";
import request from "supertest";

import { createApp } from "../../app";
import { InMemoryOrderRepository } from "../order/order.repository";
import { createOrderService } from "../order/order.service";
import { InMemoryAuditLogger } from "../../security/audit";
import { computeMidtransSignatureKey } from "./payment.signature";
import { InMemoryPaymentRepository } from "./payment.repository";
import { createPaymentService } from "./payment.service";

function createTestServices() {
  const orderRepository = new InMemoryOrderRepository();
  const orderService = createOrderService({
    repository: orderRepository,
    idGenerator: () => "order-2001",
    invoiceCodeGenerator: () => "INV-20260422-2001",
    clock: () => new Date("2026-04-22T10:00:00.000Z")
  });
  const paymentRepository = new InMemoryPaymentRepository(orderRepository);
  const paymentService = createPaymentService({
    paymentRepository,
    orderService,
    midtransConfig: {
      serverKey: "test-server-key",
      apiBaseUrl: "https://app.sandbox.midtrans.com"
    },
    fetchImpl: async () => {
      return new Response(
        JSON.stringify({
          token: "snap-token-2001",
          redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-2001"
        }),
        {
          status: 201,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    },
    clock: () => new Date("2026-04-22T10:00:00.000Z")
  });

  return {
    orderRepository,
    orderService,
    paymentRepository,
    paymentService
  };
}

describe("midtrans payment routes", () => {
  it("initializes midtrans payment for pending_payment order", async () => {
    const services = createTestServices();
    const app = createApp({
      orderService: services.orderService,
      paymentService: services.paymentService
    });

    const order = await services.orderService.createGuestOrder({
      customerRef: "cust-001",
      productCode: "ml-diamond-86",
      provider: "digiflazz",
      amountMinor: 20000,
      currency: "IDR",
      metadata: {
        channel: "web"
      }
    });

    const response = await request(app).post("/api/payments/midtrans/initialize").send({
      order_id: order.orderId,
      idempotency_key: "init-order-2001"
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      payment_id: expect.any(String),
      order_id: order.orderId,
      status: "pending",
      token: "snap-token-2001",
      redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-2001"
    });
  });

  it("processes webhook once and ignores replay by event key", async () => {
    const services = createTestServices();
    const app = createApp({
      orderService: services.orderService,
      paymentService: services.paymentService
    });

    const order = await services.orderService.createGuestOrder({
      customerRef: "cust-002",
      productCode: "ml-diamond-172",
      provider: "digiflazz",
      amountMinor: 40000,
      currency: "IDR",
      metadata: {
        channel: "web"
      }
    });

    const signature = computeMidtransSignatureKey({
      orderId: order.orderId,
      statusCode: "200",
      grossAmount: "40000.00",
      serverKey: "test-server-key"
    });

    const payload = {
      order_id: order.orderId,
      status_code: "200",
      gross_amount: "40000.00",
      transaction_status: "settlement",
      transaction_id: "trx-40000-settlement",
      signature_key: signature
    };

    const firstResponse = await request(app).post("/api/payments/midtrans/webhook").send(payload);
    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body).toEqual({
      code: "PROCESSED",
      message: "Webhook processed and order transitioned."
    });

    const replayResponse = await request(app).post("/api/payments/midtrans/webhook").send(payload);
    expect(replayResponse.status).toBe(200);
    expect(replayResponse.body).toEqual({
      code: "DUPLICATE",
      message: "Duplicate Midtrans webhook ignored.",
      idempotent: true
    });

    const persistedOrder = await services.orderRepository.findOrderById(order.orderId);
    expect(persistedOrder?.status).toBe("paid");

    const payment = await services.paymentRepository.findPaymentByProviderAndReference("midtrans", order.orderId);
    expect(payment).toMatchObject({
      providerPaymentId: "trx-40000-settlement",
      status: "paid"
    });
    expect(payment?.paidAt).toEqual(new Date("2026-04-22T10:00:00.000Z"));

    const event = services.paymentRepository.getWebhookEventByProviderAndEventKey(
      "midtrans",
      [order.orderId, "200", "settlement", "-", "trx-40000-settlement"].join(":")
    );
    expect(event).toMatchObject({
      orderId: order.orderId,
      processingState: "processed"
    });

    const history = services.orderRepository.getStatusHistoryByOrderId(order.orderId);
    expect(history).toHaveLength(2);
    expect(history[1]).toMatchObject({
      fromStatus: "pending_payment",
      toStatus: "paid",
      createdBy: "midtrans_webhook"
    });
  });

  it("rejects webhook with invalid signature before any mutation", async () => {
    const services = createTestServices();
    const auditLogger = new InMemoryAuditLogger();
    const app = createApp({
      orderService: services.orderService,
      paymentService: services.paymentService,
      auditLogger
    });

    const order = await services.orderService.createGuestOrder({
      customerRef: "cust-003",
      productCode: "ff-diamond-70",
      provider: "digiflazz",
      amountMinor: 10000,
      currency: "IDR",
      metadata: {
        channel: "web"
      }
    });

    const response = await request(app)
      .post("/api/payments/midtrans/webhook")
      .send({
        order_id: order.orderId,
        status_code: "200",
        gross_amount: "10000.00",
        transaction_status: "settlement",
        transaction_id: "trx-10000-settlement",
        signature_key: "invalid-signature"
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_SIGNATURE",
        message: "Invalid Midtrans webhook signature."
      }
    });

    const persistedOrder = await services.orderRepository.findOrderById(order.orderId);
    expect(persistedOrder?.status).toBe("pending_payment");

    const history = services.orderRepository.getStatusHistoryByOrderId(order.orderId);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      fromStatus: "created",
      toStatus: "pending_payment"
    });

    const event = services.paymentRepository.getWebhookEventByProviderAndEventKey(
      "midtrans",
      [order.orderId, "200", "settlement", "-", "trx-10000-settlement"].join(":")
    );
    expect(event).toBeNull();

    expect(auditLogger.getEvents()).toEqual([
      expect.objectContaining({
        type: "webhook_signature_invalid",
        provider: "midtrans",
        route: "/midtrans/webhook",
        method: "POST",
        statusCode: 401,
        orderId: order.orderId,
        reason: "Invalid Midtrans webhook signature."
      })
    ]);
  });

  it("rate limits sensitive payment endpoints and records a sanitized audit event", async () => {
    const services = createTestServices();
    const auditLogger = new InMemoryAuditLogger();
    const app = createApp({
      orderService: services.orderService,
      paymentService: services.paymentService,
      auditLogger,
      rateLimit: {
        windowMs: 60_000,
        maxRequests: 1
      }
    });

    const firstResponse = await request(app).post("/api/payments/midtrans/webhook").send({});
    const secondResponse = await request(app).post("/api/payments/midtrans/webhook").send({});

    expect(firstResponse.status).toBe(400);
    expect(secondResponse.status).toBe(429);
    expect(secondResponse.body).toEqual({
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please retry later."
      }
    });
    expect(auditLogger.getEvents()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "rate_limit_exceeded",
          route: "/midtrans/webhook",
          method: "POST",
          statusCode: 429
        })
      ])
    );
  });
});
