import { createDigiflazzBuyerClient, type DigiflazzBuyerConfig } from "../digiflazz/buyer-client";
import { type CatalogRepository } from "./catalog.repository";
import { type CreateProductInput, type ProductRecord } from "./catalog.types";

export type DigiflazzPriceListItem = Readonly<{
  product_name: string;
  category: string;
  brand: string;
  type: string;
  seller_name: string;
  price: number;
  buyer_sku_code: string;
  buyer_product_status: boolean;
  seller_product_status: boolean;
  unlimited_stock?: boolean;
  stock: number;
  multi: boolean;
  start_cut_off: string;
  end_cut_off: string;
  desc: string;
}>;

export type DigiflazzPriceListSyncResult = Readonly<{
  syncedAt: Date;
  source: "digiflazz_buyer_price_list";
  productCount: number;
  activeCount: number;
  inactiveCount: number;
  products: ProductRecord[];
}>;

type DigiflazzPriceListSyncServiceOptions = Readonly<{
  repository: CatalogRepository;
  digiflazzConfig: DigiflazzBuyerConfig;
  fetchImpl?: typeof fetch;
  clock?: () => Date;
  minimumIntervalMs?: number;
}>;

export type DigiflazzPriceListSyncService = Readonly<{
  syncPrepaidPriceList(): Promise<DigiflazzPriceListSyncResult>;
}>;

export class DigiflazzPriceListSyncRateLimitError extends Error {
  constructor(
    readonly retryAt: Date,
    readonly remainingMs: number
  ) {
    super("Digiflazz prepaid price-list sync was requested too soon.");
    this.name = "DigiflazzPriceListSyncRateLimitError";
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readRequiredString(item: Record<string, unknown>, field: string): string {
  const value = item[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Invalid Digiflazz price-list item: " + field + " is required.");
  }

  return value.trim();
}

function readRequiredNumber(item: Record<string, unknown>, field: string): number {
  const value = item[field];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Invalid Digiflazz price-list item: " + field + " is required.");
  }

  return value;
}

function readRequiredBoolean(item: Record<string, unknown>, field: string): boolean {
  const value = item[field];
  if (typeof value !== "boolean") {
    throw new Error("Invalid Digiflazz price-list item: " + field + " is required.");
  }

  return value;
}

function parsePriceListItem(value: unknown): DigiflazzPriceListItem {
  const item = toRecord(value);

  return {
    product_name: readRequiredString(item, "product_name"),
    category: readRequiredString(item, "category"),
    brand: readRequiredString(item, "brand"),
    type: readRequiredString(item, "type"),
    seller_name: readRequiredString(item, "seller_name"),
    price: readRequiredNumber(item, "price"),
    buyer_sku_code: readRequiredString(item, "buyer_sku_code"),
    buyer_product_status: readRequiredBoolean(item, "buyer_product_status"),
    seller_product_status: readRequiredBoolean(item, "seller_product_status"),
    unlimited_stock: typeof item.unlimited_stock === "boolean" ? item.unlimited_stock : undefined,
    stock: readRequiredNumber(item, "stock"),
    multi: readRequiredBoolean(item, "multi"),
    start_cut_off: readRequiredString(item, "start_cut_off"),
    end_cut_off: readRequiredString(item, "end_cut_off"),
    desc: readRequiredString(item, "desc")
  };
}

function mapPriceListItem(item: DigiflazzPriceListItem, syncedAt: Date): Omit<CreateProductInput, "createdAt" | "updatedAt"> {
  return {
    skuDigiflazz: item.buyer_sku_code,
    name: item.product_name,
    category: item.category,
    provider: item.brand,
    basePriceMinor: Math.round(item.price),
    isActive: item.buyer_product_status && item.seller_product_status,
    metadata: {
      seller_name: item.seller_name,
      type: item.type,
      buyer_product_status: item.buyer_product_status,
      seller_product_status: item.seller_product_status,
      stock: item.stock,
      multi: item.multi,
      start_cut_off: item.start_cut_off,
      end_cut_off: item.end_cut_off,
      desc: item.desc,
      sync_source: "digiflazz_buyer_price_list",
      synced_at: syncedAt.toISOString(),
      ...(item.unlimited_stock === undefined ? {} : { unlimited_stock: item.unlimited_stock })
    }
  };
}

function assertPriceListData(data: unknown): DigiflazzPriceListItem[] {
  if (!Array.isArray(data)) {
    throw new Error("Digiflazz prepaid price-list response did not contain a data array.");
  }

  return data.map(parsePriceListItem);
}

export function createDigiflazzPriceListSyncService(options: DigiflazzPriceListSyncServiceOptions): DigiflazzPriceListSyncService {
  const clock = options.clock ?? (() => new Date());
  const minimumIntervalMs = options.minimumIntervalMs ?? 15 * 60 * 1000;
  const buyerClient = createDigiflazzBuyerClient(options.digiflazzConfig, options.fetchImpl ?? fetch);
  let lastSuccessfulSyncAt: Date | null = null;

  return {
    async syncPrepaidPriceList(): Promise<DigiflazzPriceListSyncResult> {
      const now = clock();
      if (lastSuccessfulSyncAt !== null) {
        const elapsedMs = now.getTime() - lastSuccessfulSyncAt.getTime();
        if (elapsedMs < minimumIntervalMs) {
          const remainingMs = minimumIntervalMs - elapsedMs;
          throw new DigiflazzPriceListSyncRateLimitError(new Date(now.getTime() + remainingMs), remainingMs);
        }
      }

      const response = await buyerClient.priceList({ cmd: "prepaid" });
      const priceList = assertPriceListData(response.data);
      const existingProductsBySku = new Map((await options.repository.listProducts()).map((product) => [product.skuDigiflazz, product]));
      const products: ProductRecord[] = [];
      let activeCount = 0;

      for (const item of priceList) {
        const mapped = mapPriceListItem(item, now);
        if (mapped.isActive) activeCount += 1;
        const existingProduct = existingProductsBySku.get(mapped.skuDigiflazz);

        if (existingProduct === undefined) {
          products.push(
            await options.repository.createProduct({
              ...mapped,
              createdAt: now,
              updatedAt: now
            })
          );
        } else {
          products.push(
            await options.repository.updateProduct(existingProduct.id, {
              ...mapped,
              updatedAt: now
            })
          );
        }
      }

      lastSuccessfulSyncAt = now;
      return {
        syncedAt: now,
        source: "digiflazz_buyer_price_list",
        productCount: products.length,
        activeCount,
        inactiveCount: products.length - activeCount,
        products
      };
    }
  };
}
