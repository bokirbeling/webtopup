"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../app");
const fulfillment_repository_1 = require("../fulfillment/fulfillment.repository");
const fulfillment_service_1 = require("../fulfillment/fulfillment.service");
const invoice_status_service_1 = require("../invoice-status/invoice-status.service");
const order_repository_1 = require("../order/order.repository");
const order_service_1 = require("../order/order.service");
const payment_repository_1 = require("../payment/payment.repository");
const payment_signature_1 = require("../payment/payment.signature");
const payment_service_1 = require("../payment/payment.service");
const reconcile_service_1 = require("../reconcile/reconcile.service");
const audit_1 = require("../../security/audit");
function createLifecycleFixture() {
    const orderRepository = new order_repository_1.InMemoryOrderRepository();
    const paymentRepository = new payment_repository_1.InMemoryPaymentRepository(orderRepository);
    const fulfillmentRepository = new fulfillment_repository_1.InMemoryFulfillmentRepository(orderRepository);
    const auditLogger = new audit_1.InMemoryAuditLogger();
    const orderService = (0, order_service_1.createOrderService)({
        repository: orderRepository,
        idGenerator: () => "ORD-TEST-001",
        invoiceCodeGenerator: () => "INV-TEST-0001",
        clock: () => new Date("2026-04-22T09:00:00.000Z")
    });
    const paymentService = (0, payment_service_1.createPaymentService)({
        paymentRepository,
        orderService,
        midtransConfig: {
            serverKey: "test-server-key",
            apiBaseUrl: "https://midtrans.local.test"
        },
        fetchImpl: async () => new Response(JSON.stringify({
            token: "snap-token-regression",
            redirect_url: "https://midtrans.local.test/snap-token-regression"
        }), { status: 201, headers: { "Content-Type": "application/json" } }),
        clock: () => new Date("2026-04-22T09:01:00.000Z")
    });
    const fulfillmentService = (0, fulfillment_service_1.createFulfillmentService)({
        fulfillmentRepository,
        orderService,
        digiflazzConfig: {
            username: "digiflazz-user",
            apiKey: "digiflazz-key",
            apiBaseUrl: "https://digiflazz.local.test",
            nodeEnv: "test"
        },
        fetchImpl: async () => new Response(JSON.stringify({
            data: {
                ref_id: "ORD-TEST-001",
                trx_id: "DGF-TEST-001",
                status: "Pending",
                message: "Queued locally"
            }
        }), { status: 200, headers: { "Content-Type": "application/json" } }),
        clock: () => new Date("2026-04-22T09:02:00.000Z")
    });
    const invoiceStatusService = (0, invoice_status_service_1.createInvoiceStatusService)({
        orderRepository,
        paymentRepository,
        fulfillmentRepository
    });
    const reconcileService = (0, reconcile_service_1.createReconcileService)({
        orderRepository,
        paymentRepository,
        fulfillmentRepository,
        orderService,
        clock: () => new Date("2026-04-22T09:04:00.000Z")
    });
    const app = (0, app_1.createApp)({
        orderService,
        paymentService,
        fulfillmentService,
        invoiceStatusService,
        auditLogger,
        rateLimit: { windowMs: 60_000, maxRequests: 100 }
    });
    return {
        app,
        auditLogger,
        orderRepository,
        paymentRepository,
        fulfillmentRepository,
        orderService,
        reconcileService
    };
}
function signedMidtransPayload(orderId, transactionId = "TX-TEST-001") {
    return {
        order_id: orderId,
        status_code: "200",
        gross_amount: "20000.00",
        transaction_status: "settlement",
        transaction_id: transactionId,
        signature_key: (0, payment_signature_1.computeMidtransSignatureKey)({
            orderId,
            statusCode: "200",
            grossAmount: "20000.00",
            serverKey: "test-server-key"
        })
    };
}
(0, globals_1.describe)("full lifecycle regression suite", () => {
    (0, globals_1.it)("runs local guest order through payment, fulfillment callback, and invoice status", async () => {
        const fixture = createLifecycleFixture();
        const orderResponse = await (0, supertest_1.default)(fixture.app).post("/api/orders").send({
            customer_ref: "12345678:1234",
            product_code: "mobile-legends-86-diamond",
            provider: "digiflazz",
            amount_minor: 20000,
            currency: "IDR",
            metadata: { source: "task_14_regression" }
        });
        (0, globals_1.expect)(orderResponse.status).toBe(201);
        (0, globals_1.expect)(orderResponse.body).toEqual({
            order_id: "ORD-TEST-001",
            invoice_code: "INV-TEST-0001",
            status: "pending_payment"
        });
        const paymentInitResponse = await (0, supertest_1.default)(fixture.app).post("/api/payments/midtrans/initialize").send({
            order_id: "ORD-TEST-001",
            idempotency_key: "task-14-init"
        });
        (0, globals_1.expect)(paymentInitResponse.status).toBe(201);
        const midtransResponse = await (0, supertest_1.default)(fixture.app)
            .post("/api/payments/midtrans/webhook")
            .send(signedMidtransPayload("ORD-TEST-001"));
        (0, globals_1.expect)(midtransResponse.status).toBe(200);
        (0, globals_1.expect)(midtransResponse.body).toMatchObject({ code: "PROCESSED" });
        const fulfillmentTriggerResponse = await (0, supertest_1.default)(fixture.app).post("/api/fulfillments/digiflazz/trigger").send({
            order_id: "ORD-TEST-001"
        });
        (0, globals_1.expect)(fulfillmentTriggerResponse.status).toBe(201);
        (0, globals_1.expect)(fulfillmentTriggerResponse.body).toMatchObject({
            order_id: "ORD-TEST-001",
            status: "processing",
            provider_reference: "ORD-TEST-001",
            provider_mode: "live"
        });
        const callbackResponse = await (0, supertest_1.default)(fixture.app).post("/api/fulfillments/digiflazz/callback").send({
            data: {
                ref_id: "ORD-TEST-001",
                trx_id: "DGF-TEST-001",
                status: "Sukses",
                rc: "00",
                sn: "SN-TASK-14-001"
            }
        });
        (0, globals_1.expect)(callbackResponse.status).toBe(200);
        (0, globals_1.expect)(callbackResponse.body).toMatchObject({ code: "PROCESSED" });
        const invoiceResponse = await (0, supertest_1.default)(fixture.app).get("/api/invoices/INV-TEST-0001/status");
        (0, globals_1.expect)(invoiceResponse.status).toBe(200);
        (0, globals_1.expect)(invoiceResponse.body).toMatchObject({
            invoice_code: "INV-TEST-0001",
            order_id: "ORD-TEST-001",
            status: "success",
            payment: globals_1.expect.objectContaining({ status: "paid" }),
            fulfillment: globals_1.expect.objectContaining({ status: "success", serial_number: "SN-TASK-14-001" })
        });
    });
    (0, globals_1.it)("keeps Midtrans replay idempotent and rejects invalid signatures without mutation", async () => {
        const fixture = createLifecycleFixture();
        await fixture.orderService.createGuestOrder({
            customerRef: "12345678:1234",
            productCode: "mobile-legends-86-diamond",
            provider: "digiflazz",
            amountMinor: 20000,
            currency: "IDR",
            metadata: { source: "task_14_idempotency" }
        });
        const invalidResponse = await (0, supertest_1.default)(fixture.app).post("/api/payments/midtrans/webhook").send({
            ...signedMidtransPayload("ORD-TEST-001"),
            signature_key: "invalid-signature"
        });
        (0, globals_1.expect)(invalidResponse.status).toBe(401);
        (0, globals_1.expect)(await fixture.paymentRepository.findLatestPaymentByOrderId("ORD-TEST-001")).toBeNull();
        (0, globals_1.expect)((await fixture.orderRepository.findOrderById("ORD-TEST-001"))?.status).toBe("pending_payment");
        (0, globals_1.expect)(fixture.auditLogger.getEvents()).toEqual([
            globals_1.expect.objectContaining({ type: "webhook_signature_invalid", provider: "midtrans", orderId: "ORD-TEST-001" })
        ]);
        const payload = signedMidtransPayload("ORD-TEST-001");
        const firstResponse = await (0, supertest_1.default)(fixture.app).post("/api/payments/midtrans/webhook").send(payload);
        (0, globals_1.expect)(firstResponse.status).toBe(200);
        (0, globals_1.expect)(firstResponse.body).toMatchObject({ code: "PROCESSED" });
        const firstPayment = await fixture.paymentRepository.findLatestPaymentByOrderId("ORD-TEST-001");
        (0, globals_1.expect)(firstPayment).toMatchObject({ providerPaymentId: "TX-TEST-001", status: "paid" });
        const replayResponse = await (0, supertest_1.default)(fixture.app).post("/api/payments/midtrans/webhook").send(payload);
        (0, globals_1.expect)(replayResponse.status).toBe(200);
        (0, globals_1.expect)(replayResponse.body).toEqual({
            code: "DUPLICATE",
            message: "Duplicate Midtrans webhook ignored.",
            idempotent: true
        });
        const replayPayment = await fixture.paymentRepository.findLatestPaymentByOrderId("ORD-TEST-001");
        (0, globals_1.expect)(replayPayment?.id).toBe(firstPayment?.id);
    });
    (0, globals_1.it)("uses reconciliation for out-of-order success and denies illegal terminal regression", async () => {
        const fixture = createLifecycleFixture();
        const order = await fixture.orderService.createGuestOrder({
            customerRef: "12345678:1234",
            productCode: "mobile-legends-86-diamond",
            provider: "digiflazz",
            amountMinor: 20000,
            currency: "IDR",
            metadata: { source: "task_14_out_of_order" }
        });
        await fixture.orderService.transitionOrderStatus({
            orderId: order.orderId,
            toStatus: "paid",
            note: "paid_before_reconcile",
            createdBy: "test"
        });
        await fixture.fulfillmentRepository.createFulfillment({
            orderId: order.orderId,
            provider: "digiflazz",
            attemptNo: 1,
            providerFulfillmentId: "DGF-TEST-001",
            providerReference: order.orderId,
            status: "success",
            serialNumber: "SN-OUT-OF-ORDER",
            requestPayload: { source: "test" },
            responsePayload: { source: "test" },
            processedAt: new Date("2026-04-22T09:03:00.000Z"),
            createdAt: new Date("2026-04-22T09:03:00.000Z"),
            updatedAt: new Date("2026-04-22T09:03:00.000Z")
        });
        const successResults = await fixture.reconcileService.reconcileOrder({ orderId: order.orderId });
        (0, globals_1.expect)(successResults.map((result) => result.issue)).toEqual([
            "fulfillment_success_order_not_started",
            "fulfillment_success_order_not_success"
        ]);
        (0, globals_1.expect)((await fixture.orderRepository.findOrderById(order.orderId))?.status).toBe("success");
        await fixture.paymentRepository.createPayment({
            orderId: order.orderId,
            provider: "midtrans",
            idempotencyKey: "task-14-illegal-failed",
            providerPaymentId: "TX-FAILED-AFTER-SUCCESS",
            providerReference: order.orderId,
            amountMinor: 20000,
            currency: "IDR",
            status: "failed",
            paidAt: null,
            payload: { source: "test" },
            createdAt: new Date("2026-04-22T09:05:00.000Z"),
            updatedAt: new Date("2026-04-22T09:05:00.000Z")
        });
        const deniedResults = await fixture.reconcileService.reconcileOrder({ orderId: order.orderId });
        (0, globals_1.expect)(deniedResults).toEqual([
            globals_1.expect.objectContaining({
                issue: "payment_terminal_order_not_terminal",
                action: "denied",
                beforeStatus: "success",
                targetStatus: "failed",
                afterStatus: "success"
            })
        ]);
    });
});
