import { Router, type Response } from "express";

import { type AuthenticatedRequest } from "../auth/auth.middleware";
import {
  PostpaidForbiddenError,
  PostpaidNotFoundError,
  PostpaidPaymentNotAllowedError,
  type PostpaidService,
  PostpaidValidationError
} from "./postpaid.service";
import { type PlnInquiryRecord, type PostpaidRecord } from "./postpaid.types";

export type PostpaidRouterDependencies = Readonly<{
  postpaidService: PostpaidService;
}>;

type ValidationIssue = Readonly<{
  field: string;
  message: string;
}>;

const FORBIDDEN_PAYMENT_FIELDS = new Set(["amount", "amount_minor", "price", "price_minor", "selling_price", "selling_price_minor", "admin", "total"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function validationError(response: Response, message: string, details: ValidationIssue[]) {
  response.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message,
      details
    }
  });
}

function sendNotFound(response: Response) {
  response.status(404).json({
    error: {
      code: "POSTPAID_INQUIRY_NOT_FOUND",
      message: "Postpaid inquiry was not found."
    }
  });
}

function sendForbidden(response: Response) {
  response.status(403).json({
    error: {
      code: "FORBIDDEN",
      message: "Insufficient permissions."
    }
  });
}

function toPostpaidResponse(record: PostpaidRecord) {
  return {
    id: record.id,
    user_id: record.userId,
    ref_id: record.refId,
    buyer_sku_code: record.buyerSkuCode,
    customer_no: record.customerNo,
    customer_name: record.customerName,
    admin: record.adminMinor,
    price: record.priceMinor,
    selling_price: record.sellingPriceMinor,
    amount_minor: record.sellingPriceMinor,
    status: record.status,
    rc: record.rc,
    message: record.message,
    inquiry_status: record.inquiryStatus,
    inquiry_rc: record.inquiryRc,
    sn: record.serialNumber,
    metadata: record.metadata,
    paid_at: record.paidAt?.toISOString() ?? null,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString()
  };
}

function toPlnResponse(record: PlnInquiryRecord) {
  return {
    id: record.id,
    user_id: record.userId,
    customer_no: record.customerNo,
    meter_no: record.meterNo,
    subscriber_id: record.subscriberId,
    name: record.customerName,
    segment_power: record.segmentPower,
    status: record.status,
    rc: record.rc,
    message: record.message,
    created_at: record.createdAt.toISOString(),
    updated_at: record.updatedAt.toISOString()
  };
}

function readInquiryPayload(payload: unknown) {
  if (!isPlainObject(payload)) {
    return { ok: false as const, issues: [{ field: "body", message: "Request body must be a JSON object." }] };
  }

  const issues: ValidationIssue[] = [];
  const buyerSkuCode = optionalString(payload.buyer_sku_code);
  const customerNo = optionalString(payload.customer_no);
  const refId = optionalString(payload.ref_id);

  if (buyerSkuCode === null) issues.push({ field: "buyer_sku_code", message: "buyer_sku_code is required." });
  if (customerNo === null) issues.push({ field: "customer_no", message: "customer_no is required." });
  if (refId === null) issues.push({ field: "ref_id", message: "ref_id is required." });

  return issues.length > 0
    ? { ok: false as const, issues }
    : {
        ok: true as const,
        data: {
          buyerSkuCode: buyerSkuCode as string,
          customerNo: customerNo as string,
          refId: refId as string,
          metadata: isPlainObject(payload.metadata) ? payload.metadata : {}
        }
      };
}

function readRefPayload(payload: unknown) {
  if (!isPlainObject(payload)) {
    return { ok: false as const, issues: [{ field: "body", message: "Request body must be a JSON object." }] };
  }

  const issues: ValidationIssue[] = [];
  const refId = optionalString(payload.ref_id);
  if (refId === null) {
    issues.push({ field: "ref_id", message: "ref_id is required." });
  }

  for (const field of FORBIDDEN_PAYMENT_FIELDS) {
    if (field in payload) {
      issues.push({ field, message: field + " is server-controlled and cannot be provided." });
    }
  }

  return issues.length > 0 ? { ok: false as const, issues } : { ok: true as const, data: { refId: refId as string } };
}

function readPlnPayload(payload: unknown) {
  if (!isPlainObject(payload)) {
    return { ok: false as const, issues: [{ field: "body", message: "Request body must be a JSON object." }] };
  }

  const customerNo = optionalString(payload.customer_no);
  return customerNo === null
    ? { ok: false as const, issues: [{ field: "customer_no", message: "customer_no is required." }] }
    : { ok: true as const, data: { customerNo } };
}

function handleError(error: unknown, response: Response, next: (error: unknown) => void) {
  if (error instanceof PostpaidValidationError) {
    validationError(response, "Invalid postpaid payload.", [{ field: "body", message: error.message }]);
    return;
  }
  if (error instanceof PostpaidNotFoundError) {
    sendNotFound(response);
    return;
  }
  if (error instanceof PostpaidForbiddenError) {
    sendForbidden(response);
    return;
  }
  if (error instanceof PostpaidPaymentNotAllowedError) {
    response.status(409).json({
      error: {
        code: "POSTPAID_PAYMENT_NOT_ALLOWED",
        message: error.message
      }
    });
    return;
  }

  next(error);
}

export function createPostpaidRouter(dependencies: PostpaidRouterDependencies) {
  const router = Router();

  async function inquiryHandler(request: AuthenticatedRequest, response: Response, next: (error: unknown) => void) {
    const parsed = readInquiryPayload(request.body);
    if (!parsed.ok) {
      validationError(response, "Invalid postpaid inquiry payload.", parsed.issues);
      return;
    }

    try {
      const inquiry = await dependencies.postpaidService.inquire({
        authUser: request.authUser,
        ...parsed.data
      });
      response.status(201).json({ inquiry: toPostpaidResponse(inquiry) });
    } catch (error) {
      handleError(error, response, next);
    }
  }

  async function payHandler(request: AuthenticatedRequest, response: Response, next: (error: unknown) => void) {
    const parsed = readRefPayload(request.body);
    if (!parsed.ok) {
      validationError(response, "Invalid postpaid payment payload.", parsed.issues);
      return;
    }

    try {
      const inquiry = await dependencies.postpaidService.pay({ authUser: request.authUser, refId: parsed.data.refId });
      response.status(200).json({ inquiry: toPostpaidResponse(inquiry) });
    } catch (error) {
      handleError(error, response, next);
    }
  }

  async function statusHandler(request: AuthenticatedRequest, response: Response, next: (error: unknown) => void) {
    const parsed = readRefPayload(request.body);
    if (!parsed.ok) {
      validationError(response, "Invalid postpaid status payload.", parsed.issues);
      return;
    }

    try {
      const inquiry = await dependencies.postpaidService.recheckStatus({ authUser: request.authUser, refId: parsed.data.refId });
      response.status(200).json({ inquiry: toPostpaidResponse(inquiry) });
    } catch (error) {
      handleError(error, response, next);
    }
  }

  router.post("/inq-pasca", inquiryHandler as never);
  router.post("/postpaid/inquiries", inquiryHandler as never);
  router.post("/pay-pasca", payHandler as never);
  router.post("/postpaid/payments", payHandler as never);
  router.post("/status-pasca", statusHandler as never);
  router.post("/postpaid/status", statusHandler as never);
  router.post("/v1/transaction", (async (request: AuthenticatedRequest, response: Response, next: (error: unknown) => void) => {
    const command = isPlainObject(request.body) ? optionalString(request.body.commands) : null;
    if (command === "inq-pasca") return inquiryHandler(request, response, next);
    if (command === "pay-pasca") return payHandler(request, response, next);
    if (command === "status-pasca") return statusHandler(request, response, next);
    validationError(response, "Invalid Digiflazz command.", [{ field: "commands", message: "commands must be inq-pasca, pay-pasca, or status-pasca." }]);
  }) as never);
  router.post("/v1/inquiry-pln", (async (request: AuthenticatedRequest, response: Response, next: (error: unknown) => void) => {
    const parsed = readPlnPayload(request.body);
    if (!parsed.ok) {
      validationError(response, "Invalid PLN inquiry payload.", parsed.issues);
      return;
    }

    try {
      const inquiry = await dependencies.postpaidService.inquirePln({ authUser: request.authUser, customerNo: parsed.data.customerNo });
      response.status(201).json({ inquiry: toPlnResponse(inquiry) });
    } catch (error) {
      handleError(error, response, next);
    }
  }) as never);

  return router;
}
