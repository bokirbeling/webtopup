import { type AuthUserRole } from "../auth/auth.types";

export const PRODUCT_SCOPE_TYPES = ["global", "category", "product"] as const;
export type PricingScopeType = (typeof PRODUCT_SCOPE_TYPES)[number];

export type ProductRecord = Readonly<{
  id: string;
  skuDigiflazz: string;
  name: string;
  category: string;
  provider: string;
  basePriceMinor: number;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}>;

export type PricingRuleRecord = Readonly<{
  id: string;
  scopeType: PricingScopeType;
  productId: string | null;
  category: string | null;
  roleType: AuthUserRole;
  markupFixed: number;
  markupPercentage: number;
  priority: number;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}>;

export type CreateProductInput = Readonly<{
  skuDigiflazz: string;
  name: string;
  category: string;
  provider: string;
  basePriceMinor: number;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}>;

export type UpdateProductInput = Partial<
  Readonly<{
    skuDigiflazz: string;
    name: string;
    category: string;
    provider: string;
    basePriceMinor: number;
    isActive: boolean;
    metadata: Record<string, unknown>;
    updatedAt: Date;
  }>
>;

export type CreatePricingRuleInput = Readonly<{
  scopeType: PricingScopeType;
  productId: string | null;
  category: string | null;
  roleType: AuthUserRole;
  markupFixed: number;
  markupPercentage: number;
  priority: number;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}>;

export type UpdatePricingRuleInput = Partial<
  Readonly<{
    scopeType: PricingScopeType;
    productId: string | null;
    category: string | null;
    roleType: AuthUserRole;
    markupFixed: number;
    markupPercentage: number;
    priority: number;
    isActive: boolean;
    metadata: Record<string, unknown>;
    updatedAt: Date;
  }>
>;

export type PricingTrace = Readonly<{
  source: "product" | "category" | "global" | "default";
  ruleId: string | null;
  scopeType: PricingScopeType | "default";
  priority: number | null;
  markupFixed: number;
  markupPercentage: number;
}>;

export type PricedProduct = Readonly<{
  product: ProductRecord;
  roleType: AuthUserRole;
  basePriceMinor: number;
  markupMinor: number;
  finalPriceMinor: number;
  pricing: PricingTrace;
}>;
