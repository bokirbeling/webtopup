import { randomUUID } from "node:crypto";

import {
  type CreatePlnInquiryInput,
  type CreatePostpaidInquiryInput,
  type PlnInquiryRecord,
  type PostpaidRecord,
  type UpdatePostpaidStateInput
} from "./postpaid.types";

export interface PostpaidRepository {
  upsertInquiry(input: CreatePostpaidInquiryInput): Promise<PostpaidRecord>;
  findInquiryByRefId(refId: string): Promise<PostpaidRecord | null>;
  updatePostpaidState(input: UpdatePostpaidStateInput): Promise<PostpaidRecord>;
  createPlnInquiry(input: CreatePlnInquiryInput): Promise<PlnInquiryRecord>;
}

type SupabasePostpaidRepositoryOptions = Readonly<{
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  tablePrefix?: string;
}>;

const POSTPAID_SELECT = "id,user_id,ref_id,buyer_sku_code,customer_no,customer_name,admin_minor,price_minor,selling_price_minor,status,rc,message,inquiry_status,inquiry_rc,inquiry_message,serial_number,metadata,raw_response,payment_raw_response,status_raw_response,paid_at,created_at,updated_at";
const PLN_SELECT = "id,user_id,customer_no,meter_no,subscriber_id,customer_name,segment_power,status,rc,message,raw_response,created_at,updated_at";

function ensureObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function nullableObject(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) {
    return null;
  }

  return ensureObject(value);
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function nullableDate(value: unknown): Date | null {
  return typeof value === "string" ? new Date(value) : null;
}

function nullableInteger(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isInteger(parsed) ? parsed : null;
}

function parsePostpaidRow(value: unknown): PostpaidRecord {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid postpaid inquiry payload from persistence layer.");
  }

  const row = value as Record<string, unknown>;
  if (
    typeof row.id !== "string" ||
    typeof row.user_id !== "string" ||
    typeof row.ref_id !== "string" ||
    typeof row.buyer_sku_code !== "string" ||
    typeof row.customer_no !== "string" ||
    typeof row.created_at !== "string" ||
    typeof row.updated_at !== "string"
  ) {
    throw new Error("Missing required postpaid inquiry fields from persistence layer.");
  }

  return {
    id: row.id,
    userId: row.user_id,
    refId: row.ref_id,
    buyerSkuCode: row.buyer_sku_code,
    customerNo: row.customer_no,
    customerName: nullableString(row.customer_name),
    adminMinor: nullableInteger(row.admin_minor),
    priceMinor: nullableInteger(row.price_minor),
    sellingPriceMinor: nullableInteger(row.selling_price_minor),
    status: nullableString(row.status),
    rc: nullableString(row.rc),
    message: nullableString(row.message),
    inquiryStatus: nullableString(row.inquiry_status),
    inquiryRc: nullableString(row.inquiry_rc),
    inquiryMessage: nullableString(row.inquiry_message),
    serialNumber: nullableString(row.serial_number),
    metadata: ensureObject(row.metadata),
    rawResponse: ensureObject(row.raw_response),
    paymentRawResponse: nullableObject(row.payment_raw_response),
    statusRawResponse: nullableObject(row.status_raw_response),
    paidAt: nullableDate(row.paid_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

function parsePlnRow(value: unknown): PlnInquiryRecord {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid PLN inquiry payload from persistence layer.");
  }

  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.user_id !== "string" || typeof row.customer_no !== "string" || typeof row.created_at !== "string" || typeof row.updated_at !== "string") {
    throw new Error("Missing required PLN inquiry fields from persistence layer.");
  }

  return {
    id: row.id,
    userId: row.user_id,
    customerNo: row.customer_no,
    meterNo: nullableString(row.meter_no),
    subscriberId: nullableString(row.subscriber_id),
    customerName: nullableString(row.customer_name),
    segmentPower: nullableString(row.segment_power),
    status: nullableString(row.status),
    rc: nullableString(row.rc),
    message: nullableString(row.message),
    rawResponse: ensureObject(row.raw_response),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
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

export class SupabasePostpaidRepository implements PostpaidRepository {
  private readonly baseUrl: string;

  constructor(private readonly options: SupabasePostpaidRepositoryOptions) {
    this.baseUrl = options.supabaseUrl.replace(/\/$/, "");
  }

  private tableName(table: "postpaid_inquiries" | "pln_inquiries") {
    return (this.options.tablePrefix ?? "") + table;
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      apikey: this.options.supabaseServiceRoleKey,
      Authorization: "Bearer " + this.options.supabaseServiceRoleKey,
      "Content-Type": "application/json"
    };

    if (init.headers) {
      Object.assign(headers, init.headers as Record<string, string>);
    }

    return fetch(this.baseUrl + path, {
      ...init,
      headers
    });
  }

  async upsertInquiry(input: CreatePostpaidInquiryInput): Promise<PostpaidRecord> {
    const response = await this.request(
      "/rest/v1/" + this.tableName("postpaid_inquiries") + "?on_conflict=ref_id&select=" + POSTPAID_SELECT,
      {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates,return=representation"
        },
        body: JSON.stringify({
          user_id: input.userId,
          ref_id: input.refId,
          buyer_sku_code: input.buyerSkuCode,
          customer_no: input.customerNo,
          customer_name: input.customerName,
          admin_minor: input.adminMinor,
          price_minor: input.priceMinor,
          selling_price_minor: input.sellingPriceMinor,
          status: input.status,
          rc: input.rc,
          message: input.message,
          inquiry_status: input.inquiryStatus,
          inquiry_rc: input.inquiryRc,
          inquiry_message: input.inquiryMessage,
          serial_number: input.serialNumber,
          metadata: input.metadata,
          raw_response: input.rawResponse,
          payment_raw_response: null,
          status_raw_response: null,
          paid_at: null,
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
      throw new Error("Failed to persist postpaid inquiry record.");
    }

    return parsePostpaidRow(payload[0]);
  }

  async findInquiryByRefId(refId: string): Promise<PostpaidRecord | null> {
    const response = await this.request(
      "/rest/v1/" + this.tableName("postpaid_inquiries") + "?ref_id=eq." + encodeURIComponent(refId) + "&select=" + POSTPAID_SELECT + "&limit=1",
      { method: "GET" }
    );

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload));
    }
    if (!Array.isArray(payload) || payload.length === 0) {
      return null;
    }

    return parsePostpaidRow(payload[0]);
  }

  async updatePostpaidState(input: UpdatePostpaidStateInput): Promise<PostpaidRecord> {
    const body: Record<string, unknown> = {
      status: input.status,
      rc: input.rc,
      message: input.message,
      serial_number: input.serialNumber,
      paid_at: input.paidAt?.toISOString() ?? null,
      updated_at: input.updatedAt.toISOString()
    };
    body[input.rawResponseKind === "payment" ? "payment_raw_response" : "status_raw_response"] = input.rawResponse;

    const response = await this.request(
      "/rest/v1/" + this.tableName("postpaid_inquiries") + "?ref_id=eq." + encodeURIComponent(input.refId) + "&select=" + POSTPAID_SELECT,
      {
        method: "PATCH",
        headers: {
          Prefer: "return=representation"
        },
        body: JSON.stringify(body)
      }
    );

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload));
    }
    if (!Array.isArray(payload) || payload.length !== 1) {
      throw new Error("Failed to update postpaid inquiry record.");
    }

    return parsePostpaidRow(payload[0]);
  }

  async createPlnInquiry(input: CreatePlnInquiryInput): Promise<PlnInquiryRecord> {
    const response = await this.request("/rest/v1/" + this.tableName("pln_inquiries") + "?select=" + PLN_SELECT, {
      method: "POST",
      headers: {
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        user_id: input.userId,
        customer_no: input.customerNo,
        meter_no: input.meterNo,
        subscriber_id: input.subscriberId,
        customer_name: input.customerName,
        segment_power: input.segmentPower,
        status: input.status,
        rc: input.rc,
        message: input.message,
        raw_response: input.rawResponse,
        created_at: input.createdAt.toISOString(),
        updated_at: input.updatedAt.toISOString()
      })
    });

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(extractErrorMessage(payload));
    }
    if (!Array.isArray(payload) || payload.length !== 1) {
      throw new Error("Failed to persist PLN inquiry record.");
    }

    return parsePlnRow(payload[0]);
  }
}

export class InMemoryPostpaidRepository implements PostpaidRepository {
  private readonly inquiriesByRefId = new Map<string, PostpaidRecord>();
  private readonly plnInquiries: PlnInquiryRecord[] = [];

  async upsertInquiry(input: CreatePostpaidInquiryInput): Promise<PostpaidRecord> {
    const existing = this.inquiriesByRefId.get(input.refId);
    const record: PostpaidRecord = {
      id: existing?.id ?? randomUUID(),
      userId: input.userId,
      refId: input.refId,
      buyerSkuCode: input.buyerSkuCode,
      customerNo: input.customerNo,
      customerName: input.customerName,
      adminMinor: input.adminMinor,
      priceMinor: input.priceMinor,
      sellingPriceMinor: input.sellingPriceMinor,
      status: input.status,
      rc: input.rc,
      message: input.message,
      inquiryStatus: input.inquiryStatus,
      inquiryRc: input.inquiryRc,
      inquiryMessage: input.inquiryMessage,
      serialNumber: input.serialNumber,
      metadata: input.metadata,
      rawResponse: input.rawResponse,
      paymentRawResponse: null,
      statusRawResponse: null,
      paidAt: null,
      createdAt: existing?.createdAt ?? input.createdAt,
      updatedAt: input.updatedAt
    };

    this.inquiriesByRefId.set(record.refId, record);
    return record;
  }

  async findInquiryByRefId(refId: string): Promise<PostpaidRecord | null> {
    return this.inquiriesByRefId.get(refId) ?? null;
  }

  async updatePostpaidState(input: UpdatePostpaidStateInput): Promise<PostpaidRecord> {
    const existing = this.inquiriesByRefId.get(input.refId);
    if (existing === undefined) {
      throw new Error("Postpaid inquiry was not found.");
    }

    const updated: PostpaidRecord = {
      ...existing,
      status: input.status,
      rc: input.rc,
      message: input.message,
      serialNumber: input.serialNumber,
      paymentRawResponse: input.rawResponseKind === "payment" ? input.rawResponse : existing.paymentRawResponse,
      statusRawResponse: input.rawResponseKind === "status" ? input.rawResponse : existing.statusRawResponse,
      paidAt: input.paidAt,
      updatedAt: input.updatedAt
    };

    this.inquiriesByRefId.set(updated.refId, updated);
    return updated;
  }

  async createPlnInquiry(input: CreatePlnInquiryInput): Promise<PlnInquiryRecord> {
    const record: PlnInquiryRecord = {
      id: randomUUID(),
      userId: input.userId,
      customerNo: input.customerNo,
      meterNo: input.meterNo,
      subscriberId: input.subscriberId,
      customerName: input.customerName,
      segmentPower: input.segmentPower,
      status: input.status,
      rc: input.rc,
      message: input.message,
      rawResponse: input.rawResponse,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt
    };

    this.plnInquiries.push(record);
    return record;
  }
}
