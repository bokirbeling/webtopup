import { randomUUID } from "node:crypto";

import { type AuthUserRole } from "../auth/auth.types";
import {
  type CreatePricingRuleInput,
  type CreateProductInput,
  type PricingRuleRecord,
  type PricingScopeType,
  type ProductRecord,
  type UpdatePricingRuleInput,
  type UpdateProductInput
} from "./catalog.types";

export interface CatalogRepository {
  listProducts(): Promise<ProductRecord[]>;
  findProductById(productId: string): Promise<ProductRecord | null>;
  createProduct(input: CreateProductInput): Promise<ProductRecord>;
  updateProduct(productId: string, input: UpdateProductInput): Promise<ProductRecord>;
  deleteProduct(productId: string): Promise<void>;
  bulkUpsertProductsAtomically(operations: ReadonlyArray<{
    action: "create" | "update";
    skuDigiflazz: string;
    name: string;
    category: string;
    provider: string;
    basePriceMinor: number;
    isActive: boolean;
    metadata: Record<string, unknown>;
  }>): Promise<Array<{
    id: string;
    sku_digiflazz: string;
    name: string;
    category: string;
    provider: string;
    base_price_minor: number;
    is_active: boolean;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }>>;
  listPricingRules(): Promise<PricingRuleRecord[]>;
  createPricingRule(input: CreatePricingRuleInput): Promise<PricingRuleRecord>;
  updatePricingRule(ruleId: string, input: UpdatePricingRuleInput): Promise<PricingRuleRecord>;
}

type SupabaseCatalogRepositoryOptions = Readonly<{
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  tablePrefix?: string;
}>;

function ensureObject(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Record<string, unknown>;
}

function parseInteger(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isInteger(parsed)) {
    throw new Error("Invalid " + field + " from persistence layer.");
  }

  return parsed;
}

function parseNumber(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseFloat(value) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    throw new Error("Invalid " + field + " from persistence layer.");
  }

  return parsed;
}

function parseRole(value: unknown): AuthUserRole {
  if (value === "admin" || value === "seller" || value === "pengguna") {
    return value;
  }

  throw new Error("Unexpected role_type from persistence layer.");
}

function parseScope(value: unknown): PricingScopeType {
  if (value === "global" || value === "category" || value === "product") {
    return value;
  }

  throw new Error("Unexpected scope_type from persistence layer.");
}

function parseMetadata(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {};
  }

  return ensureObject(value, "Invalid metadata from persistence layer.");
}

function parseProductRow(value: unknown): ProductRecord {
  const row = ensureObject(value, "Invalid product payload from persistence layer.");

  if (
    typeof row.id !== "string" ||
    typeof row.sku_digiflazz !== "string" ||
    typeof row.name !== "string" ||
    typeof row.category !== "string" ||
    typeof row.provider !== "string" ||
    typeof row.is_active !== "boolean" ||
    typeof row.created_at !== "string" ||
    typeof row.updated_at !== "string"
  ) {
    throw new Error("Missing required product fields from persistence layer.");
  }

  return {
    id: row.id,
    skuDigiflazz: row.sku_digiflazz,
    name: row.name,
    category: row.category,
    provider: row.provider,
    basePriceMinor: parseInteger(row.base_price_minor, "base_price_minor"),
    isActive: row.is_active,
    metadata: parseMetadata(row.metadata),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

function parsePricingRuleRow(value: unknown): PricingRuleRecord {
  const row = ensureObject(value, "Invalid pricing rule payload from persistence layer.");

  if (
    typeof row.id !== "string" ||
    typeof row.is_active !== "boolean" ||
    typeof row.created_at !== "string" ||
    typeof row.updated_at !== "string"
  ) {
    throw new Error("Missing required pricing rule fields from persistence layer.");
  }

  return {
    id: row.id,
    scopeType: parseScope(row.scope_type),
    productId: typeof row.product_id === "string" ? row.product_id : null,
    category: typeof row.category === "string" ? row.category : null,
    roleType: parseRole(row.role_type),
    markupFixed: parseInteger(row.markup_fixed, "markup_fixed"),
    markupPercentage: parseNumber(row.markup_percentage, "markup_percentage"),
    priority: parseInteger(row.priority, "priority"),
    isActive: row.is_active,
    metadata: parseMetadata(row.metadata),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  };
}

async function readJson(response: Response): Promise<unknown> {
  const bodyText = await response.text();
  if (bodyText.trim() === "") {
    return null;
  }

  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    throw new Error("Persistence layer returned malformed JSON.");
  }
}

function extractErrorMessage(payload: unknown): string {
  if (typeof payload !== "object" || payload === null) {
    return "Persistence layer request failed.";
  }

  const value = payload as Record<string, unknown>;
  return typeof value.message === "string" ? value.message : "Persistence layer request failed.";
}

function productBody(input: CreateProductInput | UpdateProductInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  if (input.skuDigiflazz !== undefined) body.sku_digiflazz = input.skuDigiflazz;
  if (input.name !== undefined) body.name = input.name;
  if (input.category !== undefined) body.category = input.category;
  if (input.provider !== undefined) body.provider = input.provider;
  if (input.basePriceMinor !== undefined) body.base_price_minor = input.basePriceMinor;
  if (input.isActive !== undefined) body.is_active = input.isActive;
  if (input.metadata !== undefined) body.metadata = input.metadata;
  if ("createdAt" in input && input.createdAt !== undefined) body.created_at = input.createdAt.toISOString();
  if (input.updatedAt !== undefined) body.updated_at = input.updatedAt.toISOString();

  return body;
}

function pricingRuleBody(input: CreatePricingRuleInput | UpdatePricingRuleInput): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  if (input.scopeType !== undefined) body.scope_type = input.scopeType;
  if (input.productId !== undefined) body.product_id = input.productId;
  if (input.category !== undefined) body.category = input.category;
  if (input.roleType !== undefined) body.role_type = input.roleType;
  if (input.markupFixed !== undefined) body.markup_fixed = input.markupFixed;
  if (input.markupPercentage !== undefined) body.markup_percentage = input.markupPercentage;
  if (input.priority !== undefined) body.priority = input.priority;
  if (input.isActive !== undefined) body.is_active = input.isActive;
  if (input.metadata !== undefined) body.metadata = input.metadata;
  if ("createdAt" in input && input.createdAt !== undefined) body.created_at = input.createdAt.toISOString();
  if (input.updatedAt !== undefined) body.updated_at = input.updatedAt.toISOString();

  return body;
}

export class SupabaseCatalogRepository implements CatalogRepository {
  private readonly baseUrl: string;

  constructor(private readonly options: SupabaseCatalogRepositoryOptions) {
    this.baseUrl = options.supabaseUrl.replace(/\/$/, "");
  }

  private tableName(table: "products" | "pricing_rules") {
    return (this.options.tablePrefix ?? "") + table;
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      apikey: this.options.supabaseServiceRoleKey,
      Authorization: "Bearer " + this.options.supabaseServiceRoleKey,
      "Content-Type": "application/json"
    };

    if (init.headers) {
      Object.assign(headers, init.headers as Record<string, string>);
    }

    return fetch(this.baseUrl + path, {
      ...init,
      headers
    });
  }

  private productSelect() {
    return "id,sku_digiflazz,name,category,provider,base_price_minor,is_active,metadata,created_at,updated_at";
  }

  private pricingRuleSelect() {
    return "id,scope_type,product_id,category,role_type,markup_fixed,markup_percentage,priority,is_active,metadata,created_at,updated_at";
  }

  async listProducts(): Promise<ProductRecord[]> {
    const response = await this.request(
      "/rest/v1/" + this.tableName("products") + "?select=" + this.productSelect() + "&order=name.asc"
    );
    const payload = await readJson(response);
    if (!response.ok) throw new Error(extractErrorMessage(payload));
    if (!Array.isArray(payload)) throw new Error("Failed to list product records.");
    return payload.map(parseProductRow);
  }

  async findProductById(productId: string): Promise<ProductRecord | null> {
    const response = await this.request(
      "/rest/v1/" + this.tableName("products") + "?id=eq." + encodeURIComponent(productId) + "&select=" + this.productSelect()
    );
    const payload = await readJson(response);
    if (!response.ok) throw new Error(extractErrorMessage(payload));
    if (!Array.isArray(payload) || payload.length === 0) return null;
    return parseProductRow(payload[0]);
  }

  async createProduct(input: CreateProductInput): Promise<ProductRecord> {
    const response = await this.request("/rest/v1/" + this.tableName("products") + "?select=" + this.productSelect(), {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(productBody(input))
    });
    const payload = await readJson(response);
    if (!response.ok) throw new Error(extractErrorMessage(payload));
    if (!Array.isArray(payload) || payload.length !== 1) throw new Error("Failed to create product record.");
    return parseProductRow(payload[0]);
  }

  async updateProduct(productId: string, input: UpdateProductInput): Promise<ProductRecord> {
    const response = await this.request(
      "/rest/v1/" + this.tableName("products") + "?id=eq." + encodeURIComponent(productId) + "&select=" + this.productSelect(),
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(productBody(input))
      }
    );
    const payload = await readJson(response);
    if (!response.ok) throw new Error(extractErrorMessage(payload));
    if (!Array.isArray(payload) || payload.length !== 1) throw new Error("Product record was not found.");
    return parseProductRow(payload[0]);
  }

  async deleteProduct(productId: string): Promise<void> {
    const response = await this.request("/rest/v1/" + this.tableName("products") + "?id=eq." + encodeURIComponent(productId), {
      method: "DELETE"
    });
    const payload = await readJson(response);
    if (!response.ok) throw new Error(extractErrorMessage(payload));
  }

  async bulkUpsertProductsAtomically(operations: ReadonlyArray<{
    action: "create" | "update";
    skuDigiflazz: string;
    name: string;
    category: string;
    provider: string;
    basePriceMinor: number;
    isActive: boolean;
    metadata: Record<string, unknown>;
  }>): Promise<Array<{
    id: string;
    sku_digiflazz: string;
    name: string;
    category: string;
    provider: string;
    base_price_minor: number;
    is_active: boolean;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }>> {
    const response = await this.request("/rest/v1/rpc/admin_bulk_upsert_products", {
      method: "POST",
      body: JSON.stringify({
        p_operations: operations.map((operation) => ({
          action: operation.action,
          sku_digiflazz: operation.skuDigiflazz,
          name: operation.name,
          category: operation.category,
          provider: operation.provider,
          base_price_minor: operation.basePriceMinor,
          is_active: operation.isActive,
          metadata: operation.metadata
        }))
      })
    });
    const payload = await readJson(response);
    if (!response.ok) throw new Error(extractErrorMessage(payload));
    if (!Array.isArray(payload)) throw new Error("Bulk upload RPC returned malformed data.");
    return payload as Array<{
      id: string;
      sku_digiflazz: string;
      name: string;
      category: string;
      provider: string;
      base_price_minor: number;
      is_active: boolean;
      metadata: Record<string, unknown>;
      created_at: string;
      updated_at: string;
    }>;
  }

  async listPricingRules(): Promise<PricingRuleRecord[]> {
    const response = await this.request(
      "/rest/v1/" + this.tableName("pricing_rules") + "?select=" + this.pricingRuleSelect() + "&order=priority.desc,id.asc"
    );
    const payload = await readJson(response);
    if (!response.ok) throw new Error(extractErrorMessage(payload));
    if (!Array.isArray(payload)) throw new Error("Failed to list pricing rule records.");
    return payload.map(parsePricingRuleRow);
  }

  async createPricingRule(input: CreatePricingRuleInput): Promise<PricingRuleRecord> {
    const response = await this.request("/rest/v1/" + this.tableName("pricing_rules") + "?select=" + this.pricingRuleSelect(), {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(pricingRuleBody(input))
    });
    const payload = await readJson(response);
    if (!response.ok) throw new Error(extractErrorMessage(payload));
    if (!Array.isArray(payload) || payload.length !== 1) throw new Error("Failed to create pricing rule record.");
    return parsePricingRuleRow(payload[0]);
  }

  async updatePricingRule(ruleId: string, input: UpdatePricingRuleInput): Promise<PricingRuleRecord> {
    const response = await this.request(
      "/rest/v1/" + this.tableName("pricing_rules") + "?id=eq." + encodeURIComponent(ruleId) + "&select=" + this.pricingRuleSelect(),
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(pricingRuleBody(input))
      }
    );
    const payload = await readJson(response);
    if (!response.ok) throw new Error(extractErrorMessage(payload));
    if (!Array.isArray(payload) || payload.length !== 1) throw new Error("Pricing rule record was not found.");
    return parsePricingRuleRow(payload[0]);
  }
}

export class InMemoryCatalogRepository implements CatalogRepository {
  private readonly productsById = new Map<string, ProductRecord>();
  private readonly pricingRulesById = new Map<string, PricingRuleRecord>();

  constructor(seed: Readonly<{ products?: ProductRecord[]; pricingRules?: PricingRuleRecord[] }> = {}) {
    for (const product of seed.products ?? []) this.productsById.set(product.id, product);
    for (const rule of seed.pricingRules ?? []) this.pricingRulesById.set(rule.id, rule);
  }

  async listProducts(): Promise<ProductRecord[]> {
    return Array.from(this.productsById.values()).sort((left, right) => left.name.localeCompare(right.name));
  }

  async findProductById(productId: string): Promise<ProductRecord | null> {
    return this.productsById.get(productId) ?? null;
  }

  async createProduct(input: CreateProductInput): Promise<ProductRecord> {
    const product: ProductRecord = {
      id: randomUUID(),
      ...input
    };
    this.productsById.set(product.id, product);
    return product;
  }

  async updateProduct(productId: string, input: UpdateProductInput): Promise<ProductRecord> {
    const existing = this.productsById.get(productId);
    if (existing === undefined) {
      throw new Error("Product record was not found.");
    }

    const updated: ProductRecord = {
      ...existing,
      skuDigiflazz: input.skuDigiflazz ?? existing.skuDigiflazz,
      name: input.name ?? existing.name,
      category: input.category ?? existing.category,
      provider: input.provider ?? existing.provider,
      basePriceMinor: input.basePriceMinor ?? existing.basePriceMinor,
      isActive: input.isActive ?? existing.isActive,
      metadata: input.metadata ?? existing.metadata,
      updatedAt: input.updatedAt ?? existing.updatedAt
    };
    this.productsById.set(productId, updated);
    return updated;
  }

  async deleteProduct(productId: string): Promise<void> {
    this.productsById.delete(productId);
  }

  async bulkUpsertProductsAtomically(operations: ReadonlyArray<{
    action: "create" | "update";
    skuDigiflazz: string;
    name: string;
    category: string;
    provider: string;
    basePriceMinor: number;
    isActive: boolean;
    metadata: Record<string, unknown>;
  }>): Promise<Array<{
    id: string;
    sku_digiflazz: string;
    name: string;
    category: string;
    provider: string;
    base_price_minor: number;
    is_active: boolean;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }>> {
    const snapshot = new Map(this.productsById);
    const now = new Date();

    try {
      for (const operation of operations) {
        const existing = Array.from(this.productsById.values()).find(
          (product) => product.skuDigiflazz.toLowerCase() === operation.skuDigiflazz.toLowerCase()
        );

        if (existing) {
          this.productsById.set(existing.id, {
            ...existing,
            skuDigiflazz: operation.skuDigiflazz,
            name: operation.name,
            category: operation.category,
            provider: operation.provider,
            basePriceMinor: operation.basePriceMinor,
            isActive: operation.isActive,
            metadata: operation.metadata,
            updatedAt: now
          });
        } else {
          this.productsById.set(randomUUID(), {
            id: randomUUID(),
            skuDigiflazz: operation.skuDigiflazz,
            name: operation.name,
            category: operation.category,
            provider: operation.provider,
            basePriceMinor: operation.basePriceMinor,
            isActive: operation.isActive,
            metadata: operation.metadata,
            createdAt: now,
            updatedAt: now
          });
        }
      }
    } catch (error) {
      this.productsById.clear();
      for (const [key, value] of snapshot.entries()) this.productsById.set(key, value);
      throw error;
    }

    return Array.from(this.productsById.values()).map((product) => ({
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
    }));
  }

  async listPricingRules(): Promise<PricingRuleRecord[]> {
    return Array.from(this.pricingRulesById.values()).sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));
  }

  async createPricingRule(input: CreatePricingRuleInput): Promise<PricingRuleRecord> {
    const rule: PricingRuleRecord = {
      id: randomUUID(),
      ...input
    };
    this.pricingRulesById.set(rule.id, rule);
    return rule;
  }

  async updatePricingRule(ruleId: string, input: UpdatePricingRuleInput): Promise<PricingRuleRecord> {
    const existing = this.pricingRulesById.get(ruleId);
    if (existing === undefined) {
      throw new Error("Pricing rule record was not found.");
    }

    const updated: PricingRuleRecord = {
      ...existing,
      scopeType: input.scopeType ?? existing.scopeType,
      productId: "productId" in input ? input.productId ?? null : existing.productId,
      category: "category" in input ? input.category ?? null : existing.category,
      roleType: input.roleType ?? existing.roleType,
      markupFixed: input.markupFixed ?? existing.markupFixed,
      markupPercentage: input.markupPercentage ?? existing.markupPercentage,
      priority: input.priority ?? existing.priority,
      isActive: input.isActive ?? existing.isActive,
      metadata: input.metadata ?? existing.metadata,
      updatedAt: input.updatedAt ?? existing.updatedAt
    };
    this.pricingRulesById.set(ruleId, updated);
    return updated;
  }
}
