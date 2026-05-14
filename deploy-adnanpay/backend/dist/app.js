"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const order_repository_1 = require("./modules/order/order.repository");
const order_router_1 = require("./modules/order/order.router");
const order_service_1 = require("./modules/order/order.service");
const payment_repository_1 = require("./modules/payment/payment.repository");
const fulfillment_repository_1 = require("./modules/fulfillment/fulfillment.repository");
const fulfillment_router_1 = require("./modules/fulfillment/fulfillment.router");
const fulfillment_service_1 = require("./modules/fulfillment/fulfillment.service");
const payment_router_1 = require("./modules/payment/payment.router");
const payment_service_1 = require("./modules/payment/payment.service");
const invoice_status_router_1 = require("./modules/invoice-status/invoice-status.router");
const invoice_status_service_1 = require("./modules/invoice-status/invoice-status.service");
const health_1 = require("./routes/health");
const audit_1 = require("./security/audit");
const rate_limit_1 = require("./security/rate-limit");
function createApp(dependencies = {}) {
    const app = (0, express_1.default)();
    const auditLogger = dependencies.auditLogger ?? audit_1.noopAuditLogger;
    const orderRepository = dependencies.supabaseConfig === undefined
        ? new order_repository_1.InMemoryOrderRepository()
        : new order_repository_1.SupabaseOrderRepository({
            supabaseUrl: dependencies.supabaseConfig.supabaseUrl,
            supabaseServiceRoleKey: dependencies.supabaseConfig.supabaseServiceRoleKey
        });
    const paymentRepository = dependencies.supabaseConfig === undefined
        ? new payment_repository_1.InMemoryPaymentRepository(orderRepository)
        : new payment_repository_1.SupabasePaymentRepository({
            supabaseUrl: dependencies.supabaseConfig.supabaseUrl,
            supabaseServiceRoleKey: dependencies.supabaseConfig.supabaseServiceRoleKey
        });
    const fulfillmentRepository = dependencies.supabaseConfig === undefined
        ? new fulfillment_repository_1.InMemoryFulfillmentRepository(orderRepository)
        : new fulfillment_repository_1.SupabaseFulfillmentRepository({
            supabaseUrl: dependencies.supabaseConfig.supabaseUrl,
            supabaseServiceRoleKey: dependencies.supabaseConfig.supabaseServiceRoleKey
        });
    const orderService = dependencies.orderService ??
        (0, order_service_1.createOrderService)({
            repository: orderRepository
        });
    const paymentService = dependencies.paymentService ??
        (0, payment_service_1.createPaymentService)({
            paymentRepository,
            orderService,
            midtransConfig: {
                serverKey: dependencies.midtransConfig?.serverKey ?? "test-midtrans-server-key",
                apiBaseUrl: dependencies.midtransConfig?.apiBaseUrl ?? "https://app.sandbox.midtrans.com"
            }
        });
    const fulfillmentService = dependencies.fulfillmentService ??
        (0, fulfillment_service_1.createFulfillmentService)({
            fulfillmentRepository,
            orderService,
            digiflazzConfig: {
                username: dependencies.digiflazzConfig?.username ?? null,
                apiKey: dependencies.digiflazzConfig?.apiKey ?? null,
                apiBaseUrl: dependencies.digiflazzConfig?.apiBaseUrl ?? "https://api.digiflazz.com",
                nodeEnv: dependencies.digiflazzConfig?.nodeEnv ?? "test"
            }
        });
    const invoiceStatusService = dependencies.invoiceStatusService ??
        (0, invoice_status_service_1.createInvoiceStatusService)({
            orderRepository,
            paymentRepository,
            fulfillmentRepository
        });
    app.disable("x-powered-by");
    app.use(express_1.default.json());
    const sensitiveEndpointRateLimit = (0, rate_limit_1.createRateLimitMiddleware)({
        windowMs: dependencies.rateLimit?.windowMs ?? 60_000,
        maxRequests: dependencies.rateLimit?.maxRequests ?? 60,
        auditLogger
    });
    app.use("/api/orders", (0, order_router_1.createOrdersRouter)({ orderService }));
    app.use("/api/payments", sensitiveEndpointRateLimit, (0, payment_router_1.createPaymentRouter)({ paymentService, auditLogger }));
    app.use("/api/fulfillments", sensitiveEndpointRateLimit, (0, fulfillment_router_1.createFulfillmentRouter)({ fulfillmentService, auditLogger }));
    app.use("/api/invoices", (0, invoice_status_router_1.createInvoiceStatusRouter)({ invoiceStatusService }));
    app.use("/health", health_1.healthRouter);
    return app;
}
