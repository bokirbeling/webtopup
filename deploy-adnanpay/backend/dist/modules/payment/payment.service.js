"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentSignatureError = exports.PaymentValidationError = void 0;
exports.createPaymentService = createPaymentService;
const node_buffer_1 = require("node:buffer");
const order_service_1 = require("../order/order.service");
const payment_signature_1 = require("./payment.signature");
class PaymentValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "PaymentValidationError";
    }
}
exports.PaymentValidationError = PaymentValidationError;
class PaymentSignatureError extends Error {
    constructor() {
        super("Invalid Midtrans webhook signature.");
        this.name = "PaymentSignatureError";
    }
}
exports.PaymentSignatureError = PaymentSignatureError;
function parseMidtransWebhookPayload(payload) {
    const orderId = typeof payload.order_id === "string" ? payload.order_id : "";
    const statusCode = typeof payload.status_code === "string" ? payload.status_code : "";
    const grossAmount = typeof payload.gross_amount === "string" ? payload.gross_amount : "";
    const signatureKey = typeof payload.signature_key === "string" ? payload.signature_key : "";
    const transactionStatus = typeof payload.transaction_status === "string" ? payload.transaction_status : "";
    const fraudStatus = typeof payload.fraud_status === "string" ? payload.fraud_status : null;
    const transactionId = typeof payload.transaction_id === "string" ? payload.transaction_id : null;
    if (orderId === "" || statusCode === "" || grossAmount === "" || signatureKey === "" || transactionStatus === "") {
        throw new PaymentValidationError("Invalid Midtrans webhook payload.");
    }
    return {
        orderId,
        statusCode,
        grossAmount,
        signatureKey,
        transactionStatus,
        fraudStatus,
        transactionId
    };
}
function mapMidtransTransactionToOrderStatus(transactionStatus, fraudStatus) {
    if (transactionStatus === "capture") {
        return fraudStatus === "challenge" ? null : "paid";
    }
    if (transactionStatus === "settlement") {
        return "paid";
    }
    if (transactionStatus === "expire") {
        return "expired";
    }
    if (transactionStatus === "deny" || transactionStatus === "cancel" || transactionStatus === "failure") {
        return "failed";
    }
    return null;
}
function mapMidtransTransactionToPaymentStatus(transactionStatus, fraudStatus) {
    if (transactionStatus === "capture") {
        return fraudStatus === "challenge" ? "pending" : "paid";
    }
    if (transactionStatus === "settlement") {
        return "paid";
    }
    if (transactionStatus === "expire") {
        return "expired";
    }
    if (transactionStatus === "deny" || transactionStatus === "cancel" || transactionStatus === "failure") {
        return "failed";
    }
    return "pending";
}
function parseGrossAmountToMinor(grossAmount) {
    const parsed = Number.parseFloat(grossAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new PaymentValidationError("Invalid Midtrans gross_amount payload.");
    }
    return Math.round(parsed);
}
async function readJson(response) {
    const bodyText = await response.text();
    if (bodyText.trim() === "") {
        return null;
    }
    try {
        return JSON.parse(bodyText);
    }
    catch {
        throw new Error("Midtrans API returned malformed JSON.");
    }
}
function extractMidtransError(payload) {
    if (typeof payload !== "object" || payload === null) {
        return "Midtrans request failed.";
    }
    const value = payload;
    if (typeof value.error_messages === "string") {
        return value.error_messages;
    }
    if (Array.isArray(value.error_messages) && typeof value.error_messages[0] === "string") {
        return value.error_messages[0];
    }
    if (typeof value.status_message === "string") {
        return value.status_message;
    }
    return "Midtrans request failed.";
}
function toRecord(value) {
    return { ...value };
}
function createPaymentService(options) {
    const fetchImpl = options.fetchImpl ?? fetch;
    const clock = options.clock ?? (() => new Date());
    const provider = "midtrans";
    return {
        async initializeMidtransPayment(input) {
            const order = await options.paymentRepository.findOrderById(input.orderId);
            if (!order) {
                throw new PaymentValidationError(`Order ${input.orderId} was not found.`);
            }
            if (order.status !== "pending_payment") {
                throw new PaymentValidationError(`Order ${input.orderId} is in ${order.status} state. Payment can only be initialized from pending_payment.`);
            }
            const authorization = node_buffer_1.Buffer.from(`${options.midtransConfig.serverKey}:`, "utf8").toString("base64");
            const midtransResponse = await fetchImpl(`${options.midtransConfig.apiBaseUrl}/snap/v1/transactions`, {
                method: "POST",
                headers: {
                    Authorization: `Basic ${authorization}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    transaction_details: {
                        order_id: order.id,
                        gross_amount: order.amountMinor
                    }
                })
            });
            const responsePayload = await readJson(midtransResponse);
            if (!midtransResponse.ok) {
                throw new Error(extractMidtransError(responsePayload));
            }
            const payload = typeof responsePayload === "object" && responsePayload !== null ? responsePayload : {};
            const responseObject = payload;
            const token = typeof responseObject.token === "string" ? responseObject.token : null;
            const redirectUrl = typeof responseObject.redirect_url === "string" ? responseObject.redirect_url : null;
            const now = clock();
            const payment = await options.paymentRepository.createPayment({
                orderId: order.id,
                provider,
                idempotencyKey: input.idempotencyKey,
                providerPaymentId: token,
                providerReference: order.id,
                amountMinor: order.amountMinor,
                currency: order.currency,
                status: "pending",
                paidAt: null,
                payload: responseObject,
                createdAt: now,
                updatedAt: now
            });
            return {
                paymentId: payment.id,
                orderId: payment.orderId,
                status: payment.status,
                token,
                redirectUrl
            };
        },
        async handleMidtransWebhook(payload) {
            const parsed = parseMidtransWebhookPayload(payload);
            const isValidSignature = (0, payment_signature_1.verifyMidtransSignature)({
                orderId: parsed.orderId,
                statusCode: parsed.statusCode,
                grossAmount: parsed.grossAmount,
                serverKey: options.midtransConfig.serverKey,
                signatureKey: parsed.signatureKey
            });
            if (!isValidSignature) {
                throw new PaymentSignatureError();
            }
            const eventKey = [
                parsed.orderId,
                parsed.statusCode,
                parsed.transactionStatus,
                parsed.fraudStatus ?? "-",
                parsed.transactionId ?? "-"
            ].join(":");
            const now = clock();
            const order = await options.paymentRepository.findOrderById(parsed.orderId);
            const existingPayment = await options.paymentRepository.findPaymentByProviderAndReference(provider, parsed.orderId);
            const registration = await options.paymentRepository.registerWebhookEvent({
                provider,
                eventKey,
                eventType: parsed.transactionStatus,
                orderId: order?.id ?? null,
                paymentId: existingPayment?.id ?? null,
                payload: toRecord(payload),
                receivedAt: now
            });
            if (registration.duplicate) {
                return {
                    code: "DUPLICATE",
                    message: "Duplicate Midtrans webhook ignored."
                };
            }
            if (!order) {
                await options.paymentRepository.updateWebhookEventState({
                    eventId: registration.event.id,
                    processingState: "failed",
                    processedAt: now,
                    errorMessage: `Order ${parsed.orderId} was not found.`
                });
                throw new PaymentValidationError(`Order ${parsed.orderId} was not found.`);
            }
            const targetOrderStatus = mapMidtransTransactionToOrderStatus(parsed.transactionStatus, parsed.fraudStatus);
            const paymentStatus = mapMidtransTransactionToPaymentStatus(parsed.transactionStatus, parsed.fraudStatus);
            let payment = existingPayment;
            if (!payment) {
                payment = await options.paymentRepository.createPayment({
                    orderId: parsed.orderId,
                    provider,
                    idempotencyKey: `midtrans-webhook:${parsed.transactionId ?? eventKey}`,
                    providerPaymentId: parsed.transactionId,
                    providerReference: parsed.orderId,
                    amountMinor: parseGrossAmountToMinor(parsed.grossAmount),
                    currency: "IDR",
                    status: paymentStatus,
                    paidAt: paymentStatus === "paid" ? now : null,
                    payload: toRecord(payload),
                    createdAt: now,
                    updatedAt: now
                });
            }
            else {
                payment = await options.paymentRepository.updatePaymentStatus({
                    paymentId: payment.id,
                    status: paymentStatus,
                    paidAt: paymentStatus === "paid" ? now : null,
                    payload: toRecord(payload),
                    updatedAt: now
                });
            }
            if (targetOrderStatus === null) {
                await options.paymentRepository.updateWebhookEventState({
                    eventId: registration.event.id,
                    processingState: "ignored",
                    processedAt: now,
                    errorMessage: `No order transition mapping for transaction_status=${parsed.transactionStatus}.`
                });
                return {
                    code: "IGNORED",
                    message: "Webhook acknowledged without order mutation."
                };
            }
            if (order.status === targetOrderStatus) {
                await options.paymentRepository.updateWebhookEventState({
                    eventId: registration.event.id,
                    processingState: "ignored",
                    processedAt: now,
                    errorMessage: "Order status already matches webhook target status."
                });
                return {
                    code: "IGNORED",
                    message: "Order already in target status."
                };
            }
            try {
                await options.orderService.transitionOrderStatus({
                    orderId: parsed.orderId,
                    toStatus: targetOrderStatus,
                    note: `midtrans_${parsed.transactionStatus}`,
                    metadata: {
                        provider,
                        webhookEventId: registration.event.id,
                        paymentId: payment.id,
                        transactionStatus: parsed.transactionStatus,
                        transactionId: parsed.transactionId
                    },
                    createdBy: "midtrans_webhook"
                });
            }
            catch (error) {
                if (error instanceof order_service_1.OrderTransitionError) {
                    await options.paymentRepository.updateWebhookEventState({
                        eventId: registration.event.id,
                        processingState: "ignored",
                        processedAt: now,
                        errorMessage: error.message
                    });
                    return {
                        code: "IGNORED",
                        message: "Webhook did not mutate order due to monotonic transition guard."
                    };
                }
                await options.paymentRepository.updateWebhookEventState({
                    eventId: registration.event.id,
                    processingState: "failed",
                    processedAt: now,
                    errorMessage: error instanceof Error ? error.message : "Unknown webhook processing error."
                });
                throw error;
            }
            await options.paymentRepository.updateWebhookEventState({
                eventId: registration.event.id,
                processingState: "processed",
                processedAt: now,
                errorMessage: null
            });
            return {
                code: "PROCESSED",
                message: "Webhook processed and order transitioned."
            };
        }
    };
}
