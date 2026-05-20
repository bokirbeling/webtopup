import { createHmac, timingSafeEqual } from "node:crypto";

import { Router, type Request, type Response } from "express";

import {
  FulfillmentValidationError,
  type FulfillmentService
} from "./fulfillment.service";
import { type DigiflazzCallbackPayload } from "./fulfillment.types";
import { type AuditLogger, noopAuditLogger } from "../../security/audit";
import { fulfillmentTriggerSchema, zodValidate } from "../../shared/validation";

type RawBodyRequest = Request & Readonly<{ rawBody?: Buffer }>;

type FulfillmentRouterDependencies = Readonly<{
  fulfillmentService: FulfillmentService;
  auditLogger?: AuditLogger;
  digiflazzWebhookSecret?: string | null;
}>;

function extractOrderId(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return null;
  }

  const orderId = (payload as Record<string, unknown>).order_id;
  return typeof orderId === "string" && orderId.trim() !== "" ? orderId.trim() : null;
}

function normalizeHeader(value: string | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized === "" ? null : normalized;
}

function hasValidDigiflazzSignature(request: RawBodyRequest, secret: string): boolean {
  const signature = request.get("x-hub-signature");
  if (signature === undefined || signature === "" || request.rawBody === undefined) {
    return false;
  }

  const expected = "sha1=" + createHmac("sha1", secret).update(request.rawBody).digest("hex");
  const actualBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function sendFulfillmentResult(response: Response, statusCode: number, result: Awaited<ReturnType<FulfillmentService["triggerPaidOrderFulfillment"]>>) {
  response.status(statusCode).json({
    fulfillment_id: result.fulfillmentId,
    order_id: result.orderId,
    status: result.status,
    provider_reference: result.providerReference,
    provider_mode: result.providerMode
  });
}

export function createFulfillmentRouter(dependencies: FulfillmentRouterDependencies) {
  const fulfillmentRouter = Router();
  const auditLogger = dependencies.auditLogger ?? noopAuditLogger;
  const webhookSecret = dependencies.digiflazzWebhookSecret?.trim() === "" ? null : dependencies.digiflazzWebhookSecret?.trim() ?? null;

  fulfillmentRouter.post("/digiflazz/trigger", zodValidate(fulfillmentTriggerSchema), async (request, response) => {
    const orderId = request.body.order_id as string;

    try {
      const result = await dependencies.fulfillmentService.triggerPaidOrderFulfillment({ orderId });
      sendFulfillmentResult(response, 201, result);
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

  fulfillmentRouter.post("/digiflazz/recheck", zodValidate(fulfillmentTriggerSchema), async (request, response) => {
    const orderId = request.body.order_id as string;

    try {
      const result = await dependencies.fulfillmentService.recheckPendingFulfillment({ orderId });
      sendFulfillmentResult(response, 200, result);
    } catch (error) {
      if (error instanceof FulfillmentValidationError) {
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
          code: "FULFILLMENT_RECHECK_FAILED",
          message: error instanceof Error ? error.stack || error.message : "Failed to recheck Digiflazz fulfillment."
        }
      });
    }
  });

  fulfillmentRouter.post("/digiflazz/callback", async (request, response) => {
    if (webhookSecret !== null && !hasValidDigiflazzSignature(request as RawBodyRequest, webhookSecret)) {
      response.status(401).json({
        error: {
          code: "DIGIFLAZZ_SIGNATURE_INVALID",
          message: "Invalid Digiflazz webhook signature."
        }
      });
      return;
    }

    const eventType = (normalizeHeader(request.get("x-digiflazz-event")) ?? "update").toLowerCase();
    const userAgent = normalizeHeader(request.get("user-agent"));

    if (eventType === "ping") {
      response.status(200).json({ code: "PROCESSED", message: "Digiflazz ping acknowledged." });
      return;
    }
    if (eventType !== "create" && eventType !== "update") {
      response.status(200).json({ code: "IGNORED", message: "Unsupported Digiflazz webhook event ignored." });
      return;
    }
    if (userAgent === "Digiflazz-Pasca-Hookshot") {
      response.status(200).json({ code: "IGNORED", message: "Postpaid Digiflazz webhook ignored." });
      return;
    }

    try {
      const result = await dependencies.fulfillmentService.handleDigiflazzCallback(request.body as DigiflazzCallbackPayload, {
        eventType,
        userAgent: userAgent ?? undefined
      });
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
