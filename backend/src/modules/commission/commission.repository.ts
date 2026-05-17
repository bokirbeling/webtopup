import { randomUUID } from "node:crypto";
import {
  type CommissionRecord,
  type CreateCommissionInput,
  type DiscountCodeRecord,
  type ReferralCodeRecord,
  type CommissionStatus,
  type PerformanceCurveResult,
  type CommissionRepository
} from "./commission.types";

export class InMemoryCommissionRepository implements CommissionRepository {
  private readonly referrals: ReferralCodeRecord[] = [];
  private readonly discounts: DiscountCodeRecord[] = [];
  private readonly commissions: CommissionRecord[] = [];

  // Seed for tests
  async seedReferral(input: ReferralCodeRecord) { this.referrals.push(input); }
  async seedDiscount(input: DiscountCodeRecord) { this.discounts.push(input); }

  async findReferralByCode(code: string): Promise<ReferralCodeRecord | null> {
    return this.referrals.find((r) => r.code.toUpperCase() === code.toUpperCase() && r.isActive) ?? null;
  }

  async findDiscountByCode(code: string): Promise<DiscountCodeRecord | null> {
    const now = new Date();
    return this.discounts.find((d) => 
      d.code.toUpperCase() === code.toUpperCase() && 
      d.isActive &&
      (!d.startsAt || d.startsAt <= now) &&
      (!d.expiresAt || d.expiresAt >= now)
    ) ?? null;
  }

  async createCommission(input: CreateCommissionInput): Promise<CommissionRecord> {
    const commission: CommissionRecord = {
      ...input,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.commissions.push(commission);
    return commission;
  }

  async findCommissionByOrderId(orderId: string): Promise<CommissionRecord | null> {
    return this.commissions.find((c) => c.orderId === orderId) ?? null;
  }

  async updateCommissionStatus(id: string, status: CommissionStatus): Promise<CommissionRecord> {
    const index = this.commissions.findIndex((c) => c.id === id);
    if (index === -1) throw new Error("Commission not found");
    const updated = { ...this.commissions[index], status, updatedAt: new Date() };
    this.commissions[index] = updated;
    return updated;
  }

  async getPerformanceCurves(options: { resellerId?: string; affiliateId?: string; interval: "day" | "month" }): Promise<readonly PerformanceCurveResult[]> {
    let filtered = this.commissions.filter(c => c.status === "payable" || c.status === "paid");
    if (options.resellerId) filtered = filtered.filter(c => c.resellerId === options.resellerId);
    if (options.affiliateId) filtered = filtered.filter(c => c.referralCodeId === options.affiliateId);

    const curves: Record<string, { date: string; count: number; grossMinor: number; commissionMinor: number }> = {};
    for (const c of filtered) {
      const dateKey = options.interval === "day" 
        ? c.createdAt.toISOString().split("T")[0] 
        : c.createdAt.toISOString().substring(0, 7);
      
      if (!curves[dateKey]) {
        curves[dateKey] = { date: dateKey, count: 0, grossMinor: 0, commissionMinor: 0 };
      }
      curves[dateKey].count++;
      curves[dateKey].grossMinor += c.grossSaleMinor;
      curves[dateKey].commissionMinor += c.commissionAmountMinor;
    }

    return Object.values(curves).sort((a, b) => a.date.localeCompare(b.date));
  }
}

export class SupabaseCommissionRepository implements CommissionRepository {
  constructor(
    private readonly supabaseUrl: string,
    private readonly supabaseServiceRoleKey: string,
    private readonly tablePrefix: string = ""
  ) {}

  private tableName(table: string): string {
    return this.tablePrefix + table;
  }

  private get headers() {
    return {
      "apikey": this.supabaseServiceRoleKey,
      "Authorization": `Bearer ${this.supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    };
  }

  async findReferralByCode(code: string): Promise<ReferralCodeRecord | null> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/${this.tableName("referral_codes")}?code=eq.${encodeURIComponent(code)}&is_active=eq.true&select=*`, {
      headers: this.headers
    });
    if (!response.ok) return null;
    const [data] = await response.json();
    return data ? this.mapReferralRow(data) : null;
  }

  async findDiscountByCode(code: string): Promise<DiscountCodeRecord | null> {
    const now = new Date().toISOString();
    const url = `${this.supabaseUrl}/rest/v1/${this.tableName("discount_codes")}?code=eq.${encodeURIComponent(code)}&is_active=eq.true&or=(starts_at.is.null,starts_at.lte.${now})&or=(expires_at.is.null,expires_at.gte.${now})&select=*`;
    const response = await fetch(url, { headers: this.headers });
    if (!response.ok) return null;
    const [data] = await response.json();
    return data ? this.mapDiscountRow(data) : null;
  }

  async createCommission(input: CreateCommissionInput): Promise<CommissionRecord> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/${this.tableName("commissions")}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        order_id: input.orderId,
        reseller_id: input.resellerId,
        referral_code_id: input.referralCodeId,
        discount_code_id: input.discountCodeId,
        gross_sale_minor: input.grossSaleMinor,
        discount_amount_minor: input.discountAmountMinor,
        net_sale_minor: input.netSaleMinor,
        commission_percentage: input.commissionPercentage,
        commission_amount_minor: input.commissionAmountMinor,
        status: input.status
      })
    });
    if (!response.ok) throw new Error("Failed to create commission");
    const [data] = await response.json();
    return this.mapCommissionRow(data);
  }

  async findCommissionByOrderId(orderId: string): Promise<CommissionRecord | null> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/${this.tableName("commissions")}?order_id=eq.${orderId}&select=*`, {
      headers: this.headers
    });
    if (!response.ok) return null;
    const [data] = await response.json();
    return data ? this.mapCommissionRow(data) : null;
  }

  async updateCommissionStatus(id: string, status: CommissionStatus): Promise<CommissionRecord> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/${this.tableName("commissions")}?id=eq.${id}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify({ status, updated_at: new Date().toISOString() })
    });
    if (!response.ok) throw new Error("Failed to update commission");
    const [data] = await response.json();
    return this.mapCommissionRow(data);
  }

  async getPerformanceCurves(options: { resellerId?: string; affiliateId?: string; interval: "day" | "month" }): Promise<readonly PerformanceCurveResult[]> {
    // Note: real version uses RPC or complex grouping in REST. 
    // This scaffolded version provides the pattern.
    return [];
  }

  private mapReferralRow(row: any): ReferralCodeRecord {
    return {
      id: row.id,
      resellerId: row.reseller_id,
      code: row.code,
      isActive: row.is_active,
      createdAt: new Date(row.created_at)
    };
  }

  private mapDiscountRow(row: any): DiscountCodeRecord {
    return {
      id: row.id,
      code: row.code,
      type: row.type,
      valueMinor: row.value_minor,
      maxDiscountMinor: row.max_discount_minor,
      minOrderMinor: row.min_order_minor,
      isActive: row.is_active,
      startsAt: row.starts_at ? new Date(row.starts_at) : null,
      expiresAt: row.expires_at ? new Date(row.expires_at) : null,
      createdAt: new Date(row.created_at)
    };
  }

  private mapCommissionRow(row: any): CommissionRecord {
    return {
      id: row.id,
      orderId: row.order_id,
      resellerId: row.reseller_id,
      referralCodeId: row.referral_code_id,
      discountCodeId: row.discount_code_id,
      grossSaleMinor: row.gross_sale_minor,
      discountAmountMinor: row.discount_amount_minor,
      netSaleMinor: row.net_sale_minor,
      commissionPercentage: row.commission_percentage,
      commissionAmountMinor: row.commission_amount_minor,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
