export type TaxStatus = "pending" | "allocated" | "reported" | "cancelled";

export type TaxAllocationRecord = Readonly<{
  id: string;
  orderId: string;
  userId: string;
  
  // Snapshot values in minor units
  modalPriceMinor: number;
  sellingPriceMinor: number;
  grossCommissionMinor: number;
  
  // Tax calculation
  taxRate: number; // 0.0050 for 0.5%
  taxAllocationMinor: number;
  
  status: TaxStatus;
  
  paymentVerifiedAt: Date | null;
  fulfillmentVerifiedAt: Date | null;
  allocatedAt: Date | null;
  
  reportingPeriod: string | null; // YYYY-MM
  reportedAt: Date | null;
  
  createdAt: Date;
  updatedAt: Date;
}>;

export type TaxReportRecord = Readonly<{
  id: string;
  reportingPeriod: string; // YYYY-MM
  
  totalTransactions: number;
  totalGrossCommissionMinor: number;
  totalTaxAllocationMinor: number;
  
  generatedBy: string | null;
  generatedAt: Date;
  
  exportedAt: Date | null;
  exportFormat: string | null;
  exportReference: string | null;
  
  createdAt: Date;
  updatedAt: Date;
}>;

export type CreateTaxAllocationInput = Readonly<{
  orderId: string;
  userId: string;
  modalPriceMinor: number;
  sellingPriceMinor: number;
}>;

export type TaxRepository = Readonly<{
  createTaxAllocation(input: CreateTaxAllocationInput): Promise<TaxAllocationRecord>;
  findTaxAllocationByOrderId(orderId: string): Promise<TaxAllocationRecord | null>;
  markPaymentVerified(orderId: string): Promise<TaxAllocationRecord>;
  markFulfillmentVerified(orderId: string): Promise<TaxAllocationRecord>;
  allocateTax(orderId: string): Promise<TaxAllocationRecord>;
  cancelTaxAllocation(orderId: string): Promise<TaxAllocationRecord>;
  
  findTaxAllocationsByPeriod(period: string): Promise<readonly TaxAllocationRecord[]>;
  generateTaxReport(period: string, generatedBy: string): Promise<TaxReportRecord>;
  findTaxReportByPeriod(period: string): Promise<TaxReportRecord | null>;
  exportTaxReport(period: string, format: string, reference: string): Promise<TaxReportRecord>;
}>;
