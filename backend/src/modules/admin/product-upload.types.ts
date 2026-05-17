export const EXCEL_TEMPLATE_HEADERS = [
  "No",
  "Kode Produk",
  "Produk",
  "Seller",
  "Harga",
  "Harga Max",
  "Stok",
  "Status",
  "Perubahan Terakhir",
  "Deskripsi"
] as const;

export type ProductUploadValidationIssue = Readonly<{
  rowNumber: number | null;
  field: string;
  message: string;
}>;

export type ProductUploadRow = Readonly<{
  rowNumber: number;
  skuDigiflazz: string;
  name: string;
  provider: string;
  basePriceMinor: number;
  maxPriceMinor: number | null;
  stock: string;
  isActive: boolean;
  changedAt: string | null;
  description: string;
  category: string;
  sourceData: Record<string, unknown>;
}>;

export type ProductUploadValidationResult = Readonly<{
  ok: boolean;
  issues: ProductUploadValidationIssue[];
}>;

export type ProductUploadOperation = Readonly<{
  action: "create" | "update";
  skuDigiflazz: string;
  name: string;
  category: string;
  provider: string;
  basePriceMinor: number;
  isActive: boolean;
  metadata: Record<string, unknown>;
}>;

export type ProductUploadResult = Readonly<{
  created: number;
  updated: number;
  products: Array<{
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
  errors: ProductUploadValidationIssue[];
}>;
