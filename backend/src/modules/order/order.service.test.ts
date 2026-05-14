import { describe, expect, it } from "@jest/globals";

import { InMemoryOrderRepository } from "./order.repository";
import { OrderTransitionError, createOrderService } from "./order.service";

describe("order transition engine", () => {
  it("rejects backward transitions", async () => {
    const repository = new InMemoryOrderRepository();
    const service = createOrderService({
      repository,
      idGenerator: () => "order-001",
      invoiceCodeGenerator: () => "INV-20260422-0001",
      clock: () => new Date("2026-04-22T00:00:00.000Z")
    });

    const createdOrder = await service.createGuestOrder({
      customerRef: "081234567890",
      productCode: "ml-diamond-86",
      provider: "digiflazz",
      amountMinor: 20000,
      currency: "IDR",
      metadata: {
        channel: "web"
      }
    });

    await service.transitionOrderStatus({
      orderId: createdOrder.orderId,
      toStatus: "paid",
      note: "payment_settled"
    });

    await expect(
      service.transitionOrderStatus({
        orderId: createdOrder.orderId,
        toStatus: "pending_payment",
        note: "should_fail"
      })
    ).rejects.toBeInstanceOf(OrderTransitionError);
  });

  it("persists status history for create and valid transitions", async () => {
    const repository = new InMemoryOrderRepository();
    const service = createOrderService({
      repository,
      idGenerator: () => "order-002",
      invoiceCodeGenerator: () => "INV-20260422-0002",
      clock: () => new Date("2026-04-22T00:05:00.000Z")
    });

    const createdOrder = await service.createGuestOrder({
      customerRef: null,
      productCode: "ff-diamond-70",
      provider: "digiflazz",
      amountMinor: 10000,
      currency: "IDR",
      metadata: {}
    });

    await service.transitionOrderStatus({
      orderId: createdOrder.orderId,
      toStatus: "paid",
      note: "payment_settled",
      createdBy: "midtrans_webhook"
    });

    await service.transitionOrderStatus({
      orderId: createdOrder.orderId,
      toStatus: "fulfillment_pending",
      note: "queued_for_provider",
      createdBy: "fulfillment_worker"
    });

    const history = repository.getStatusHistoryByOrderId(createdOrder.orderId);

    expect(history).toHaveLength(3);
    expect(history.map((entry) => [entry.fromStatus, entry.toStatus, entry.note, entry.createdBy])).toEqual([
      ["created", "pending_payment", "order_created", "system"],
      ["pending_payment", "paid", "payment_settled", "midtrans_webhook"],
      ["paid", "fulfillment_pending", "queued_for_provider", "fulfillment_worker"]
    ]);
  });
});
