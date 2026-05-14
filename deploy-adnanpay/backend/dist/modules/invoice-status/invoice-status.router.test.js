"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../app");
const fulfillment_repository_1 = require("../fulfillment/fulfillment.repository");
const order_repository_1 = require("../order/order.repository");
const order_service_1 = require("../order/order.service");
const payment_repository_1 = require("../payment/payment.repository");
const invoice_status_service_1 = require("./invoice-status.service");
function createStatusFixture() {
    const orderRepository = new order_repository_1.InMemoryOrderRepository();
    const paymentRepository = new payment_repository_1.InMemoryPaymentRepository(orderRepository);
    const fulfillmentRepository = new fulfillment_repository_1.InMemoryFulfillmentRepository(orderRepository);
    const orderService = (0, order_service_1.createOrderService)({
        repository: orderRepository,
        idGenerator: () => "order-status-1001",
        invoiceCodeGenerator: () => "INV-TEST-0001",
        clock: () => new Date("2026-04-22T08:00:00.000Z")
    });
    const invoiceStatusService = (0, invoice_status_service_1.createInvoiceStatusService)({
        orderRepository,
        paymentRepository,
        fulfillmentRepository
    });
    return {
        orderService,
        paymentRepository,
        fulfillmentRepository,
        app: (0, app_1.createApp)({
            orderService,
            invoiceStatusService
        })
    };
}
(0, globals_1.describe)("GET /api/invoices/:invoiceCode/status", () => {
    (0, globals_1.it)("returns a single guest-safe invoice status with timeline and summaries", async () => {
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
        const response = await (0, supertest_1.default)(fixture.app).get("/api/invoices/INV-TEST-0001/status");
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body).toMatchObject({
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
        (0, globals_1.expect)(response.body.timeline.map((entry) => entry.toStatus)).toEqual([
            "pending_payment",
            "paid",
            "fulfillment_pending",
            "success"
        ]);
        (0, globals_1.expect)(response.body.customer_ref).toBeUndefined();
    });
    (0, globals_1.it)("returns a safe not-found response for an invalid invoice", async () => {
        const response = await (0, supertest_1.default)((0, app_1.createApp)()).get("/api/invoices/INV-NOT-FOUND/status");
        (0, globals_1.expect)(response.status).toBe(404);
        (0, globals_1.expect)(response.body).toEqual({
            error: {
                code: "INVOICE_NOT_FOUND",
                message: "Invoice tidak ditemukan"
            }
        });
    });
    (0, globals_1.it)("does not expose unrestricted invoice or order listing", async () => {
        const app = (0, app_1.createApp)();
        const invoiceListResponse = await (0, supertest_1.default)(app).get("/api/invoices");
        const orderListResponse = await (0, supertest_1.default)(app).get("/api/orders");
        (0, globals_1.expect)(invoiceListResponse.status).toBe(404);
        (0, globals_1.expect)(orderListResponse.status).toBe(404);
    });
});
