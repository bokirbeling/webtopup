import XLSX from "xlsx";

import {
  EXCEL_TEMPLATE_HEADERS,
  type ProductUploadRow,
  type ProductUploadValidationIssue,
  type ProductUploadValidationResult
} from "./product-upload.types";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function toMinorNumber(value: unknown, field: string) {
  const parsed = typeof value === "number" ? value : Number.parseInt(normalizeText(value), 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(field + " harus berupa angka bulat >= 0.");
  }

  return parsed;
}

function toStatus(value: string) {
  const normalized = value.toLowerCase();
  if (normalized === "aktif") return true;
  if (normalized === "tidak aktif") return false;
  throw new Error("Status harus 'Aktif' atau 'Tidak Aktif'.");
}

function toCategory(productName: string, description: string) {
  const token = productName.trim().split(/\s+/)[0];
  if (token && token.length > 0) {
    return token;
  }

  return description.trim() || "Uncategorized";
}

export function parseExcelFile(buffer: Buffer): ProductUploadRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  if (firstSheetName === undefined) {
    throw new Error("Workbook Excel tidak memiliki sheet.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

  if (rows.length === 0) {
    throw new Error("File Excel tidak berisi data produk.");
  }

  const actualHeaders = Object.keys(rows[0] ?? {});
  const missingHeaders = EXCEL_TEMPLATE_HEADERS.filter((header) => !actualHeaders.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error("Header template tidak lengkap: " + missingHeaders.join(", "));
  }

  return rows.map((row, index) => {
    const name = normalizeText(row["Produk"]);
    const description = normalizeText(row["Deskripsi"]);

    return {
      rowNumber: index + 2,
      skuDigiflazz: normalizeText(row["Kode Produk"]),
      name,
      provider: normalizeText(row["Seller"]),
      basePriceMinor: toMinorNumber(row["Harga"], "Harga"),
      maxPriceMinor: normalizeText(row["Harga Max"]) === "" ? null : toMinorNumber(row["Harga Max"], "Harga Max"),
      stock: normalizeText(row["Stok"]),
      isActive: toStatus(normalizeText(row["Status"])),
      changedAt: normalizeText(row["Perubahan Terakhir"]) || null,
      description,
      category: toCategory(name, description),
      sourceData: row
    };
  });
}

export function validateUploadData(rows: readonly ProductUploadRow[]): ProductUploadValidationResult {
  const issues: ProductUploadValidationIssue[] = [];
  const seenSkus = new Map<string, number>();

  for (const row of rows) {
    if (row.skuDigiflazz.length === 0) {
      issues.push({ rowNumber: row.rowNumber, field: "Kode Produk", message: "SKU wajib diisi." });
    }
    if (row.name.length === 0) {
      issues.push({ rowNumber: row.rowNumber, field: "Produk", message: "Nama produk wajib diisi." });
    }
    if (row.provider.length === 0) {
      issues.push({ rowNumber: row.rowNumber, field: "Seller", message: "Provider wajib diisi." });
    }

    const normalizedSku = row.skuDigiflazz.toLowerCase();
    const firstSeen = seenSkus.get(normalizedSku);
    if (firstSeen !== undefined) {
      issues.push({
        rowNumber: row.rowNumber,
        field: "Kode Produk",
        message: "SKU duplikat dalam file upload. Baris pertama ada di " + firstSeen + "."
      });
    } else {
      seenSkus.set(normalizedSku, row.rowNumber);
    }
  }

  return { ok: issues.length === 0, issues };
}
