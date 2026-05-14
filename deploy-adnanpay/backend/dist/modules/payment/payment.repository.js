"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryPaymentRepository = exports.SupabasePaymentRepository = void 0;
const node_crypto_1 = require("node:crypto");
function ensureObject(value) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        return value;
    }
    return {};
}
function parseInteger(value) {
    if (typeof value === "number") {
        return value;
    }
    if (typeof value === "string") {
        return Number.parseInt(value, 10);
    }
    return Number.NaN;
}
function parseOrderRow(value) {
    if (typeof value !== "object" || value === null) {
        throw new Error("Invalid order payload from persistence layer.");
    }
    const row = value;
    const amountMinor = parseInteger(row.amount_minor);
    if (typeof row.id !== "string" ||
        typeof row.order_number !== "string" ||
        !Number.isFinite(amountMinor) ||
        typeof row.currency !== "string" ||
        typeof row.status !== "string") {
        throw new Error("Missing required order fields from persistence layer.");
    }
    if (row.status !== "created" &&
        row.status !== "pending_payment" &&
        row.status !== "paid" &&
        row.status !== "fulfillment_pending" &&
        row.status !== "success" &&
        row.status !== "failed" &&
        row.status !== "expired") {
        throw new Error("Unexpected order status from persistence layer.");
    }
    return {
        id: row.id,
        orderNumber: row.order_number,
        amountMinor,
        currency: row.currency,
        status: row.status
    };
}
function parsePaymentStatus(value) {
    if (value === "pending" ||
        value === "paid" ||
        value === "failed" ||
        value === "expired" ||
        value === "cancelled" ||
        value === "refunded") {
        return value;
    }
    throw new Error("Unexpected payment status from persistence layer.");
}
function parsePaymentRow(value) {
    if (typeof value !== "object" || value === null) {
        throw new Error("Invalid payments payload from persistence layer.");
    }
    const row = value;
    const amountMinor = parseInteger(row.amount_minor);
    if (typeof row.id !== "string" ||
        typeof row.order_id !== "string" ||
        typeof row.provider !== "string" ||
        typeof row.idempotency_key !== "string" ||
        !Number.isFinite(amountMinor) ||
        typeof row.currency !== "string" ||
        typeof row.created_at !== "string" ||
        typeof row.updated_at !== "string") {
        throw new Error("Missing required payment fields from persistence layer.");
    }
    return {
        id: row.id,
        orderId: row.order_id,
        provider: row.provider,
        idempotencyKey: row.idempotency_key,
        providerPaymentId: typeof row.provider_payment_id === "string" ? row.provider_payment_id : null,
        providerReference: typeof row.provider_reference === "string" ? row.provider_reference : null,
        amountMinor,
        currency: row.currency,
        status: parsePaymentStatus(row.status),
        paidAt: typeof row.paid_at === "string" ? new Date(row.paid_at) : null,
        payload: ensureObject(row.payload),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    };
}
function parseWebhookState(value) {
    if (value === "pending" || value === "processed" || value === "ignored" || value === "failed") {
        return value;
    }
    throw new Error("Unexpected webhook state from persistence layer.");
}
function parseWebhookEventRow(value) {
    if (typeof value !== "object" || value === null) {
        throw new Error("Invalid webhook_events payload from persistence layer.");
    }
    const row = value;
    if (typeof row.id !== "string" ||
        typeof row.provider !== "string" ||
        typeof row.event_key !== "string" ||
        typeof row.event_type !== "string" ||
        typeof row.received_at !== "string") {
        throw new Error("Missing required webhook event fields from persistence layer.");
    }
    return {
        id: row.id,
        provider: row.provider,
        eventKey: row.event_key,
        eventType: row.event_type,
        orderId: typeof row.order_id === "string" ? row.order_id : null,
        paymentId: typeof row.payment_id === "string" ? row.payment_id : null,
        payload: ensureObject(row.payload),
        processingState: parseWebhookState(row.processing_state),
        receivedAt: new Date(row.received_at),
        processedAt: typeof row.processed_at === "string" ? new Date(row.processed_at) : null,
        errorMessage: typeof row.error_message === "string" ? row.error_message : null
    };
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
        throw new Error("Persistence layer returned malformed JSON.");
    }
}
function extractErrorMessage(payload) {
    if (typeof payload !== "object" || payload === null) {
        return "Persistence layer request failed.";
    }
    const value = payload;
    return typeof value.message === "string" ? value.message : "Persistence layer request failed.";
}
class SupabasePaymentRepository {
    options;
    baseUrl;
    constructor(options) {
        this.options = options;
        this.baseUrl = options.supabaseUrl.replace(/\/$/, "");
    }
    async request(path, init = {}) {
        const headers = {
            apikey: this.options.supabaseServiceRoleKey,
            Authorization: `Bearer ${this.options.supabaseServiceRoleKey}`,
            "Content-Type": "application/json"
        };
        if (init.headers) {
            Object.assign(headers, init.headers);
        }
        return fetch(`${this.baseUrl}${path}`, {
            ...init,
            headers
        });
    }
    async findOrderById(orderId) {
        const response = await this.request(`/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,order_number,amount_minor,currency,status&limit=1`, {
            method: "GET"
        });
        const payload = await readJson(response);
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }
        if (!Array.isArray(payload) || payload.length === 0) {
            return null;
        }
        return parseOrderRow(payload[0]);
    }
    async createPayment(input) {
        const response = await this.request("/rest/v1/payments?select=id,order_id,provider,idempotency_key,provider_payment_id,provider_reference,amount_minor,currency,status,paid_at,payload,created_at,updated_at", {
            method: "POST",
            headers: {
                Prefer: "return=representation"
            },
            body: JSON.stringify({
                order_id: input.orderId,
                provider: input.provider,
                idempotency_key: input.idempotencyKey,
                provider_payment_id: input.providerPaymentId,
                provider_reference: input.providerReference,
                amount_minor: input.amountMinor,
                currency: input.currency,
                status: input.status,
                paid_at: input.paidAt?.toISOString() ?? null,
                payload: input.payload,
                created_at: input.createdAt.toISOString(),
                updated_at: input.updatedAt.toISOString()
            })
        });
        const payload = await readJson(response);
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }
        if (!Array.isArray(payload) || payload.length !== 1) {
            throw new Error("Failed to persist payment record.");
        }
        return parsePaymentRow(payload[0]);
    }
    async findPaymentByProviderAndReference(provider, providerReference) {
        const response = await this.request(`/rest/v1/payments?provider=eq.${encodeURIComponent(provider)}&provider_reference=eq.${encodeURIComponent(providerReference)}&select=id,order_id,provider,idempotency_key,provider_payment_id,provider_reference,amount_minor,currency,status,paid_at,payload,created_at,updated_at&limit=1`, {
            method: "GET"
        });
        const payload = await readJson(response);
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }
        if (!Array.isArray(payload) || payload.length === 0) {
            return null;
        }
        return parsePaymentRow(payload[0]);
    }
    async findLatestPaymentByOrderId(orderId) {
        const response = await this.request("/rest/v1/payments?order_id=eq." + encodeURIComponent(orderId) + "&select=id,order_id,provider,idempotency_key,provider_payment_id,provider_reference,amount_minor,currency,status,paid_at,payload,created_at,updated_at&order=created_at.desc&limit=1", {
            method: "GET"
        });
        const payload = await readJson(response);
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }
        if (!Array.isArray(payload) || payload.length === 0) {
            return null;
        }
        return parsePaymentRow(payload[0]);
    }
    async updatePaymentStatus(input) {
        const response = await this.request(`/rest/v1/payments?id=eq.${encodeURIComponent(input.paymentId)}&select=id,order_id,provider,idempotency_key,provider_payment_id,provider_reference,amount_minor,currency,status,paid_at,payload,created_at,updated_at`, {
            method: "PATCH",
            headers: {
                Prefer: "return=representation"
            },
            body: JSON.stringify({
                status: input.status,
                paid_at: input.paidAt?.toISOString() ?? null,
                payload: input.payload,
                updated_at: input.updatedAt.toISOString()
            })
        });
        const payload = await readJson(response);
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }
        if (!Array.isArray(payload) || payload.length !== 1) {
            throw new Error(`Payment ${input.paymentId} was not found.`);
        }
        return parsePaymentRow(payload[0]);
    }
    async registerWebhookEvent(input) {
        const payloadObject = {
            provider: input.provider,
            event_key: input.eventKey,
            event_type: input.eventType,
            order_id: input.orderId,
            payment_id: input.paymentId,
            payload: input.payload,
            received_at: input.receivedAt.toISOString()
        };
        const insertResponse = await this.request("/rest/v1/webhook_events?on_conflict=provider,event_key&select=id,provider,event_key,event_type,order_id,payment_id,payload,processing_state,received_at,processed_at,error_message", {
            method: "POST",
            headers: {
                Prefer: "resolution=ignore-duplicates,return=representation"
            },
            body: JSON.stringify(payloadObject)
        });
        const insertedPayload = await readJson(insertResponse);
        if (!insertResponse.ok) {
            throw new Error(extractErrorMessage(insertedPayload));
        }
        if (Array.isArray(insertedPayload) && insertedPayload.length === 1) {
            return {
                event: parseWebhookEventRow(insertedPayload[0]),
                duplicate: false
            };
        }
        const readResponse = await this.request(`/rest/v1/webhook_events?provider=eq.${encodeURIComponent(input.provider)}&event_key=eq.${encodeURIComponent(input.eventKey)}&select=id,provider,event_key,event_type,order_id,payment_id,payload,processing_state,received_at,processed_at,error_message&limit=1`, {
            method: "GET"
        });
        const readPayload = await readJson(readResponse);
        if (!readResponse.ok) {
            throw new Error(extractErrorMessage(readPayload));
        }
        if (!Array.isArray(readPayload) || readPayload.length !== 1) {
            throw new Error("Failed to read deduplicated webhook event record.");
        }
        return {
            event: parseWebhookEventRow(readPayload[0]),
            duplicate: true
        };
    }
    async updateWebhookEventState(input) {
        const response = await this.request(`/rest/v1/webhook_events?id=eq.${encodeURIComponent(input.eventId)}&select=id,provider,event_key,event_type,order_id,payment_id,payload,processing_state,received_at,processed_at,error_message`, {
            method: "PATCH",
            headers: {
                Prefer: "return=representation"
            },
            body: JSON.stringify({
                processing_state: input.processingState,
                processed_at: input.processedAt.toISOString(),
                error_message: input.errorMessage
            })
        });
        const payload = await readJson(response);
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }
        if (!Array.isArray(payload) || payload.length !== 1) {
            throw new Error(`Webhook event ${input.eventId} was not found.`);
        }
        return parseWebhookEventRow(payload[0]);
    }
}
exports.SupabasePaymentRepository = SupabasePaymentRepository;
class InMemoryPaymentRepository {
    orderRepository;
    paymentsById = new Map();
    paymentKeyByProviderReference = new Map();
    webhookEventByProviderKey = new Map();
    constructor(orderRepository) {
        this.orderRepository = orderRepository;
    }
    async findOrderById(orderId) {
        const order = await this.orderRepository.findOrderById(orderId);
        if (!order) {
            return null;
        }
        return {
            id: order.id,
            orderNumber: order.orderNumber,
            amountMinor: order.amountMinor,
            currency: order.currency,
            status: order.status
        };
    }
    async createPayment(input) {
        const id = (0, node_crypto_1.randomUUID)();
        const payment = {
            id,
            orderId: input.orderId,
            provider: input.provider,
            idempotencyKey: input.idempotencyKey,
            providerPaymentId: input.providerPaymentId,
            providerReference: input.providerReference,
            amountMinor: input.amountMinor,
            currency: input.currency,
            status: input.status,
            paidAt: input.paidAt,
            payload: { ...input.payload },
            createdAt: input.createdAt,
            updatedAt: input.updatedAt
        };
        this.paymentsById.set(id, payment);
        if (payment.providerReference !== null) {
            this.paymentKeyByProviderReference.set(`${payment.provider}:${payment.providerReference}`, payment.id);
        }
        return payment;
    }
    async findPaymentByProviderAndReference(provider, providerReference) {
        const key = `${provider}:${providerReference}`;
        const paymentId = this.paymentKeyByProviderReference.get(key);
        if (!paymentId) {
            return null;
        }
        return this.paymentsById.get(paymentId) ?? null;
    }
    async findLatestPaymentByOrderId(orderId) {
        const payments = Array.from(this.paymentsById.values())
            .filter((payment) => payment.orderId === orderId)
            .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
        return payments[0] ?? null;
    }
    async updatePaymentStatus(input) {
        const existing = this.paymentsById.get(input.paymentId);
        if (!existing) {
            throw new Error(`Payment ${input.paymentId} was not found.`);
        }
        const updated = {
            ...existing,
            status: input.status,
            paidAt: input.paidAt,
            payload: { ...input.payload },
            updatedAt: input.updatedAt
        };
        this.paymentsById.set(updated.id, updated);
        return updated;
    }
    async registerWebhookEvent(input) {
        const lookupKey = `${input.provider}:${input.eventKey}`;
        const existing = this.webhookEventByProviderKey.get(lookupKey);
        if (existing) {
            return {
                event: existing,
                duplicate: true
            };
        }
        const created = {
            id: (0, node_crypto_1.randomUUID)(),
            provider: input.provider,
            eventKey: input.eventKey,
            eventType: input.eventType,
            orderId: input.orderId,
            paymentId: input.paymentId,
            payload: { ...input.payload },
            processingState: "pending",
            receivedAt: input.receivedAt,
            processedAt: null,
            errorMessage: null
        };
        this.webhookEventByProviderKey.set(lookupKey, created);
        return {
            event: created,
            duplicate: false
        };
    }
    async updateWebhookEventState(input) {
        for (const [key, event] of this.webhookEventByProviderKey.entries()) {
            if (event.id !== input.eventId) {
                continue;
            }
            const updated = {
                ...event,
                processingState: input.processingState,
                processedAt: input.processedAt,
                errorMessage: input.errorMessage
            };
            this.webhookEventByProviderKey.set(key, updated);
            return updated;
        }
        throw new Error(`Webhook event ${input.eventId} was not found.`);
    }
    getWebhookEventByProviderAndEventKey(provider, eventKey) {
        return this.webhookEventByProviderKey.get(`${provider}:${eventKey}`) ?? null;
    }
}
exports.InMemoryPaymentRepository = InMemoryPaymentRepository;
