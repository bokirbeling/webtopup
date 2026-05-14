"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFulfillmentRouter = createFulfillmentRouter;
const express_1 = require("express");
const fulfillment_service_1 = require("./fulfillment.service");
const audit_1 = require("../../security/audit");
function extractOrderId(payload) {
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
        return null;
    }
    const orderId = payload.order_id;
    return typeof orderId === "string" && orderId.trim() !== "" ? orderId.trim() : null;
}
function createFulfillmentRouter(dependencies) {
    const fulfillmentRouter = (0, express_1.Router)();
    const auditLogger = dependencies.auditLogger ?? audit_1.noopAuditLogger;
    fulfillmentRouter.post("/digiflazz/trigger", async (request, response) => {
        const orderId = extractOrderId(request.body);
        if (orderId === null) {
            response.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "order_id is required and must be a non-empty string."
                }
            });
            return;
        }
        try {
            const result = await dependencies.fulfillmentService.triggerPaidOrderFulfillment({ orderId });
            response.status(201).json({
                fulfillment_id: result.fulfillmentId,
                order_id: result.orderId,
                status: result.status,
                provider_reference: result.providerReference,
                provider_mode: result.providerMode
            });
        }
        catch (error) {
            if (error instanceof fulfillment_service_1.FulfillmentValidationError) {
                auditLogger.record({
                    type: "fulfillment_security_rejection",
                    provider: "digiflazz",
                    route: request.path,
                    method: request.method,
                    statusCode: 400,
                    reason: error.message,
                    orderId,
                    occurredAt: new Date().toISOString()
                });
                response.status(400).json({
                    error: {
                        code: "FULFILLMENT_VALIDATION_ERROR",
                        message: error.message
                    }
                });
                return;
            }
            response.status(500).json({
                error: {
                    code: "FULFILLMENT_FAILED",
                    message: "Failed to trigger Digiflazz fulfillment."
                }
            });
        }
    });
    fulfillmentRouter.post("/digiflazz/callback", async (request, response) => {
        try {
            const result = await dependencies.fulfillmentService.handleDigiflazzCallback(request.body);
            response.status(200).json({ code: result.code, message: result.message });
        }
        catch (error) {
            if (error instanceof fulfillment_service_1.FulfillmentValidationError) {
                response.status(400).json({
                    error: {
                        code: "CALLBACK_VALIDATION_ERROR",
                        message: error.message
                    }
                });
                return;
            }
            response.status(500).json({
                error: {
                    code: "CALLBACK_PROCESSING_FAILED",
                    message: "Failed to process Digiflazz callback."
                }
            });
        }
    });
    return fulfillmentRouter;
}
