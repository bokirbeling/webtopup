import {
  type CommissionRepository,
  type CommissionRecord,
  type DiscountCodeRecord,
  type ReferralCodeRecord
} from "./commission.types";

export type CommissionService = Readonly<{
  calculateAndRecordCommission(options: {
    orderId: string;
    grossSaleMinor: number;
    basePriceMinor: number;
    resellerId: string | null;
    referralCode?: string | null;
    discountCode?: string | null;
  }): Promise<{
    discountAmountMinor: number;
    netSaleMinor: number;
    commissionAmountMinor: number;
    commissionId: string | null;
  }>;
  markCommissionPayable(orderId: string): Promise<void>;
  markCommissionCancelled(orderId: string): Promise<void>;
}>;

export function createCommissionService(options: { repository: CommissionRepository }): CommissionService {
  return {
    async calculateAndRecordCommission(input) {
      let discountAmountMinor = 0;
      let referralCodeId: string | null = null;
      let discountCodeId: string | null = null;
      let resellerId = input.resellerId;

      // 1. Handle Referral
      if (input.referralCode) {
        const referral = await options.repository.findReferralByCode(input.referralCode);
        if (referral) {
          referralCodeId = referral.id;
          if (!resellerId) resellerId = referral.resellerId;
        }
      }

      // 2. Handle Discount
      if (input.discountCode) {
        const discount = await options.repository.findDiscountByCode(input.discountCode);
        if (discount && input.grossSaleMinor >= discount.minOrderMinor) {
          discountCodeId = discount.id;
          if (discount.type === "fixed") {
            discountAmountMinor = discount.valueMinor;
          } else {
            discountAmountMinor = Math.floor((input.grossSaleMinor * discount.valueMinor) / 100);
          }
          if (discount.maxDiscountMinor) {
            discountAmountMinor = Math.min(discountAmountMinor, discount.maxDiscountMinor);
          }
        }
      }

      const netSaleMinor = Math.max(0, input.grossSaleMinor - discountAmountMinor);
      
      // Commission calculation: Admin sets base price (modal). 
      // Profit kotor = Net Sale - Base Price.
      // For now, entire profit goes to commission if reseller/referral present.
      const profitMinor = Math.max(0, netSaleMinor - input.basePriceMinor);
      const commissionAmountMinor = resellerId ? profitMinor : 0;

      let commissionId: string | null = null;
      if (resellerId) {
        const commission = await options.repository.createCommission({
          orderId: input.orderId,
          resellerId,
          referralCodeId,
          discountCodeId,
          grossSaleMinor: input.grossSaleMinor,
          discountAmountMinor,
          netSaleMinor,
          commissionPercentage: null,
          commissionAmountMinor,
          status: "pending"
        });
        commissionId = commission.id;
      }

      return {
        discountAmountMinor,
        netSaleMinor,
        commissionAmountMinor,
        commissionId
      };
    },

    async markCommissionPayable(orderId) {
      const commission = await options.repository.findCommissionByOrderId(orderId);
      if (commission && commission.status === "pending") {
        await options.repository.updateCommissionStatus(commission.id, "payable");
      }
    },

    async markCommissionCancelled(orderId) {
      const commission = await options.repository.findCommissionByOrderId(orderId);
      if (commission && commission.status === "pending") {
        await options.repository.updateCommissionStatus(commission.id, "cancelled");
      }
    }
  };
}
