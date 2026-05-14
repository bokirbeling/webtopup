import { Buffer } from "node:buffer";

import { OrderTransitionError, type OrderService } from "../order/order.service";
import { type PaymentRepository } from "./payment.repository";
import { verifyMidtransSignature } from "./payment.signature";
import { type MidtransWebhookPayload } from "./payment.types";

type MidtransConfig = Readonly<{
  serverKey: string;
  apiBaseUrl: string;
}>;

type PaymentServiceOptions = Readonly<{
  paymentRepository: PaymentRepository;
  orderService: OrderService;
  midtransConfig: MidtransConfig;
  fetchImpl?: typeof fetch;
  clock?: () => Date;
}>;

type InitializePaymentInput = Readonly<{
  orderId: string;
  idempotencyKey: string;
}>;

export type PaymentService = Readonly<{
  initializeMidtransPayment(input: InitializePaymentInput): Promise<{
    paymentId: string;
    orderId: string;
    status: string;
    token: string | null;
    redirectUrl: string | null;
  }>;
  handleMidtransWebhook(payload: MidtransWebhookPayload): Promise<{
    code: "PROCESSED" | "DUPLICATE" | "IGNORED";
    message: string;
  }>;
}>;

export class PaymentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentValidationError";
  }
}

export class PaymentSignatureError extends Error {
  constructor() {
    super("Invalid Midtrans webhook signature.");
    this.name = "PaymentSignatureError";
  }
}

function parseMidtransWebhookPayload(payload: MidtransWebhookPayload): {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
  transactionStatus: string;
  fraudStatus: string | null;
  transactionId: string | null;
} {
  const orderId = typeof payload.order_id === "string" ? payload.order_id : "";
  const statusCode = typeof payload.status_code === "string" ? payload.status_code : "";
  const grossAmount = typeof payload.gross_amount === "string" ? payload.gross_amount : "";
  const signatureKey = typeof payload.signature_key === "string" ? payload.signature_key : "";
  const transactionStatus = typeof payload.transaction_status === "string" ? payload.transaction_status : "";
  const fraudStatus = typeof payload.fraud_status === "string" ? payload.fraud_status : null;
  const transactionId = typeof payload.transaction_id === "string" ? payload.transaction_id : null;

  if (orderId === "" || statusCode === "" || grossAmount === "" || signatureKey === "" || transactionStatus === "") {
    throw new PaymentValidationError("Invalid Midtrans webhook payload.");
  }

  return {
    orderId,
    statusCode,
    grossAmount,
    signatureKey,
    transactionStatus,
    fraudStatus,
    transactionId
  };
}

function mapMidtransTransactionToOrderStatus(
  transactionStatus: string,
  fraudStatus: string | null
): "paid" | "failed" | "expired" | null {
  if (transactionStatus === "capture") {
    return fraudStatus === "challenge" ? null : "paid";
  }

  if (transactionStatus === "settlement") {
    return "paid";
  }

  if (transactionStatus === "expire") {
    return "expired";
  }

  if (transactionStatus === "deny" || transactionStatus === "cancel" || transactionStatus === "failure") {
    return "failed";
  }

  return null;
}

function mapMidtransTransactionToPaymentStatus(
  transactionStatus: string,
  fraudStatus: string | null
): "pending" | "paid" | "failed" | "expired" {
  if (transactionStatus === "capture") {
    return fraudStatus === "challenge" ? "pending" : "paid";
  }

  if (transactionStatus === "settlement") {
    return "paid";
  }

  if (transactionStatus === "expire") {
    return "expired";
  }

  if (transactionStatus === "deny" || transactionStatus === "cancel" || transactionStatus === "failure") {
    return "failed";
  }

  return "pending";
}

function parseGrossAmountToMinor(grossAmount: string): number {
  const parsed = Number.parseFloat(grossAmount);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new PaymentValidationError("Invalid Midtrans gross_amount payload.");
  }

  return Math.round(parsed);
}

async function readJson(response: Response): Promise<unknown> {
  const bodyText = await response.text();

  if (bodyText.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    throw new Error("Midtrans API returned malformed JSON.");
  }
}

function extractMidtransError(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) {
    return "Midtrans request failed.";
  }

  const value = payload as Record<string, unknown>;
  if (typeof value.error_messages === "string") {
    return value.error_messages;
  }

  if (Array.isArray(value.error_messages) && typeof value.error_messages[0] === "string") {
    return value.error_messages[0];
  }

  if (typeof value.status_message === "string") {
    return value.status_message;
  }

  return "Midtrans request failed.";
}

function toRecord(value: MidtransWebhookPayload): Record<string, unknown> {
  return { ...value };
}

export function createPaymentService(options: PaymentServiceOptions): PaymentService {
  const fetchImpl = options.fetchImpl ?? fetch;
  const clock = options.clock ?? (() => new Date());
  const provider = "midtrans";

  return {
    async initializeMidtransPayment(input: InitializePaymentInput) {
      const order = await options.paymentRepository.findOrderById(input.orderId);

      if (!order) {
        throw new PaymentValidationError(`Order ${input.orderId} was not found.`);
      }

      if (order.status !== "pending_payment") {
        throw new PaymentValidationError(
          `Order ${input.orderId} is in ${order.status} state. Payment can only be initialized from pending_payment.`
        );
      }

      const authorization = Buffer.from(`${options.midtransConfig.serverKey}:`, "utf8").toString("base64");
      const midtransResponse = await fetchImpl(`${options.midtransConfig.apiBaseUrl}/snap/v1/transactions`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${authorization}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          transaction_details: {
            order_id: order.id,
            gross_amount: order.amountMinor
          }
        })
      });

      const responsePayload = await readJson(midtransResponse);
      if (!midtransResponse.ok) {
        throw new Error(extractMidtransError(responsePayload));
      }

      const payload = typeof responsePayload === "object" && responsePayload !== null ? responsePayload : {};
      const responseObject = payload as Record<string, unknown>;
      const token = typeof responseObject.token === "string" ? responseObject.token : null;
      const redirectUrl = typeof responseObject.redirect_url === "string" ? responseObject.redirect_url : null;

      const now = clock();
      const payment = await options.paymentRepository.createPayment({
        orderId: order.id,
        provider,
        idempotencyKey: input.idempotencyKey,
        providerPaymentId: token,
        providerReference: order.id,
        amountMinor: order.amountMinor,
        currency: order.currency,
        status: "pending",
        paidAt: null,
        payload: responseObject,
        createdAt: now,
        updatedAt: now
      });

      return {
        paymentId: payment.id,
        orderId: payment.orderId,
        status: payment.status,
        token,
        redirectUrl
      };
    },

    async handleMidtransWebhook(payload: MidtransWebhookPayload) {
      const parsed = parseMidtransWebhookPayload(payload);
      const isValidSignature = verifyMidtransSignature({
        orderId: parsed.orderId,
        statusCode: parsed.statusCode,
        grossAmount: parsed.grossAmount,
        serverKey: options.midtransConfig.serverKey,
        signatureKey: parsed.signatureKey
      });

      if (!isValidSignature) {
        throw new PaymentSignatureError();
      }

      const eventKey = [
        parsed.orderId,
        parsed.statusCode,
        parsed.transactionStatus,
        parsed.fraudStatus ?? "-",
        parsed.transactionId ?? "-"
      ].join(":");

      const now = clock();
      const order = await options.paymentRepository.findOrderById(parsed.orderId);
      const existingPayment = await options.paymentRepository.findPaymentByProviderAndReference(provider, parsed.orderId);
      const registration = await options.paymentRepository.registerWebhookEvent({
        provider,
        eventKey,
        eventType: parsed.transactionStatus,
        orderId: order?.id ?? null,
        paymentId: existingPayment?.id ?? null,
        payload: toRecord(payload),
        receivedAt: now
      });

      if (registration.duplicate) {
        return {
          code: "DUPLICATE" as const,
          message: "Duplicate Midtrans webhook ignored."
        };
      }

      if (!order) {
        await options.paymentRepository.updateWebhookEventState({
          eventId: registration.event.id,
          processingState: "failed",
          processedAt: now,
          errorMessage: `Order ${parsed.orderId} was not found.`
        });

        throw new PaymentValidationError(`Order ${parsed.orderId} was not found.`);
      }

      const targetOrderStatus = mapMidtransTransactionToOrderStatus(parsed.transactionStatus, parsed.fraudStatus);
      const paymentStatus = mapMidtransTransactionToPaymentStatus(parsed.transactionStatus, parsed.fraudStatus);

      let payment = existingPayment;
      if (!payment) {
        payment = await options.paymentRepository.createPayment({
          orderId: parsed.orderId,
          provider,
          idempotencyKey: `midtrans-webhook:${parsed.transactionId ?? eventKey}`,
          providerPaymentId: parsed.transactionId,
          providerReference: parsed.orderId,
          amountMinor: parseGrossAmountToMinor(parsed.grossAmount),
          currency: "IDR",
          status: paymentStatus,
          paidAt: paymentStatus === "paid" ? now : null,
          payload: toRecord(payload),
          createdAt: now,
          updatedAt: now
        });
      } else {
        payment = await options.paymentRepository.updatePaymentStatus({
          paymentId: payment.id,
          status: paymentStatus,
          paidAt: paymentStatus === "paid" ? now : null,
          payload: toRecord(payload),
          updatedAt: now
        });
      }

      if (targetOrderStatus === null) {
        await options.paymentRepository.updateWebhookEventState({
          eventId: registration.event.id,
          processingState: "ignored",
          processedAt: now,
          errorMessage: `No order transition mapping for transaction_status=${parsed.transactionStatus}.`
        });

        return {
          code: "IGNORED" as const,
          message: "Webhook acknowledged without order mutation."
        };
      }

      if (order.status === targetOrderStatus) {
        await options.paymentRepository.updateWebhookEventState({
          eventId: registration.event.id,
          processingState: "ignored",
          processedAt: now,
          errorMessage: "Order status already matches webhook target status."
        });

        return {
          code: "IGNORED" as const,
          message: "Order already in target status."
        };
      }

      try {
        await options.orderService.transitionOrderStatus({
          orderId: parsed.orderId,
          toStatus: targetOrderStatus,
          note: `midtrans_${parsed.transactionStatus}`,
          metadata: {
            provider,
            webhookEventId: registration.event.id,
            paymentId: payment.id,
            transactionStatus: parsed.transactionStatus,
            transactionId: parsed.transactionId
          },
          createdBy: "midtrans_webhook"
        });
      } catch (error) {
        if (error instanceof OrderTransitionError) {
          await options.paymentRepository.updateWebhookEventState({
            eventId: registration.event.id,
            processingState: "ignored",
            processedAt: now,
            errorMessage: error.message
          });

          return {
            code: "IGNORED" as const,
            message: "Webhook did not mutate order due to monotonic transition guard."
          };
        }

        await options.paymentRepository.updateWebhookEventState({
          eventId: registration.event.id,
          processingState: "failed",
          processedAt: now,
          errorMessage: error instanceof Error ? error.message : "Unknown webhook processing error."
        });

        throw error;
      }

      await options.paymentRepository.updateWebhookEventState({
        eventId: registration.event.id,
        processingState: "processed",
        processedAt: now,
        errorMessage: null
      });

      return {
        code: "PROCESSED" as const,
        message: "Webhook processed and order transitioned."
      };
    }
  };
}
