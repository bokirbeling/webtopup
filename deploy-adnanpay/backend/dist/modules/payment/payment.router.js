"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentRouter = createPaymentRouter;
const express_1 = require("express");
const payment_service_1 = require("./payment.service");
const audit_1 = require("../../security/audit");
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validateInitializePayload(payload) {
    if (!isPlainObject(payload)) {
        return {
            ok: false,
            issues: ["Request body must be a JSON object."]
        };
    }
    const issues = [];
    const orderIdRaw = payload.order_id;
    const idempotencyKeyRaw = payload.idempotency_key;
    if (typeof orderIdRaw !== "string" || orderIdRaw.trim() === "") {
        issues.push("order_id is required and must be a non-empty string.");
    }
    if (typeof idempotencyKeyRaw !== "string" || idempotencyKeyRaw.trim() === "") {
        issues.push("idempotency_key is required and must be a non-empty string.");
    }
    if (issues.length > 0) {
        return {
            ok: false,
            issues
        };
    }
    return {
        ok: true,
        orderId: orderIdRaw.trim(),
        idempotencyKey: idempotencyKeyRaw.trim()
    };
}
function createPaymentRouter(dependencies) {
    const paymentRouter = (0, express_1.Router)();
    const auditLogger = dependencies.auditLogger ?? audit_1.noopAuditLogger;
    paymentRouter.post("/midtrans/initialize", async (request, response) => {
        const validation = validateInitializePayload(request.body);
        if (!validation.ok) {
            response.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid payment initialization payload.",
                    details: validation.issues
                }
            });
            return;
        }
        try {
            const result = await dependencies.paymentService.initializeMidtransPayment({
                orderId: validation.orderId,
                idempotencyKey: validation.idempotencyKey
            });
            response.status(201).json({
                payment_id: result.paymentId,
                order_id: result.orderId,
                status: result.status,
                token: result.token,
                redirect_url: result.redirectUrl
            });
        }
        catch (error) {
            if (error instanceof payment_service_1.PaymentValidationError) {
                response.status(400).json({
                    error: {
                        code: "PAYMENT_INITIALIZATION_FAILED",
                        message: error.message
                    }
                });
                return;
            }
            response.status(500).json({
                error: {
                    code: "PAYMENT_INITIALIZATION_FAILED",
                    message: "Failed to initialize Midtrans payment."
                }
            });
        }
    });
    paymentRouter.post("/midtrans/webhook", async (request, response) => {
        try {
            const result = await dependencies.paymentService.handleMidtransWebhook(request.body);
            response.status(200).json({
                code: result.code,
                message: result.message,
                ...(result.code === "DUPLICATE" ? { idempotent: true } : {})
            });
        }
        catch (error) {
            if (error instanceof payment_service_1.PaymentSignatureError) {
                auditLogger.record({
                    type: "webhook_signature_invalid",
                    provider: "midtrans",
                    route: request.path,
                    method: request.method,
                    statusCode: 401,
                    reason: error.message,
                    orderId: typeof request.body?.order_id === "string" ? request.body.order_id : null,
                    occurredAt: new Date().toISOString()
                });
                response.status(401).json({
                    error: {
                        code: "INVALID_SIGNATURE",
                        message: error.message
                    }
                });
                return;
            }
            if (error instanceof payment_service_1.PaymentValidationError) {
                response.status(400).json({
                    error: {
                        code: "WEBHOOK_VALIDATION_ERROR",
                        message: error.message
                    }
                });
                return;
            }
            response.status(500).json({
                error: {
                    code: "WEBHOOK_PROCESSING_FAILED",
                    message: "Failed to process Midtrans webhook."
                }
            });
        }
    });
    return paymentRouter;
}
