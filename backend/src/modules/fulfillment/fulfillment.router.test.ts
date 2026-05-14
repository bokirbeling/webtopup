import { describe, expect, it } from "@jest/globals";
import request from "supertest";

import { createApp } from "../../app";
import { InMemoryAuditLogger } from "../../security/audit";
import { InMemoryOrderRepository } from "../order/order.repository";
import { createOrderService } from "../order/order.service";
import { InMemoryFulfillmentRepository } from "./fulfillment.repository";
import { createFulfillmentService } from "./fulfillment.service";

function createTestServices(options: { live?: boolean; production?: boolean } = {}) {
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
      nodeEnv: options.production ? "production" : "test"
    },
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          data: {
            ref_id: "11111111-1111-4111-8111-111111111111",
            trx_id: "DFZ-TRX-9001",
            status: "Pending",
            message: "Transaksi pending"
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ),
    clock: () => new Date("2026-04-22T12:00:00.000Z")
  });

  return { orderRepository, orderService, fulfillmentRepository, fulfillmentService };
}

async function createPaidDigiflazzOrder(services: ReturnType<typeof createTestServices>) {
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

describe("digiflazz fulfillment routes", () => {
  it("triggers fulfillment only after order is paid", async () => {
    const services = createTestServices({ live: true });
    const app = createApp({ orderService: services.orderService, fulfillmentService: services.fulfillmentService });
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

  it("processes Digiflazz success callback and records provider reference", async () => {
    const services = createTestServices({ live: true });
    const app = createApp({ orderService: services.orderService, fulfillmentService: services.fulfillmentService });
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
    const response = await request(app).post("/api/fulfillments/digiflazz/callback").send(payload);
    const replay = await request(app).post("/api/fulfillments/digiflazz/callback").send(payload);

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
    const persistedOrder = await services.orderRepository.findOrderById(order.orderId);
    expect(persistedOrder?.status).toBe("success");
  });

  it("uses controlled mock fallback outside production when credentials are missing", async () => {
    const services = createTestServices();
    const app = createApp({ orderService: services.orderService, fulfillmentService: services.fulfillmentService });
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
        message: "Digiflazz credentials are required in production."
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
        reason: "Digiflazz credentials are required in production."
      })
    ]);
  });
});
