import { describe, expect, it } from "@jest/globals";

import { InMemoryFulfillmentRepository } from "../fulfillment/fulfillment.repository";
import { InMemoryOrderRepository } from "../order/order.repository";
import { createOrderService } from "../order/order.service";
import { InMemoryPaymentRepository } from "../payment/payment.repository";
import { createReconcileService } from "./reconcile.service";

function createFixture() {
  const orderRepository = new InMemoryOrderRepository();
  const orderService = createOrderService({
    repository: orderRepository,
    idGenerator: () => "22222222-2222-4222-8222-222222222222",
    invoiceCodeGenerator: () => "INV-RECON-0001",
    clock: () => new Date("2026-04-22T15:00:00.000Z")
  });
  const paymentRepository = new InMemoryPaymentRepository(orderRepository);
  const fulfillmentRepository = new InMemoryFulfillmentRepository(orderRepository);
  const reconcileService = createReconcileService({
    orderRepository,
    paymentRepository,
    fulfillmentRepository,
    orderService,
    clock: () => new Date("2026-04-22T15:05:00.000Z")
  });

  return { orderRepository, orderService, paymentRepository, fulfillmentRepository, reconcileService };
}

async function createPendingOrder(fixture: ReturnType<typeof createFixture>) {
  return fixture.orderService.createGuestOrder({
    customerRef: "081234567890",
    productCode: "pln-20",
    provider: "digiflazz",
    amountMinor: 20000,
    currency: "IDR",
    metadata: { channel: "test" }
  });
}

describe("reconcile service", () => {
  it("converges paid payment with pending order through the transition service", async () => {
    const fixture = createFixture();
    const order = await createPendingOrder(fixture);
    await fixture.paymentRepository.createPayment({
      orderId: order.orderId,
      provider: "midtrans",
      idempotencyKey: "reconcile-paid-payment",
      providerPaymentId: "payment-reconcile-1",
      providerReference: order.orderId,
      amountMinor: 20000,
      currency: "IDR",
      status: "paid",
      paidAt: new Date("2026-04-22T15:01:00.000Z"),
      payload: { source: "test" },
      createdAt: new Date("2026-04-22T15:01:00.000Z"),
      updatedAt: new Date("2026-04-22T15:01:00.000Z")
    });

    const results = await fixture.reconcileService.reconcileOrder({ orderId: order.orderId });

    expect(results).toEqual([
      expect.objectContaining({
        orderId: order.orderId,
        issue: "payment_paid_order_not_paid",
        action: "transitioned",
        beforeStatus: "pending_payment",
        targetStatus: "paid",
        afterStatus: "paid",
        reason: "Latest payment is paid while order is still pending_payment."
      })
    ]);
    const persistedOrder = await fixture.orderRepository.findOrderById(order.orderId);
    expect(persistedOrder?.status).toBe("paid");
    expect(fixture.orderRepository.getStatusHistoryByOrderId(order.orderId)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromStatus: "pending_payment",
          toStatus: "paid",
          createdBy: "reconciliation_job",
          note: "payment_paid_order_not_paid"
        })
      ])
    );
  });

  it("walks successful fulfillment through allowed intermediate order states", async () => {
    const fixture = createFixture();
    const order = await createPendingOrder(fixture);
    await fixture.orderService.transitionOrderStatus({ orderId: order.orderId, toStatus: "paid" });
    await fixture.fulfillmentRepository.createFulfillment({
      orderId: order.orderId,
      provider: "digiflazz",
      attemptNo: 1,
      providerFulfillmentId: "DFZ-1",
      providerReference: order.orderId,
      status: "success",
      serialNumber: "SN-123",
      requestPayload: { source: "test" },
      responsePayload: { status: "success" },
      processedAt: new Date("2026-04-22T15:03:00.000Z"),
      createdAt: new Date("2026-04-22T15:02:00.000Z"),
      updatedAt: new Date("2026-04-22T15:03:00.000Z")
    });

    const results = await fixture.reconcileService.reconcileOrder({ orderId: order.orderId });

    expect(results).toEqual([
      expect.objectContaining({
        issue: "fulfillment_success_order_not_started",
        action: "transitioned",
        beforeStatus: "paid",
        targetStatus: "fulfillment_pending",
        afterStatus: "fulfillment_pending"
      }),
      expect.objectContaining({
        issue: "fulfillment_success_order_not_success",
        action: "transitioned",
        beforeStatus: "fulfillment_pending",
        targetStatus: "success",
        afterStatus: "success"
      })
    ]);
    const persistedOrder = await fixture.orderRepository.findOrderById(order.orderId);
    expect(persistedOrder?.status).toBe("success");
  });

  it("denies illegal terminal regression and leaves order state unchanged", async () => {
    const fixture = createFixture();
    const order = await createPendingOrder(fixture);
    await fixture.orderService.transitionOrderStatus({ orderId: order.orderId, toStatus: "paid" });
    await fixture.orderService.transitionOrderStatus({ orderId: order.orderId, toStatus: "fulfillment_pending" });
    await fixture.orderService.transitionOrderStatus({ orderId: order.orderId, toStatus: "success" });
    await fixture.paymentRepository.createPayment({
      orderId: order.orderId,
      provider: "midtrans",
      idempotencyKey: "reconcile-failed-payment",
      providerPaymentId: "payment-reconcile-2",
      providerReference: order.orderId,
      amountMinor: 20000,
      currency: "IDR",
      status: "failed",
      paidAt: null,
      payload: { source: "test" },
      createdAt: new Date("2026-04-22T15:04:00.000Z"),
      updatedAt: new Date("2026-04-22T15:04:00.000Z")
    });

    const results = await fixture.reconcileService.reconcileOrder({ orderId: order.orderId });

    expect(results).toEqual([
      expect.objectContaining({
        issue: "payment_terminal_order_not_terminal",
        action: "denied",
        beforeStatus: "success",
        targetStatus: "failed",
        afterStatus: "success",
        reason: expect.stringContaining("Correction denied:")
      })
    ]);
    const persistedOrder = await fixture.orderRepository.findOrderById(order.orderId);
    expect(persistedOrder?.status).toBe("success");
  });
});
