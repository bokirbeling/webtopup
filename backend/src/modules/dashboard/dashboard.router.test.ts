import { describe, expect, it, jest } from "@jest/globals";
import request from "supertest";

import { createApp } from "../../app";
import { InMemoryAuthRepository } from "../auth/auth.repository";
import { InMemoryCatalogRepository } from "../catalog/catalog.repository";
import { InMemoryFulfillmentRepository } from "../fulfillment/fulfillment.repository";
import { InMemoryOrderRepository } from "../order/order.repository";
import { InMemoryPaymentRepository } from "../payment/payment.repository";

async function register(app: ReturnType<typeof createApp>, email: string) {
  const response = await request(app).post("/api/auth/register").send({
    email,
    password: "correct-password"
  });

  expect(response.status).toBe(201);
  return response.body as { user: { id: string }; token: string };
}

function createDashboardFixture() {
  const authRepository = new InMemoryAuthRepository();
  const orderRepository = new InMemoryOrderRepository();
  const paymentRepository = new InMemoryPaymentRepository(orderRepository);
  const fulfillmentRepository = new InMemoryFulfillmentRepository(orderRepository);
  const catalogRepository = new InMemoryCatalogRepository();
  const fetchImpl = jest.fn<typeof fetch>().mockResolvedValue(
    new Response(JSON.stringify({ data: { deposit: 125000, rc: "00", message: "Saldo tersedia" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  );
  const app = createApp({
    authRepository,
    catalogRepository,
    orderRepository,
    paymentRepository,
    fulfillmentRepository,
    fetchImpl,
    digiflazzConfig: {
      username: "buyer-user",
      apiKey: "buyer-api-key",
      apiBaseUrl: "https://api.digiflazz.test",
      webhookSecret: null,
      nodeEnv: "test"
    }
  });

  return { app, authRepository, catalogRepository, orderRepository, paymentRepository, fulfillmentRepository, fetchImpl };
}

async function seedMemberTransaction(fixture: ReturnType<typeof createDashboardFixture>, userId: string) {
  const createdAt = new Date("2026-05-14T09:00:00.000Z");
  await fixture.orderRepository.createOrder({
    id: "order-history-1",
    orderNumber: "INV-HISTORY-0001",
    customerRef: "12345678:1234",
    userId,
    productCode: "mobile-legends-86-diamond",
    provider: "digiflazz",
    amountMinor: 20_000,
    currency: "IDR",
    status: "success",
    referralCode: null,
    discountCode: null,
    discountAmountMinor: null,
    metadata: { source: "dashboard_history_test" },
    basePriceSnapshot: 19_000,
    markupSnapshot: 1_000,
    rolePriceSnapshot: 20_000,
    pricingRuleIdSnapshot: null,
    createdAt,
    updatedAt: new Date("2026-05-14T09:03:00.000Z")
  });

  const payment = await fixture.paymentRepository.createPayment({
    orderId: "order-history-1",
    provider: "midtrans",
    idempotencyKey: "history-payment-init",
    providerPaymentId: "TX-HISTORY-1",
    providerReference: "TX-HISTORY-1",
    amountMinor: 20_000,
    currency: "IDR",
    status: "paid",
    paidAt: new Date("2026-05-14T09:01:00.000Z"),
    payload: { transaction_status: "settlement" },
    createdAt: new Date("2026-05-14T09:01:00.000Z"),
    updatedAt: new Date("2026-05-14T09:01:00.000Z")
  });

  await fixture.fulfillmentRepository.createFulfillment({
    orderId: "order-history-1",
    provider: "digiflazz",
    attemptNo: 1,
    providerFulfillmentId: "DGF-HISTORY-1",
    providerReference: "order-history-1",
    status: "success",
    serialNumber: "SN-HISTORY-1",
    requestPayload: { ref_id: "order-history-1" },
    responsePayload: { status: "Sukses" },
    processedAt: new Date("2026-05-14T09:03:00.000Z"),
    createdAt: new Date("2026-05-14T09:02:00.000Z"),
    updatedAt: new Date("2026-05-14T09:03:00.000Z")
  });

  const registeredWebhook = await fixture.paymentRepository.registerWebhookEvent({
    provider: "midtrans",
    eventKey: "TX-HISTORY-1",
    eventType: "settlement",
    orderId: "order-history-1",
    paymentId: payment.id,
    payload: { transaction_status: "settlement" },
    receivedAt: new Date("2026-05-14T09:01:30.000Z")
  });

  await fixture.paymentRepository.updateWebhookEventState({
    eventId: registeredWebhook.event.id,
    processingState: "processed",
    processedAt: new Date("2026-05-14T09:01:31.000Z"),
    errorMessage: null
  });
}

describe("dashboard history and monitoring routes", () => {
  it("returns authenticated member transaction history and empty history for other members", async () => {
    const fixture = createDashboardFixture();
    const member = await register(fixture.app, "member@example.com");
    const otherMember = await register(fixture.app, "other@example.com");
    await seedMemberTransaction(fixture, member.user.id);

    const historyResponse = await request(fixture.app)
      .get("/api/account/transactions")
      .set("Authorization", `Bearer ${member.token}`);

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.transactions).toHaveLength(1);
    expect(historyResponse.body.transactions[0]).toMatchObject({
      order_id: "order-history-1",
      invoice_code: "INV-HISTORY-0001",
      status: "success",
      payment: { status: "paid" },
      fulfillment: { status: "success", serial_number: "SN-HISTORY-1" }
    });

    const emptyResponse = await request(fixture.app)
      .get("/api/account/transactions")
      .set("Authorization", `Bearer ${otherMember.token}`);

    expect(emptyResponse.status).toBe(200);
    expect(emptyResponse.body).toEqual({ transactions: [] });
  });

  it("keeps admin monitoring read-only and protected by admin role", async () => {
    const fixture = createDashboardFixture();
    const member = await register(fixture.app, "member@example.com");
    const admin = await register(fixture.app, "admin@example.com");
    await fixture.authRepository.updateUser(admin.user.id, {
      role: "admin",
      updatedAt: new Date("2026-05-14T10:00:00.000Z")
    });
    await seedMemberTransaction(fixture, member.user.id);

    const forbiddenResponse = await request(fixture.app)
      .get("/api/admin/monitoring")
      .set("Authorization", `Bearer ${member.token}`);

    expect(forbiddenResponse.status).toBe(403);

    const monitoringResponse = await request(fixture.app)
      .get("/api/admin/monitoring")
      .set("Authorization", `Bearer ${admin.token}`);

    expect(monitoringResponse.status).toBe(200);
    expect(monitoringResponse.body.summary).toEqual({
      transaction_count: 1,
      webhook_count: 1,
      failed_webhook_count: 0
    });
    expect(monitoringResponse.body.transactions[0]).toMatchObject({
      order_id: "order-history-1",
      user_id: member.user.id,
      payment: { status: "paid" },
      fulfillment: { status: "success" }
    });
    expect(monitoringResponse.body.webhooks[0]).toMatchObject({
      provider: "midtrans",
      event_key: "TX-HISTORY-1",
      processing_state: "processed",
      order_id: "order-history-1"
    });
  });

  it("returns admin-only Digiflazz Buyer operations without exposing secrets", async () => {
    const fixture = createDashboardFixture();
    const member = await register(fixture.app, "member@example.com");
    const admin = await register(fixture.app, "admin@example.com");
    await fixture.authRepository.updateUser(admin.user.id, {
      role: "admin",
      updatedAt: new Date("2026-05-14T10:00:00.000Z")
    });
    await fixture.catalogRepository.createProduct({
      skuDigiflazz: "DIGI-ACTIVE",
      name: "Digiflazz Active",
      category: "Pulsa",
      provider: "digiflazz",
      basePriceMinor: 10000,
      isActive: true,
      metadata: { synced_at: "2026-05-15T03:30:00.000Z" },
      createdAt: new Date("2026-05-15T03:30:00.000Z"),
      updatedAt: new Date("2026-05-15T03:30:00.000Z")
    });
    await fixture.catalogRepository.createProduct({
      skuDigiflazz: "DIGI-INACTIVE",
      name: "Digiflazz Inactive",
      category: "Pulsa",
      provider: "digiflazz",
      basePriceMinor: 5000,
      isActive: false,
      metadata: { synced_at: "2026-05-15T03:31:00.000Z" },
      createdAt: new Date("2026-05-15T03:31:00.000Z"),
      updatedAt: new Date("2026-05-15T03:31:00.000Z")
    });
    await seedMemberTransaction(fixture, member.user.id);

    const missingTokenResponse = await request(fixture.app).get("/api/admin/digiflazz/operations");
    expect(missingTokenResponse.status).toBe(401);

    const forbiddenResponse = await request(fixture.app)
      .get("/api/admin/digiflazz/operations")
      .set("Authorization", `Bearer ${member.token}`);
    expect(forbiddenResponse.status).toBe(403);

    const response = await request(fixture.app)
      .get("/api/admin/digiflazz/operations")
      .set("Authorization", `Bearer ${admin.token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      balance: { deposit: 125000, rc: "00", message: "Saldo tersedia" },
      catalog: { product_count: 2, active_count: 1, inactive_count: 1, last_synced_at: "2026-05-15T03:31:00.000Z" },
      webhooks: { recent_count: 1, failed_count: 0 }
    });
    expect(JSON.stringify(response.body)).not.toContain("buyer-api-key");
  });
});
