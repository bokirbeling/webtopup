import { Router } from "express";

import {
  PaymentSignatureError,
  PaymentValidationError,
  type PaymentService
} from "./payment.service";
import { type MidtransWebhookPayload } from "./payment.types";
import { type AuditLogger, noopAuditLogger } from "../../security/audit";
import { initializePaymentSchema, midtransWebhookSchema, zodValidate } from "../../shared/validation";

type PaymentRouterDependencies = Readonly<{
  paymentService: PaymentService;
  auditLogger?: AuditLogger;
}>;

export function createPaymentRouter(dependencies: PaymentRouterDependencies) {
  const paymentRouter = Router();
  const auditLogger = dependencies.auditLogger ?? noopAuditLogger;

  paymentRouter.post("/midtrans/initialize", zodValidate(initializePaymentSchema), async (request, response) => {
    try {
      const result = await dependencies.paymentService.initializeMidtransPayment({
        orderId: request.body.order_id,
        idempotencyKey: request.body.idempotency_key
      });

      response.status(201).json({
        payment_id: result.paymentId,
        order_id: result.orderId,
        status: result.status,
        token: result.token,
        redirect_url: result.redirectUrl
      });
    } catch (error) {
      if (error instanceof PaymentValidationError) {
        response.status(400).json({
          error: {
            code: "PAYMENT_INITIALIZATION_FAILED",
            message: error.message
          }
        });

        return;
      }

      console.error("[PaymentInit] Error initializing payment:", error);
      response.status(500).json({
        error: {
          code: "PAYMENT_INITIALIZATION_FAILED",
          message: "Failed to initialize Midtrans payment."
        }
      });
    }
  });

  paymentRouter.post("/midtrans/webhook", zodValidate(midtransWebhookSchema), async (request, response) => {
    try {
      const result = await dependencies.paymentService.handleMidtransWebhook(request.body as MidtransWebhookPayload);

      response.status(200).json({
        code: result.code,
        message: result.message,
        ...(result.code === "DUPLICATE" ? { idempotent: true } : {})
      });
    } catch (error) {
      if (error instanceof PaymentSignatureError) {
        auditLogger.record({
          type: "webhook_signature_invalid",
          provider: "midtrans",
          route: request.path,
          method: request.method,
          statusCode: 401,
          reason: error.message,
          orderId: typeof request.body?.order_id === "string" ? request.body.order_id : null,
          occurredAt: new Date().toISOString()
        });

        response.status(401).json({
          error: {
            code: "INVALID_SIGNATURE",
            message: error.message
          }
        });

        return;
      }

      if (error instanceof PaymentValidationError) {
        response.status(400).json({
          error: {
            code: "WEBHOOK_VALIDATION_ERROR",
            message: error.message
          }
        });

        return;
      }

      console.error("[Webhook] Error processing webhook:", error);
      response.status(500).json({
        error: {
          code: "WEBHOOK_PROCESSING_FAILED",
          message: "Failed to process Midtrans webhook."
        }
      });
    }
  });

  return paymentRouter;
}
