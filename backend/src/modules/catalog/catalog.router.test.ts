import { describe, expect, it } from "@jest/globals";
import request from "supertest";

import { createApp } from "../../app";
import { InMemoryAuthRepository } from "../auth/auth.repository";
import { InMemoryCatalogRepository } from "./catalog.repository";
import {
  CatalogProductInactiveError,
  CatalogProductNotFoundError,
  createCatalogService
} from "./pricing.service";
import { type PricingRuleRecord, type ProductRecord } from "./catalog.types";

const createdAt = new Date("2026-05-14T12:00:00.000Z");

type RegisteredUser = Readonly<{
  user: Readonly<{ id: string }>;
  token: string;
}>;

type CatalogProductBody = Readonly<{
  product: Readonly<{ id: string; is_active: boolean }>;
  role_type: string;
  final_price_minor: number;
  pricing: Readonly<{
    source: string;
    rule_id: string | null;
    markup_fixed: number;
    markup_percentage: number;
  }>;
}>;

function product(overrides: Partial<ProductRecord>): ProductRecord {
  return {
    id: "product-default",
    skuDigiflazz: "default-sku",
    name: "Default Product",
    category: "default",
    provider: "digiflazz",
    basePriceMinor: 10_000,
    isActive: true,
    metadata: {},
    createdAt,
    updatedAt: createdAt,
    ...overrides
  };
}

function pricingRule(overrides: Partial<PricingRuleRecord>): PricingRuleRecord {
  return {
    id: "rule-default",
    scopeType: "global",
    productId: null,
    category: null,
    roleType: "pengguna",
    markupFixed: 0,
    markupPercentage: 0,
    priority: 0,
    isActive: true,
    metadata: {},
    createdAt,
    updatedAt: createdAt,
    ...overrides
  };
}

function bodyByProductId(products: readonly CatalogProductBody[], productId: string): CatalogProductBody {
  const productBody = products.find((item) => item.product.id === productId);
  expect(productBody).toBeDefined();
  return productBody as CatalogProductBody;
}

async function registerUser(app: ReturnType<typeof createApp>, email: string): Promise<RegisteredUser> {
  const response = await request(app).post("/api/auth/register").send({
    email,
    password: "correct-password"
  });

  expect(response.status).toBe(201);
  return response.body as RegisteredUser;
}

describe("catalog and pricing routes", () => {
  it("returns role-aware server-computed prices with pricing precedence", async () => {
    const authRepository = new InMemoryAuthRepository();
    const catalogRepository = new InMemoryCatalogRepository({
      products: [
        product({ id: "product-specific", skuDigiflazz: "specific-sku", name: "A Specific", category: "games" }),
        product({ id: "category-product", skuDigiflazz: "category-sku", name: "B Category", category: "data" }),
        product({ id: "default-product", skuDigiflazz: "default-sku", name: "C Default", category: "pln" }),
        product({ id: "inactive-product", skuDigiflazz: "inactive-sku", name: "D Inactive", isActive: false })
      ],
      pricingRules: [
        pricingRule({ id: "pengguna-global", roleType: "pengguna", markupFixed: 2_000, priority: 1 }),
        pricingRule({ id: "seller-global", roleType: "seller", markupFixed: 3_000, priority: 100 }),
        pricingRule({
          id: "seller-product",
          scopeType: "product",
          productId: "product-specific",
          roleType: "seller",
          markupFixed: 500,
          priority: 1
        }),
        pricingRule({
          id: "seller-category",
          scopeType: "category",
          category: "data",
          roleType: "seller",
          markupFixed: 500,
          markupPercentage: 10,
          priority: 1
        })
      ]
    });
    const app = createApp({ authRepository, catalogRepository });
    const seller = await registerUser(app, "seller@example.com");
    const admin = await registerUser(app, "admin@example.com");

    await authRepository.updateUser(seller.user.id, { role: "seller", updatedAt: createdAt });
    await authRepository.updateUser(admin.user.id, { role: "admin", updatedAt: createdAt });

    const penggunaResponse = await request(app).get("/api/catalog/products");
    expect(penggunaResponse.status).toBe(200);
    const penggunaProducts = (penggunaResponse.body as { products: CatalogProductBody[] }).products;
    expect(penggunaProducts.map((item) => item.product.id)).not.toContain("inactive-product");
    expect(bodyByProductId(penggunaProducts, "product-specific")).toMatchObject({
      role_type: "pengguna",
      final_price_minor: 12_000,
      pricing: { source: "global", rule_id: "pengguna-global", markup_fixed: 2_000 }
    });

    const sellerResponse = await request(app)
      .get("/ppob-api/api/catalog/products")
      .set("Authorization", "Bearer " + seller.token);
    expect(sellerResponse.status).toBe(200);
    const sellerProducts = (sellerResponse.body as { products: CatalogProductBody[] }).products;
    expect(bodyByProductId(sellerProducts, "product-specific")).toMatchObject({
      role_type: "seller",
      final_price_minor: 10_500,
      pricing: { source: "product", rule_id: "seller-product", markup_fixed: 500 }
    });
    expect(bodyByProductId(sellerProducts, "category-product")).toMatchObject({
      role_type: "seller",
      final_price_minor: 11_550,
      pricing: { source: "category", rule_id: "seller-category", markup_percentage: 10 }
    });

    const adminResponse = await request(app)
      .get("/api/catalog/products")
      .set("Authorization", "Bearer " + admin.token);
    expect(adminResponse.status).toBe(200);
    const adminProducts = (adminResponse.body as { products: CatalogProductBody[] }).products;
    expect(bodyByProductId(adminProducts, "default-product")).toMatchObject({
      role_type: "admin",
      final_price_minor: 10_000,
      pricing: { source: "default", rule_id: null, markup_fixed: 0, markup_percentage: 0 }
    });
  });

  it("exposes inactive and missing product paths for ordering", async () => {
    const catalogRepository = new InMemoryCatalogRepository({
      products: [product({ id: "inactive-product", isActive: false })]
    });
    const catalogService = createCatalogService({ repository: catalogRepository });
    const app = createApp({ catalogRepository, catalogService });

    await expect(catalogService.quoteProduct("inactive-product", "pengguna")).rejects.toBeInstanceOf(
      CatalogProductInactiveError
    );
    await expect(catalogService.quoteProduct("missing-product", "pengguna")).rejects.toBeInstanceOf(
      CatalogProductNotFoundError
    );

    const inactiveResponse = await request(app).post("/api/catalog/products/inactive-product/prepare-order").send({});
    expect(inactiveResponse.status).toBe(409);
    expect(inactiveResponse.body).toEqual({
      error: {
        code: "PRODUCT_INACTIVE",
        message: "Product is inactive."
      }
    });

    const missingResponse = await request(app).post("/api/catalog/products/missing-product/prepare-order").send({});
    expect(missingResponse.status).toBe(404);
    expect(missingResponse.body).toEqual({
      error: {
        code: "PRODUCT_NOT_FOUND",
        message: "Product was not found."
      }
    });
  });

  it("protects admin management and rejects client-submitted prices", async () => {
    const authRepository = new InMemoryAuthRepository();
    const catalogRepository = new InMemoryCatalogRepository();
    const app = createApp({ authRepository, catalogRepository });
    const admin = await registerUser(app, "catalog-admin@example.com");
    const pengguna = await registerUser(app, "catalog-user@example.com");

    await authRepository.updateUser(admin.user.id, { role: "admin", updatedAt: createdAt });

    const missingTokenResponse = await request(app).post("/api/admin/catalog/products").send({});
    expect(missingTokenResponse.status).toBe(401);

    const wrongRoleResponse = await request(app)
      .post("/api/admin/catalog/products")
      .set("Authorization", "Bearer " + pengguna.token)
      .send({});
    expect(wrongRoleResponse.status).toBe(403);

    const createProductResponse = await request(app)
      .post("/api/admin/catalog/products")
      .set("Authorization", "Bearer " + admin.token)
      .send({
        sku_digiflazz: "admin-sku",
        name: "Admin Product",
        category: "games",
        base_price_minor: 10_000
      });
    expect(createProductResponse.status).toBe(201);
    const createdProduct = createProductResponse.body as { product: { id: string; sku_digiflazz: string } };
    expect(createdProduct.product.sku_digiflazz).toBe("admin-sku");

    const createRuleResponse = await request(app)
      .post("/api/admin/catalog/pricing-rules")
      .set("Authorization", "Bearer " + admin.token)
      .send({
        scope_type: "product",
        product_id: createdProduct.product.id,
        role_type: "seller",
        markup_fixed: 500
      });
    expect(createRuleResponse.status).toBe(201);
    expect(createRuleResponse.body).toMatchObject({
      pricing_rule: {
        product_id: createdProduct.product.id,
        role_type: "seller",
        markup_fixed: 500
      }
    });

    const tamperedQuoteResponse = await request(app)
      .post("/api/catalog/products/" + createdProduct.product.id + "/prepare-order")
      .send({ final_price: 1, price: 1 });
    expect(tamperedQuoteResponse.status).toBe(400);
    expect(tamperedQuoteResponse.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid prepare-order payload.",
        details: [
          {
            field: "final_price",
            message: "final_price is server-controlled and cannot be provided."
          },
          {
            field: "price",
            message: "price is server-controlled and cannot be provided."
          }
        ]
      }
    });

    const quoteResponse = await request(app).post("/api/catalog/products/" + createdProduct.product.id + "/prepare-order").send({});
    expect(quoteResponse.status).toBe(200);
    expect((quoteResponse.body as { quote: { final_price_minor: number } }).quote.final_price_minor).toBe(10_000);
  });
});
