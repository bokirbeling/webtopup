"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const order_repository_1 = require("./order.repository");
const order_service_1 = require("./order.service");
(0, globals_1.describe)("order transition engine", () => {
    (0, globals_1.it)("rejects backward transitions", async () => {
        const repository = new order_repository_1.InMemoryOrderRepository();
        const service = (0, order_service_1.createOrderService)({
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
        await (0, globals_1.expect)(service.transitionOrderStatus({
            orderId: createdOrder.orderId,
            toStatus: "pending_payment",
            note: "should_fail"
        })).rejects.toBeInstanceOf(order_service_1.OrderTransitionError);
    });
    (0, globals_1.it)("persists status history for create and valid transitions", async () => {
        const repository = new order_repository_1.InMemoryOrderRepository();
        const service = (0, order_service_1.createOrderService)({
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
        (0, globals_1.expect)(history).toHaveLength(3);
        (0, globals_1.expect)(history.map((entry) => [entry.fromStatus, entry.toStatus, entry.note, entry.createdBy])).toEqual([
            ["created", "pending_payment", "order_created", "system"],
            ["pending_payment", "paid", "payment_settled", "midtrans_webhook"],
            ["paid", "fulfillment_pending", "queued_for_provider", "fulfillment_worker"]
        ]);
    });
});
