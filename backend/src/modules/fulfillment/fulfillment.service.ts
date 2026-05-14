import { createHash } from "node:crypto";

import { OrderTransitionError, type OrderService } from "../order/order.service";
import { type FulfillmentRepository } from "./fulfillment.repository";
import {
  type DigiflazzCallbackPayload,
  type FulfillmentProviderMode,
  type FulfillmentStatus
} from "./fulfillment.types";

type DigiflazzConfig = Readonly<{
  username: string | null;
  apiKey: string | null;
  apiBaseUrl: string;
  nodeEnv: "development" | "test" | "production";
}>;

type FulfillmentServiceOptions = Readonly<{
  fulfillmentRepository: FulfillmentRepository;
  orderService: OrderService;
  digiflazzConfig: DigiflazzConfig;
  fetchImpl?: typeof fetch;
  clock?: () => Date;
}>;

type TriggerFulfillmentInput = Readonly<{
  orderId: string;
}>;

export type FulfillmentService = Readonly<{
  triggerPaidOrderFulfillment(input: TriggerFulfillmentInput): Promise<{
    fulfillmentId: string;
    orderId: string;
    status: FulfillmentStatus;
    providerReference: string;
    providerMode: FulfillmentProviderMode;
  }>;
  handleDigiflazzCallback(payload: DigiflazzCallbackPayload): Promise<{
    code: "PROCESSED" | "DUPLICATE" | "IGNORED";
    message: string;
  }>;
}>;

export class FulfillmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FulfillmentValidationError";
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function requireString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function isLiveDigiflazzConfigured(config: DigiflazzConfig): boolean {
  return config.username !== null && config.username.trim() !== "" && config.apiKey !== null && config.apiKey.trim() !== "";
}

function resolveProviderMode(config: DigiflazzConfig): FulfillmentProviderMode {
  if (isLiveDigiflazzConfigured(config)) {
    return "live";
  }

  if (config.nodeEnv === "production") {
    throw new FulfillmentValidationError("Digiflazz credentials are required in production.");
  }

  return "mock";
}

function signDigiflazz(username: string, apiKey: string, refId: string): string {
  return createHash("md5").update(username + apiKey + refId).digest("hex");
}

function mapDigiflazzStatus(rawStatus: string | null): FulfillmentStatus {
  const status = rawStatus?.toLowerCase() ?? "";
  if (status === "sukses" || status === "success" || status === "berhasil") {
    return "success";
  }
  if (status === "gagal" || status === "failed" || status === "error") {
    return "failed";
  }
  return "processing";
}

function extractCallbackData(payload: DigiflazzCallbackPayload): Record<string, unknown> {
  return toRecord(payload.data ?? payload);
}

function extractEventKey(data: Record<string, unknown>): string {
  const refId = requireString(data.ref_id);
  const trxId = requireString(data.trx_id);
  const status = requireString(data.status) ?? "unknown";
  const rc = requireString(data.rc) ?? "-";

  if (refId === null) {
    throw new FulfillmentValidationError("Digiflazz callback missing ref_id.");
  }

  return [refId, trxId ?? "-", status, rc].join(":");
}

async function readJson(response: Response): Promise<unknown> {
  const bodyText = await response.text();
  if (bodyText.trim() === "") {
    return {};
  }
  return JSON.parse(bodyText) as unknown;
}

function digiflazzPayloadFor(order: {
  productCode: string;
  customerRef: string | null;
}, username: string, apiKey: string, refId: string): Record<string, unknown> {
  return {
    username,
    buyer_sku_code: order.productCode,
    customer_no: order.customerRef ?? "",
    ref_id: refId,
    sign: signDigiflazz(username, apiKey, refId)
  };
}

function modeResponsePayload(mode: FulfillmentProviderMode, payload: Record<string, unknown>): Record<string, unknown> {
  return {
    ...payload,
    provider_mode: mode
  };
}

export function createFulfillmentService(options: FulfillmentServiceOptions): FulfillmentService {
  const fetchImpl = options.fetchImpl ?? fetch;
  const clock = options.clock ?? (() => new Date());
  const provider = "digiflazz";

  return {
    async triggerPaidOrderFulfillment(input: TriggerFulfillmentInput) {
      const now = clock();
      const order = await options.fulfillmentRepository.findOrderById(input.orderId);
      if (!order) {
        throw new FulfillmentValidationError("Order " + input.orderId + " was not found.");
      }
      if (order.status !== "paid") {
        throw new FulfillmentValidationError("Order " + input.orderId + " is in " + order.status + " state. Fulfillment requires paid status.");
      }
      if (order.provider !== provider) {
        throw new FulfillmentValidationError("Order " + input.orderId + " uses unsupported fulfillment provider " + order.provider + ".");
      }

      const providerMode = resolveProviderMode(options.digiflazzConfig);
      const providerReference = order.id;
      const existing = await options.fulfillmentRepository.findFulfillmentByProviderAndReference(provider, providerReference);
      if (existing) {
        return {
          fulfillmentId: existing.id,
          orderId: existing.orderId,
          status: existing.status,
          providerReference,
          providerMode: (existing.responsePayload.provider_mode as FulfillmentProviderMode | undefined) ?? providerMode
        };
      }

      await options.orderService.transitionOrderStatus({
        orderId: order.id,
        toStatus: "fulfillment_pending",
        note: "digiflazz_fulfillment_started",
        metadata: { provider, providerMode },
        createdBy: "fulfillment_service"
      });

      if (providerMode === "mock") {
        const responsePayload = modeResponsePayload("mock", {
          status: "Sukses",
          ref_id: providerReference,
          sn: "MOCK-SN-" + order.orderNumber,
          message: "Mock Digiflazz fulfillment succeeded."
        });
        const fulfillment = await options.fulfillmentRepository.createFulfillment({
          orderId: order.id,
          provider,
          attemptNo: 1,
          providerFulfillmentId: "mock-" + order.id,
          providerReference,
          status: "success",
          serialNumber: String(responsePayload.sn),
          requestPayload: modeResponsePayload("mock", { order_id: order.id, product_code: order.productCode, customer_ref: order.customerRef }),
          responsePayload,
          processedAt: now,
          createdAt: now,
          updatedAt: now
        });
        await options.orderService.transitionOrderStatus({
          orderId: order.id,
          toStatus: "success",
          note: "digiflazz_mock_success",
          metadata: { provider, fulfillmentId: fulfillment.id, providerReference, providerMode: "mock" },
          createdBy: "fulfillment_service"
        });
        return { fulfillmentId: fulfillment.id, orderId: order.id, status: fulfillment.status, providerReference, providerMode: "mock" };
      }

      const username = options.digiflazzConfig.username;
      const apiKey = options.digiflazzConfig.apiKey;
      if (username === null || apiKey === null) {
        throw new FulfillmentValidationError("Digiflazz credentials are required for live fulfillment.");
      }
      const requestPayload = digiflazzPayloadFor(order, username, apiKey, providerReference);
      const response = await fetchImpl(options.digiflazzConfig.apiBaseUrl + "/v1/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload)
      });
      const responsePayload = toRecord(await readJson(response));
      if (!response.ok) {
        throw new Error("Digiflazz transaction request failed.");
      }
      const responseData = toRecord(responsePayload.data ?? responsePayload);
      const status = mapDigiflazzStatus(requireString(responseData.status));
      const fulfillment = await options.fulfillmentRepository.createFulfillment({
        orderId: order.id,
        provider,
        attemptNo: 1,
        providerFulfillmentId: requireString(responseData.trx_id),
        providerReference,
        status,
        serialNumber: requireString(responseData.sn),
        requestPayload,
        responsePayload: modeResponsePayload("live", responsePayload),
        processedAt: status === "success" || status === "failed" ? now : null,
        createdAt: now,
        updatedAt: now
      });
      return { fulfillmentId: fulfillment.id, orderId: order.id, status: fulfillment.status, providerReference, providerMode: "live" };
    },

    async handleDigiflazzCallback(payload: DigiflazzCallbackPayload) {
      const now = clock();
      const data = extractCallbackData(payload);
      const refId = requireString(data.ref_id);
      if (refId === null) {
        throw new FulfillmentValidationError("Digiflazz callback missing ref_id.");
      }
      const eventKey = extractEventKey(data);
      const fulfillment = await options.fulfillmentRepository.findFulfillmentByProviderAndReference(provider, refId);
      const registration = await options.fulfillmentRepository.registerWebhookEvent({
        provider,
        eventKey,
        eventType: requireString(data.status) ?? "unknown",
        orderId: fulfillment?.orderId ?? null,
        fulfillmentId: fulfillment?.id ?? null,
        payload: toRecord(payload),
        receivedAt: now
      });
      if (registration.duplicate) {
        return { code: "DUPLICATE" as const, message: "Duplicate Digiflazz callback ignored." };
      }
      if (!fulfillment) {
        await options.fulfillmentRepository.updateWebhookEventState({ eventId: registration.event.id, processingState: "failed", processedAt: now, errorMessage: "Fulfillment for ref_id " + refId + " was not found." });
        throw new FulfillmentValidationError("Fulfillment for ref_id " + refId + " was not found.");
      }

      const status = mapDigiflazzStatus(requireString(data.status));
      const updated = await options.fulfillmentRepository.updateFulfillmentStatus({
        fulfillmentId: fulfillment.id,
        providerFulfillmentId: requireString(data.trx_id) ?? fulfillment.providerFulfillmentId,
        status,
        serialNumber: requireString(data.sn) ?? fulfillment.serialNumber,
        responsePayload: modeResponsePayload("live", data),
        processedAt: status === "success" || status === "failed" ? now : null,
        updatedAt: now
      });

      if (status === "success" || status === "failed") {
        try {
          await options.orderService.transitionOrderStatus({
            orderId: updated.orderId,
            toStatus: status === "success" ? "success" : "failed",
            note: "digiflazz_callback_" + status,
            metadata: { provider, webhookEventId: registration.event.id, fulfillmentId: updated.id, providerReference: refId, transactionId: updated.providerFulfillmentId },
            createdBy: "digiflazz_callback"
          });
        } catch (error) {
          if (error instanceof OrderTransitionError) {
            await options.fulfillmentRepository.updateWebhookEventState({ eventId: registration.event.id, processingState: "ignored", processedAt: now, errorMessage: error.message });
            return { code: "IGNORED" as const, message: "Callback did not mutate order due to monotonic transition guard." };
          }
          throw error;
        }
      }

      await options.fulfillmentRepository.updateWebhookEventState({ eventId: registration.event.id, processingState: "processed", processedAt: now, errorMessage: null });
      return { code: "PROCESSED" as const, message: "Digiflazz callback processed." };
    }
  };
}
