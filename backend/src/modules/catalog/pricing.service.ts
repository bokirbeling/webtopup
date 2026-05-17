import { type AuthUserRole } from "../auth/auth.types";
import { type CatalogRepository } from "./catalog.repository";
import { type DigiflazzPriceListSyncResult, type DigiflazzPriceListSyncService } from "./digiflazz-price-sync.service";
import {
  type CreatePricingRuleInput,
  type CreateProductInput,
  type PricedProduct,
  type PricingRuleRecord,
  type ProductRecord,
  type UpdatePricingRuleInput,
  type UpdateProductInput
} from "./catalog.types";

export type CatalogService = Readonly<{
  listPricedProducts(roleType: AuthUserRole): Promise<PricedProduct[]>;
  quoteProduct(productId: string, roleType: AuthUserRole): Promise<PricedProduct>;
  listAdminProducts(): Promise<ProductRecord[]>;
  createProduct(input: CreateProductRequest): Promise<ProductRecord>;
  updateProduct(productId: string, input: UpdateProductRequest): Promise<ProductRecord>;
  deleteProduct(productId: string): Promise<void>;
  listPricingRules(): Promise<PricingRuleRecord[]>;
  createPricingRule(input: CreatePricingRuleRequest): Promise<PricingRuleRecord>;
  updatePricingRule(ruleId: string, input: UpdatePricingRuleRequest): Promise<PricingRuleRecord>;
  syncDigiflazzPrepaidPriceList(): Promise<DigiflazzPriceListSyncResult>;
}>;

export type CreateProductRequest = Omit<CreateProductInput, "createdAt" | "updatedAt">;
export type UpdateProductRequest = Omit<UpdateProductInput, "updatedAt">;
export type CreatePricingRuleRequest = Omit<CreatePricingRuleInput, "createdAt" | "updatedAt">;
export type UpdatePricingRuleRequest = Omit<UpdatePricingRuleInput, "updatedAt">;

type CatalogServiceOptions = Readonly<{
  repository: CatalogRepository;
  priceListSyncService?: DigiflazzPriceListSyncService;
  clock?: () => Date;
}>;

export class CatalogProductNotFoundError extends Error {
  constructor() {
    super("Product was not found.");
    this.name = "CatalogProductNotFoundError";
  }
}

export class CatalogProductInactiveError extends Error {
  constructor() {
    super("Product is inactive.");
    this.name = "CatalogProductInactiveError";
  }
}

function choosePricingRule(product: ProductRecord, roleType: AuthUserRole, rules: readonly PricingRuleRecord[]): PricingRuleRecord | null {
  const activeRoleRules = rules
    .filter((rule) => rule.isActive && rule.roleType === roleType)
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));

  return (
    activeRoleRules.find((rule) => rule.scopeType === "product" && rule.productId === product.id) ??
    activeRoleRules.find((rule) => rule.scopeType === "category" && rule.category === product.category) ??
    activeRoleRules.find((rule) => rule.scopeType === "global") ??
    null
  );
}

export function priceProduct(product: ProductRecord, roleType: AuthUserRole, rules: readonly PricingRuleRecord[]): PricedProduct {
  const rule = choosePricingRule(product, roleType, rules);
  const markupFixed = rule?.markupFixed ?? 0;
  const markupPercentage = rule?.markupPercentage ?? 0;
  const afterFixed = product.basePriceMinor + markupFixed;
  const finalPriceMinor = Math.round(afterFixed * (1 + markupPercentage / 100));

  return {
    product,
    roleType,
    basePriceMinor: product.basePriceMinor,
    markupMinor: finalPriceMinor - product.basePriceMinor,
    finalPriceMinor,
    pricing: {
      source: rule?.scopeType ?? "default",
      ruleId: rule?.id ?? null,
      scopeType: rule?.scopeType ?? "default",
      priority: rule?.priority ?? null,
      markupFixed,
      markupPercentage
    }
  };
}

export function createCatalogService(options: CatalogServiceOptions): CatalogService {
  const clock = options.clock ?? (() => new Date());

  async function activeProduct(productId: string): Promise<ProductRecord> {
    const product = await options.repository.findProductById(productId);
    if (product === null) {
      throw new CatalogProductNotFoundError();
    }

    if (!product.isActive) {
      throw new CatalogProductInactiveError();
    }

    return product;
  }

  return {
    async listPricedProducts(roleType: AuthUserRole): Promise<PricedProduct[]> {
      const [products, rules] = await Promise.all([options.repository.listProducts(), options.repository.listPricingRules()]);
      return products.filter((product) => product.isActive).map((product) => priceProduct(product, roleType, rules));
    },

    async quoteProduct(productId: string, roleType: AuthUserRole): Promise<PricedProduct> {
      const [product, rules] = await Promise.all([activeProduct(productId), options.repository.listPricingRules()]);
      return priceProduct(product, roleType, rules);
    },

    async listAdminProducts(): Promise<ProductRecord[]> {
      return options.repository.listProducts();
    },

    async createProduct(input: CreateProductRequest): Promise<ProductRecord> {
      const now = clock();
      return options.repository.createProduct({
        ...input,
        createdAt: now,
        updatedAt: now
      });
    },

    async updateProduct(productId: string, input: UpdateProductRequest): Promise<ProductRecord> {
      return options.repository.updateProduct(productId, {
        ...input,
        updatedAt: clock()
      });
    },

    async deleteProduct(productId: string): Promise<void> {
      await options.repository.deleteProduct(productId);
    },

    async listPricingRules(): Promise<PricingRuleRecord[]> {
      return options.repository.listPricingRules();
    },

    async createPricingRule(input: CreatePricingRuleRequest): Promise<PricingRuleRecord> {
      const now = clock();
      return options.repository.createPricingRule({
        ...input,
        createdAt: now,
        updatedAt: now
      });
    },

    async updatePricingRule(ruleId: string, input: UpdatePricingRuleRequest): Promise<PricingRuleRecord> {
      return options.repository.updatePricingRule(ruleId, {
        ...input,
        updatedAt: clock()
      });
    },

    async syncDigiflazzPrepaidPriceList(): Promise<DigiflazzPriceListSyncResult> {
      if (options.priceListSyncService === undefined) {
        throw new Error("Digiflazz price-list sync service is not configured.");
      }

      return options.priceListSyncService.syncPrepaidPriceList();
    }
  };
}
