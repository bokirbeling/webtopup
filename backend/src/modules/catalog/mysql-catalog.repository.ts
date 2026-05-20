import mysql from "mysql2/promise";
import { type AuthUserRole } from "../auth/auth.types";
import {
  type CatalogRepository,
  type SupabaseCatalogRepository
} from "./catalog.repository";
import {
  type CreatePricingRuleInput,
  type CreateProductInput,
  type PricingRuleRecord,
  type ProductRecord,
  type UpdatePricingRuleInput,
  type UpdateProductInput
} from "./catalog.types";

type MySqlCatalogRepositoryOptions = Readonly<{
  pool: mysql.Pool;
  supabaseFallback: CatalogRepository;
}>;

export class MySqlCatalogRepository implements CatalogRepository {
  private readonly pool: mysql.Pool;
  private readonly fallback: CatalogRepository;

  constructor(options: MySqlCatalogRepositoryOptions) {
    this.pool = options.pool;
    this.fallback = options.supabaseFallback;
  }

  private mapRowToProduct(row: any): ProductRecord {
    let metadata: Record<string, unknown> = {};
    if (row.metadata) {
      try {
        metadata = typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata;
      } catch (e) {
        // Fallback
      }
    }

    return {
      id: String(row.id),
      skuDigiflazz: row.sku_digiflazz,
      name: row.nama,
      category: row.kategori,
      provider: row.provider,
      basePriceMinor: Number(row.harga_modal),
      isActive: row.status === "active",
      metadata: {
        ...metadata,
        image_url: row.image_url || metadata.image_url || "",
        description: row.deskripsi || metadata.description || ""
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  async listProducts(): Promise<ProductRecord[]> {
    const [rows] = await this.pool.query("SELECT * FROM produk WHERE status = 'active' ORDER BY nama ASC");
    return (rows as any[]).map((row) => this.mapRowToProduct(row));
  }

  async findProductById(productId: string): Promise<ProductRecord | null> {
    const [rows] = await this.pool.query("SELECT * FROM produk WHERE id = ? LIMIT 1", [productId]);
    const list = rows as any[];
    if (list.length === 0) return null;
    return this.mapRowToProduct(list[0]);
  }

  // Support lookup by SKU also for fallback
  async findProductBySku(sku: string): Promise<ProductRecord | null> {
    const [rows] = await this.pool.query("SELECT * FROM produk WHERE sku_digiflazz = ? LIMIT 1", [sku]);
    const list = rows as any[];
    if (list.length === 0) return null;
    return this.mapRowToProduct(list[0]);
  }

  async createProduct(input: CreateProductInput): Promise<ProductRecord> {
    let imageUrl = "";
    if (input.metadata && input.metadata.image_url) {
      imageUrl = String(input.metadata.image_url);
    }

    const mainCategory = input.metadata?.main_category ? String(input.metadata.main_category) : "";
    const subCategory = input.metadata?.sub_category ? String(input.metadata.sub_category) : "";
    const productType = input.metadata?.product_type ? String(input.metadata.product_type) : "";
    const description = input.metadata?.description ? String(input.metadata.description) : "";

    const [result] = await this.pool.query(
      `INSERT INTO produk (
        sku_digiflazz, nama, kategori, provider, harga_modal, harga_jual, status, 
        main_category, sub_category, product_type, image_url, deskripsi, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.skuDigiflazz,
        input.name,
        input.category,
        input.provider,
        input.basePriceMinor,
        input.basePriceMinor,
        input.isActive ? "active" : "inactive",
        mainCategory,
        subCategory,
        productType,
        imageUrl,
        description,
        JSON.stringify(input.metadata || {})
      ]
    );

    const insertId = (result as any).insertId;
    const created = await this.findProductById(String(insertId));
    if (!created) throw new Error("Failed to retrieve created product record.");
    return created;
  }

  async updateProduct(productId: string, input: UpdateProductInput): Promise<ProductRecord> {
    const existing = await this.findProductById(productId);
    if (!existing) throw new Error("Product record was not found.");

    const fields: string[] = [];
    const values: any[] = [];

    if (input.skuDigiflazz !== undefined) {
      fields.push("sku_digiflazz = ?");
      values.push(input.skuDigiflazz);
    }
    if (input.name !== undefined) {
      fields.push("nama = ?");
      values.push(input.name);
    }
    if (input.category !== undefined) {
      fields.push("kategori = ?");
      values.push(input.category);
    }
    if (input.provider !== undefined) {
      fields.push("provider = ?");
      values.push(input.provider);
    }
    if (input.basePriceMinor !== undefined) {
      fields.push("harga_modal = ?", "harga_jual = ?");
      values.push(input.basePriceMinor, input.basePriceMinor);
    }
    if (input.isActive !== undefined) {
      fields.push("status = ?");
      values.push(input.isActive ? "active" : "inactive");
    }
    if (input.metadata !== undefined) {
      fields.push("metadata = ?");
      values.push(JSON.stringify(input.metadata));
      if (input.metadata.image_url) {
        fields.push("image_url = ?");
        values.push(input.metadata.image_url);
      }
    }

    if (fields.length === 0) return existing;

    values.push(productId);
    await this.pool.query(`UPDATE produk SET ${fields.join(", ")} WHERE id = ?`, values);

    const updated = await this.findProductById(productId);
    if (!updated) throw new Error("Failed to retrieve updated product record.");
    return updated;
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.pool.query("DELETE FROM produk WHERE id = ?", [productId]);
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
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const results: any[] = [];

      for (const op of operations) {
        let imageUrl = "";
        if (op.metadata && op.metadata.image_url) {
          imageUrl = String(op.metadata.image_url);
        }

        const sql = `
          INSERT INTO produk (
            sku_digiflazz, nama, kategori, provider, harga_modal, harga_jual, status, 
            image_url, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            nama = VALUES(nama),
            kategori = VALUES(kategori),
            provider = VALUES(provider),
            harga_modal = VALUES(harga_modal),
            harga_jual = VALUES(harga_jual),
            status = VALUES(status),
            image_url = VALUES(image_url),
            metadata = VALUES(metadata)
        `;

        await connection.query(sql, [
          op.skuDigiflazz,
          op.name,
          op.category,
          op.provider,
          op.basePriceMinor,
          op.basePriceMinor,
          op.isActive ? "active" : "inactive",
          imageUrl,
          JSON.stringify(op.metadata)
        ]);

        const [rows] = await connection.query("SELECT * FROM produk WHERE sku_digiflazz = ?", [op.skuDigiflazz]);
        const list = rows as any[];
        if (list.length > 0) {
          results.push({
            id: String(list[0].id),
            sku_digiflazz: list[0].sku_digiflazz,
            name: list[0].nama,
            category: list[0].kategori,
            provider: list[0].provider,
            base_price_minor: Number(list[0].harga_modal),
            is_active: list[0].status === "active",
            metadata: op.metadata,
            created_at: new Date(list[0].created_at).toISOString(),
            updated_at: new Date(list[0].updated_at).toISOString()
          });
        }
      }

      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // --- Fallback Methods to Supabase Pricing Rules ---
  async listPricingRules(): Promise<PricingRuleRecord[]> {
    return this.fallback.listPricingRules();
  }

  async createPricingRule(input: CreatePricingRuleInput): Promise<PricingRuleRecord> {
    return this.fallback.createPricingRule(input);
  }

  async updatePricingRule(ruleId: string, input: UpdatePricingRuleInput): Promise<PricingRuleRecord> {
    return this.fallback.updatePricingRule(ruleId, input);
  }
}
