import {
  type CreateOrderRecordInput,
  type CreateStatusHistoryInput,
  type OrderRecord,
  type OrderStatus,
  type StatusHistoryRecord
} from "./order.types";

export interface OrderRepository {
  createOrder(input: CreateOrderRecordInput): Promise<OrderRecord>;
  findOrderById(orderId: string): Promise<OrderRecord | null>;
  findOrderByInvoiceCode(invoiceCode: string): Promise<OrderRecord | null>;
  listOrdersByUserId(userId: string, limit: number): Promise<OrderRecord[]>;
  listRecentOrders(limit: number): Promise<OrderRecord[]>;
  updateOrderStatus(orderId: string, status: OrderStatus, updatedAt: Date): Promise<OrderRecord>;
  createStatusHistory(input: CreateStatusHistoryInput): Promise<StatusHistoryRecord>;
  findStatusHistoryByOrderId(orderId: string): Promise<StatusHistoryRecord[]>;
}

type SupabaseOrderRepositoryOptions = Readonly<{
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  tablePrefix?: string;
}>;

const ORDER_SELECT = "id,order_number,customer_ref,product_code,provider,amount_minor,currency,status,expires_at,metadata,created_at,updated_at";

function asOrderStatus(value: unknown): OrderStatus {
  if (
    value === "created" ||
    value === "pending_payment" ||
    value === "paid" ||
    value === "fulfillment_pending" ||
    value === "success" ||
    value === "failed" ||
    value === "expired"
  ) {
    return value;
  }

  throw new Error("Unexpected order status from persistence layer.");
}

function ensureObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function parseNullableInteger(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseOrderRow(value: unknown): OrderRecord {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid order payload from persistence layer.");
  }

  const row = value as Record<string, unknown>;

  const amountMinorRaw = row.amount_minor;
  const amountMinor =
    typeof amountMinorRaw === "number"
      ? amountMinorRaw
      : typeof amountMinorRaw === "string"
        ? Number.parseInt(amountMinorRaw, 10)
        : Number.NaN;

  if (
    typeof row.id !== "string" ||
    typeof row.order_number !== "string" ||
    typeof row.product_code !== "string" ||
    typeof row.provider !== "string" ||
    !Number.isFinite(amountMinor) ||
    typeof row.currency !== "string" ||
    typeof row.created_at !== "string" ||
    typeof row.updated_at !== "string"
  ) {
    throw new Error("Missing required order fields from persistence layer.");
  }

  return {
    id: row.id,
    orderNumber: row.order_number,
    customerRef: typeof row.customer_ref === "string" ? row.customer_ref : null,
    userId: typeof row.user_id === "string" ? row.user_id : null,
    productCode: row.product_code,
    provider: row.provider,
    amountMinor,
    currency: row.currency,
    status: asOrderStatus(row.status),
    metadata: ensureObject(row.metadata),
    basePriceSnapshot: parseNullableInteger(row.base_price_snapshot),
    markupSnapshot: parseNullableInteger(row.markup_snapshot),
    rolePriceSnapshot: parseNullableInteger(row.role_price_snapshot),
    pricingRuleIdSnapshot: typeof row.pricing_rule_id_snapshot === "string" ? row.pricing_rule_id_snapshot : null,
    referralCode: typeof row.referral_code === "string" ? row.referral_code : null,
    discountCode: typeof row.discount_code === "string" ? row.discount_code : null,
    discountAmountMinor: parseNullableInteger(row.discount_amount_minor),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

function parseStatusHistoryRow(value: unknown): StatusHistoryRecord {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid status_history payload from persistence layer.");
  }

  const row = value as Record<string, unknown>;

  const idRaw = row.id;
  const id =
    typeof idRaw === "number" ? idRaw : typeof idRaw === "string" ? Number.parseInt(idRaw, 10) : Number.NaN;

  if (
    !Number.isFinite(id) ||
    typeof row.order_id !== "string" ||
    typeof row.to_status !== "string" ||
    typeof row.created_by !== "string" ||
    typeof row.created_at !== "string"
  ) {
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

async function readJson(response: Response): Promise<unknown> {
  const bodyText = await response.text();

  if (bodyText.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    throw new Error("Persistence layer returned malformed JSON.");
  }
}

function extractErrorMessage(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) {
    return "Persistence layer request failed.";
  }

  const value = payload as Record<string, unknown>;
  return typeof value.message === "string" ? value.message : "Persistence layer request failed.";
}

export class SupabaseOrderRepository implements OrderRepository {
  private readonly baseUrl: string;

  constructor(private readonly options: SupabaseOrderRepositoryOptions) {
    this.baseUrl = options.supabaseUrl.replace(/\/$/, "");
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const scopedPath = this.options.tablePrefix === undefined || this.options.tablePrefix === ""
      ? path
      : path.replace(
          /\/rest\/v1\/(orders|status_history)\b/g,
          (_match, tableName: string) => "/rest/v1/" + this.options.tablePrefix + tableName
        );
    const headers: Record<string, string> = {
      apikey: this.options.supabaseServiceRoleKey,
      Authorization: `Bearer ${this.options.supabaseServiceRoleKey}`,
      "Content-Type": "application/json"
    };

    if (init.headers) {
      Object.assign(headers, init.headers as Record<string, string>);
    }

    return fetch(`${this.baseUrl}${scopedPath}`, {
      ...init,
      headers
    });
  }

  async createOrder(input: CreateOrderRecordInput): Promise<OrderRecord> {
    const response = await this.request(
      "/rest/v1/orders?select=" + ORDER_SELECT,
      {
        method: "POST",
        headers: {
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          id: input.id,
          order_number: input.orderNumber,
          customer_ref: input.customerRef,
          user_id: input.userId,
          product_code: input.productCode,
          provider: input.provider,
          amount_minor: input.amountMinor,
          currency: input.currency,
          status: input.status,
          metadata: input.metadata,
          base_price_snapshot: input.basePriceSnapshot,
          markup_snapshot: input.markupSnapshot,
          role_price_snapshot: input.rolePriceSnapshot,
          pricing_rule_id_snapshot: input.pricingRuleIdSnapshot,
          created_at: input.createdAt.toISOString(),
          updated_at: input.updatedAt.toISOString()
        })
      }
    );

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload));
    }

    if (!Array.isArray(payload) || payload.length !== 1) {
      throw new Error("Failed to persist order record.");
    }

    return parseOrderRow(payload[0]);
  }

  async findOrderById(orderId: string): Promise<OrderRecord | null> {
    const response = await this.request(
      `/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=${ORDER_SELECT}&limit=1`,
      {
        method: "GET"
      }
    );

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload));
    }

    if (!Array.isArray(payload) || payload.length === 0) {
      return null;
    }

    return parseOrderRow(payload[0]);
  }

  async findOrderByInvoiceCode(invoiceCode: string): Promise<OrderRecord | null> {
    const response = await this.request(
      "/rest/v1/orders?order_number=eq." + encodeURIComponent(invoiceCode) + "&select=" + ORDER_SELECT + "&limit=1",
      {
        method: "GET"
      }
    );

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload));
    }

    if (!Array.isArray(payload) || payload.length === 0) {
      return null;
    }

    return parseOrderRow(payload[0]);
  }

  async listOrdersByUserId(userId: string, limit: number): Promise<OrderRecord[]> {
    const response = await this.request(
      "/rest/v1/orders?user_id=eq." + encodeURIComponent(userId) + "&select=" + ORDER_SELECT + "&order=created_at.desc&limit=" + limit,
      {
        method: "GET"
      }
    );

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload));
    }

    return Array.isArray(payload) ? payload.map(parseOrderRow) : [];
  }

  async listRecentOrders(limit: number): Promise<OrderRecord[]> {
    const response = await this.request(
      "/rest/v1/orders?select=" + ORDER_SELECT + "&order=created_at.desc&limit=" + limit,
      {
        method: "GET"
      }
    );

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload));
    }

    return Array.isArray(payload) ? payload.map(parseOrderRow) : [];
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, updatedAt: Date): Promise<OrderRecord> {
    const response = await this.request(
      `/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=${ORDER_SELECT}`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          status,
          updated_at: updatedAt.toISOString()
        })
      }
    );

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload));
    }

    if (!Array.isArray(payload) || payload.length !== 1) {
      throw new Error(`Order ${orderId} was not found.`);
    }

    return parseOrderRow(payload[0]);
  }

  async createStatusHistory(input: CreateStatusHistoryInput): Promise<StatusHistoryRecord> {
    const response = await this.request(
      "/rest/v1/status_history?select=id,order_id,from_status,to_status,note,metadata,created_by,created_at",
      {
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
      }
    );

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload));
    }

    if (!Array.isArray(payload) || payload.length !== 1) {
      throw new Error("Failed to persist status history record.");
    }

    return parseStatusHistoryRow(payload[0]);
  }

  async findStatusHistoryByOrderId(orderId: string): Promise<StatusHistoryRecord[]> {
    const response = await this.request(
      "/rest/v1/status_history?order_id=eq." + encodeURIComponent(orderId) + "&select=id,order_id,from_status,to_status,note,metadata,created_by,created_at&order=created_at.asc,id.asc",
      {
        method: "GET"
      }
    );

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

export class InMemoryOrderRepository implements OrderRepository {
  private readonly ordersById = new Map<string, OrderRecord>();
  private readonly orderNumberToId = new Map<string, string>();
  private readonly statusHistory: StatusHistoryRecord[] = [];
  private nextStatusHistoryId = 1;

  async createOrder(input: CreateOrderRecordInput): Promise<OrderRecord> {
    if (this.ordersById.has(input.id)) {
      throw new Error(`Order with id ${input.id} already exists.`);
    }

    if (this.orderNumberToId.has(input.orderNumber)) {
      throw new Error(`Order with order_number ${input.orderNumber} already exists.`);
    }

    const order: OrderRecord = {
      id: input.id,
      orderNumber: input.orderNumber,
      customerRef: input.customerRef,
      userId: input.userId,
      productCode: input.productCode,
      provider: input.provider,
      amountMinor: input.amountMinor,
      currency: input.currency,
      status: input.status,
      referralCode: input.referralCode,
      discountCode: input.discountCode,
      discountAmountMinor: input.discountAmountMinor,
      metadata: input.metadata,
      basePriceSnapshot: input.basePriceSnapshot,
      markupSnapshot: input.markupSnapshot,
      rolePriceSnapshot: input.rolePriceSnapshot,
      pricingRuleIdSnapshot: input.pricingRuleIdSnapshot,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt
    };

    this.ordersById.set(order.id, order);
    this.orderNumberToId.set(order.orderNumber, order.id);

    return order;
  }

  async findOrderById(orderId: string): Promise<OrderRecord | null> {
    return this.ordersById.get(orderId) ?? null;
  }

  async findOrderByInvoiceCode(invoiceCode: string): Promise<OrderRecord | null> {
    const orderId = this.orderNumberToId.get(invoiceCode);

    return orderId === undefined ? null : this.ordersById.get(orderId) ?? null;
  }

  async listOrdersByUserId(userId: string, limit: number): Promise<OrderRecord[]> {
    return Array.from(this.ordersById.values())
      .filter((order) => order.userId === userId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, limit);
  }

  async listRecentOrders(limit: number): Promise<OrderRecord[]> {
    return Array.from(this.ordersById.values())
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      .slice(0, limit);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, updatedAt: Date): Promise<OrderRecord> {
    const existingOrder = this.ordersById.get(orderId);

    if (!existingOrder) {
      throw new Error(`Order ${orderId} was not found.`);
    }

    const updatedOrder: OrderRecord = {
      ...existingOrder,
      status,
      updatedAt
    };

    this.ordersById.set(orderId, updatedOrder);

    return updatedOrder;
  }

  async createStatusHistory(input: CreateStatusHistoryInput): Promise<StatusHistoryRecord> {
    const statusHistoryEntry: StatusHistoryRecord = {
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

  async findStatusHistoryByOrderId(orderId: string): Promise<StatusHistoryRecord[]> {
    return this.getStatusHistoryByOrderId(orderId);
  }

  getStatusHistoryByOrderId(orderId: string): StatusHistoryRecord[] {
    return this.statusHistory.filter((entry) => entry.orderId === orderId);
  }
}
