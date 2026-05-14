import { Router } from "express";

import {
  FulfillmentValidationError,
  type FulfillmentService
} from "./fulfillment.service";
import { type DigiflazzCallbackPayload } from "./fulfillment.types";
import { type AuditLogger, noopAuditLogger } from "../../security/audit";

type FulfillmentRouterDependencies = Readonly<{
  fulfillmentService: FulfillmentService;
  auditLogger?: AuditLogger;
}>;

function extractOrderId(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }

  const orderId = (payload as Record<string, unknown>).order_id;
  return typeof orderId === "string" && orderId.trim() !== "" ? orderId.trim() : null;
}

export function createFulfillmentRouter(dependencies: FulfillmentRouterDependencies) {
  const fulfillmentRouter = Router();
  const auditLogger = dependencies.auditLogger ?? noopAuditLogger;

  fulfillmentRouter.post("/digiflazz/trigger", async (request, response) => {
    const orderId = extractOrderId(request.body);
    if (orderId === null) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "order_id is required and must be a non-empty string."
        }
      });
      return;
    }

    try {
      const result = await dependencies.fulfillmentService.triggerPaidOrderFulfillment({ orderId });
      response.status(201).json({
        fulfillment_id: result.fulfillmentId,
        order_id: result.orderId,
        status: result.status,
        provider_reference: result.providerReference,
        provider_mode: result.providerMode
      });
    } catch (error) {
      if (error instanceof FulfillmentValidationError) {
        auditLogger.record({
          type: "fulfillment_security_rejection",
          provider: "digiflazz",
          route: request.path,
          method: request.method,
          statusCode: 400,
          reason: error.message,
          orderId,
          occurredAt: new Date().toISOString()
        });

        response.status(400).json({
          error: {
            code: "FULFILLMENT_VALIDATION_ERROR",
            message: error.message
          }
        });
        return;
      }

      response.status(500).json({
        error: {
          code: "FULFILLMENT_FAILED",
          message: "Failed to trigger Digiflazz fulfillment."
        }
      });
    }
  });

  fulfillmentRouter.post("/digiflazz/callback", async (request, response) => {
    try {
      const result = await dependencies.fulfillmentService.handleDigiflazzCallback(request.body as DigiflazzCallbackPayload);
      response.status(200).json({ code: result.code, message: result.message });
    } catch (error) {
      if (error instanceof FulfillmentValidationError) {
        response.status(400).json({
          error: {
            code: "CALLBACK_VALIDATION_ERROR",
            message: error.message
          }
        });
        return;
      }

      response.status(500).json({
        error: {
          code: "CALLBACK_PROCESSING_FAILED",
          message: "Failed to process Digiflazz callback."
        }
      });
    }
  });

  return fulfillmentRouter;
}
