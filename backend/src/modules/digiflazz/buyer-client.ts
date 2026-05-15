import { createHash } from "node:crypto";

export type DigiflazzBuyerCredentials = Readonly<{
  username: string;
  apiKey: string;
}>;

export type DigiflazzBuyerConfig = Readonly<{
  username: string | null;
  apiKey: string | null;
  apiBaseUrl: string;
}>;

export type DigiflazzBuyerRequest = Readonly<Record<string, string | number | boolean>>;

export type DigiflazzBuyerResponse<TData = unknown> = Readonly<{
  data: TData;
  raw: unknown;
  rc: string | null;
  message: string | null;
  status: string | null;
}>;

export class DigiflazzBuyerCredentialError extends Error {
  constructor(missingFields: readonly string[]) {
    super("Missing Digiflazz Buyer credentials: " + missingFields.join(", ") + ".");
    this.name = "DigiflazzBuyerCredentialError";
  }
}

type TopupRequestInput = Readonly<{
  credentials: DigiflazzBuyerCredentials;
  buyerSkuCode: string;
  customerNo: string;
  refId: string;
  testing?: boolean;
  maxPrice?: number;
  callbackUrl?: string;
  allowDot?: boolean;
}>;

type PriceListRequestInput = Readonly<{
  credentials: DigiflazzBuyerCredentials;
  cmd: "prepaid" | "pasca";
  code?: string;
  category?: string;
  brand?: string;
  type?: string;
}>;

type PostpaidRequestInput = Readonly<{
  credentials: DigiflazzBuyerCredentials;
  buyerSkuCode: string;
  customerNo: string;
  refId: string;
  testing?: boolean;
  amount?: number;
  year?: number;
}>;

type PlnInquiryRequestInput = Readonly<{
  credentials: DigiflazzBuyerCredentials;
  customerNo: string;
}>;

type DepositTicketRequestInput = Readonly<{
  credentials: DigiflazzBuyerCredentials;
  amount: number;
  bank: string;
  ownerName: string;
}>;

type PostJsonOptions = Readonly<{
  fetchImpl: typeof fetch;
  apiBaseUrl: string;
  path: string;
  payload: DigiflazzBuyerRequest;
}>;

function hasText(value: string | null): value is string {
  return value !== null && value.trim() !== "";
}

function addOptional<T extends Record<string, string | number | boolean>>(payload: T, key: string, value: string | number | boolean | undefined): DigiflazzBuyerRequest {
  if (value === undefined) {
    return payload;
  }

  return { ...payload, [key]: value };
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

async function readJson(response: Response): Promise<unknown> {
  const bodyText = await response.text();
  if (bodyText.trim() === "") {
    return {};
  }

  return JSON.parse(bodyText) as unknown;
}

async function postJson<TData>(options: PostJsonOptions): Promise<DigiflazzBuyerResponse<TData>> {
  const response = await options.fetchImpl(options.apiBaseUrl + options.path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options.payload)
  });
  const raw = await readJson(response);

  if (!response.ok) {
    throw new Error("Digiflazz Buyer request failed for " + options.path + ".");
  }

  return parseDigiflazzBuyerResponse<TData>(raw);
}

export function signDigiflazzBuyer(credentials: DigiflazzBuyerCredentials, seed: string): string {
  return createHash("md5").update(credentials.username + credentials.apiKey + seed).digest("hex");
}

export function missingDigiflazzBuyerCredentialFields(config: Pick<DigiflazzBuyerConfig, "username" | "apiKey">): readonly string[] {
  const missingFields: string[] = [];

  if (!hasText(config.username)) {
    missingFields.push("DIGIFLAZZ_USERNAME");
  }
  if (!hasText(config.apiKey)) {
    missingFields.push("DIGIFLAZZ_API_KEY");
  }

  return missingFields;
}

export function requireDigiflazzBuyerCredentials(config: Pick<DigiflazzBuyerConfig, "username" | "apiKey">): DigiflazzBuyerCredentials {
  const missingFields = missingDigiflazzBuyerCredentialFields(config);

  if (missingFields.length > 0) {
    throw new DigiflazzBuyerCredentialError(missingFields);
  }

  return {
    username: config.username as string,
    apiKey: config.apiKey as string
  };
}

export function buildDigiflazzTopupRequest(input: TopupRequestInput): DigiflazzBuyerRequest {
  const payload = {
    username: input.credentials.username,
    buyer_sku_code: input.buyerSkuCode,
    customer_no: input.customerNo,
    ref_id: input.refId,
    sign: signDigiflazzBuyer(input.credentials, input.refId)
  };

  return addOptional(addOptional(addOptional(addOptional(payload, "testing", input.testing), "max_price", input.maxPrice), "cb_url", input.callbackUrl), "allow_dot", input.allowDot);
}

export function buildDigiflazzPriceListRequest(input: PriceListRequestInput): DigiflazzBuyerRequest {
  let payload: DigiflazzBuyerRequest = {
    cmd: input.cmd,
    username: input.credentials.username,
    sign: signDigiflazzBuyer(input.credentials, "pricelist")
  };

  payload = addOptional(payload, "code", input.code);
  payload = addOptional(payload, "category", input.category);
  payload = addOptional(payload, "brand", input.brand);
  return addOptional(payload, "type", input.type);
}

export function buildDigiflazzBalanceRequest(credentials: DigiflazzBuyerCredentials): DigiflazzBuyerRequest {
  return {
    cmd: "deposit",
    username: credentials.username,
    sign: signDigiflazzBuyer(credentials, "depo")
  };
}

export function buildDigiflazzPostpaidInquiryRequest(input: PostpaidRequestInput): DigiflazzBuyerRequest {
  return buildDigiflazzPostpaidRequest("inq-pasca", input);
}

export function buildDigiflazzPostpaidPayRequest(input: PostpaidRequestInput): DigiflazzBuyerRequest {
  return buildDigiflazzPostpaidRequest("pay-pasca", input);
}

export function buildDigiflazzPostpaidStatusRequest(input: PostpaidRequestInput): DigiflazzBuyerRequest {
  return buildDigiflazzPostpaidRequest("status-pasca", input);
}

export function buildDigiflazzPlnInquiryRequest(input: PlnInquiryRequestInput): DigiflazzBuyerRequest {
  return {
    username: input.credentials.username,
    customer_no: input.customerNo,
    sign: signDigiflazzBuyer(input.credentials, input.customerNo)
  };
}

export function buildDigiflazzDepositTicketRequest(input: DepositTicketRequestInput): DigiflazzBuyerRequest {
  return {
    username: input.credentials.username,
    amount: input.amount,
    bank: input.bank,
    owner_name: input.ownerName,
    sign: signDigiflazzBuyer(input.credentials, "deposit")
  };
}

export function parseDigiflazzBuyerResponse<TData = unknown>(payload: unknown): DigiflazzBuyerResponse<TData> {
  const wrapper = toRecord(payload);
  const data = Object.prototype.hasOwnProperty.call(wrapper, "data") ? wrapper.data : payload;
  const dataRecord = toRecord(data);

  return {
    data: data as TData,
    raw: payload,
    rc: optionalString(dataRecord.rc),
    message: optionalString(dataRecord.message),
    status: optionalString(dataRecord.status)
  };
}

export function createDigiflazzBuyerClient(config: DigiflazzBuyerConfig, fetchImpl: typeof fetch = fetch) {
  const credentials = () => requireDigiflazzBuyerCredentials(config);

  return {
    async topup(input: Omit<TopupRequestInput, "credentials">) {
      const payload = buildDigiflazzTopupRequest({ ...input, credentials: credentials() });
      return postJson({ fetchImpl, apiBaseUrl: config.apiBaseUrl, path: "/v1/transaction", payload });
    },
    async priceList(input: Omit<PriceListRequestInput, "credentials">) {
      const payload = buildDigiflazzPriceListRequest({ ...input, credentials: credentials() });
      return postJson({ fetchImpl, apiBaseUrl: config.apiBaseUrl, path: "/v1/price-list", payload });
    },
    async balance() {
      const payload = buildDigiflazzBalanceRequest(credentials());
      return postJson({ fetchImpl, apiBaseUrl: config.apiBaseUrl, path: "/v1/cek-saldo", payload });
    },
    async postpaidInquiry(input: Omit<PostpaidRequestInput, "credentials">) {
      const payload = buildDigiflazzPostpaidInquiryRequest({ ...input, credentials: credentials() });
      return postJson({ fetchImpl, apiBaseUrl: config.apiBaseUrl, path: "/v1/transaction", payload });
    },
    async postpaidPay(input: Omit<PostpaidRequestInput, "credentials">) {
      const payload = buildDigiflazzPostpaidPayRequest({ ...input, credentials: credentials() });
      return postJson({ fetchImpl, apiBaseUrl: config.apiBaseUrl, path: "/v1/transaction", payload });
    },
    async postpaidStatus(input: Omit<PostpaidRequestInput, "credentials">) {
      const payload = buildDigiflazzPostpaidStatusRequest({ ...input, credentials: credentials() });
      return postJson({ fetchImpl, apiBaseUrl: config.apiBaseUrl, path: "/v1/transaction", payload });
    },
    async plnInquiry(input: Omit<PlnInquiryRequestInput, "credentials">) {
      const payload = buildDigiflazzPlnInquiryRequest({ ...input, credentials: credentials() });
      return postJson({ fetchImpl, apiBaseUrl: config.apiBaseUrl, path: "/v1/inquiry-pln", payload });
    },
    async depositTicket(input: Omit<DepositTicketRequestInput, "credentials">) {
      const payload = buildDigiflazzDepositTicketRequest({ ...input, credentials: credentials() });
      return postJson({ fetchImpl, apiBaseUrl: config.apiBaseUrl, path: "/v1/deposit", payload });
    }
  };
}

function buildDigiflazzPostpaidRequest(command: "inq-pasca" | "pay-pasca" | "status-pasca", input: PostpaidRequestInput): DigiflazzBuyerRequest {
  const payload = {
    commands: command,
    username: input.credentials.username,
    buyer_sku_code: input.buyerSkuCode,
    customer_no: input.customerNo,
    ref_id: input.refId,
    sign: signDigiflazzBuyer(input.credentials, input.refId)
  };

  return addOptional(addOptional(addOptional(payload, "testing", input.testing), "amount", input.amount), "year", input.year);
}
