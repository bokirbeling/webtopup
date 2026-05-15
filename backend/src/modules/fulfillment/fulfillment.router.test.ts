import { createHmac } from "node:crypto";

import { describe, expect, it } from "@jest/globals";
import request from "supertest";

import { createApp } from "../../app";
import { InMemoryAuditLogger } from "../../security/audit";
import { InMemoryOrderRepository } from "../order/order.repository";
import { createOrderService } from "../order/order.service";
import { InMemoryFulfillmentRepository } from "./fulfillment.repository";
import { createFulfillmentService } from "./fulfillment.service";

type TestServices = ReturnType<typeof createTestServices>;

type CreateTestServicesOptions = Readonly<{
  live?: boolean;
  production?: boolean;
  fetchImpl?: typeof fetch;
  topupOptions?: Readonly<{
    testing?: boolean;
    maxPrice?: number;
    callbackUrl?: string;
    allowDot?: boolean;
  }>;
}>;

function createTestServices(options: CreateTestServicesOptions = {}) {
  const orderRepository = new InMemoryOrderRepository();
  const orderService = createOrderService({
    repository: orderRepository,
    idGenerator: () => "11111111-1111-4111-8111-111111111111",
    invoiceCodeGenerator: () => "INV-20260422-9001",
    clock: () => new Date("2026-04-22T12:00:00.000Z")
  });
  const fulfillmentRepository = new InMemoryFulfillmentRepository(orderRepository);
  const fulfillmentService = createFulfillmentService({
    fulfillmentRepository,
    orderService,
    digiflazzConfig: {
      username: options.live ? "digiflazz-user" : null,
      apiKey: options.live ? "digiflazz-key" : null,
      apiBaseUrl: "https://api.digiflazz.test",
      nodeEnv: options.production ? "production" : "test",
      topupOptions: options.topupOptions
    },
    fetchImpl: options.fetchImpl ?? (async () =>
      new Response(
        JSON.stringify({
          data: {
            ref_id: "11111111-1111-4111-8111-111111111111",
            trx_id: "DFZ-TRX-9001",
            status: "Pending",
            rc: "03",
            message: "Transaksi pending"
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )),
    clock: () => new Date("2026-04-22T12:00:00.000Z")
  });

  return { orderRepository, orderService, fulfillmentRepository, fulfillmentService };
}

function createFulfillmentApp(services: TestServices, options: { webhookSecret?: string | null } = {}) {
  return createApp({
    orderService: services.orderService,
    fulfillmentService: services.fulfillmentService,
    digiflazzConfig: {
      username: "digiflazz-user",
      apiKey: "digiflazz-key",
      apiBaseUrl: "https://api.digiflazz.test",
      nodeEnv: "test",
      webhookSecret: options.webhookSecret ?? null
    }
  });
}

async function createPaidDigiflazzOrder(services: TestServices) {
  const order = await services.orderService.createGuestOrder({
    customerRef: "081234567890",
    productCode: "pln-20",
    provider: "digiflazz",
    amountMinor: 20000,
    currency: "IDR",
    metadata: { channel: "web" }
  });
  await services.orderService.transitionOrderStatus({
    orderId: order.orderId,
    toStatus: "paid",
    note: "test_payment_paid",
    createdBy: "test"
  });
  return order;
}

function digiflazzSignature(secret: string, rawBody: string): string {
  return "sha1=" + createHmac("sha1", secret).update(Buffer.from(rawBody)).digest("hex");
}

function postRawCallback(app: ReturnType<typeof createApp>, rawBody: string, signature?: string) {
  const pendingRequest = request(app)
    .post("/api/fulfillments/digiflazz/callback")
    .set("Content-Type", "application/json")
    .set("X-Digiflazz-Event", "update")
    .set("User-Agent", "Digiflazz-Hookshot");

  return (signature === undefined ? pendingRequest : pendingRequest.set("X-Hub-Signature", signature)).send(rawBody);
}

describe("digiflazz fulfillment routes", () => {
  it("triggers fulfillment only after order is paid", async () => {
    const services = createTestServices({ live: true });
    const app = createFulfillmentApp(services);
    const order = await createPaidDigiflazzOrder(services);

    const response = await request(app).post("/api/fulfillments/digiflazz/trigger").send({ order_id: order.orderId });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      fulfillment_id: expect.any(String),
      order_id: order.orderId,
      status: "processing",
      provider_reference: order.orderId,
      provider_mode: "live"
    });
    const persistedOrder = await services.orderRepository.findOrderById(order.orderId);
    expect(persistedOrder?.status).toBe("fulfillment_pending");
  });

  it("processes unsigned Digiflazz callback when no webhook secret is configured and preserves duplicate idempotency", async () => {
    const services = createTestServices({ live: true });
    const app = createFulfillmentApp(services);
    const order = await createPaidDigiflazzOrder(services);
    const triggerResponse = await request(app).post("/api/fulfillments/digiflazz/trigger").send({ order_id: order.orderId });
    expect(triggerResponse.status).toBe(201);

    const payload = {
      data: {
        ref_id: order.orderId,
        trx_id: "DFZ-TRX-9001",
        status: "Sukses",
        rc: "00",
        sn: "SN1234567890",
        message: "Transaksi sukses"
      }
    };
    const response = await request(app).post("/api/fulfillments/digiflazz/callback").set("X-Digiflazz-Event", "update").send(payload);
    const replay = await request(app).post("/api/fulfillments/digiflazz/callback").set("X-Digiflazz-Event", "update").send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ code: "PROCESSED", message: "Digiflazz callback processed." });
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual({ code: "DUPLICATE", message: "Duplicate Digiflazz callback ignored." });
    const fulfillment = await services.fulfillmentRepository.findFulfillmentByProviderAndReference("digiflazz", order.orderId);
    expect(fulfillment).toMatchObject({
      providerReference: order.orderId,
      providerFulfillmentId: "DFZ-TRX-9001",
      serialNumber: "SN1234567890",
      status: "success"
    });
    const event = services.fulfillmentRepository.getWebhookEventByProviderAndEventKey("digiflazz", order.orderId + ":DFZ-TRX-9001:Sukses:00");
    expect(event?.eventType).toBe("update");
    expect(event?.payload.metadata).toEqual(expect.objectContaining({ rc: "00", message: "Transaksi sukses", status: "Sukses" }));
    const persistedOrder = await services.orderRepository.findOrderById(order.orderId);
    expect(persistedOrder?.status).toBe("success");
  });

  it("validates Digiflazz webhook HMAC over the raw request body when a secret is configured", async () => {
    const services = createTestServices({ live: true });
    const webhookSecret = "digiflazz-webhook-secret";
    const app = createFulfillmentApp(services, { webhookSecret });
    const order = await createPaidDigiflazzOrder(services);
    const triggerResponse = await request(app).post("/api/fulfillments/digiflazz/trigger").send({ order_id: order.orderId });
    expect(triggerResponse.status).toBe(201);

    const rawBody = JSON.stringify({
      data: {
        ref_id: order.orderId,
        trx_id: "DFZ-TRX-9002",
        status: "Sukses",
        rc: "00",
        sn: "SN-SIGNED",
        message: "Transaksi sukses"
      }
    });
    const response = await postRawCallback(app, rawBody, digiflazzSignature(webhookSecret, rawBody));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ code: "PROCESSED", message: "Digiflazz callback processed." });
    const fulfillment = await services.fulfillmentRepository.findFulfillmentByProviderAndReference("digiflazz", order.orderId);
    expect(fulfillment?.serialNumber).toBe("SN-SIGNED");
  });

  it("rejects invalid or missing Digiflazz webhook signatures when a secret is configured", async () => {
    const services = createTestServices({ live: true });
    const app = createFulfillmentApp(services, { webhookSecret: "digiflazz-webhook-secret" });
    const rawBody = JSON.stringify({ data: { ref_id: "missing-order", status: "Sukses", rc: "00" } });

    const invalidSignature = await postRawCallback(app, rawBody, "sha1=bad");
    const missingSignature = await postRawCallback(app, rawBody);

    expect(invalidSignature.status).toBe(401);
    expect(missingSignature.status).toBe(401);
    expect(services.fulfillmentRepository.getWebhookEventByProviderAndEventKey("digiflazz", "missing-order:-:Sukses:00")).toBeNull();
  });

  it("acknowledges Digiflazz ping events without storing transaction webhook events", async () => {
    const services = createTestServices({ live: true });
    const app = createFulfillmentApp(services);
    const payload = { data: { ref_id: "ping-ref", status: "Sukses", rc: "00", message: "ping" } };

    const response = await request(app).post("/api/fulfillments/digiflazz/callback").set("X-Digiflazz-Event", "ping").send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ code: "PROCESSED", message: "Digiflazz ping acknowledged." });
    expect(services.fulfillmentRepository.getWebhookEventByProviderAndEventKey("digiflazz", "ping-ref:-:Sukses:00")).toBeNull();
  });

  it("ignores Digiflazz postpaid webhook deliveries without storing prepaid transaction events", async () => {
    const services = createTestServices({ live: true });
    const app = createFulfillmentApp(services);
    const payload = { data: { ref_id: "postpaid-ref", status: "Sukses", rc: "00", message: "postpaid" } };

    const response = await request(app)
      .post("/api/fulfillments/digiflazz/callback")
      .set("X-Digiflazz-Event", "update")
      .set("User-Agent", "Digiflazz-Pasca-Hookshot")
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ code: "IGNORED", message: "Postpaid Digiflazz webhook ignored." });
    expect(services.fulfillmentRepository.getWebhookEventByProviderAndEventKey("digiflazz", "postpaid-ref:-:Sukses:00")).toBeNull();
  });

  it("rechecks a pending prepaid transaction by repeating topup with the same ref_id", async () => {
    const fetchBodies: Record<string, unknown>[] = [];
    let attempt = 0;
    const fetchImpl: typeof fetch = async (_input, init) => {
      fetchBodies.push(JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>);
      attempt += 1;
      return new Response(
        JSON.stringify({
          data: {
            ref_id: "11111111-1111-4111-8111-111111111111",
            trx_id: "DFZ-TRX-RECHECK",
            status: attempt === 1 ? "Pending" : "Sukses",
            rc: attempt === 1 ? "03" : "00",
            sn: attempt === 1 ? "" : "SN-RECHECK",
            message: attempt === 1 ? "Transaksi pending" : "Transaksi sukses"
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };
    const services = createTestServices({
      live: true,
      fetchImpl,
      topupOptions: {
        testing: true,
        maxPrice: 25000,
        callbackUrl: "https://merchant.test/api/fulfillments/digiflazz/callback",
        allowDot: true
      }
    });
    const app = createFulfillmentApp(services);
    const order = await createPaidDigiflazzOrder(services);

    const triggerResponse = await request(app).post("/api/fulfillments/digiflazz/trigger").send({
      order_id: order.orderId,
      max_price: 1,
      cb_url: "https://client.invalid/callback",
      allow_dot: false
    });
    const initialFulfillment = await services.fulfillmentRepository.findFulfillmentByProviderAndReference("digiflazz", order.orderId);
    const recheckResponse = await request(app).post("/api/fulfillments/digiflazz/recheck").send({ order_id: order.orderId });
    const recheckedFulfillment = await services.fulfillmentRepository.findFulfillmentByProviderAndReference("digiflazz", order.orderId);

    expect(triggerResponse.status).toBe(201);
    expect(triggerResponse.body.status).toBe("processing");
    expect(recheckResponse.status).toBe(200);
    expect(recheckResponse.body).toEqual({
      fulfillment_id: initialFulfillment?.id,
      order_id: order.orderId,
      status: "success",
      provider_reference: order.orderId,
      provider_mode: "live"
    });
    expect(recheckedFulfillment?.id).toBe(initialFulfillment?.id);
    expect(recheckedFulfillment?.serialNumber).toBe("SN-RECHECK");
    expect(fetchBodies).toHaveLength(2);
    expect(fetchBodies.map((body) => body.ref_id)).toEqual([order.orderId, order.orderId]);
    expect(fetchBodies[0]).toEqual(expect.objectContaining({
      testing: true,
      max_price: 25000,
      cb_url: "https://merchant.test/api/fulfillments/digiflazz/callback",
      allow_dot: true
    }));
    expect(fetchBodies[1]).toEqual(expect.objectContaining({
      testing: true,
      max_price: 25000,
      cb_url: "https://merchant.test/api/fulfillments/digiflazz/callback",
      allow_dot: true
    }));
    const persistedOrder = await services.orderRepository.findOrderById(order.orderId);
    expect(persistedOrder?.status).toBe("success");
  });

  it("uses controlled mock fallback outside production when credentials are missing", async () => {
    const services = createTestServices();
    const app = createFulfillmentApp(services);
    const order = await createPaidDigiflazzOrder(services);

    const response = await request(app).post("/api/fulfillments/digiflazz/trigger").send({ order_id: order.orderId });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ provider_mode: "mock", status: "success" });
    const fulfillment = await services.fulfillmentRepository.findFulfillmentByProviderAndReference("digiflazz", order.orderId);
    expect(fulfillment?.responsePayload.provider_mode).toBe("mock");
    const persistedOrder = await services.orderRepository.findOrderById(order.orderId);
    expect(persistedOrder?.status).toBe("success");
  });

  it("does not silently use mock fallback in production", async () => {
    const services = createTestServices({ production: true });
    const auditLogger = new InMemoryAuditLogger();
    const app = createApp({
      orderService: services.orderService,
      fulfillmentService: services.fulfillmentService,
      auditLogger
    });
    const order = await createPaidDigiflazzOrder(services);

    const response = await request(app).post("/api/fulfillments/digiflazz/trigger").send({ order_id: order.orderId });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "FULFILLMENT_VALIDATION_ERROR",
        message: "Digiflazz credentials are required in production. Missing: DIGIFLAZZ_USERNAME, DIGIFLAZZ_API_KEY."
      }
    });
    expect(await services.fulfillmentRepository.findFulfillmentByProviderAndReference("digiflazz", order.orderId)).toBeNull();
    expect(auditLogger.getEvents()).toEqual([
      expect.objectContaining({
        type: "fulfillment_security_rejection",
        provider: "digiflazz",
        route: "/digiflazz/trigger",
        method: "POST",
        statusCode: 400,
        orderId: order.orderId,
        reason: "Digiflazz credentials are required in production. Missing: DIGIFLAZZ_USERNAME, DIGIFLAZZ_API_KEY."
      })
    ]);
  });
});
