import { type Request, type Response, Router } from "express";

import { readBearerToken, sendUnauthorized } from "../auth/auth.middleware";
import { InvalidAuthTokenError, type AuthService } from "../auth/auth.service";
import { type AuthUserRole } from "../auth/auth.types";
import { CatalogProductInactiveError, CatalogProductNotFoundError } from "../catalog/pricing.service";
import { type OrderService } from "./order.service";
import { type CreateGuestOrderInput } from "./order.types";

const FORBIDDEN_SERVER_CONTROLLED_FIELDS = new Set([
  "id",
  "order_id",
  "order_number",
  "invoice_code",
  "status"
]);

type ValidationIssue = Readonly<{
  field: string;
  message: string;
}>;

type CreateOrderValidationResult =
  | Readonly<{
      ok: true;
      data: CreateGuestOrderInput;
    }>
  | Readonly<{
      ok: false;
      issues: ValidationIssue[];
    }>;

type OrderRequester = Readonly<{
  userId: string | null;
  roleType: AuthUserRole;
}>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

function sendProductNotFound(response: Response) {
  response.status(404).json({
    error: {
      code: "PRODUCT_NOT_FOUND",
      message: "Product was not found."
    }
  });
}

function sendInactiveProduct(response: Response) {
  response.status(409).json({
    error: {
      code: "PRODUCT_INACTIVE",
      message: "Product is inactive."
    }
  });
}

function validateCreateOrderPayload(payload: unknown): CreateOrderValidationResult {
  if (!isPlainObject(payload)) {
    return {
      ok: false,
      issues: [
        {
          field: "body",
          message: "Request body must be a JSON object."
        }
      ]
    };
  }

  const issues: ValidationIssue[] = [];

  for (const field of FORBIDDEN_SERVER_CONTROLLED_FIELDS) {
    if (field in payload) {
      issues.push({
        field,
        message: `${field} is server-controlled and cannot be provided.`
      });
    }
  }

  const productIdRaw = payload.product_id;
  const productCodeRaw = payload.product_code;
  const providerRaw = payload.provider;
  const amountMinorRaw = payload.amount_minor;
  const currencyRaw = payload.currency;
  const customerRefRaw = payload.customer_ref;
  const metadataRaw = payload.metadata;

  const productId = normalizeOptionalString(productIdRaw);
  if (productIdRaw !== undefined && productId === undefined) {
    issues.push({
      field: "product_id",
      message: "product_id must be a string or null when provided."
    });
  }

  if (typeof productCodeRaw !== "string" || productCodeRaw.trim() === "") {
    issues.push({
      field: "product_code",
      message: "product_code is required and must be a non-empty string."
    });
  }

  if (typeof providerRaw !== "string" || providerRaw.trim() === "") {
    issues.push({
      field: "provider",
      message: "provider is required and must be a non-empty string."
    });
  }

  if (typeof amountMinorRaw !== "number" || !Number.isInteger(amountMinorRaw) || amountMinorRaw <= 0) {
    issues.push({
      field: "amount_minor",
      message: "amount_minor is required and must be a positive integer."
    });
  }

  let currency = "IDR";
  if (currencyRaw !== undefined) {
    if (typeof currencyRaw !== "string" || currencyRaw.trim() === "") {
      issues.push({
        field: "currency",
        message: "currency must be a non-empty string when provided."
      });
    } else {
      currency = currencyRaw.trim().toUpperCase();
    }
  }

  const normalizedCustomerRef = normalizeOptionalString(customerRefRaw);
  if (customerRefRaw !== undefined && normalizedCustomerRef === undefined) {
    issues.push({
      field: "customer_ref",
      message: "customer_ref must be a string or null when provided."
    });
  }

  let metadata: Record<string, unknown> = {};
  if (metadataRaw !== undefined) {
    if (!isPlainObject(metadataRaw)) {
      issues.push({
        field: "metadata",
        message: "metadata must be an object when provided."
      });
    } else {
      metadata = metadataRaw;
    }
  }

  if (issues.length > 0) {
    return {
      ok: false,
      issues
    };
  }

  const productCode = productCodeRaw as string;
  const provider = providerRaw as string;
  const amountMinor = amountMinorRaw as number;

  return {
    ok: true,
    data: {
      customerRef: normalizedCustomerRef ?? null,
      productId: productId ?? null,
      productCode: productCode.trim(),
      provider: provider.trim(),
      amountMinor,
      currency,
      metadata
    }
  };
}

async function resolveOrderRequester(request: Request, authService: AuthService): Promise<OrderRequester> {
  const authorizationHeader = request.header("authorization");
  if (authorizationHeader === undefined) {
    return {
      userId: null,
      roleType: "pengguna"
    };
  }

  const token = readBearerToken(authorizationHeader);
  if (token === null) {
    throw new InvalidAuthTokenError();
  }

  const user = await authService.getCurrentUser(token);

  return {
    userId: user.id,
    roleType: user.role
  };
}

type OrdersRouterDependencies = Readonly<{
  orderService: OrderService;
  authService: AuthService;
}>;

export function createOrdersRouter(dependencies: OrdersRouterDependencies) {
  const ordersRouter = Router();

  ordersRouter.post("/", async (request, response) => {
    const validation = validateCreateOrderPayload(request.body);

    if (!validation.ok) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid order payload.",
          details: validation.issues
        }
      });

      return;
    }

    try {
      const requester = await resolveOrderRequester(request, dependencies.authService);
      const createdOrder = await dependencies.orderService.createOrder({
        ...validation.data,
        userId: requester.userId,
        roleType: requester.roleType
      });

      response.status(201).json({
        order_id: createdOrder.orderId,
        invoice_code: createdOrder.invoiceCode,
        status: createdOrder.status
      });
    } catch (error) {
      if (error instanceof InvalidAuthTokenError) {
        sendUnauthorized(response);
        return;
      }

      if (error instanceof CatalogProductNotFoundError) {
        sendProductNotFound(response);
        return;
      }

      if (error instanceof CatalogProductInactiveError) {
        sendInactiveProduct(response);
        return;
      }

      response.status(500).json({
        error: {
          code: "ORDER_CREATE_FAILED",
          message: "Failed to create order."
        }
      });
    }
  });

  return ordersRouter;
}
