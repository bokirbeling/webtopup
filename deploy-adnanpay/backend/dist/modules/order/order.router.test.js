"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../../app");
const order_repository_1 = require("./order.repository");
const order_service_1 = require("./order.service");
(0, globals_1.describe)("POST /api/orders", () => {
    (0, globals_1.it)("returns order_id, invoice_code, and pending_payment for valid payload", async () => {
        const repository = new order_repository_1.InMemoryOrderRepository();
        const service = (0, order_service_1.createOrderService)({
            repository,
            idGenerator: () => "order-1001",
            invoiceCodeGenerator: () => "INV-20260422-1001",
            clock: () => new Date("2026-04-22T08:00:00.000Z")
        });
        const app = (0, app_1.createApp)({
            orderService: service
        });
        const response = await (0, supertest_1.default)(app).post("/api/orders").send({
            customer_ref: "12345678:1234",
            product_code: "ml-diamond-86",
            provider: "digiflazz",
            amount_minor: 20000,
            currency: "idr",
            metadata: {
                source: "web_checkout"
            },
            status: "paid"
        });
        (0, globals_1.expect)(response.status).toBe(400);
        (0, globals_1.expect)(response.body).toEqual({
            error: {
                code: "VALIDATION_ERROR",
                message: "Invalid order payload.",
                details: [
                    {
                        field: "status",
                        message: "status is server-controlled and cannot be provided."
                    }
                ]
            }
        });
        const successResponse = await (0, supertest_1.default)(app).post("/api/orders").send({
            customer_ref: "12345678:1234",
            product_code: "ml-diamond-86",
            provider: "digiflazz",
            amount_minor: 20000,
            currency: "idr",
            metadata: {
                source: "web_checkout"
            }
        });
        (0, globals_1.expect)(successResponse.status).toBe(201);
        (0, globals_1.expect)(successResponse.body).toEqual({
            order_id: "order-1001",
            invoice_code: "INV-20260422-1001",
            status: "pending_payment"
        });
        const history = repository.getStatusHistoryByOrderId("order-1001");
        (0, globals_1.expect)(history).toHaveLength(1);
        (0, globals_1.expect)(history[0]).toMatchObject({
            orderId: "order-1001",
            fromStatus: "created",
            toStatus: "pending_payment"
        });
    });
    (0, globals_1.it)("returns stable validation error for invalid payload", async () => {
        const app = (0, app_1.createApp)();
        const response = await (0, supertest_1.default)(app).post("/api/orders").send({
            amount_minor: 0,
            metadata: "invalid"
        });
        (0, globals_1.expect)(response.status).toBe(400);
        (0, globals_1.expect)(response.body).toEqual({
            error: {
                code: "VALIDATION_ERROR",
                message: "Invalid order payload.",
                details: [
                    {
                        field: "product_code",
                        message: "product_code is required and must be a non-empty string."
                    },
                    {
                        field: "provider",
                        message: "provider is required and must be a non-empty string."
                    },
                    {
                        field: "amount_minor",
                        message: "amount_minor is required and must be a positive integer."
                    },
                    {
                        field: "metadata",
                        message: "metadata must be an object when provided."
                    }
                ]
            }
        });
    });
});
