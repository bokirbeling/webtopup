"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fulfillment_repository_1 = require("../fulfillment/fulfillment.repository");
const order_repository_1 = require("../order/order.repository");
const order_service_1 = require("../order/order.service");
const payment_repository_1 = require("../payment/payment.repository");
const reconcile_service_1 = require("./reconcile.service");
function createFixture() {
    const orderRepository = new order_repository_1.InMemoryOrderRepository();
    const orderService = (0, order_service_1.createOrderService)({
        repository: orderRepository,
        idGenerator: () => "22222222-2222-4222-8222-222222222222",
        invoiceCodeGenerator: () => "INV-RECON-0001",
        clock: () => new Date("2026-04-22T15:00:00.000Z")
    });
    const paymentRepository = new payment_repository_1.InMemoryPaymentRepository(orderRepository);
    const fulfillmentRepository = new fulfillment_repository_1.InMemoryFulfillmentRepository(orderRepository);
    const reconcileService = (0, reconcile_service_1.createReconcileService)({
        orderRepository,
        paymentRepository,
        fulfillmentRepository,
        orderService,
        clock: () => new Date("2026-04-22T15:05:00.000Z")
    });
    return { orderRepository, orderService, paymentRepository, fulfillmentRepository, reconcileService };
}
async function createPendingOrder(fixture) {
    return fixture.orderService.createGuestOrder({
        customerRef: "081234567890",
        productCode: "pln-20",
        provider: "digiflazz",
        amountMinor: 20000,
        currency: "IDR",
        metadata: { channel: "test" }
    });
}
(0, globals_1.describe)("reconcile service", () => {
    (0, globals_1.it)("converges paid payment with pending order through the transition service", async () => {
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
        (0, globals_1.expect)(results).toEqual([
            globals_1.expect.objectContaining({
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
        (0, globals_1.expect)(persistedOrder?.status).toBe("paid");
        (0, globals_1.expect)(fixture.orderRepository.getStatusHistoryByOrderId(order.orderId)).toEqual(globals_1.expect.arrayContaining([
            globals_1.expect.objectContaining({
                fromStatus: "pending_payment",
                toStatus: "paid",
                createdBy: "reconciliation_job",
                note: "payment_paid_order_not_paid"
            })
        ]));
    });
    (0, globals_1.it)("walks successful fulfillment through allowed intermediate order states", async () => {
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
        (0, globals_1.expect)(results).toEqual([
            globals_1.expect.objectContaining({
                issue: "fulfillment_success_order_not_started",
                action: "transitioned",
                beforeStatus: "paid",
                targetStatus: "fulfillment_pending",
                afterStatus: "fulfillment_pending"
            }),
            globals_1.expect.objectContaining({
                issue: "fulfillment_success_order_not_success",
                action: "transitioned",
                beforeStatus: "fulfillment_pending",
                targetStatus: "success",
                afterStatus: "success"
            })
        ]);
        const persistedOrder = await fixture.orderRepository.findOrderById(order.orderId);
        (0, globals_1.expect)(persistedOrder?.status).toBe("success");
    });
    (0, globals_1.it)("denies illegal terminal regression and leaves order state unchanged", async () => {
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
        (0, globals_1.expect)(results).toEqual([
            globals_1.expect.objectContaining({
                issue: "payment_terminal_order_not_terminal",
                action: "denied",
                beforeStatus: "success",
                targetStatus: "failed",
                afterStatus: "success",
                reason: globals_1.expect.stringContaining("Correction denied:")
            })
        ]);
        const persistedOrder = await fixture.orderRepository.findOrderById(order.orderId);
        (0, globals_1.expect)(persistedOrder?.status).toBe("success");
    });
});
