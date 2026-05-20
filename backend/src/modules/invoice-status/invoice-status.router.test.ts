import { describe, expect, it } from "@jest/globals";
import request from "supertest";

import { createApp } from "../../app";
import { InMemoryFulfillmentRepository } from "../fulfillment/fulfillment.repository";
import { InMemoryOrderRepository } from "../order/order.repository";
import { createOrderService } from "../order/order.service";
import { InMemoryPaymentRepository } from "../payment/payment.repository";
import { createInvoiceStatusService } from "./invoice-status.service";

function createStatusFixture() {
  const orderRepository = new InMemoryOrderRepository();
  const paymentRepository = new InMemoryPaymentRepository(orderRepository);
  const fulfillmentRepository = new InMemoryFulfillmentRepository(orderRepository);
  const orderService = createOrderService({
    repository: orderRepository,
    idGenerator: () => "order-status-1001",
    invoiceCodeGenerator: () => "INV-TEST-0001",
    clock: () => new Date("2026-04-22T08:00:00.000Z")
  });
  const invoiceStatusService = createInvoiceStatusService({
    orderRepository,
    paymentRepository,
    fulfillmentRepository
  });

  const app = createApp({
    orderService,
    orderRepository,
    paymentRepository,
    fulfillmentRepository
  });

  return {
    orderService,
    paymentRepository,
    fulfillmentRepository,
    app
  };
}

describe("GET /api/invoices/:invoiceCode/status", () => {
  it("returns a single guest-safe invoice status with timeline and summaries", async () => {
    const fixture = createStatusFixture();
    const createdOrder = await fixture.orderService.createGuestOrder({
      customerRef: "12345678:1234",
      productCode: "mobile-legends-86-diamond",
      provider: "digiflazz",
      amountMinor: 20000,
      currency: "IDR",
      metadata: {
        source: "status_test"
      }
    });

    await fixture.orderService.transitionOrderStatus({
      orderId: createdOrder.orderId,
      toStatus: "paid",
      note: "payment_settled",
      createdBy: "midtrans_webhook"
    });
    await fixture.orderService.transitionOrderStatus({
      orderId: createdOrder.orderId,
      toStatus: "fulfillment_pending",
      note: "queued_for_provider",
      createdBy: "fulfillment_worker"
    });
    await fixture.orderService.transitionOrderStatus({
      orderId: createdOrder.orderId,
      toStatus: "success",
      note: "provider_success",
      createdBy: "digiflazz_callback"
    });

    await fixture.paymentRepository.createPayment({
      orderId: createdOrder.orderId,
      provider: "midtrans",
      idempotencyKey: "status-test-payment",
      providerPaymentId: "midtrans-payment-1001",
      providerReference: "midtrans-reference-1001",
      amountMinor: 20000,
      currency: "IDR",
      status: "paid",
      paidAt: new Date("2026-04-22T08:01:00.000Z"),
      payload: {},
      createdAt: new Date("2026-04-22T08:00:30.000Z"),
      updatedAt: new Date("2026-04-22T08:01:00.000Z")
    });
    await fixture.fulfillmentRepository.createFulfillment({
      orderId: createdOrder.orderId,
      provider: "digiflazz",
      attemptNo: 1,
      providerFulfillmentId: "digiflazz-fulfillment-1001",
      providerReference: "digiflazz-reference-1001",
      status: "success",
      serialNumber: "SN-1001",
      requestPayload: {},
      responsePayload: {},
      processedAt: new Date("2026-04-22T08:03:00.000Z"),
      createdAt: new Date("2026-04-22T08:02:00.000Z"),
      updatedAt: new Date("2026-04-22T08:03:00.000Z")
    });

    const response = await request(fixture.app).get("/api/invoices/INV-TEST-0001/status");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      invoice_code: "INV-TEST-0001",
      order_id: "order-status-1001",
      status: "success",
      product_code: "mobile-legends-86-diamond",
      provider: "digiflazz",
      amount_minor: 20000,
      currency: "IDR",
      payment: {
        provider: "midtrans",
        status: "paid",
        paid_at: "2026-04-22T08:01:00.000Z"
      },
      fulfillment: {
        provider: "digiflazz",
        status: "success",
        serial_number: "SN-1001",
        processed_at: "2026-04-22T08:03:00.000Z"
      }
    });
    expect(response.body.timeline.map((entry: { toStatus: string }) => entry.toStatus)).toEqual([
      "pending_payment",
      "paid",
      "fulfillment_pending",
      "success"
    ]);
    expect(response.body.customer_ref).toBeUndefined();
  });

  it("returns a safe not-found response for an invalid invoice", async () => {
    const response = await request(createApp({})).get("/api/invoices/INV-NOT-FOUND/status");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "INVOICE_NOT_FOUND",
        message: "Invoice tidak ditemukan"
      }
    });
  });

  it("does not expose unrestricted invoice or order listing", async () => {
    const app = createApp({});

    const invoiceListResponse = await request(app).get("/api/invoices");
    const orderListResponse = await request(app).get("/api/orders");

    expect(invoiceListResponse.status).toBe(404);
    expect(orderListResponse.status).toBe(401);
  });
});
