export type CommissionStatus = "pending" | "approved" | "payable" | "paid" | "cancelled" | "reversed";

export type ReferralCodeRecord = Readonly<{
  id: string;
  resellerId: string;
  code: string;
  isActive: boolean;
  createdAt: Date;
}>;

export type DiscountCodeRecord = Readonly<{
  id: string;
  code: string;
  type: "fixed" | "percentage";
  valueMinor: number;
  maxDiscountMinor: number | null;
  minOrderMinor: number;
  isActive: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}>;

export type CommissionRecord = Readonly<{
  id: string;
  orderId: string;
  resellerId: string | null;
  referralCodeId: string | null;
  discountCodeId: string | null;
  grossSaleMinor: number;
  discountAmountMinor: number;
  netSaleMinor: number;
  commissionPercentage: number | null;
  commissionAmountMinor: number;
  status: CommissionStatus;
  createdAt: Date;
  updatedAt: Date;
}>;

export type PerformanceCurveResult = Readonly<{
  date: string;
  count: number;
  grossMinor: number;
  commissionMinor: number;
}>;

export type CreateCommissionInput = Omit<CommissionRecord, "id" | "createdAt" | "updatedAt">;

export type CommissionRepository = Readonly<{
  findReferralByCode(code: string): Promise<ReferralCodeRecord | null>;
  findDiscountByCode(code: string): Promise<DiscountCodeRecord | null>;
  createCommission(input: CreateCommissionInput): Promise<CommissionRecord>;
  findCommissionByOrderId(orderId: string): Promise<CommissionRecord | null>;
  updateCommissionStatus(id: string, status: CommissionStatus): Promise<CommissionRecord>;
  getPerformanceCurves(options: { resellerId?: string; affiliateId?: string; interval: "day" | "month" }): Promise<readonly PerformanceCurveResult[]>;
}>;
