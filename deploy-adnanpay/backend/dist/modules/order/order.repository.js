"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryOrderRepository = exports.SupabaseOrderRepository = void 0;
function asOrderStatus(value) {
    if (value === "created" ||
        value === "pending_payment" ||
        value === "paid" ||
        value === "fulfillment_pending" ||
        value === "success" ||
        value === "failed" ||
        value === "expired") {
        return value;
    }
    throw new Error("Unexpected order status from persistence layer.");
}
function ensureObject(value) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        return value;
    }
    return {};
}
function parseOrderRow(value) {
    if (typeof value !== "object" || value === null) {
        throw new Error("Invalid order payload from persistence layer.");
    }
    const row = value;
    const amountMinorRaw = row.amount_minor;
    const amountMinor = typeof amountMinorRaw === "number"
        ? amountMinorRaw
        : typeof amountMinorRaw === "string"
            ? Number.parseInt(amountMinorRaw, 10)
            : Number.NaN;
    if (typeof row.id !== "string" ||
        typeof row.order_number !== "string" ||
        typeof row.product_code !== "string" ||
        typeof row.provider !== "string" ||
        !Number.isFinite(amountMinor) ||
        typeof row.currency !== "string" ||
        typeof row.created_at !== "string" ||
        typeof row.updated_at !== "string") {
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
        status: asOrderStatus(row.status),
        metadata: ensureObject(row.metadata),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
    };
}
function parseStatusHistoryRow(value) {
    if (typeof value !== "object" || value === null) {
        throw new Error("Invalid status_history payload from persistence layer.");
    }
    const row = value;
    const idRaw = row.id;
    const id = typeof idRaw === "number" ? idRaw : typeof idRaw === "string" ? Number.parseInt(idRaw, 10) : Number.NaN;
    if (!Number.isFinite(id) ||
        typeof row.order_id !== "string" ||
        typeof row.to_status !== "string" ||
        typeof row.created_by !== "string" ||
        typeof row.created_at !== "string") {
        throw new Error("Missing required status_history fields from persistence layer.");
    }
    return {
        id,
        orderId: row.order_id,
        fromStatus: row.from_status === null ? null : asOrderStatus(row.from_status),
        toStatus: asOrderStatus(row.to_status),
        note: typeof row.note === "string" ? row.note : null,
        metadata: ensureObject(row.metadata),
        createdBy: row.created_by,
        createdAt: new Date(row.created_at)
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
class SupabaseOrderRepository {
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
    async createOrder(input) {
        const response = await this.request("/rest/v1/orders?select=id,order_number,customer_ref,product_code,provider,amount_minor,currency,status,metadata,created_at,updated_at", {
            method: "POST",
            headers: {
                Prefer: "return=representation"
            },
            body: JSON.stringify({
                id: input.id,
                order_number: input.orderNumber,
                customer_ref: input.customerRef,
                product_code: input.productCode,
                provider: input.provider,
                amount_minor: input.amountMinor,
                currency: input.currency,
                status: input.status,
                metadata: input.metadata,
                created_at: input.createdAt.toISOString(),
                updated_at: input.updatedAt.toISOString()
            })
        });
        const payload = await readJson(response);
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }
        if (!Array.isArray(payload) || payload.length !== 1) {
            throw new Error("Failed to persist order record.");
        }
        return parseOrderRow(payload[0]);
    }
    async findOrderById(orderId) {
        const response = await this.request(`/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,order_number,customer_ref,product_code,provider,amount_minor,currency,status,metadata,created_at,updated_at&limit=1`, {
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
    async findOrderByInvoiceCode(invoiceCode) {
        const response = await this.request("/rest/v1/orders?order_number=eq." + encodeURIComponent(invoiceCode) + "&select=id,order_number,customer_ref,product_code,provider,amount_minor,currency,status,metadata,created_at,updated_at&limit=1", {
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
    async updateOrderStatus(orderId, status, updatedAt) {
        const response = await this.request(`/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,order_number,customer_ref,product_code,provider,amount_minor,currency,status,metadata,created_at,updated_at`, {
            method: "PATCH",
            headers: {
                Prefer: "return=representation"
            },
            body: JSON.stringify({
                status,
                updated_at: updatedAt.toISOString()
            })
        });
        const payload = await readJson(response);
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }
        if (!Array.isArray(payload) || payload.length !== 1) {
            throw new Error(`Order ${orderId} was not found.`);
        }
        return parseOrderRow(payload[0]);
    }
    async createStatusHistory(input) {
        const response = await this.request("/rest/v1/status_history?select=id,order_id,from_status,to_status,note,metadata,created_by,created_at", {
            method: "POST",
            headers: {
                Prefer: "return=representation"
            },
            body: JSON.stringify({
                order_id: input.orderId,
                from_status: input.fromStatus,
                to_status: input.toStatus,
                note: input.note,
                metadata: input.metadata,
                created_by: input.createdBy,
                created_at: input.createdAt.toISOString()
            })
        });
        const payload = await readJson(response);
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }
        if (!Array.isArray(payload) || payload.length !== 1) {
            throw new Error("Failed to persist status history record.");
        }
        return parseStatusHistoryRow(payload[0]);
    }
    async findStatusHistoryByOrderId(orderId) {
        const response = await this.request("/rest/v1/status_history?order_id=eq." + encodeURIComponent(orderId) + "&select=id,order_id,from_status,to_status,note,metadata,created_by,created_at&order=created_at.asc,id.asc", {
            method: "GET"
        });
        const payload = await readJson(response);
        if (!response.ok) {
            throw new Error(extractErrorMessage(payload));
        }
        if (!Array.isArray(payload)) {
            throw new Error("Persistence layer returned invalid status history payload.");
        }
        return payload.map(parseStatusHistoryRow);
    }
}
exports.SupabaseOrderRepository = SupabaseOrderRepository;
class InMemoryOrderRepository {
    ordersById = new Map();
    orderNumberToId = new Map();
    statusHistory = [];
    nextStatusHistoryId = 1;
    async createOrder(input) {
        if (this.ordersById.has(input.id)) {
            throw new Error(`Order with id ${input.id} already exists.`);
        }
        if (this.orderNumberToId.has(input.orderNumber)) {
            throw new Error(`Order with order_number ${input.orderNumber} already exists.`);
        }
        const order = {
            id: input.id,
            orderNumber: input.orderNumber,
            customerRef: input.customerRef,
            productCode: input.productCode,
            provider: input.provider,
            amountMinor: input.amountMinor,
            currency: input.currency,
            status: input.status,
            metadata: { ...input.metadata },
            createdAt: input.createdAt,
            updatedAt: input.updatedAt
        };
        this.ordersById.set(order.id, order);
        this.orderNumberToId.set(order.orderNumber, order.id);
        return order;
    }
    async findOrderById(orderId) {
        return this.ordersById.get(orderId) ?? null;
    }
    async findOrderByInvoiceCode(invoiceCode) {
        const orderId = this.orderNumberToId.get(invoiceCode);
        return orderId === undefined ? null : this.ordersById.get(orderId) ?? null;
    }
    async updateOrderStatus(orderId, status, updatedAt) {
        const existingOrder = this.ordersById.get(orderId);
        if (!existingOrder) {
            throw new Error(`Order ${orderId} was not found.`);
        }
        const updatedOrder = {
            ...existingOrder,
            status,
            updatedAt
        };
        this.ordersById.set(orderId, updatedOrder);
        return updatedOrder;
    }
    async createStatusHistory(input) {
        const statusHistoryEntry = {
            id: this.nextStatusHistoryId,
            orderId: input.orderId,
            fromStatus: input.fromStatus,
            toStatus: input.toStatus,
            note: input.note,
            metadata: { ...input.metadata },
            createdBy: input.createdBy,
            createdAt: input.createdAt
        };
        this.statusHistory.push(statusHistoryEntry);
        this.nextStatusHistoryId += 1;
        return statusHistoryEntry;
    }
    async findStatusHistoryByOrderId(orderId) {
        return this.getStatusHistoryByOrderId(orderId);
    }
    getStatusHistoryByOrderId(orderId) {
        return this.statusHistory.filter((entry) => entry.orderId === orderId);
    }
}
exports.InMemoryOrderRepository = InMemoryOrderRepository;
