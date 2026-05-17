import { createHmac } from "node:crypto";
import { describe, expect, it } from "@jest/globals";
import request from "supertest";

import { createApp } from "../../app";
import { InMemoryAuthRepository } from "../auth/auth.repository";
import { InMemoryCatalogRepository } from "../catalog/catalog.repository";
import { createCatalogService } from "../catalog/pricing.service";
import { InMemoryFulfillmentRepository } from "../fulfillment/fulfillment.repository";
import { createFulfillmentService } from "../fulfillment/fulfillment.service";
import { createInvoiceStatusService } from "../invoice-status/invoice-status.service";
import { InMemoryOrderRepository } from "../order/order.repository";
import { createOrderService } from "../order/order.service";
import { InMemoryPaymentRepository } from "../payment/payment.repository";
import { computeMidtransSignatureKey } from "../payment/payment.signature";
import { createPaymentService } from "../payment/payment.service";

const MIDTRANS_SERVER_KEY = "midtrans-server-key";
const DIGIFLAZZ_WEBHOOK_SECRET = "digiflazz-webhook-secret";

function createFraudFixture() {
  const orderRepository = new InMemoryOrderRepository();
  const authRepository = new InMemoryAuthRepository();
  const catalogRepository = new InMemoryCatalogRepository();
  
  const orderService = createOrderService({
    repository: orderRepository,
    idGenerator: () => "order-123",
    invoiceCodeGenerator: () => "INV-FRAUD-001",
    clock: () => new Date("2026-05-16T12:00:00Z")
  });

  const catalogService = createCatalogService({
    repository: catalogRepository
  });

  const paymentService = createPaymentService({
    paymentRepository: new InMemoryPaymentRepository(orderRepository),
    orderService,
    midtransConfig: {
      serverKey: MIDTRANS_SERVER_KEY,
      apiBaseUrl: "https://api.midtrans.test"
    }
  });

  const fulfillmentService = createFulfillmentService({
    fulfillmentRepository: new InMemoryFulfillmentRepository(orderRepository),
    orderService,
    digiflazzConfig: {
      username: "buyer-user",
      apiKey: "buyer-api-key",
      apiBaseUrl: "https://api.digiflazz.test",
      nodeEnv: "test"
    }
  });

  const invoiceStatusService = createInvoiceStatusService({
    orderRepository,
    paymentRepository: new InMemoryPaymentRepository(orderRepository),
    fulfillmentRepository: new InMemoryFulfillmentRepository(orderRepository)
  });

  const app = createApp({
    orderRepository,
    paymentRepository: new InMemoryPaymentRepository(orderRepository),
    fulfillmentRepository: new InMemoryFulfillmentRepository(orderRepository),
    digiflazzConfig: {
      username: "buyer-user",
      apiKey: "buyer-api-key",
      apiBaseUrl: "https://api.digiflazz.test",
      webhookSecret: DIGIFLAZZ_WEBHOOK_SECRET,
      nodeEnv: "test"
    },
    midtransConfig: {
      clientKey: "midtrans-client-key",
      serverKey: MIDTRANS_SERVER_KEY,
      apiBaseUrl: "https://api.midtrans.test",
      merchantId: "merchant-123"
    }
  });

  return { app, orderRepository, catalogRepository };
}

function midtransSignature(orderId: string, statusCode: string, grossAmount: string): string {
  return computeMidtransSignatureKey({
    orderId,
    statusCode,
    grossAmount,
    serverKey: MIDTRANS_SERVER_KEY
  });
}

function digiflazzSignature(payload: string): string {
  return createHmac("sha1", DIGIFLAZZ_WEBHOOK_SECRET).update(payload).digest("hex");
}

describe("Fraud Matrix Regression", () => {
  it("Scenario: Mismatch Amount Webhook - rejected and order remains pending", async () => {
    const { app, orderRepository, catalogRepository } = createFraudFixture();
    
    await catalogRepository.createProduct({
      skuDigiflazz: "SKU1",
      name: "Product 1",
      category: "games",
      provider: "digiflazz",
      basePriceMinor: 10000,
      isActive: true,
      metadata: {},
      createdAt: new Date("2026-05-16T12:00:00Z"),
      updatedAt: new Date("2026-05-16T12:00:00Z")
    });

    const orderResp = await request(app).post("/api/orders").send({
      product_code: "SKU1",
      provider: "digiflazz",
      amount_minor: 10000,
      customer_ref: "C1"
    });
    const orderId = orderResp.body.order_id;

    const signature = midtransSignature(orderId, "200", "5.00"); // 500 minor vs 10000 order
    const webhookResp = await request(app)
      .post("/api/payments/midtrans/webhook")
      .send({
        order_id: orderId,
        status_code: "200",
        gross_amount: "5.00",
        transaction_status: "settlement",
        signature_key: signature
      });

    expect(webhookResp.status).toBe(400);
    expect(webhookResp.body.error.code).toBe("WEBHOOK_VALIDATION_ERROR");
    
    const finalOrder = await orderRepository.findOrderById(orderId);
    expect(finalOrder?.status).toBe("pending_payment");
  });

  it("Scenario: Fulfillment Before Payment - trigger blocked", async () => {
    const { app, orderRepository, catalogRepository } = createFraudFixture();
    
    await catalogRepository.createProduct({
      skuDigiflazz: "SKU1",
      name: "Product 1",
      category: "games",
      provider: "digiflazz",
      basePriceMinor: 10000,
      isActive: true,
      metadata: {},
      createdAt: new Date("2026-05-16T12:00:00Z"),
      updatedAt: new Date("2026-05-16T12:00:00Z")
    });

    const orderResp = await request(app).post("/api/orders").send({
      product_code: "SKU1",
      provider: "digiflazz",
      amount_minor: 10000,
      customer_ref: "C1"
    });
    const orderId = orderResp.body.order_id;

    const triggerResp = await request(app)
      .post("/api/fulfillments/digiflazz/trigger")
      .send({ order_id: orderId });

    expect(triggerResp.status).toBe(400);
    expect(triggerResp.body.error.code).toBe("FULFILLMENT_VALIDATION_ERROR");
    expect(triggerResp.body.error.message).toContain("requires paid status");
  });

  it("Scenario: Success Callback on Unpaid Order - ignored by guard", async () => {
    const { app, orderRepository, catalogRepository } = createFraudFixture();
    
    await catalogRepository.createProduct({
      skuDigiflazz: "SKU1",
      name: "Product 1",
      category: "games",
      provider: "digiflazz",
      basePriceMinor: 10000,
      isActive: true,
      metadata: {},
      createdAt: new Date("2026-05-16T12:00:00Z"),
      updatedAt: new Date("2026-05-16T12:00:00Z")
    });

    const orderResp = await request(app).post("/api/orders").send({
      product_code: "SKU1",
      provider: "digiflazz",
      amount_minor: 10000,
      customer_ref: "C1"
    });
    const orderId = orderResp.body.order_id;

    const payload = JSON.stringify({
      data: {
        ref_id: orderId,
        trx_id: "T1",
        status: "Sukses",
        rc: "00",
        sn: "SN1"
      }
    });

    const callbackResp = await request(app)
      .post("/api/fulfillments/digiflazz/callback")
      .set("X-Hub-Signature", "sha1=" + digiflazzSignature(payload))
      .set("Content-Type", "application/json")
      .send(payload);

    expect(callbackResp.status).toBe(200);
    
    const finalOrder = await orderRepository.findOrderById(orderId);
    expect(finalOrder?.status).toBe("pending_payment");
  });
});
