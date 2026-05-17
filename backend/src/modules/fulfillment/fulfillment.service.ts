import {
  buildDigiflazzTopupRequest,
  type DigiflazzBuyerRequest,
  missingDigiflazzBuyerCredentialFields,
  parseDigiflazzBuyerResponse,
  requireDigiflazzBuyerCredentials
} from "../digiflazz/buyer-client";
import { type OrderService } from "../order/order.service";
import { OrderTransitionError } from "../order/order.transition.service";
import { type OrderRepository } from "../order/order.repository";
import { type CommissionService } from "../commission/commission.service";
import { type FulfillmentRepository } from "./fulfillment.repository";
import { type ProviderAuditRepository } from "../audit/provider-audit.types";
import {
  type DigiflazzCallbackPayload,
  type FulfillmentOrderLookup,
  type FulfillmentProviderMode,
  type FulfillmentRecord,
  type FulfillmentStatus
} from "./fulfillment.types";

type DigiflazzTopupOptions = Readonly<{
  testing?: boolean;
  maxPrice?: number;
  callbackUrl?: string;
  allowDot?: boolean;
}>;

type DigiflazzConfig = Readonly<{
  username: string | null;
  apiKey: string | null;
  apiBaseUrl: string;
  nodeEnv: "development" | "test" | "production";
  topupOptions?: DigiflazzTopupOptions;
}>;

type FulfillmentServiceOptions = Readonly<{
  fulfillmentRepository: FulfillmentRepository;
  orderService: OrderService;
  commissionService?: CommissionService;
  digiflazzConfig: DigiflazzConfig;
  providerAuditRepository?: ProviderAuditRepository;
  fetchImpl?: typeof fetch;
  clock?: () => Date;
}>;

type FulfillmentResult = Readonly<{
  fulfillmentId: string;
  orderId: string;
  status: FulfillmentStatus;
  providerReference: string;
  providerMode: FulfillmentProviderMode;
}>;

type TriggerFulfillmentInput = Readonly<{
  orderId: string;
}>;

type DigiflazzCallbackContext = Readonly<{
  eventType?: string;
  userAgent?: string;
}>;

type LiveTopupResult = Readonly<{
  requestPayload: DigiflazzBuyerRequest;
  responsePayload: Record<string, unknown>;
  responseData: Record<string, unknown>;
  status: FulfillmentStatus;
}>;

export type FulfillmentService = Readonly<{
  triggerPaidOrderFulfillment(input: TriggerFulfillmentInput): Promise<FulfillmentResult>;
  recheckPendingFulfillment(input: TriggerFulfillmentInput): Promise<FulfillmentResult>;
  handleDigiflazzCallback(payload: DigiflazzCallbackPayload, context?: DigiflazzCallbackContext): Promise<{
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
  return missingDigiflazzBuyerCredentialFields(config).length === 0;
}

function resolveProviderMode(config: DigiflazzConfig): FulfillmentProviderMode {
  if (isLiveDigiflazzConfigured(config)) {
    return "live";
  }

  if (config.nodeEnv === "production") {
    throw new FulfillmentValidationError("Digiflazz credentials are required in production. Missing: " + missingDigiflazzBuyerCredentialFields(config).join(", ") + ".");
  }

  return "mock";
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

function isTerminalStatus(status: FulfillmentStatus): boolean {
  return status === "success" || status === "failed";
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

function modeResponsePayload(mode: FulfillmentProviderMode, payload: Record<string, unknown>): Record<string, unknown> {
  return {
    ...payload,
    provider_mode: mode
  };
}

function providerModeFromFulfillment(fulfillment: FulfillmentRecord, fallback: FulfillmentProviderMode): FulfillmentProviderMode {
  return fulfillment.responsePayload.provider_mode === "live" || fulfillment.responsePayload.provider_mode === "mock"
    ? fulfillment.responsePayload.provider_mode
    : fallback;
}

function buildWebhookEventPayload(payload: DigiflazzCallbackPayload, data: Record<string, unknown>, context: DigiflazzCallbackContext | undefined): Record<string, unknown> {
  return {
    ...toRecord(payload),
    metadata: {
      digiflazz_event: context?.eventType ?? "unknown",
      user_agent: context?.userAgent ?? null,
      rc: requireString(data.rc),
      message: requireString(data.message),
      status: requireString(data.status)
    }
  };
}

export function createFulfillmentService(options: FulfillmentServiceOptions): FulfillmentService {
  const fetchImpl = options.fetchImpl ?? fetch;
  const clock = options.clock ?? (() => new Date());
  const provider = "digiflazz";

  async function sendLiveTopup(order: FulfillmentOrderLookup, providerReference: string): Promise<LiveTopupResult> {
    const credentials = requireDigiflazzBuyerCredentials(options.digiflazzConfig);
    const requestPayload = buildDigiflazzTopupRequest({
      credentials,
      buyerSkuCode: order.productCode,
      customerNo: order.customerRef ?? "",
      refId: providerReference,
      testing: options.digiflazzConfig.topupOptions?.testing,
      maxPrice: options.digiflazzConfig.topupOptions?.maxPrice,
      callbackUrl: options.digiflazzConfig.topupOptions?.callbackUrl,
      allowDot: options.digiflazzConfig.topupOptions?.allowDot
    });
    const response = await fetchImpl(options.digiflazzConfig.apiBaseUrl + "/v1/transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload)
    });
    const rawResponsePayload = await readJson(response);
    if (!response.ok) {
      throw new Error("Digiflazz transaction request failed.");
    }
    const parsedResponse = parseDigiflazzBuyerResponse(rawResponsePayload);
    const responsePayload = toRecord(parsedResponse.raw);

    return {
      requestPayload,
      responsePayload,
      responseData: toRecord(parsedResponse.data),
      status: mapDigiflazzStatus(parsedResponse.status)
    };
  }

  async function transitionTerminalOrderStatus(fulfillment: FulfillmentRecord, status: FulfillmentStatus, metadata: Record<string, unknown>, note: string, createdBy: string): Promise<boolean> {
    if (!isTerminalStatus(status)) {
      return true;
    }

    try {
      await options.orderService.transitionOrderStatus({
        orderId: fulfillment.orderId,
        toStatus: status === "success" ? "success" : "failed",
        note,
        metadata,
        createdBy
      });
      return true;
    } catch (error) {
      if (error instanceof OrderTransitionError) {
        return false;
      }
      throw error;
    }
  }

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
          providerMode: providerModeFromFulfillment(existing, providerMode)
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

        // S5: Mark commission payable if order is success
        if (options.commissionService) {
          await options.commissionService.markCommissionPayable(order.id);
        }

        return { fulfillmentId: fulfillment.id, orderId: order.id, status: fulfillment.status, providerReference, providerMode: "mock" };
      }

      const topup = await sendLiveTopup(order, providerReference);
      const fulfillment = await options.fulfillmentRepository.createFulfillment({
        orderId: order.id,
        provider,
        attemptNo: 1,
        providerFulfillmentId: requireString(topup.responseData.trx_id),
        providerReference,
        status: topup.status,
        serialNumber: requireString(topup.responseData.sn),
        requestPayload: topup.requestPayload,
        responsePayload: modeResponsePayload("live", topup.responsePayload),
        processedAt: isTerminalStatus(topup.status) ? now : null,
        createdAt: now,
        updatedAt: now
      });

      if (options.providerAuditRepository) {
        await options.providerAuditRepository.recordProviderEvent({
          orderId: order.id,
          paymentId: null,
          fulfillmentId: fulfillment.id,
          provider: "digiflazz",
          eventType: "api_response_topup",
          providerReference: fulfillment.providerFulfillmentId ?? providerReference,
          providerStatus: topup.status,
          providerCode: requireString(topup.responseData.rc),
          providerMessage: requireString(topup.responseData.message),
          amountMinor: order.amountMinor,
          skuDigiflazz: order.productCode,
          customerNoMasked: order.customerRef,
          serialNumber: fulfillment.serialNumber,
          signatureVerified: true,
          amountMatched: true,
          idempotencyKey: providerReference,
          rawPayload: toRecord(topup.responsePayload),
          safeSummary: `Digiflazz topup response: ${topup.status}. RC: ${topup.responseData.rc}`
        });
      }

      return { fulfillmentId: fulfillment.id, orderId: order.id, status: fulfillment.status, providerReference, providerMode: "live" };
    },

    async recheckPendingFulfillment(input: TriggerFulfillmentInput) {
      const now = clock();
      const order = await options.fulfillmentRepository.findOrderById(input.orderId);
      if (!order) {
        throw new FulfillmentValidationError("Order " + input.orderId + " was not found.");
      }
      if (order.provider !== provider) {
        throw new FulfillmentValidationError("Order " + input.orderId + " uses unsupported fulfillment provider " + order.provider + ".");
      }

      const existing = await options.fulfillmentRepository.findLatestFulfillmentByOrderId(order.id);
      if (!existing || existing.provider !== provider || existing.providerReference === null) {
        throw new FulfillmentValidationError("Order " + order.id + " has no Digiflazz fulfillment to recheck.");
      }

      const providerMode = providerModeFromFulfillment(existing, resolveProviderMode(options.digiflazzConfig));
      if (providerMode !== "live") {
        return { fulfillmentId: existing.id, orderId: existing.orderId, status: existing.status, providerReference: existing.providerReference, providerMode };
      }
      if (existing.status !== "processing") {
        return { fulfillmentId: existing.id, orderId: existing.orderId, status: existing.status, providerReference: existing.providerReference, providerMode };
      }

      const topup = await sendLiveTopup(order, existing.providerReference);
      const updated = await options.fulfillmentRepository.updateFulfillmentStatus({
        fulfillmentId: existing.id,
        providerFulfillmentId: requireString(topup.responseData.trx_id) ?? existing.providerFulfillmentId,
        status: topup.status,
        serialNumber: requireString(topup.responseData.sn) ?? existing.serialNumber,
        responsePayload: modeResponsePayload("live", topup.responsePayload),
        processedAt: isTerminalStatus(topup.status) ? now : null,
        updatedAt: now
      });

      const transitioned = await transitionTerminalOrderStatus(
        updated,
        topup.status,
        { provider, fulfillmentId: updated.id, providerReference: existing.providerReference, transactionId: updated.providerFulfillmentId, recheck: true },
        "digiflazz_recheck_" + topup.status,
        "fulfillment_recheck"
      );

      // S5: Mark commission payable if order is success
      if (status === "success" && options.commissionService) {
        await options.commissionService.markCommissionPayable(updated.orderId);
      }

      return { fulfillmentId: updated.id, orderId: updated.orderId, status: updated.status, providerReference: existing.providerReference, providerMode };
    },

    async handleDigiflazzCallback(payload: DigiflazzCallbackPayload, context?: DigiflazzCallbackContext) {
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
        eventType: context?.eventType ?? "unknown",
        orderId: fulfillment?.orderId ?? null,
        fulfillmentId: fulfillment?.id ?? null,
        payload: buildWebhookEventPayload(payload, data, context),
        receivedAt: now
      });
      if (registration.duplicate) {
        return { code: "DUPLICATE" as const, message: "Duplicate Digiflazz callback ignored." };
      }
      if (!fulfillment) {
        await options.fulfillmentRepository.updateWebhookEventState({ eventId: registration.event.id, processingState: "failed", processedAt: now, errorMessage: "Fulfillment for ref_id " + refId + " was not found." });
        throw new FulfillmentValidationError("Fulfillment for ref_id " + refId + " was not found.");
      }

      const order = await options.orderService.findOrderById(fulfillment.orderId);

      const status = mapDigiflazzStatus(requireString(data.status));
      const updated = await options.fulfillmentRepository.updateFulfillmentStatus({
        fulfillmentId: fulfillment.id,
        providerFulfillmentId: requireString(data.trx_id) ?? fulfillment.providerFulfillmentId,
        status,
        serialNumber: requireString(data.sn) ?? fulfillment.serialNumber,
        responsePayload: modeResponsePayload("live", data),
        processedAt: isTerminalStatus(status) ? now : null,
        updatedAt: now
      });

      if (options.providerAuditRepository) {
        await options.providerAuditRepository.recordProviderEvent({
          orderId: order?.id ?? null,
          paymentId: null,
          fulfillmentId: updated.id,
          provider: "digiflazz",
          eventType: "callback",
          providerReference: updated.providerFulfillmentId ?? refId,
          providerStatus: status,
          providerCode: requireString(data.rc),
          providerMessage: requireString(data.message),
          amountMinor: order?.amountMinor ?? null,
          skuDigiflazz: order?.productCode ?? null,
          customerNoMasked: order?.customerRef ?? null,
          serialNumber: updated.serialNumber,
          signatureVerified: true,
          amountMatched: true,
          idempotencyKey: eventKey,
          rawPayload: toRecord(payload),
          safeSummary: `Digiflazz callback: ${status}. RC: ${data.rc}`
        });
      }

      const transitioned = await transitionTerminalOrderStatus(
        updated,
        status,
        { provider, webhookEventId: registration.event.id, fulfillmentId: updated.id, providerReference: refId, transactionId: updated.providerFulfillmentId },
        "digiflazz_callback_" + status,
        "digiflazz_callback"
      );

      // S5: Mark commission payable if order is success
      if (status === "success" && options.commissionService) {
        await options.commissionService.markCommissionPayable(updated.orderId);
      }

      if (!transitioned) {
        await options.fulfillmentRepository.updateWebhookEventState({ eventId: registration.event.id, processingState: "ignored", processedAt: now, errorMessage: "Order transition was rejected by monotonic transition guard." });
        return { code: "IGNORED" as const, message: "Callback did not mutate order due to monotonic transition guard." };
      }

      await options.fulfillmentRepository.updateWebhookEventState({ eventId: registration.event.id, processingState: "processed", processedAt: now, errorMessage: null });
      return { code: "PROCESSED" as const, message: "Digiflazz callback processed." };
    }
  };
}
