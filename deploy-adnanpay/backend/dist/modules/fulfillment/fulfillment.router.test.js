"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../app");
const audit_1 = require("../../security/audit");
const order_repository_1 = require("../order/order.repository");
const order_service_1 = require("../order/order.service");
const fulfillment_repository_1 = require("./fulfillment.repository");
const fulfillment_service_1 = require("./fulfillment.service");
function createTestServices(options = {}) {
    const orderRepository = new order_repository_1.InMemoryOrderRepository();
    const orderService = (0, order_service_1.createOrderService)({
        repository: orderRepository,
        idGenerator: () => "11111111-1111-4111-8111-111111111111",
        invoiceCodeGenerator: () => "INV-20260422-9001",
        clock: () => new Date("2026-04-22T12:00:00.000Z")
    });
    const fulfillmentRepository = new fulfillment_repository_1.InMemoryFulfillmentRepository(orderRepository);
    const fulfillmentService = (0, fulfillment_service_1.createFulfillmentService)({
        fulfillmentRepository,
        orderService,
        digiflazzConfig: {
            username: options.live ? "digiflazz-user" : null,
            apiKey: options.live ? "digiflazz-key" : null,
            apiBaseUrl: "https://api.digiflazz.test",
            nodeEnv: options.production ? "production" : "test"
        },
        fetchImpl: async () => new Response(JSON.stringify({
            data: {
                ref_id: "11111111-1111-4111-8111-111111111111",
                trx_id: "DFZ-TRX-9001",
                status: "Pending",
                message: "Transaksi pending"
            }
        }), { status: 200, headers: { "Content-Type": "application/json" } }),
        clock: () => new Date("2026-04-22T12:00:00.000Z")
    });
    return { orderRepository, orderService, fulfillmentRepository, fulfillmentService };
}
async function createPaidDigiflazzOrder(services) {
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
(0, globals_1.describe)("digiflazz fulfillment routes", () => {
    (0, globals_1.it)("triggers fulfillment only after order is paid", async () => {
        const services = createTestServices({ live: true });
        const app = (0, app_1.createApp)({ orderService: services.orderService, fulfillmentService: services.fulfillmentService });
        const order = await createPaidDigiflazzOrder(services);
        const response = await (0, supertest_1.default)(app).post("/api/fulfillments/digiflazz/trigger").send({ order_id: order.orderId });
        (0, globals_1.expect)(response.status).toBe(201);
        (0, globals_1.expect)(response.body).toEqual({
            fulfillment_id: globals_1.expect.any(String),
            order_id: order.orderId,
            status: "processing",
            provider_reference: order.orderId,
            provider_mode: "live"
        });
        const persistedOrder = await services.orderRepository.findOrderById(order.orderId);
        (0, globals_1.expect)(persistedOrder?.status).toBe("fulfillment_pending");
    });
    (0, globals_1.it)("processes Digiflazz success callback and records provider reference", async () => {
        const services = createTestServices({ live: true });
        const app = (0, app_1.createApp)({ orderService: services.orderService, fulfillmentService: services.fulfillmentService });
        const order = await createPaidDigiflazzOrder(services);
        const triggerResponse = await (0, supertest_1.default)(app).post("/api/fulfillments/digiflazz/trigger").send({ order_id: order.orderId });
        (0, globals_1.expect)(triggerResponse.status).toBe(201);
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
        const response = await (0, supertest_1.default)(app).post("/api/fulfillments/digiflazz/callback").send(payload);
        const replay = await (0, supertest_1.default)(app).post("/api/fulfillments/digiflazz/callback").send(payload);
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body).toEqual({ code: "PROCESSED", message: "Digiflazz callback processed." });
        (0, globals_1.expect)(replay.status).toBe(200);
        (0, globals_1.expect)(replay.body).toEqual({ code: "DUPLICATE", message: "Duplicate Digiflazz callback ignored." });
        const fulfillment = await services.fulfillmentRepository.findFulfillmentByProviderAndReference("digiflazz", order.orderId);
        (0, globals_1.expect)(fulfillment).toMatchObject({
            providerReference: order.orderId,
            providerFulfillmentId: "DFZ-TRX-9001",
            serialNumber: "SN1234567890",
            status: "success"
        });
        const persistedOrder = await services.orderRepository.findOrderById(order.orderId);
        (0, globals_1.expect)(persistedOrder?.status).toBe("success");
    });
    (0, globals_1.it)("uses controlled mock fallback outside production when credentials are missing", async () => {
        const services = createTestServices();
        const app = (0, app_1.createApp)({ orderService: services.orderService, fulfillmentService: services.fulfillmentService });
        const order = await createPaidDigiflazzOrder(services);
        const response = await (0, supertest_1.default)(app).post("/api/fulfillments/digiflazz/trigger").send({ order_id: order.orderId });
        (0, globals_1.expect)(response.status).toBe(201);
        (0, globals_1.expect)(response.body).toMatchObject({ provider_mode: "mock", status: "success" });
        const fulfillment = await services.fulfillmentRepository.findFulfillmentByProviderAndReference("digiflazz", order.orderId);
        (0, globals_1.expect)(fulfillment?.responsePayload.provider_mode).toBe("mock");
        const persistedOrder = await services.orderRepository.findOrderById(order.orderId);
        (0, globals_1.expect)(persistedOrder?.status).toBe("success");
    });
    (0, globals_1.it)("does not silently use mock fallback in production", async () => {
        const services = createTestServices({ production: true });
        const auditLogger = new audit_1.InMemoryAuditLogger();
        const app = (0, app_1.createApp)({
            orderService: services.orderService,
            fulfillmentService: services.fulfillmentService,
            auditLogger
        });
        const order = await createPaidDigiflazzOrder(services);
        const response = await (0, supertest_1.default)(app).post("/api/fulfillments/digiflazz/trigger").send({ order_id: order.orderId });
        (0, globals_1.expect)(response.status).toBe(400);
        (0, globals_1.expect)(response.body).toEqual({
            error: {
                code: "FULFILLMENT_VALIDATION_ERROR",
                message: "Digiflazz credentials are required in production."
            }
        });
        (0, globals_1.expect)(await services.fulfillmentRepository.findFulfillmentByProviderAndReference("digiflazz", order.orderId)).toBeNull();
        (0, globals_1.expect)(auditLogger.getEvents()).toEqual([
            globals_1.expect.objectContaining({
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
