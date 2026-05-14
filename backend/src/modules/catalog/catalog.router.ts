import { type Request, type Response, Router } from "express";

import { readBearerToken, sendUnauthorized, type AuthenticatedRequest } from "../auth/auth.middleware";
import { InvalidAuthTokenError, type AuthService } from "../auth/auth.service";
import { type AuthUserRole } from "../auth/auth.types";
import {
  CatalogProductInactiveError,
  CatalogProductNotFoundError,
  type CatalogService,
  type CreatePricingRuleRequest,
  type CreateProductRequest,
  type UpdatePricingRuleRequest,
  type UpdateProductRequest
} from "./pricing.service";
import { type PricedProduct, type PricingRuleRecord, type PricingScopeType, type ProductRecord } from "./catalog.types";

export type CatalogRouterDependencies = Readonly<{
  catalogService: CatalogService;
  authService: AuthService;
}>;

export type CatalogAdminRouterDependencies = Readonly<{
  catalogService: CatalogService;
}>;

type ValidationIssue = Readonly<{
  field: string;
  message: string;
}>;

type Mutable<T> = {
  -readonly [Key in keyof T]: T[Key];
};

const TRUSTED_PRICE_FIELDS = new Set(["final_price", "price", "final_price_minor", "role_price_minor", "trusted_final_price", "amount_minor"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sendValidationError(response: Response, message: string, issues: readonly ValidationIssue[]) {
  response.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message,
      details: issues
    }
  });
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

function handleCatalogError(error: unknown, response: Response) {
  if (error instanceof CatalogProductNotFoundError) {
    sendProductNotFound(response);
    return;
  }

  if (error instanceof CatalogProductInactiveError) {
    sendInactiveProduct(response);
    return;
  }

  throw error;
}

async function resolveCatalogRole(request: Request, authService: AuthService): Promise<AuthUserRole> {
  const token = readBearerToken(request.header("authorization"));
  if (token === null) {
    return "pengguna";
  }

  try {
    return (await authService.getCurrentUser(token)).role;
  } catch (error) {
    if (error instanceof InvalidAuthTokenError) {
      throw error;
    }

    throw error;
  }
}

function productResponse(product: ProductRecord) {
  return {
    id: product.id,
    sku_digiflazz: product.skuDigiflazz,
    name: product.name,
    category: product.category,
    provider: product.provider,
    base_price_minor: product.basePriceMinor,
    is_active: product.isActive,
    metadata: product.metadata,
    created_at: product.createdAt.toISOString(),
    updated_at: product.updatedAt.toISOString()
  };
}

function pricingRuleResponse(rule: PricingRuleRecord) {
  return {
    id: rule.id,
    scope_type: rule.scopeType,
    product_id: rule.productId,
    category: rule.category,
    role_type: rule.roleType,
    markup_fixed: rule.markupFixed,
    markup_percentage: rule.markupPercentage,
    priority: rule.priority,
    is_active: rule.isActive,
    metadata: rule.metadata,
    created_at: rule.createdAt.toISOString(),
    updated_at: rule.updatedAt.toISOString()
  };
}

function pricedProductResponse(pricedProduct: PricedProduct) {
  return {
    product: productResponse(pricedProduct.product),
    role_type: pricedProduct.roleType,
    base_price_minor: pricedProduct.basePriceMinor,
    markup_minor: pricedProduct.markupMinor,
    final_price_minor: pricedProduct.finalPriceMinor,
    pricing: {
      source: pricedProduct.pricing.source,
      rule_id: pricedProduct.pricing.ruleId,
      scope_type: pricedProduct.pricing.scopeType,
      priority: pricedProduct.pricing.priority,
      markup_fixed: pricedProduct.pricing.markupFixed,
      markup_percentage: pricedProduct.pricing.markupPercentage
    }
  };
}

function readString(payload: Record<string, unknown>, field: string, issues: ValidationIssue[]): string | undefined {
  const value = payload[field];
  if (typeof value !== "string" || value.trim() === "") {
    issues.push({ field, message: field + " is required and must be a non-empty string." });
    return undefined;
  }

  return value.trim();
}

function readOptionalString(payload: Record<string, unknown>, field: string, issues: ValidationIssue[]): string | null | undefined {
  if (!(field in payload)) return undefined;
  const value = payload[field];
  if (value === null) return null;
  if (typeof value !== "string" || value.trim() === "") {
    issues.push({ field, message: field + " must be a non-empty string or null when provided." });
    return undefined;
  }

  return value.trim();
}

function readInteger(payload: Record<string, unknown>, field: string, issues: ValidationIssue[], minimum = 0): number | undefined {
  const value = payload[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum) {
    issues.push({ field, message: field + " is required and must be an integer greater than or equal to " + minimum + "." });
    return undefined;
  }

  return value;
}

function readOptionalInteger(payload: Record<string, unknown>, field: string, issues: ValidationIssue[], minimum = 0): number | undefined {
  if (!(field in payload)) return undefined;
  return readInteger(payload, field, issues, minimum);
}

function readNumber(payload: Record<string, unknown>, field: string, issues: ValidationIssue[], minimum = 0): number | undefined {
  const value = payload[field];
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) {
    issues.push({ field, message: field + " is required and must be a number greater than or equal to " + minimum + "." });
    return undefined;
  }

  return value;
}

function readOptionalNumber(payload: Record<string, unknown>, field: string, issues: ValidationIssue[], minimum = 0): number | undefined {
  if (!(field in payload)) return undefined;
  return readNumber(payload, field, issues, minimum);
}

function readBoolean(payload: Record<string, unknown>, field: string, issues: ValidationIssue[]): boolean | undefined {
  const value = payload[field];
  if (typeof value !== "boolean") {
    issues.push({ field, message: field + " is required and must be a boolean." });
    return undefined;
  }

  return value;
}

function readOptionalBoolean(payload: Record<string, unknown>, field: string, issues: ValidationIssue[]): boolean | undefined {
  if (!(field in payload)) return undefined;
  return readBoolean(payload, field, issues);
}

function readMetadata(payload: Record<string, unknown>, issues: ValidationIssue[]): Record<string, unknown> | undefined {
  if (!("metadata" in payload)) return undefined;
  const value = payload.metadata;
  if (!isPlainObject(value)) {
    issues.push({ field: "metadata", message: "metadata must be an object when provided." });
    return undefined;
  }

  return value;
}

function readRole(payload: Record<string, unknown>, issues: ValidationIssue[]): AuthUserRole | undefined {
  const value = payload.role_type;
  if (value === "admin" || value === "seller" || value === "pengguna") {
    return value;
  }

  issues.push({ field: "role_type", message: "role_type must be admin, seller, or pengguna." });
  return undefined;
}

function readOptionalRole(payload: Record<string, unknown>, issues: ValidationIssue[]): AuthUserRole | undefined {
  if (!("role_type" in payload)) return undefined;
  return readRole(payload, issues);
}

function readScope(payload: Record<string, unknown>, issues: ValidationIssue[]): PricingScopeType | undefined {
  const value = payload.scope_type;
  if (value === "global" || value === "category" || value === "product") {
    return value;
  }

  issues.push({ field: "scope_type", message: "scope_type must be global, category, or product." });
  return undefined;
}

function readOptionalScope(payload: Record<string, unknown>, issues: ValidationIssue[]): PricingScopeType | undefined {
  if (!("scope_type" in payload)) return undefined;
  return readScope(payload, issues);
}

function validateTrustedPricePayload(payload: unknown): ValidationIssue[] {
  if (payload === undefined || payload === null) return [];
  if (!isPlainObject(payload)) {
    return [{ field: "body", message: "Request body must be a JSON object." }];
  }

  const issues: ValidationIssue[] = [];
  for (const field of TRUSTED_PRICE_FIELDS) {
    if (field in payload) {
      issues.push({ field, message: field + " is server-controlled and cannot be provided." });
    }
  }

  return issues;
}

function validateCreateProductPayload(payload: unknown): { ok: true; data: CreateProductRequest } | { ok: false; issues: ValidationIssue[] } {
  if (!isPlainObject(payload)) return { ok: false, issues: [{ field: "body", message: "Request body must be a JSON object." }] };
  const issues: ValidationIssue[] = [];
  const skuDigiflazz = readString(payload, "sku_digiflazz", issues);
  const name = readString(payload, "name", issues);
  const category = readString(payload, "category", issues);
  const provider = "provider" in payload ? readString(payload, "provider", issues) : "digiflazz";
  const basePriceMinor = readInteger(payload, "base_price_minor", issues, 0);
  const isActive = "is_active" in payload ? readBoolean(payload, "is_active", issues) : true;
  const metadata = readMetadata(payload, issues) ?? {};
  if (issues.length > 0 || skuDigiflazz === undefined || name === undefined || category === undefined || provider === undefined || basePriceMinor === undefined || isActive === undefined) return { ok: false, issues };
  return { ok: true, data: { skuDigiflazz, name, category, provider, basePriceMinor, isActive, metadata } };
}

function validateUpdateProductPayload(payload: unknown): { ok: true; data: UpdateProductRequest } | { ok: false; issues: ValidationIssue[] } {
  if (!isPlainObject(payload)) return { ok: false, issues: [{ field: "body", message: "Request body must be a JSON object." }] };
  const issues: ValidationIssue[] = [];
  const data: Mutable<UpdateProductRequest> = {};
  const skuDigiflazz = readOptionalString(payload, "sku_digiflazz", issues);
  const name = readOptionalString(payload, "name", issues);
  const category = readOptionalString(payload, "category", issues);
  const provider = readOptionalString(payload, "provider", issues);
  const basePriceMinor = readOptionalInteger(payload, "base_price_minor", issues, 0);
  const isActive = readOptionalBoolean(payload, "is_active", issues);
  const metadata = readMetadata(payload, issues);
  if (skuDigiflazz !== undefined && skuDigiflazz !== null) data.skuDigiflazz = skuDigiflazz;
  if (name !== undefined && name !== null) data.name = name;
  if (category !== undefined && category !== null) data.category = category;
  if (provider !== undefined && provider !== null) data.provider = provider;
  if (basePriceMinor !== undefined) data.basePriceMinor = basePriceMinor;
  if (isActive !== undefined) data.isActive = isActive;
  if (metadata !== undefined) data.metadata = metadata;
  return issues.length > 0 ? { ok: false, issues } : { ok: true, data };
}

function validateCreatePricingRulePayload(payload: unknown): { ok: true; data: CreatePricingRuleRequest } | { ok: false; issues: ValidationIssue[] } {
  if (!isPlainObject(payload)) return { ok: false, issues: [{ field: "body", message: "Request body must be a JSON object." }] };
  const issues: ValidationIssue[] = [];
  const scopeType = readScope(payload, issues);
  const productId = readOptionalString(payload, "product_id", issues) ?? null;
  const category = readOptionalString(payload, "category", issues) ?? null;
  const roleType = readRole(payload, issues);
  const markupFixed = "markup_fixed" in payload ? readInteger(payload, "markup_fixed", issues, 0) : 0;
  const markupPercentage = "markup_percentage" in payload ? readNumber(payload, "markup_percentage", issues, 0) : 0;
  const priority = "priority" in payload ? readInteger(payload, "priority", issues) : 0;
  const isActive = "is_active" in payload ? readBoolean(payload, "is_active", issues) : true;
  const metadata = readMetadata(payload, issues) ?? {};
  if (scopeType === "global" && (productId !== null || category !== null)) issues.push({ field: "scope_type", message: "global rules cannot include product_id or category." });
  if (scopeType === "category" && (productId !== null || category === null)) issues.push({ field: "category", message: "category rules require category and no product_id." });
  if (scopeType === "product" && (productId === null || category !== null)) issues.push({ field: "product_id", message: "product rules require product_id and no category." });
  if (issues.length > 0 || scopeType === undefined || roleType === undefined || markupFixed === undefined || markupPercentage === undefined || priority === undefined || isActive === undefined) return { ok: false, issues };
  return { ok: true, data: { scopeType, productId, category, roleType, markupFixed, markupPercentage, priority, isActive, metadata } };
}

function validateUpdatePricingRulePayload(payload: unknown): { ok: true; data: UpdatePricingRuleRequest } | { ok: false; issues: ValidationIssue[] } {
  if (!isPlainObject(payload)) return { ok: false, issues: [{ field: "body", message: "Request body must be a JSON object." }] };
  const issues: ValidationIssue[] = [];
  const data: Mutable<UpdatePricingRuleRequest> = {};
  const scopeType = readOptionalScope(payload, issues);
  const productId = readOptionalString(payload, "product_id", issues);
  const category = readOptionalString(payload, "category", issues);
  const roleType = readOptionalRole(payload, issues);
  const markupFixed = readOptionalInteger(payload, "markup_fixed", issues, 0);
  const markupPercentage = readOptionalNumber(payload, "markup_percentage", issues, 0);
  const priority = readOptionalInteger(payload, "priority", issues);
  const isActive = readOptionalBoolean(payload, "is_active", issues);
  const metadata = readMetadata(payload, issues);
  if (scopeType !== undefined) data.scopeType = scopeType;
  if (productId !== undefined) data.productId = productId;
  if (category !== undefined && category !== null) data.category = category;
  if (roleType !== undefined) data.roleType = roleType;
  if (markupFixed !== undefined) data.markupFixed = markupFixed;
  if (markupPercentage !== undefined) data.markupPercentage = markupPercentage;
  if (priority !== undefined) data.priority = priority;
  if (isActive !== undefined) data.isActive = isActive;
  if (metadata !== undefined) data.metadata = metadata;
  return issues.length > 0 ? { ok: false, issues } : { ok: true, data };
}

export function createCatalogRouter(dependencies: CatalogRouterDependencies) {
  const catalogRouter = Router();

  catalogRouter.get("/products", async (request, response, next) => {
    try {
      const roleType = await resolveCatalogRole(request, dependencies.authService);
      const products = await dependencies.catalogService.listPricedProducts(roleType);
      response.status(200).json({ products: products.map(pricedProductResponse) });
    } catch (error) {
      if (error instanceof InvalidAuthTokenError) {
        sendUnauthorized(response);
        return;
      }

      next(error);
    }
  });

  catalogRouter.post("/products/:productId/prepare-order", async (request, response, next) => {
    const issues = validateTrustedPricePayload(request.body);
    if (issues.length > 0) {
      sendValidationError(response, "Invalid prepare-order payload.", issues);
      return;
    }

    try {
      const roleType = await resolveCatalogRole(request, dependencies.authService);
      const pricedProduct = await dependencies.catalogService.quoteProduct(request.params.productId, roleType);
      response.status(200).json({ quote: pricedProductResponse(pricedProduct) });
    } catch (error) {
      if (error instanceof InvalidAuthTokenError) {
        sendUnauthorized(response);
        return;
      }

      try {
        handleCatalogError(error, response);
      } catch (unhandledError) {
        next(unhandledError);
      }
    }
  });

  return catalogRouter;
}

export function createCatalogAdminRouter(dependencies: CatalogAdminRouterDependencies) {
  const adminRouter = Router();

  adminRouter.get("/products", async (_request, response) => {
    const products = await dependencies.catalogService.listAdminProducts();
    response.status(200).json({ products: products.map(productResponse) });
  });

  adminRouter.post("/products", async (request, response) => {
    const validation = validateCreateProductPayload(request.body);
    if (!validation.ok) {
      sendValidationError(response, "Invalid product payload.", validation.issues);
      return;
    }

    const product = await dependencies.catalogService.createProduct(validation.data);
    response.status(201).json({ product: productResponse(product) });
  });

  adminRouter.patch("/products/:productId", async (request, response, next) => {
    const validation = validateUpdateProductPayload(request.body);
    if (!validation.ok) {
      sendValidationError(response, "Invalid product payload.", validation.issues);
      return;
    }

    try {
      const product = await dependencies.catalogService.updateProduct(request.params.productId, validation.data);
      response.status(200).json({ product: productResponse(product) });
    } catch (error) {
      next(error);
    }
  });

  adminRouter.get("/pricing-rules", async (_request, response) => {
    const pricingRules = await dependencies.catalogService.listPricingRules();
    response.status(200).json({ pricing_rules: pricingRules.map(pricingRuleResponse) });
  });

  adminRouter.post("/pricing-rules", async (request, response) => {
    const validation = validateCreatePricingRulePayload(request.body);
    if (!validation.ok) {
      sendValidationError(response, "Invalid pricing rule payload.", validation.issues);
      return;
    }

    const pricingRule = await dependencies.catalogService.createPricingRule(validation.data);
    response.status(201).json({ pricing_rule: pricingRuleResponse(pricingRule) });
  });

  adminRouter.patch("/pricing-rules/:ruleId", async (request, response, next) => {
    const validation = validateUpdatePricingRulePayload(request.body);
    if (!validation.ok) {
      sendValidationError(response, "Invalid pricing rule payload.", validation.issues);
      return;
    }

    try {
      const pricingRule = await dependencies.catalogService.updatePricingRule(request.params.ruleId, validation.data);
      response.status(200).json({ pricing_rule: pricingRuleResponse(pricingRule) });
    } catch (error) {
      next(error);
    }
  });

  adminRouter.post("/products/:productId/prepare-order", async (request, response) => {
    const issues = validateTrustedPricePayload(request.body);
    if (issues.length > 0) {
      sendValidationError(response, "Invalid prepare-order payload.", issues);
      return;
    }

    const roleType = (request as unknown as AuthenticatedRequest).authUser.role;
    try {
      const pricedProduct = await dependencies.catalogService.quoteProduct(request.params.productId, roleType);
      response.status(200).json({ quote: pricedProductResponse(pricedProduct) });
    } catch (error) {
      handleCatalogError(error, response);
    }
  });

  return adminRouter;
}
