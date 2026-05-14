"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOrdersRouter = createOrdersRouter;
const express_1 = require("express");
const FORBIDDEN_SERVER_CONTROLLED_FIELDS = new Set([
    "id",
    "order_id",
    "order_number",
    "invoice_code",
    "status"
]);
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeOptionalString(value) {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return null;
    }
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
}
function validateCreateOrderPayload(payload) {
    if (!isPlainObject(payload)) {
        return {
            ok: false,
            issues: [
                {
                    field: "body",
                    message: "Request body must be a JSON object."
                }
            ]
        };
    }
    const issues = [];
    for (const field of FORBIDDEN_SERVER_CONTROLLED_FIELDS) {
        if (field in payload) {
            issues.push({
                field,
                message: `${field} is server-controlled and cannot be provided.`
            });
        }
    }
    const productCodeRaw = payload.product_code;
    const providerRaw = payload.provider;
    const amountMinorRaw = payload.amount_minor;
    const currencyRaw = payload.currency;
    const customerRefRaw = payload.customer_ref;
    const metadataRaw = payload.metadata;
    if (typeof productCodeRaw !== "string" || productCodeRaw.trim() === "") {
        issues.push({
            field: "product_code",
            message: "product_code is required and must be a non-empty string."
        });
    }
    if (typeof providerRaw !== "string" || providerRaw.trim() === "") {
        issues.push({
            field: "provider",
            message: "provider is required and must be a non-empty string."
        });
    }
    if (typeof amountMinorRaw !== "number" || !Number.isInteger(amountMinorRaw) || amountMinorRaw <= 0) {
        issues.push({
            field: "amount_minor",
            message: "amount_minor is required and must be a positive integer."
        });
    }
    let currency = "IDR";
    if (currencyRaw !== undefined) {
        if (typeof currencyRaw !== "string" || currencyRaw.trim() === "") {
            issues.push({
                field: "currency",
                message: "currency must be a non-empty string when provided."
            });
        }
        else {
            currency = currencyRaw.trim().toUpperCase();
        }
    }
    const normalizedCustomerRef = normalizeOptionalString(customerRefRaw);
    if (customerRefRaw !== undefined && normalizedCustomerRef === undefined) {
        issues.push({
            field: "customer_ref",
            message: "customer_ref must be a string or null when provided."
        });
    }
    let metadata = {};
    if (metadataRaw !== undefined) {
        if (!isPlainObject(metadataRaw)) {
            issues.push({
                field: "metadata",
                message: "metadata must be an object when provided."
            });
        }
        else {
            metadata = metadataRaw;
        }
    }
    if (issues.length > 0) {
        return {
            ok: false,
            issues
        };
    }
    const productCode = productCodeRaw;
    const provider = providerRaw;
    const amountMinor = amountMinorRaw;
    return {
        ok: true,
        data: {
            customerRef: normalizedCustomerRef ?? null,
            productCode: productCode.trim(),
            provider: provider.trim(),
            amountMinor,
            currency,
            metadata
        }
    };
}
function createOrdersRouter(dependencies) {
    const ordersRouter = (0, express_1.Router)();
    ordersRouter.post("/", async (request, response) => {
        const validation = validateCreateOrderPayload(request.body);
        if (!validation.ok) {
            response.status(400).json({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Invalid order payload.",
                    details: validation.issues
                }
            });
            return;
        }
        try {
            const createdOrder = await dependencies.orderService.createGuestOrder(validation.data);
            response.status(201).json({
                order_id: createdOrder.orderId,
                invoice_code: createdOrder.invoiceCode,
                status: createdOrder.status
            });
        }
        catch {
            response.status(500).json({
                error: {
                    code: "ORDER_CREATE_FAILED",
                    message: "Failed to create order."
                }
            });
        }
    });
    return ordersRouter;
}
