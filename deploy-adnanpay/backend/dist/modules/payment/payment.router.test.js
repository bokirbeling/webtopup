"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../app");
const order_repository_1 = require("../order/order.repository");
const order_service_1 = require("../order/order.service");
const audit_1 = require("../../security/audit");
const payment_signature_1 = require("./payment.signature");
const payment_repository_1 = require("./payment.repository");
const payment_service_1 = require("./payment.service");
function createTestServices() {
    const orderRepository = new order_repository_1.InMemoryOrderRepository();
    const orderService = (0, order_service_1.createOrderService)({
        repository: orderRepository,
        idGenerator: () => "order-2001",
        invoiceCodeGenerator: () => "INV-20260422-2001",
        clock: () => new Date("2026-04-22T10:00:00.000Z")
    });
    const paymentRepository = new payment_repository_1.InMemoryPaymentRepository(orderRepository);
    const paymentService = (0, payment_service_1.createPaymentService)({
        paymentRepository,
        orderService,
        midtransConfig: {
            serverKey: "test-server-key",
            apiBaseUrl: "https://app.sandbox.midtrans.com"
        },
        fetchImpl: async () => {
            return new Response(JSON.stringify({
                token: "snap-token-2001",
                redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-2001"
            }), {
                status: 201,
                headers: {
                    "Content-Type": "application/json"
                }
            });
        },
        clock: () => new Date("2026-04-22T10:00:00.000Z")
    });
    return {
        orderRepository,
        orderService,
        paymentRepository,
        paymentService
    };
}
(0, globals_1.describe)("midtrans payment routes", () => {
    (0, globals_1.it)("initializes midtrans payment for pending_payment order", async () => {
        const services = createTestServices();
        const app = (0, app_1.createApp)({
            orderService: services.orderService,
            paymentService: services.paymentService
        });
        const order = await services.orderService.createGuestOrder({
            customerRef: "cust-001",
            productCode: "ml-diamond-86",
            provider: "digiflazz",
            amountMinor: 20000,
            currency: "IDR",
            metadata: {
                channel: "web"
            }
        });
        const response = await (0, supertest_1.default)(app).post("/api/payments/midtrans/initialize").send({
            order_id: order.orderId,
            idempotency_key: "init-order-2001"
        });
        (0, globals_1.expect)(response.status).toBe(201);
        (0, globals_1.expect)(response.body).toEqual({
            payment_id: globals_1.expect.any(String),
            order_id: order.orderId,
            status: "pending",
            token: "snap-token-2001",
            redirect_url: "https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-2001"
        });
    });
    (0, globals_1.it)("processes webhook once and ignores replay by event key", async () => {
        const services = createTestServices();
        const app = (0, app_1.createApp)({
            orderService: services.orderService,
            paymentService: services.paymentService
        });
        const order = await services.orderService.createGuestOrder({
            customerRef: "cust-002",
            productCode: "ml-diamond-172",
            provider: "digiflazz",
            amountMinor: 40000,
            currency: "IDR",
            metadata: {
                channel: "web"
            }
        });
        const signature = (0, payment_signature_1.computeMidtransSignatureKey)({
            orderId: order.orderId,
            statusCode: "200",
            grossAmount: "40000.00",
            serverKey: "test-server-key"
        });
        const payload = {
            order_id: order.orderId,
            status_code: "200",
            gross_amount: "40000.00",
            transaction_status: "settlement",
            transaction_id: "trx-40000-settlement",
            signature_key: signature
        };
        const firstResponse = await (0, supertest_1.default)(app).post("/api/payments/midtrans/webhook").send(payload);
        (0, globals_1.expect)(firstResponse.status).toBe(200);
        (0, globals_1.expect)(firstResponse.body).toEqual({
            code: "PROCESSED",
            message: "Webhook processed and order transitioned."
        });
        const replayResponse = await (0, supertest_1.default)(app).post("/api/payments/midtrans/webhook").send(payload);
        (0, globals_1.expect)(replayResponse.status).toBe(200);
        (0, globals_1.expect)(replayResponse.body).toEqual({
            code: "DUPLICATE",
            message: "Duplicate Midtrans webhook ignored.",
            idempotent: true
        });
        const persistedOrder = await services.orderRepository.findOrderById(order.orderId);
        (0, globals_1.expect)(persistedOrder?.status).toBe("paid");
        const payment = await services.paymentRepository.findPaymentByProviderAndReference("midtrans", order.orderId);
        (0, globals_1.expect)(payment).toMatchObject({
            providerPaymentId: "trx-40000-settlement",
            status: "paid"
        });
        (0, globals_1.expect)(payment?.paidAt).toEqual(new Date("2026-04-22T10:00:00.000Z"));
        const event = services.paymentRepository.getWebhookEventByProviderAndEventKey("midtrans", [order.orderId, "200", "settlement", "-", "trx-40000-settlement"].join(":"));
        (0, globals_1.expect)(event).toMatchObject({
            orderId: order.orderId,
            processingState: "processed"
        });
        const history = services.orderRepository.getStatusHistoryByOrderId(order.orderId);
        (0, globals_1.expect)(history).toHaveLength(2);
        (0, globals_1.expect)(history[1]).toMatchObject({
            fromStatus: "pending_payment",
            toStatus: "paid",
            createdBy: "midtrans_webhook"
        });
    });
    (0, globals_1.it)("rejects webhook with invalid signature before any mutation", async () => {
        const services = createTestServices();
        const auditLogger = new audit_1.InMemoryAuditLogger();
        const app = (0, app_1.createApp)({
            orderService: services.orderService,
            paymentService: services.paymentService,
            auditLogger
        });
        const order = await services.orderService.createGuestOrder({
            customerRef: "cust-003",
            productCode: "ff-diamond-70",
            provider: "digiflazz",
            amountMinor: 10000,
            currency: "IDR",
            metadata: {
                channel: "web"
            }
        });
        const response = await (0, supertest_1.default)(app)
            .post("/api/payments/midtrans/webhook")
            .send({
            order_id: order.orderId,
            status_code: "200",
            gross_amount: "10000.00",
            transaction_status: "settlement",
            transaction_id: "trx-10000-settlement",
            signature_key: "invalid-signature"
        });
        (0, globals_1.expect)(response.status).toBe(401);
        (0, globals_1.expect)(response.body).toEqual({
            error: {
                code: "INVALID_SIGNATURE",
                message: "Invalid Midtrans webhook signature."
            }
        });
        const persistedOrder = await services.orderRepository.findOrderById(order.orderId);
        (0, globals_1.expect)(persistedOrder?.status).toBe("pending_payment");
        const history = services.orderRepository.getStatusHistoryByOrderId(order.orderId);
        (0, globals_1.expect)(history).toHaveLength(1);
        (0, globals_1.expect)(history[0]).toMatchObject({
            fromStatus: "created",
            toStatus: "pending_payment"
        });
        const event = services.paymentRepository.getWebhookEventByProviderAndEventKey("midtrans", [order.orderId, "200", "settlement", "-", "trx-10000-settlement"].join(":"));
        (0, globals_1.expect)(event).toBeNull();
        (0, globals_1.expect)(auditLogger.getEvents()).toEqual([
            globals_1.expect.objectContaining({
                type: "webhook_signature_invalid",
                provider: "midtrans",
                route: "/midtrans/webhook",
                method: "POST",
                statusCode: 401,
                orderId: order.orderId,
                reason: "Invalid Midtrans webhook signature."
            })
        ]);
    });
    (0, globals_1.it)("rate limits sensitive payment endpoints and records a sanitized audit event", async () => {
        const services = createTestServices();
        const auditLogger = new audit_1.InMemoryAuditLogger();
        const app = (0, app_1.createApp)({
            orderService: services.orderService,
            paymentService: services.paymentService,
            auditLogger,
            rateLimit: {
                windowMs: 60_000,
                maxRequests: 1
            }
        });
        const firstResponse = await (0, supertest_1.default)(app).post("/api/payments/midtrans/webhook").send({});
        const secondResponse = await (0, supertest_1.default)(app).post("/api/payments/midtrans/webhook").send({});
        (0, globals_1.expect)(firstResponse.status).toBe(400);
        (0, globals_1.expect)(secondResponse.status).toBe(429);
        (0, globals_1.expect)(secondResponse.body).toEqual({
            error: {
                code: "RATE_LIMITED",
                message: "Too many requests. Please retry later."
            }
        });
        (0, globals_1.expect)(auditLogger.getEvents()).toEqual(globals_1.expect.arrayContaining([
            globals_1.expect.objectContaining({
                type: "rate_limit_exceeded",
                route: "/midtrans/webhook",
                method: "POST",
                statusCode: 429
            })
        ]));
    });
});
