import { describe, expect, it } from "@jest/globals";
import request from "supertest";

import { createApp } from "../../app";
import { InMemoryAuthRepository } from "../auth/auth.repository";
import { InMemoryCatalogRepository } from "../catalog/catalog.repository";
import { createCatalogService } from "../catalog/pricing.service";
import { type PricingRuleRecord, type ProductRecord } from "../catalog/catalog.types";
import { InMemoryFulfillmentRepository } from "../fulfillment/fulfillment.repository";
import { createFulfillmentService } from "../fulfillment/fulfillment.service";
import { createInvoiceStatusService } from "../invoice-status/invoice-status.service";
import { InMemoryOrderRepository } from "../order/order.repository";
import { createOrderService } from "../order/order.service";
import { InMemoryPaymentRepository } from "../payment/payment.repository";
import { computeMidtransSignatureKey } from "../payment/payment.signature";
import { createPaymentService } from "../payment/payment.service";
import { createReconcileService } from "../reconcile/reconcile.service";
import { InMemoryAuditLogger } from "../../security/audit";

const catalogCreatedAt = new Date("2026-05-14T12:00:00.000Z");

type RegisteredUser = Readonly<{
  user: Readonly<{ id: string }>;
  token: string;
}>;

function product(overrides: Partial<ProductRecord>): ProductRecord {
  return {
    id: "product-default",
    skuDigiflazz: "default-sku",
    name: "Default Product",
    category: "games",
    provider: "digiflazz",
    basePriceMinor: 10_000,
    isActive: true,
    metadata: {},
    createdAt: catalogCreatedAt,
    updatedAt: catalogCreatedAt,
    ...overrides
  };
}

function pricingRule(overrides: Partial<PricingRuleRecord>): PricingRuleRecord {
  return {
    id: "rule-default",
    scopeType: "global",
    productId: null,
    category: null,
    roleType: "pengguna",
    markupFixed: 0,
    markupPercentage: 0,
    priority: 0,
    isActive: true,
    metadata: {},
    createdAt: catalogCreatedAt,
    updatedAt: catalogCreatedAt,
    ...overrides
  };
}

async function registerUser(app: ReturnType<typeof createApp>, email: string): Promise<RegisteredUser> {
  const response = await request(app).post("/api/auth/register").send({
    email,
    password: "correct-password"
  });

  expect(response.status).toBe(201);
  return response.body as RegisteredUser;
}

function createLifecycleFixture(options: {
  authRepository?: InMemoryAuthRepository;
  catalogRepository?: InMemoryCatalogRepository;
} = {}) {
  const orderRepository = new InMemoryOrderRepository();
  const paymentRepository = new InMemoryPaymentRepository(orderRepository);
  const fulfillmentRepository = new InMemoryFulfillmentRepository(orderRepository);
  const auditLogger = new InMemoryAuditLogger();
  const catalogService =
    options.catalogRepository === undefined
      ? undefined
      : createCatalogService({
          repository: options.catalogRepository
        });

  const orderService = createOrderService({
    repository: orderRepository,
    catalogService,
    idGenerator: () => "ORD-TEST-001",
    invoiceCodeGenerator: () => "INV-TEST-0001",
    clock: () => new Date("2026-04-22T09:00:00.000Z")
  });

  const paymentService = createPaymentService({
    paymentRepository,
    orderService,
    midtransConfig: {
      serverKey: "test-server-key",
      apiBaseUrl: "https://midtrans.local.test"
    },
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          token: "snap-token-regression",
          redirect_url: "https://midtrans.local.test/snap-token-regression"
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      ),
    clock: () => new Date("2026-04-22T09:01:00.000Z")
  });

  const fulfillmentService = createFulfillmentService({
    fulfillmentRepository,
    orderService,
    digiflazzConfig: {
      username: "digiflazz-user",
      apiKey: "digiflazz-key",
      apiBaseUrl: "https://digiflazz.local.test",
      nodeEnv: "test"
    },
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          data: {
            ref_id: "ORD-TEST-001",
            trx_id: "DGF-TEST-001",
            status: "Pending",
            message: "Queued locally"
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ),
    clock: () => new Date("2026-04-22T09:02:00.000Z")
  });

  const invoiceStatusService = createInvoiceStatusService({
    orderRepository,
    paymentRepository,
    fulfillmentRepository
  });

  const reconcileService = createReconcileService({
    orderRepository,
    paymentRepository,
    fulfillmentRepository,
    orderService,
    clock: () => new Date("2026-04-22T09:04:00.000Z")
  });

  const app = createApp({
    authRepository: options.authRepository,
    catalogRepository: options.catalogRepository,
    orderRepository,
    paymentRepository,
    fulfillmentRepository,
    orderService,
    paymentService,
    fulfillmentService,
    auditLogger
  });

  return {
    app,
    auditLogger,
    authRepository: options.authRepository,
    orderRepository,
    paymentRepository,
    fulfillmentRepository,
    orderService,
    reconcileService
  };
}

function signedMidtransPayload(orderId: string, grossAmount = "20000.00", transactionId = "TX-TEST-001") {
  return {
    order_id: orderId,
    status_code: "200",
    gross_amount: grossAmount,
    transaction_status: "settlement",
    transaction_id: transactionId,
    signature_key: computeMidtransSignatureKey({
      orderId,
      statusCode: "200",
      grossAmount,
      serverKey: "test-server-key"
    })
  };
}

describe("full lifecycle regression suite", () => {
  it("runs local guest order through payment, fulfillment callback, and invoice status", async () => {
    const fixture = createLifecycleFixture();

    const orderResponse = await request(fixture.app).post("/api/orders").send({
      customer_ref: "12345678:1234",
      product_code: "mobile-legends-86-diamond",
      provider: "digiflazz",
      amount_minor: 20000,
      currency: "IDR",
      metadata: { source: "task_14_regression" }
    });
    expect(orderResponse.status).toBe(201);
    expect(orderResponse.body).toEqual({
      order_id: "ORD-TEST-001",
      invoice_code: "INV-TEST-0001",
      status: "pending_payment"
    });

    const paymentInitResponse = await request(fixture.app).post("/api/payments/midtrans/initialize").send({
      order_id: "ORD-TEST-001",
      idempotency_key: "task-14-init"
    });
    expect(paymentInitResponse.status).toBe(201);

    const midtransResponse = await request(fixture.app)
      .post("/api/payments/midtrans/webhook")
      .send(signedMidtransPayload("ORD-TEST-001"));
    expect(midtransResponse.status).toBe(200);
    expect(midtransResponse.body).toMatchObject({ code: "PROCESSED" });

    const fulfillmentTriggerResponse = await request(fixture.app).post("/api/fulfillments/digiflazz/trigger").send({
      order_id: "ORD-TEST-001"
    });
    expect(fulfillmentTriggerResponse.status).toBe(201);
    expect(fulfillmentTriggerResponse.body).toMatchObject({
      order_id: "ORD-TEST-001",
      status: "processing",
      provider_reference: "ORD-TEST-001",
      provider_mode: "live"
    });

    const callbackResponse = await request(fixture.app).post("/api/fulfillments/digiflazz/callback").send({
      data: {
        ref_id: "ORD-TEST-001",
        trx_id: "DGF-TEST-001",
        status: "Sukses",
        rc: "00",
        sn: "SN-TASK-14-001"
      }
    });
    expect(callbackResponse.status).toBe(200);
    expect(callbackResponse.body).toMatchObject({ code: "PROCESSED" });

    const invoiceResponse = await request(fixture.app).get("/api/invoices/INV-TEST-0001/status");
    expect(invoiceResponse.status).toBe(200);
    expect(invoiceResponse.body).toMatchObject({
      invoice_code: "INV-TEST-0001",
      order_id: "ORD-TEST-001",
      status: "success",
      payment: expect.objectContaining({ status: "paid" }),
      fulfillment: expect.objectContaining({ status: "success", serial_number: "SN-TASK-14-001" })
    });
  });

  it("keeps payment, fulfillment, and invoice flows compatible for seller-priced catalog orders", async () => {
    const authRepository = new InMemoryAuthRepository();
    const catalogRepository = new InMemoryCatalogRepository({
      products: [product({ id: "product-seller", skuDigiflazz: "ml-diamond-172" })],
      pricingRules: [
        pricingRule({ id: "seller-global", roleType: "seller", markupFixed: 3_000, priority: 100 }),
        pricingRule({
          id: "seller-product",
          scopeType: "product",
          productId: "product-seller",
          roleType: "seller",
          markupFixed: 500,
          priority: 1
        })
      ]
    });
    const fixture = createLifecycleFixture({ authRepository, catalogRepository });
    const seller = await registerUser(fixture.app, "seller-regression@example.com");

    await authRepository.updateUser(seller.user.id, { role: "seller", updatedAt: catalogCreatedAt });

    const orderResponse = await request(fixture.app)
      .post("/api/orders")
      .set("Authorization", "Bearer " + seller.token)
      .send({
        customer_ref: "12345678:1234",
        product_id: "product-seller",
        product_code: "tampered-code",
        provider: "tampered-provider",
        amount_minor: 1,
        total_price: 1,
        currency: "IDR",
        metadata: { source: "task_5_seller_regression" }
      });
    expect(orderResponse.status).toBe(201);

    const persistedOrder = await fixture.orderRepository.findOrderById("ORD-TEST-001");
    expect(persistedOrder).toMatchObject({
      userId: seller.user.id,
      productCode: "ml-diamond-172",
      provider: "digiflazz",
      amountMinor: 10_500,
      basePriceSnapshot: 10_000,
      markupSnapshot: 500,
      rolePriceSnapshot: 10_500,
      pricingRuleIdSnapshot: "seller-product"
    });

    const paymentInitResponse = await request(fixture.app).post("/api/payments/midtrans/initialize").send({
      order_id: "ORD-TEST-001",
      idempotency_key: "task-5-init"
    });
    expect(paymentInitResponse.status).toBe(201);

    const pendingPayment = await fixture.paymentRepository.findLatestPaymentByOrderId("ORD-TEST-001");
    expect(pendingPayment).toMatchObject({ amountMinor: 10_500, status: "pending" });

    const midtransResponse = await request(fixture.app)
      .post("/api/payments/midtrans/webhook")
      .send(signedMidtransPayload("ORD-TEST-001", "10500.00", "TX-TASK-5-001"));
    expect(midtransResponse.status).toBe(200);
    expect(midtransResponse.body).toMatchObject({ code: "PROCESSED" });

    const fulfillmentTriggerResponse = await request(fixture.app).post("/api/fulfillments/digiflazz/trigger").send({
      order_id: "ORD-TEST-001"
    });
    expect(fulfillmentTriggerResponse.status).toBe(201);

    const callbackResponse = await request(fixture.app).post("/api/fulfillments/digiflazz/callback").send({
      data: {
        ref_id: "ORD-TEST-001",
        trx_id: "DGF-TASK-5-001",
        status: "Sukses",
        rc: "00",
        sn: "SN-TASK-5-001"
      }
    });
    expect(callbackResponse.status).toBe(200);
    expect(callbackResponse.body).toMatchObject({ code: "PROCESSED" });

    const invoiceResponse = await request(fixture.app).get("/api/invoices/INV-TEST-0001/status");
    expect(invoiceResponse.status).toBe(200);
    expect(invoiceResponse.body).toMatchObject({
      invoice_code: "INV-TEST-0001",
      order_id: "ORD-TEST-001",
      amount_minor: 10_500,
      status: "success",
      payment: expect.objectContaining({ status: "paid" }),
      fulfillment: expect.objectContaining({ status: "success", serial_number: "SN-TASK-5-001" })
    });
  });

  it("keeps Midtrans replay idempotent and rejects invalid signatures without mutation", async () => {
    const fixture = createLifecycleFixture();
    await fixture.orderService.createGuestOrder({
      customerRef: "12345678:1234",
      productCode: "mobile-legends-86-diamond",
      provider: "digiflazz",
      amountMinor: 20000,
      currency: "IDR",
      metadata: { source: "task_14_idempotency" }
    });

    const invalidResponse = await request(fixture.app).post("/api/payments/midtrans/webhook").send({
      ...signedMidtransPayload("ORD-TEST-001"),
      signature_key: "invalid-signature"
    });
    expect(invalidResponse.status).toBe(401);
    expect(await fixture.paymentRepository.findLatestPaymentByOrderId("ORD-TEST-001")).toBeNull();
    expect((await fixture.orderRepository.findOrderById("ORD-TEST-001"))?.status).toBe("pending_payment");
    expect(fixture.auditLogger.getEvents()).toEqual([
      expect.objectContaining({ type: "webhook_signature_invalid", provider: "midtrans", orderId: "ORD-TEST-001" })
    ]);

    const payload = signedMidtransPayload("ORD-TEST-001");
    const firstResponse = await request(fixture.app).post("/api/payments/midtrans/webhook").send(payload);
    expect(firstResponse.status).toBe(200);
    expect(firstResponse.body).toMatchObject({ code: "PROCESSED" });

    const firstPayment = await fixture.paymentRepository.findLatestPaymentByOrderId("ORD-TEST-001");
    expect(firstPayment).toMatchObject({ providerPaymentId: "TX-TEST-001", status: "paid" });

    const replayResponse = await request(fixture.app).post("/api/payments/midtrans/webhook").send(payload);
    expect(replayResponse.status).toBe(200);
    expect(replayResponse.body).toEqual({
      code: "DUPLICATE",
      message: "Duplicate Midtrans webhook ignored.",
      idempotent: true
    });
    const replayPayment = await fixture.paymentRepository.findLatestPaymentByOrderId("ORD-TEST-001");
    expect(replayPayment?.id).toBe(firstPayment?.id);
  });

  it("uses reconciliation for out-of-order success and denies illegal terminal regression", async () => {
    const fixture = createLifecycleFixture();
    const order = await fixture.orderService.createGuestOrder({
      customerRef: "12345678:1234",
      productCode: "mobile-legends-86-diamond",
      provider: "digiflazz",
      amountMinor: 20000,
      currency: "IDR",
      metadata: { source: "task_14_out_of_order" }
    });

    await fixture.orderService.transitionOrderStatus({
      orderId: order.orderId,
      toStatus: "paid",
      note: "paid_before_reconcile",
      createdBy: "test"
    });
    await fixture.fulfillmentRepository.createFulfillment({
      orderId: order.orderId,
      provider: "digiflazz",
      attemptNo: 1,
      providerFulfillmentId: "DGF-TEST-001",
      providerReference: order.orderId,
      status: "success",
      serialNumber: "SN-OUT-OF-ORDER",
      requestPayload: { source: "test" },
      responsePayload: { source: "test" },
      processedAt: new Date("2026-04-22T09:03:00.000Z"),
      createdAt: new Date("2026-04-22T09:03:00.000Z"),
      updatedAt: new Date("2026-04-22T09:03:00.000Z")
    });

    const successResults = await fixture.reconcileService.reconcileOrder({ orderId: order.orderId });
    expect(successResults.map((result) => result.issue)).toEqual([
      "fulfillment_success_order_not_started",
      "fulfillment_success_order_not_success"
    ]);
    expect((await fixture.orderRepository.findOrderById(order.orderId))?.status).toBe("success");

    await fixture.paymentRepository.createPayment({
      orderId: order.orderId,
      provider: "midtrans",
      idempotencyKey: "task-14-illegal-failed",
      providerPaymentId: "TX-FAILED-AFTER-SUCCESS",
      providerReference: order.orderId,
      amountMinor: 20000,
      currency: "IDR",
      status: "failed",
      paidAt: null,
      payload: { source: "test" },
      createdAt: new Date("2026-04-22T09:05:00.000Z"),
      updatedAt: new Date("2026-04-22T09:05:00.000Z")
    });

    const deniedResults = await fixture.reconcileService.reconcileOrder({ orderId: order.orderId });
    expect(deniedResults).toEqual([
      expect.objectContaining({
        issue: "payment_terminal_order_not_terminal",
        action: "denied",
        beforeStatus: "success",
        targetStatus: "failed",
        afterStatus: "success"
      })
    ]);
  });
});
