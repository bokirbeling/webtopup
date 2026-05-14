import { randomUUID } from "node:crypto";

import { InMemoryOrderRepository } from "../order/order.repository";
import { type PaymentOrderLookup, type PaymentRecord, type WebhookEventRecord } from "./payment.types";

export interface PaymentRepository {
  findOrderById(orderId: string): Promise<PaymentOrderLookup | null>;
  createPayment(input: {
    orderId: string;
    provider: string;
    idempotencyKey: string;
    providerPaymentId: string | null;
    providerReference: string | null;
    amountMinor: number;
    currency: string;
    status: PaymentRecord["status"];
    paidAt: Date | null;
    payload: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<PaymentRecord>;
  findPaymentByProviderAndReference(provider: string, providerReference: string): Promise<PaymentRecord | null>;
  findLatestPaymentByOrderId(orderId: string): Promise<PaymentRecord | null>;
  updatePaymentStatus(input: {
    paymentId: string;
    status: PaymentRecord["status"];
    paidAt: Date | null;
    payload: Record<string, unknown>;
    updatedAt: Date;
  }): Promise<PaymentRecord>;
  registerWebhookEvent(input: {
    provider: string;
    eventKey: string;
    eventType: string;
    orderId: string | null;
    paymentId: string | null;
    payload: Record<string, unknown>;
    receivedAt: Date;
  }): Promise<{ event: WebhookEventRecord; duplicate: boolean }>;
  updateWebhookEventState(input: {
    eventId: string;
    processingState: WebhookEventRecord["processingState"];
    processedAt: Date;
    errorMessage: string | null;
  }): Promise<WebhookEventRecord>;
}

type SupabasePaymentRepositoryOptions = Readonly<{
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  tablePrefix?: string;
}>;

function ensureObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function parseInteger(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number.parseInt(value, 10);
  }

  return Number.NaN;
}

function parseOrderRow(value: unknown): PaymentOrderLookup {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid order payload from persistence layer.");
  }

  const row = value as Record<string, unknown>;
  const amountMinor = parseInteger(row.amount_minor);

  if (
    typeof row.id !== "string" ||
    typeof row.order_number !== "string" ||
    !Number.isFinite(amountMinor) ||
    typeof row.currency !== "string" ||
    typeof row.status !== "string"
  ) {
    throw new Error("Missing required order fields from persistence layer.");
  }

  if (
    row.status !== "created" &&
    row.status !== "pending_payment" &&
    row.status !== "paid" &&
    row.status !== "fulfillment_pending" &&
    row.status !== "success" &&
    row.status !== "failed" &&
    row.status !== "expired"
  ) {
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

function parsePaymentStatus(value: unknown): PaymentRecord["status"] {
  if (
    value === "pending" ||
    value === "paid" ||
    value === "failed" ||
    value === "expired" ||
    value === "cancelled" ||
    value === "refunded"
  ) {
    return value;
  }

  throw new Error("Unexpected payment status from persistence layer.");
}

function parsePaymentRow(value: unknown): PaymentRecord {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid payments payload from persistence layer.");
  }

  const row = value as Record<string, unknown>;
  const amountMinor = parseInteger(row.amount_minor);

  if (
    typeof row.id !== "string" ||
    typeof row.order_id !== "string" ||
    typeof row.provider !== "string" ||
    typeof row.idempotency_key !== "string" ||
    !Number.isFinite(amountMinor) ||
    typeof row.currency !== "string" ||
    typeof row.created_at !== "string" ||
    typeof row.updated_at !== "string"
  ) {
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

function parseWebhookState(value: unknown): WebhookEventRecord["processingState"] {
  if (value === "pending" || value === "processed" || value === "ignored" || value === "failed") {
    return value;
  }

  throw new Error("Unexpected webhook state from persistence layer.");
}

function parseWebhookEventRow(value: unknown): WebhookEventRecord {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid webhook_events payload from persistence layer.");
  }

  const row = value as Record<string, unknown>;

  if (
    typeof row.id !== "string" ||
    typeof row.provider !== "string" ||
    typeof row.event_key !== "string" ||
    typeof row.event_type !== "string" ||
    typeof row.received_at !== "string"
  ) {
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

export class SupabasePaymentRepository implements PaymentRepository {
  private readonly baseUrl: string;

  constructor(private readonly options: SupabasePaymentRepositoryOptions) {
    this.baseUrl = options.supabaseUrl.replace(/\/$/, "");
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const scopedPath = this.options.tablePrefix === undefined
      ? path
      : path.replace(
          /\/rest\/v1\/(orders|payments|webhook_events)(?=\?)/,
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

  async findOrderById(orderId: string): Promise<PaymentOrderLookup | null> {
    const response = await this.request(
      `/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}&select=id,order_number,amount_minor,currency,status&limit=1`,
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

  async createPayment(input: {
    orderId: string;
    provider: string;
    idempotencyKey: string;
    providerPaymentId: string | null;
    providerReference: string | null;
    amountMinor: number;
    currency: string;
    status: PaymentRecord["status"];
    paidAt: Date | null;
    payload: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<PaymentRecord> {
    const response = await this.request(
      "/rest/v1/payments?select=id,order_id,provider,idempotency_key,provider_payment_id,provider_reference,amount_minor,currency,status,paid_at,payload,created_at,updated_at",
      {
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
      }
    );

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload));
    }

    if (!Array.isArray(payload) || payload.length !== 1) {
      throw new Error("Failed to persist payment record.");
    }

    return parsePaymentRow(payload[0]);
  }

  async findPaymentByProviderAndReference(provider: string, providerReference: string): Promise<PaymentRecord | null> {
    const response = await this.request(
      `/rest/v1/payments?provider=eq.${encodeURIComponent(provider)}&provider_reference=eq.${encodeURIComponent(providerReference)}&select=id,order_id,provider,idempotency_key,provider_payment_id,provider_reference,amount_minor,currency,status,paid_at,payload,created_at,updated_at&limit=1`,
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

    return parsePaymentRow(payload[0]);
  }

  async findLatestPaymentByOrderId(orderId: string): Promise<PaymentRecord | null> {
    const response = await this.request(
      "/rest/v1/payments?order_id=eq." + encodeURIComponent(orderId) + "&select=id,order_id,provider,idempotency_key,provider_payment_id,provider_reference,amount_minor,currency,status,paid_at,payload,created_at,updated_at&order=created_at.desc&limit=1",
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

    return parsePaymentRow(payload[0]);
  }

  async updatePaymentStatus(input: {
    paymentId: string;
    status: PaymentRecord["status"];
    paidAt: Date | null;
    payload: Record<string, unknown>;
    updatedAt: Date;
  }): Promise<PaymentRecord> {
    const response = await this.request(
      `/rest/v1/payments?id=eq.${encodeURIComponent(input.paymentId)}&select=id,order_id,provider,idempotency_key,provider_payment_id,provider_reference,amount_minor,currency,status,paid_at,payload,created_at,updated_at`,
      {
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
      }
    );

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload));
    }

    if (!Array.isArray(payload) || payload.length !== 1) {
      throw new Error(`Payment ${input.paymentId} was not found.`);
    }

    return parsePaymentRow(payload[0]);
  }

  async registerWebhookEvent(input: {
    provider: string;
    eventKey: string;
    eventType: string;
    orderId: string | null;
    paymentId: string | null;
    payload: Record<string, unknown>;
    receivedAt: Date;
  }): Promise<{ event: WebhookEventRecord; duplicate: boolean }> {
    const payloadObject = {
      provider: input.provider,
      event_key: input.eventKey,
      event_type: input.eventType,
      order_id: input.orderId,
      payment_id: input.paymentId,
      payload: input.payload,
      received_at: input.receivedAt.toISOString()
    };

    const insertResponse = await this.request(
      "/rest/v1/webhook_events?on_conflict=provider,event_key&select=id,provider,event_key,event_type,order_id,payment_id,payload,processing_state,received_at,processed_at,error_message",
      {
        method: "POST",
        headers: {
          Prefer: "resolution=ignore-duplicates,return=representation"
        },
        body: JSON.stringify(payloadObject)
      }
    );

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

    const readResponse = await this.request(
      `/rest/v1/webhook_events?provider=eq.${encodeURIComponent(input.provider)}&event_key=eq.${encodeURIComponent(input.eventKey)}&select=id,provider,event_key,event_type,order_id,payment_id,payload,processing_state,received_at,processed_at,error_message&limit=1`,
      {
        method: "GET"
      }
    );

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

  async updateWebhookEventState(input: {
    eventId: string;
    processingState: WebhookEventRecord["processingState"];
    processedAt: Date;
    errorMessage: string | null;
  }): Promise<WebhookEventRecord> {
    const response = await this.request(
      `/rest/v1/webhook_events?id=eq.${encodeURIComponent(input.eventId)}&select=id,provider,event_key,event_type,order_id,payment_id,payload,processing_state,received_at,processed_at,error_message`,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=representation"
        },
        body: JSON.stringify({
          processing_state: input.processingState,
          processed_at: input.processedAt.toISOString(),
          error_message: input.errorMessage
        })
      }
    );

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

export class InMemoryPaymentRepository implements PaymentRepository {
  private readonly paymentsById = new Map<string, PaymentRecord>();
  private readonly paymentKeyByProviderReference = new Map<string, string>();
  private readonly webhookEventByProviderKey = new Map<string, WebhookEventRecord>();

  constructor(private readonly orderRepository: InMemoryOrderRepository) {}

  async findOrderById(orderId: string): Promise<PaymentOrderLookup | null> {
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

  async createPayment(input: {
    orderId: string;
    provider: string;
    idempotencyKey: string;
    providerPaymentId: string | null;
    providerReference: string | null;
    amountMinor: number;
    currency: string;
    status: PaymentRecord["status"];
    paidAt: Date | null;
    payload: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<PaymentRecord> {
    const id = randomUUID();
    const payment: PaymentRecord = {
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

  async findPaymentByProviderAndReference(provider: string, providerReference: string): Promise<PaymentRecord | null> {
    const key = `${provider}:${providerReference}`;
    const paymentId = this.paymentKeyByProviderReference.get(key);

    if (!paymentId) {
      return null;
    }

    return this.paymentsById.get(paymentId) ?? null;
  }

  async findLatestPaymentByOrderId(orderId: string): Promise<PaymentRecord | null> {
    const payments = Array.from(this.paymentsById.values())
      .filter((payment) => payment.orderId === orderId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

    return payments[0] ?? null;
  }

  async updatePaymentStatus(input: {
    paymentId: string;
    status: PaymentRecord["status"];
    paidAt: Date | null;
    payload: Record<string, unknown>;
    updatedAt: Date;
  }): Promise<PaymentRecord> {
    const existing = this.paymentsById.get(input.paymentId);

    if (!existing) {
      throw new Error(`Payment ${input.paymentId} was not found.`);
    }

    const updated: PaymentRecord = {
      ...existing,
      status: input.status,
      paidAt: input.paidAt,
      payload: { ...input.payload },
      updatedAt: input.updatedAt
    };

    this.paymentsById.set(updated.id, updated);
    return updated;
  }

  async registerWebhookEvent(input: {
    provider: string;
    eventKey: string;
    eventType: string;
    orderId: string | null;
    paymentId: string | null;
    payload: Record<string, unknown>;
    receivedAt: Date;
  }): Promise<{ event: WebhookEventRecord; duplicate: boolean }> {
    const lookupKey = `${input.provider}:${input.eventKey}`;
    const existing = this.webhookEventByProviderKey.get(lookupKey);

    if (existing) {
      return {
        event: existing,
        duplicate: true
      };
    }

    const created: WebhookEventRecord = {
      id: randomUUID(),
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

  async updateWebhookEventState(input: {
    eventId: string;
    processingState: WebhookEventRecord["processingState"];
    processedAt: Date;
    errorMessage: string | null;
  }): Promise<WebhookEventRecord> {
    for (const [key, event] of this.webhookEventByProviderKey.entries()) {
      if (event.id !== input.eventId) {
        continue;
      }

      const updated: WebhookEventRecord = {
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

  getWebhookEventByProviderAndEventKey(provider: string, eventKey: string): WebhookEventRecord | null {
    return this.webhookEventByProviderKey.get(`${provider}:${eventKey}`) ?? null;
  }
}
