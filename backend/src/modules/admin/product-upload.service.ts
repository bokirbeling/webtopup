import { type ProductRecord } from "../catalog/catalog.types";
import { parseExcelFile, validateUploadData } from "./excel-parser.service";
import { buildProductUploadOperations } from "./product-matcher.service";
import { type ProductUploadResult } from "./product-upload.types";

export type ProductUploadRepository = Readonly<{
  listProducts(): Promise<ProductRecord[]>;
  bulkUpsertProductsAtomically(operations: ReadonlyArray<{
    action: "create" | "update";
    skuDigiflazz: string;
    name: string;
    category: string;
    provider: string;
    basePriceMinor: number;
    isActive: boolean;
    metadata: Record<string, unknown>;
  }>): Promise<ProductUploadResult["products"]>;
}>;

export type ProductUploadService = Readonly<{
  processProductUpload(fileBuffer: Buffer): Promise<ProductUploadResult>;
}>;

export function createProductUploadService(repository: ProductUploadRepository): ProductUploadService {
  return {
    async processProductUpload(fileBuffer: Buffer): Promise<ProductUploadResult> {
      const rows = parseExcelFile(fileBuffer);
      const validation = validateUploadData(rows);
      if (!validation.ok) {
        return {
          created: 0,
          updated: 0,
          products: [],
          errors: validation.issues
        };
      }

      const existingProducts = await repository.listProducts();
      const operations = buildProductUploadOperations(rows, existingProducts);
      const products = await repository.bulkUpsertProductsAtomically(operations);

      return {
        created: operations.filter((operation) => operation.action === "create").length,
        updated: operations.filter((operation) => operation.action === "update").length,
        products,
        errors: []
      };
    }
  };
}
