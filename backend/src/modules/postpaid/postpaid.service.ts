import { createDigiflazzBuyerClient, type DigiflazzBuyerResponse } from "../digiflazz/buyer-client";
import { type AuthUser } from "../auth/auth.types";
import { type PostpaidRepository } from "./postpaid.repository";
import { type PlnInquiryRecord, type PostpaidRecord } from "./postpaid.types";

type DigiflazzConfig = Readonly<{
  username: string | null;
  apiKey: string | null;
  apiBaseUrl: string;
  nodeEnv: "development" | "test" | "production";
  topupOptions?: Readonly<{
    testing?: boolean;
  }>;
}>;

type PostpaidServiceOptions = Readonly<{
  repository: PostpaidRepository;
  digiflazzConfig: DigiflazzConfig;
  fetchImpl?: typeof fetch;
  clock?: () => Date;
}>;

type PostpaidInquiryInput = Readonly<{
  authUser: AuthUser;
  buyerSkuCode: string;
  customerNo: string;
  refId: string;
  metadata?: unknown;
}>;

type RefInput = Readonly<{
  authUser: AuthUser;
  refId: string;
}>;

type PlnInquiryInput = Readonly<{
  authUser: AuthUser;
  customerNo: string;
}>;

export type PostpaidService = Readonly<{
  inquire(input: PostpaidInquiryInput): Promise<PostpaidRecord>;
  pay(input: RefInput): Promise<PostpaidRecord>;
  recheckStatus(input: RefInput): Promise<PostpaidRecord>;
  inquirePln(input: PlnInquiryInput): Promise<PlnInquiryRecord>;
}>;

export class PostpaidValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostpaidValidationError";
  }
}

export class PostpaidNotFoundError extends Error {
  constructor(refId: string) {
    super("Postpaid inquiry " + refId + " was not found.");
    this.name = "PostpaidNotFoundError";
  }
}

export class PostpaidForbiddenError extends Error {
  constructor() {
    super("Postpaid inquiry belongs to another user.");
    this.name = "PostpaidForbiddenError";
  }
}

export class PostpaidPaymentNotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostpaidPaymentNotAllowedError";
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeString(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized === "") {
    throw new PostpaidValidationError(field + " is required.");
  }

  return normalized;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function optionalInteger(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isInteger(parsed) ? parsed : null;
}

function parsePositiveInteger(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new PostpaidValidationError(field + " must be a positive integer.");
  }

  return parsed;
}

function isSuccessfulStatus(status: string | null, rc: string | null): boolean {
  return status?.toLowerCase() === "sukses" && (rc === null || rc === "00");
}

function responseRecord(response: DigiflazzBuyerResponse<unknown>): Record<string, unknown> {
  return toRecord(response.data);
}

function rawRecord(response: DigiflazzBuyerResponse<unknown>): Record<string, unknown> {
  return toRecord(response.raw);
}

function buildMetadata(input: Record<string, unknown>, responseData: Record<string, unknown>): Record<string, unknown> {
  return {
    ...input,
    periode: optionalString(responseData.periode),
    buyer_last_saldo: responseData.buyer_last_saldo ?? null,
    desc: toRecord(responseData.desc),
    detail: Array.isArray(toRecord(responseData.desc).detail) ? toRecord(responseData.desc).detail : []
  };
}

function assertOwner(record: PostpaidRecord, authUser: AuthUser) {
  if (record.userId !== authUser.id) {
    throw new PostpaidForbiddenError();
  }
}

async function requireOwnedRecord(repository: PostpaidRepository, input: RefInput): Promise<PostpaidRecord> {
  const refId = normalizeString(input.refId, "ref_id");
  const record = await repository.findInquiryByRefId(refId);
  if (record === null) {
    throw new PostpaidNotFoundError(refId);
  }

  assertOwner(record, input.authUser);
  return record;
}

function parseCategoryMetadata(metadata: unknown, buyerSkuCode: string, customerNo: string) {
  const metadataRecord = toRecord(metadata);
  const amount = parsePositiveInteger(metadataRecord.amount, "metadata.amount");
  const year = parsePositiveInteger(metadataRecord.year, "metadata.year");
  const sku = buyerSkuCode.toLowerCase();

  if (sku.includes("samsat") && customerNo.split(",").filter((part) => part.trim() !== "").length < 2) {
    throw new PostpaidValidationError("customer_no must contain the SAMSAT composite values separated by a comma.");
  }

  if (sku.includes("emoney") && amount === undefined) {
    throw new PostpaidValidationError("metadata.amount is required for E-Money inquiries.");
  }

  return { metadataRecord, amount, year };
}

function toPostpaidCreateInput(userId: string, requestMetadata: Record<string, unknown>, now: Date, response: DigiflazzBuyerResponse<unknown>) {
  const data = responseRecord(response);
  const status = response.status ?? optionalString(data.status);
  const rc = response.rc ?? optionalString(data.rc);
  const message = response.message ?? optionalString(data.message);

  return {
    userId,
    refId: normalizeString(optionalString(data.ref_id) ?? String(requestMetadata.ref_id ?? ""), "ref_id"),
    buyerSkuCode: normalizeString(optionalString(data.buyer_sku_code) ?? String(requestMetadata.buyer_sku_code ?? ""), "buyer_sku_code"),
    customerNo: normalizeString(optionalString(data.customer_no) ?? String(requestMetadata.customer_no ?? ""), "customer_no"),
    customerName: optionalString(data.customer_name) ?? optionalString(data.name),
    adminMinor: optionalInteger(data.admin),
    priceMinor: optionalInteger(data.price),
    sellingPriceMinor: optionalInteger(data.selling_price),
    status,
    rc,
    message,
    inquiryStatus: status,
    inquiryRc: rc,
    inquiryMessage: message,
    serialNumber: optionalString(data.sn),
    metadata: buildMetadata(requestMetadata, data),
    rawResponse: rawRecord(response),
    createdAt: now,
    updatedAt: now
  };
}

export function createPostpaidService(options: PostpaidServiceOptions): PostpaidService {
  const clock = options.clock ?? (() => new Date());
  const buyerClient = createDigiflazzBuyerClient(options.digiflazzConfig, options.fetchImpl);
  const testing = options.digiflazzConfig.topupOptions?.testing;

  return {
    async inquire(input) {
      const buyerSkuCode = normalizeString(input.buyerSkuCode, "buyer_sku_code");
      const customerNo = normalizeString(input.customerNo, "customer_no");
      const refId = normalizeString(input.refId, "ref_id");
      const existing = await options.repository.findInquiryByRefId(refId);
      if (existing !== null) {
        assertOwner(existing, input.authUser);
      }

      const categoryMetadata = parseCategoryMetadata(input.metadata, buyerSkuCode, customerNo);
      const response = await buyerClient.postpaidInquiry({
        buyerSkuCode,
        customerNo,
        refId,
        testing,
        amount: categoryMetadata.amount,
        year: categoryMetadata.year
      });
      const now = clock();

      return options.repository.upsertInquiry(
        toPostpaidCreateInput(
          input.authUser.id,
          {
            ...categoryMetadata.metadataRecord,
            buyer_sku_code: buyerSkuCode,
            customer_no: customerNo,
            ref_id: refId
          },
          now,
          response
        )
      );
    },

    async pay(input) {
      const record = await requireOwnedRecord(options.repository, input);
      if (!isSuccessfulStatus(record.inquiryStatus, record.inquiryRc)) {
        throw new PostpaidPaymentNotAllowedError("Payment requires a successful stored inquiry.");
      }
      if (record.sellingPriceMinor === null || record.sellingPriceMinor <= 0) {
        throw new PostpaidPaymentNotAllowedError("Stored inquiry does not contain a payable amount.");
      }

      const response = await buyerClient.postpaidPay({
        buyerSkuCode: record.buyerSkuCode,
        customerNo: record.customerNo,
        refId: record.refId,
        testing
      });
      const data = responseRecord(response);
      const status = response.status ?? optionalString(data.status);
      const rc = response.rc ?? optionalString(data.rc);
      const now = clock();

      return options.repository.updatePostpaidState({
        refId: record.refId,
        status,
        rc,
        message: response.message ?? optionalString(data.message),
        serialNumber: optionalString(data.sn) ?? record.serialNumber,
        rawResponse: rawRecord(response),
        rawResponseKind: "payment",
        paidAt: isSuccessfulStatus(status, rc) ? now : record.paidAt,
        updatedAt: now
      });
    },

    async recheckStatus(input) {
      const record = await requireOwnedRecord(options.repository, input);
      const response = await buyerClient.postpaidStatus({
        buyerSkuCode: record.buyerSkuCode,
        customerNo: record.customerNo,
        refId: record.refId,
        testing
      });
      const data = responseRecord(response);
      const status = response.status ?? optionalString(data.status);
      const rc = response.rc ?? optionalString(data.rc);
      const now = clock();

      return options.repository.updatePostpaidState({
        refId: record.refId,
        status,
        rc,
        message: response.message ?? optionalString(data.message),
        serialNumber: optionalString(data.sn) ?? record.serialNumber,
        rawResponse: rawRecord(response),
        rawResponseKind: "status",
        paidAt: isSuccessfulStatus(status, rc) ? (record.paidAt ?? now) : record.paidAt,
        updatedAt: now
      });
    },

    async inquirePln(input) {
      const customerNo = normalizeString(input.customerNo, "customer_no");
      const response = await buyerClient.plnInquiry({ customerNo });
      const data = responseRecord(response);
      const now = clock();

      return options.repository.createPlnInquiry({
        userId: input.authUser.id,
        customerNo: optionalString(data.customer_no) ?? customerNo,
        meterNo: optionalString(data.meter_no),
        subscriberId: optionalString(data.subscriber_id),
        customerName: optionalString(data.name) ?? optionalString(data.customer_name),
        segmentPower: optionalString(data.segment_power),
        status: response.status ?? optionalString(data.status),
        rc: response.rc ?? optionalString(data.rc),
        message: response.message ?? optionalString(data.message),
        rawResponse: rawRecord(response),
        createdAt: now,
        updatedAt: now
      });
    }
  };
}
