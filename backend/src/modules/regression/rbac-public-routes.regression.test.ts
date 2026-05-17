import { describe, expect, it } from "@jest/globals";
import request from "supertest";

import { createApp } from "../../app";
import { InMemoryFulfillmentRepository } from "../fulfillment/fulfillment.repository";
import { createFulfillmentService } from "../fulfillment/fulfillment.service";
import { InMemoryOrderRepository } from "../order/order.repository";
import { createOrderService } from "../order/order.service";
import { InMemoryPaymentRepository } from "../payment/payment.repository";
import { computeMidtransSignatureKey } from "../payment/payment.signature";
import { createPaymentService } from "../payment/payment.service";
import { createInvoiceStatusService } from "../invoice-status/invoice-status.service";

function createPublicRouteFixture() {
  const orderRepository = new InMemoryOrderRepository();
  const orderService = createOrderService({
    repository: orderRepository,
    idGenerator: () => "ORD-RBAC-001",
    invoiceCodeGenerator: () => "INV-RBAC-001",
    clock: () => new Date("2026-05-14T11:00:00.000Z")
  });
  const paymentRepository = new InMemoryPaymentRepository(orderRepository);
  const paymentService = createPaymentService({
    paymentRepository,
    orderService,
    midtransConfig: {
      serverKey: "test-server-key",
      apiBaseUrl: "https://app.sandbox.midtrans.com"
    },
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          token: "snap-token-rbac",
          redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-rbac"
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      ),
    clock: () => new Date("2026-05-14T11:00:00.000Z")
  });
  const fulfillmentRepository = new InMemoryFulfillmentRepository(orderRepository);
  const fulfillmentService = createFulfillmentService({
    fulfillmentRepository,
    orderService,
    digiflazzConfig: {
      username: "digiflazz-user",
      apiKey: "digiflazz-key",
      apiBaseUrl: "https://api.digiflazz.test",
      nodeEnv: "test"
    },
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          data: {
            ref_id: "ORD-RBAC-001",
            trx_id: "DGF-RBAC-001",
            status: "Pending",
            message: "Transaksi pending"
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      ),
    clock: () => new Date("2026-05-14T11:00:00.000Z")
  });
  const invoiceStatusService = createInvoiceStatusService({
    orderRepository,
    paymentRepository,
    fulfillmentRepository
  });

  return {
    app: createApp({ orderService, paymentService, fulfillmentService }),
    orderService
  };
}

describe("RBAC public route regressions", () => {
  it("keeps guest order, invoice, payment webhook, and fulfillment callback routes public", async () => {
    const fixture = createPublicRouteFixture();

    const orderResponse = await request(fixture.app).post("/api/orders").send({
      customer_ref: "12345678:1234",
      product_code: "mobile-legends-86-diamond",
      provider: "digiflazz",
      amount_minor: 20000,
      currency: "IDR",
      metadata: { source: "rbac_public_regression" }
    });
    expect(orderResponse.status).toBe(201);
    expect(orderResponse.body).toEqual({
      order_id: "ORD-RBAC-001",
      invoice_code: "INV-RBAC-001",
      status: "pending_payment"
    });

    const webhookPayload = {
      order_id: "ORD-RBAC-001",
      status_code: "200",
      gross_amount: "20000.00",
      transaction_status: "settlement",
      transaction_id: "TRX-RBAC-001",
      signature_key: computeMidtransSignatureKey({
        orderId: "ORD-RBAC-001",
        statusCode: "200",
        grossAmount: "20000.00",
        serverKey: "test-server-key"
      })
    };
    const webhookResponse = await request(fixture.app).post("/api/payments/midtrans/webhook").send(webhookPayload);
    expect(webhookResponse.status).toBe(200);
    expect(webhookResponse.body).toMatchObject({ code: "PROCESSED" });

    const triggerResponse = await request(fixture.app).post("/api/fulfillments/digiflazz/trigger").send({
      order_id: "ORD-RBAC-001"
    });
    expect(triggerResponse.status).toBe(201);

    const callbackResponse = await request(fixture.app).post("/api/fulfillments/digiflazz/callback").send({
      data: {
        ref_id: "ORD-RBAC-001",
        trx_id: "DGF-RBAC-001",
        status: "Sukses",
        rc: "00",
        sn: "SN-RBAC-001"
      }
    });
    expect(callbackResponse.status).toBe(200);
    expect(callbackResponse.body).toMatchObject({ code: "PROCESSED" });

    const invoiceResponse = await request(fixture.app).get("/api/invoices/INV-RBAC-001/status");
    expect(invoiceResponse.status).toBe(200);
    expect(invoiceResponse.body).toMatchObject({
      invoice_code: "INV-RBAC-001",
      order_id: "ORD-RBAC-001",
      status: "success"
    });
  });
});
