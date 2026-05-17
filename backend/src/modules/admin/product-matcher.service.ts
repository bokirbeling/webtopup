import { type ProductRecord } from "../catalog/catalog.types";
import { type ProductUploadOperation, type ProductUploadRow } from "./product-upload.types";

function buildMetadata(row: ProductUploadRow, existingMetadata: Record<string, unknown> | undefined) {
  return {
    ...(existingMetadata ?? {}),
    digiflazz_buyer_template: {
      stock: row.stock,
      max_price_minor: row.maxPriceMinor,
      changed_at: row.changedAt,
      description: row.description,
      source: "admin_excel_upload"
    }
  };
}

export function buildProductUploadOperations(
  rows: readonly ProductUploadRow[],
  existingProducts: readonly ProductRecord[]
): ProductUploadOperation[] {
  const productsBySku = new Map(existingProducts.map((product) => [product.skuDigiflazz.toLowerCase(), product]));

  return rows.map((row) => {
    const existing = productsBySku.get(row.skuDigiflazz.toLowerCase());
    return {
      action: existing ? "update" : "create",
      skuDigiflazz: row.skuDigiflazz,
      name: row.name,
      category: existing?.category ?? row.category,
      provider: row.provider,
      basePriceMinor: row.basePriceMinor,
      isActive: row.isActive,
      metadata: buildMetadata(row, existing?.metadata)
    };
  });
}
