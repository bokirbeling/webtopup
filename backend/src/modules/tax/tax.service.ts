import type {
  TaxRepository,
  TaxAllocationRecord,
  TaxReportRecord,
  CreateTaxAllocationInput
} from "./tax.types";

export type TaxService = Readonly<{
  createTaxAllocation(input: CreateTaxAllocationInput): Promise<TaxAllocationRecord>;
  markPaymentVerified(orderId: string): Promise<void>;
  markFulfillmentVerified(orderId: string): Promise<void>;
  tryAllocateTax(orderId: string): Promise<TaxAllocationRecord | null>;
  cancelTaxAllocation(orderId: string): Promise<void>;
  
  getTaxAllocationsByPeriod(period: string): Promise<readonly TaxAllocationRecord[]>;
  generateMonthlyReport(period: string, adminId: string): Promise<TaxReportRecord>;
  exportReport(period: string, format: string, reference: string): Promise<TaxReportRecord>;
}>;

export function createTaxService(options: {
  repository: TaxRepository;
}): TaxService {
  return {
    async createTaxAllocation(input) {
      // Calculate gross commission and tax allocation
      const grossCommissionMinor = Math.max(0, input.sellingPriceMinor - input.modalPriceMinor);
      const taxAllocationMinor = Math.round(grossCommissionMinor * 0.005); // 0.5%

      return options.repository.createTaxAllocation(input);
    },

    async markPaymentVerified(orderId) {
      const allocation = await options.repository.findTaxAllocationByOrderId(orderId);
      if (!allocation) {
        throw new Error(`Tax allocation not found for order ${orderId}`);
      }

      await options.repository.markPaymentVerified(orderId);
      
      // Try to allocate if both payment and fulfillment verified
      await this.tryAllocateTax(orderId);
    },

    async markFulfillmentVerified(orderId) {
      const allocation = await options.repository.findTaxAllocationByOrderId(orderId);
      if (!allocation) {
        throw new Error(`Tax allocation not found for order ${orderId}`);
      }

      await options.repository.markFulfillmentVerified(orderId);
      
      // Try to allocate if both payment and fulfillment verified
      await this.tryAllocateTax(orderId);
    },

    async tryAllocateTax(orderId) {
      const allocation = await options.repository.findTaxAllocationByOrderId(orderId);
      if (!allocation) return null;

      // Only allocate if both payment and fulfillment verified
      if (allocation.paymentVerifiedAt && allocation.fulfillmentVerifiedAt && allocation.status === "pending") {
        return options.repository.allocateTax(orderId);
      }

      return null;
    },

    async cancelTaxAllocation(orderId) {
      const allocation = await options.repository.findTaxAllocationByOrderId(orderId);
      if (!allocation) {
        throw new Error(`Tax allocation not found for order ${orderId}`);
      }

      await options.repository.cancelTaxAllocation(orderId);
    },

    async getTaxAllocationsByPeriod(period) {
      return options.repository.findTaxAllocationsByPeriod(period);
    },

    async generateMonthlyReport(period, adminId) {
      // Validate period format (YYYY-MM)
      if (!/^\d{4}-\d{2}$/.test(period)) {
        throw new Error("Invalid period format. Expected YYYY-MM");
      }

      return options.repository.generateTaxReport(period, adminId);
    },

    async exportReport(period, format, reference) {
      const report = await options.repository.findTaxReportByPeriod(period);
      if (!report) {
        throw new Error(`Tax report not found for period ${period}`);
      }

      return options.repository.exportTaxReport(period, format, reference);
    }
  };
}
