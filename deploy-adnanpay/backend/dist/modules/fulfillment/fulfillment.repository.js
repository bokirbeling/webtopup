"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryFulfillmentRepository = exports.SupabaseFulfillmentRepository = void 0;
const node_crypto_1 = require("node:crypto");
const FULFILLMENT_SELECT = "id,order_id,provider,attempt_no,provider_fulfillment_id,provider_reference,status,serial_number,request_payload,response_payload,processed_at,created_at,updated_at";
const WEBHOOK_SELECT = "id,provider,event_key,event_type,order_id,fulfillment_id,payload,processing_state,received_at,processed_at,error_message";
function ensureObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}
function parseInteger(value) {
    return typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
}
function parseFulfillmentStatus(value) {
    if (value === "queued" || value === "processing" || value === "success" || value === "failed") {
        return value;
    }
    throw new Error("Unexpected fulfillment status from persistence layer.");
}
function parseOrderRow(value) {
    if (typeof value !== "object" || value === null) {
        throw new Error("Invalid order payload from persistence layer.");
    }
    const row = value;
    const amountMinor = parseInteger(row.amount_minor);
    if (typeof row.id !== "string" ||
        typeof row.order_number !== "string" ||
        typeof row.product_code !== "string" ||
        typeof row.provider !== "string" ||
        !Number.isFinite(amountMinor) ||
        typeof row.currency !== "string" ||
        typeof row.status !== "string") {
        throw new Error("Missing required order fields from persistence layer.");
    }
    return {
        id: row.id,
        orderNumber: row.order_number,
        customerRef: typeof row.customer_ref === "string" ? row.customer_ref : null,
        productCode: row.product_code,
        provider: row.provider,
        amountMinor,
        currency: row.currency,
        status: row.status,
        metadata: ensureObject(row.metadata)
    };
}
function parseFulfillmentRow(value) {
    if (typeof value !== "object" || value === null) {
        throw new Error("Invalid fulfillments payload from persistence layer.");
    }
    const row = value;
    const attemptNo = parseInteger(row.attempt_no);
    if (typeof row.id !== "string" ||
        typeof row.order_id !== "string" ||
        typeof row.provider !== "string" ||
        !Number.isFinite(attemptNo) ||
        typeof row.created_at !== "string" ||
        typeof row.updated_at !== "string") {
        throw new Error("Missing required fulfillment fields from persistence layer.");
    }
    return {
        id: row.id,
        orderId: row.order_id,
        provider: row.provider,
        attemptNo,
        providerFulfillmentId: typeof row.provider_fulfillment_id === "string" ? row.provider_fulfillment_id : null,
        providerReference: typeof row.provider_reference === "string" ? row.provider_reference : null,
        status: parseFulfillmentStatus(row.status),
        serialNumber: typeof row.serial_number === "string" ? row.serial_number : null,
        requestPayload: ensureObject(row.request_payload),
        responsePayload: ensureObject(row.response_payload),
        processedAt: typeof row.processed_at === "string" ? new Date(row.processed_at) : null,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    };
}
function parseWebhookEventRow(value) {
    if (typeof value !== "object" || value === null) {
        throw new Error("Invalid webhook_events payload from persistence layer.");
    }
    const row = value;
    if (typeof row.id !== "string" || typeof row.provider !== "string" || typeof row.event_key !== "string" || typeof row.event_type !== "string" || typeof row.received_at !== "string") {
        throw new Error("Missing required webhook event fields from persistence layer.");
    }
    const processingState = row.processing_state;
    if (processingState !== "pending" && processingState !== "processed" && processingState !== "ignored" && processingState !== "failed") {
        throw new Error("Unexpected webhook state from persistence layer.");
    }
    return {
        id: row.id,
        provider: row.provider,
        eventKey: row.event_key,
        eventType: row.event_type,
        orderId: typeof row.order_id === "string" ? row.order_id : null,
        fulfillmentId: typeof row.fulfillment_id === "string" ? row.fulfillment_id : null,
        payload: ensureObject(row.payload),
        processingState,
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
    return JSON.parse(bodyText);
}
function extractErrorMessage(payload) {
    return typeof payload === "object" && payload !== null && typeof payload.message === "string"
        ? payload.message
        : "Persistence layer request failed.";
}
class SupabaseFulfillmentRepository {
    options;
    baseUrl;
    constructor(options) {
        this.options = options;
        this.baseUrl = options.supabaseUrl.replace(/\/$/, "");
    }
    async request(path, init = {}) {
        const headers = {
            apikey: this.options.supabaseServiceRoleKey,
            Authorization: "Bearer " + this.options.supabaseServiceRoleKey,
            "Content-Type": "application/json"
        };
        Object.assign(headers, init.headers);
        return fetch(this.baseUrl + path, { ...init, headers });
    }
    async findOrderById(orderId) {
        const response = await this.request("/rest/v1/orders?id=eq." + encodeURIComponent(orderId) + "&select=id,order_number,customer_ref,product_code,provider,amount_minor,currency,status,metadata&limit=1", { method: "GET" });
        const payload = await readJson(response);
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }
        return Array.isArray(payload) && payload.length > 0 ? parseOrderRow(payload[0]) : null;
    }
    async createFulfillment(input) {
        const response = await this.request("/rest/v1/fulfillments?select=" + FULFILLMENT_SELECT, {
            method: "POST",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify({
                order_id: input.orderId,
                provider: input.provider,
                attempt_no: input.attemptNo,
                provider_fulfillment_id: input.providerFulfillmentId,
                provider_reference: input.providerReference,
                status: input.status,
                serial_number: input.serialNumber,
                request_payload: input.requestPayload,
                response_payload: input.responsePayload,
                processed_at: input.processedAt?.toISOString() ?? null,
                created_at: input.createdAt.toISOString(),
                updated_at: input.updatedAt.toISOString()
            })
        });
        const payload = await readJson(response);
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }
        if (!Array.isArray(payload) || payload.length !== 1) {
            throw new Error("Failed to persist fulfillment record.");
        }
        return parseFulfillmentRow(payload[0]);
    }
    async findFulfillmentByProviderAndReference(provider, providerReference) {
        const response = await this.request("/rest/v1/fulfillments?provider=eq." + encodeURIComponent(provider) + "&provider_reference=eq." + encodeURIComponent(providerReference) + "&select=" + FULFILLMENT_SELECT + "&limit=1", { method: "GET" });
        const payload = await readJson(response);
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }
        return Array.isArray(payload) && payload.length > 0 ? parseFulfillmentRow(payload[0]) : null;
    }
    async findLatestFulfillmentByOrderId(orderId) {
        const response = await this.request("/rest/v1/fulfillments?order_id=eq." + encodeURIComponent(orderId) + "&select=" + FULFILLMENT_SELECT + "&order=created_at.desc&limit=1", { method: "GET" });
        const payload = await readJson(response);
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }
        return Array.isArray(payload) && payload.length > 0 ? parseFulfillmentRow(payload[0]) : null;
    }
    async updateFulfillmentStatus(input) {
        const response = await this.request("/rest/v1/fulfillments?id=eq." + encodeURIComponent(input.fulfillmentId) + "&select=" + FULFILLMENT_SELECT, {
            method: "PATCH",
            headers: { Prefer: "return=representation" },
            body: JSON.stringify({
                provider_fulfillment_id: input.providerFulfillmentId,
                status: input.status,
                serial_number: input.serialNumber,
                response_payload: input.responsePayload,
                processed_at: input.processedAt?.toISOString() ?? null,
                updated_at: input.updatedAt.toISOString()
            })
        });
        const payload = await readJson(response);
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }
        if (!Array.isArray(payload) || payload.length !== 1) {
            throw new Error("Fulfillment " + input.fulfillmentId + " was not found.");
        }
        return parseFulfillmentRow(payload[0]);
    }
    async registerWebhookEvent(input) {
        const response = await this.request("/rest/v1/webhook_events?on_conflict=provider,event_key&select=" + WEBHOOK_SELECT, {
            method: "POST",
            headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
            body: JSON.stringify({
                provider: input.provider,
                event_key: input.eventKey,
                event_type: input.eventType,
                order_id: input.orderId,
                fulfillment_id: input.fulfillmentId,
                payload: input.payload,
                received_at: input.receivedAt.toISOString()
            })
        });
        const payload = await readJson(response);
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }
        if (Array.isArray(payload) && payload.length === 1) {
            return { event: parseWebhookEventRow(payload[0]), duplicate: false };
        }
        const readResponse = await this.request("/rest/v1/webhook_events?provider=eq." + encodeURIComponent(input.provider) + "&event_key=eq." + encodeURIComponent(input.eventKey) + "&select=" + WEBHOOK_SELECT + "&limit=1", { method: "GET" });
        const readPayload = await readJson(readResponse);
        if (!readResponse.ok) {
            throw new Error(extractErrorMessage(readPayload));
        }
        if (!Array.isArray(readPayload) || readPayload.length !== 1) {
            throw new Error("Failed to read deduplicated webhook event record.");
        }
        return { event: parseWebhookEventRow(readPayload[0]), duplicate: true };
    }
    async updateWebhookEventState(input) {
        const response = await this.request("/rest/v1/webhook_events?id=eq." + encodeURIComponent(input.eventId) + "&select=" + WEBHOOK_SELECT, {
            method: "PATCH",
            headers: { Prefer: "return=representation" },
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
            throw new Error("Webhook event " + input.eventId + " was not found.");
        }
        return parseWebhookEventRow(payload[0]);
    }
}
exports.SupabaseFulfillmentRepository = SupabaseFulfillmentRepository;
class InMemoryFulfillmentRepository {
    orderRepository;
    fulfillmentsById = new Map();
    fulfillmentKeyByProviderReference = new Map();
    webhookEventByProviderKey = new Map();
    constructor(orderRepository) {
        this.orderRepository = orderRepository;
    }
    async findOrderById(orderId) {
        const order = await this.orderRepository.findOrderById(orderId);
        return order
            ? {
                id: order.id,
                orderNumber: order.orderNumber,
                customerRef: order.customerRef,
                productCode: order.productCode,
                provider: order.provider,
                amountMinor: order.amountMinor,
                currency: order.currency,
                status: order.status,
                metadata: { ...order.metadata }
            }
            : null;
    }
    async createFulfillment(input) {
        const fulfillment = {
            id: (0, node_crypto_1.randomUUID)(),
            orderId: input.orderId,
            provider: input.provider,
            attemptNo: input.attemptNo,
            providerFulfillmentId: input.providerFulfillmentId,
            providerReference: input.providerReference,
            status: input.status,
            serialNumber: input.serialNumber,
            requestPayload: { ...input.requestPayload },
            responsePayload: { ...input.responsePayload },
            processedAt: input.processedAt,
            createdAt: input.createdAt,
            updatedAt: input.updatedAt
        };
        this.fulfillmentsById.set(fulfillment.id, fulfillment);
        if (fulfillment.providerReference !== null) {
            this.fulfillmentKeyByProviderReference.set(fulfillment.provider + ":" + fulfillment.providerReference, fulfillment.id);
        }
        return fulfillment;
    }
    async findFulfillmentByProviderAndReference(provider, providerReference) {
        const id = this.fulfillmentKeyByProviderReference.get(provider + ":" + providerReference);
        return id === undefined ? null : this.fulfillmentsById.get(id) ?? null;
    }
    async findLatestFulfillmentByOrderId(orderId) {
        const fulfillments = Array.from(this.fulfillmentsById.values())
            .filter((fulfillment) => fulfillment.orderId === orderId)
            .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
        return fulfillments[0] ?? null;
    }
    async updateFulfillmentStatus(input) {
        const existing = this.fulfillmentsById.get(input.fulfillmentId);
        if (!existing) {
            throw new Error("Fulfillment " + input.fulfillmentId + " was not found.");
        }
        const updated = {
            ...existing,
            providerFulfillmentId: input.providerFulfillmentId,
            status: input.status,
            serialNumber: input.serialNumber,
            responsePayload: { ...input.responsePayload },
            processedAt: input.processedAt,
            updatedAt: input.updatedAt
        };
        this.fulfillmentsById.set(updated.id, updated);
        return updated;
    }
    async registerWebhookEvent(input) {
        const key = input.provider + ":" + input.eventKey;
        const existing = this.webhookEventByProviderKey.get(key);
        if (existing) {
            return { event: existing, duplicate: true };
        }
        const event = {
            id: (0, node_crypto_1.randomUUID)(),
            provider: input.provider,
            eventKey: input.eventKey,
            eventType: input.eventType,
            orderId: input.orderId,
            fulfillmentId: input.fulfillmentId,
            payload: { ...input.payload },
            processingState: "pending",
            receivedAt: input.receivedAt,
            processedAt: null,
            errorMessage: null
        };
        this.webhookEventByProviderKey.set(key, event);
        return { event, duplicate: false };
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
        throw new Error("Webhook event " + input.eventId + " was not found.");
    }
    getWebhookEventByProviderAndEventKey(provider, eventKey) {
        return this.webhookEventByProviderKey.get(provider + ":" + eventKey) ?? null;
    }
}
exports.InMemoryFulfillmentRepository = InMemoryFulfillmentRepository;
