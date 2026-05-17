export type ProviderName = "midtrans" | "digiflazz";
export type LedgerSource = "api" | "manual" | "calculated";

export type ProviderEventRecord = Readonly<{
  id: string;
  orderId: string | null;
  paymentId: string | null;
  fulfillmentId: string | null;
  provider: ProviderName;
  eventType: string;
  providerReference: string | null;
  providerStatus: string | null;
  providerCode: string | null;
  providerMessage: string | null;
  amountMinor: number | null;
  skuDigiflazz: string | null;
  customerNoMasked: string | null;
  serialNumber: string | null;
  signatureVerified: boolean;
  amountMatched: boolean;
  idempotencyKey: string | null;
  rawPayload: Record<string, unknown> | null;
  safeSummary: string | null;
  createdAt: Date;
}>;

export type CreateProviderEventInput = Omit<ProviderEventRecord, "id" | "createdAt">;

export type BalanceLedgerRecord = Readonly<{
  id: string;
  provider: ProviderName;
  source: LedgerSource;
  amountMinor: number;
  balanceAfterMinor: number | null;
  note: string | null;
  actorId: string | null;
  orderId: string | null;
  createdAt: Date;
}>;

export type CreateLedgerEntryInput = Omit<BalanceLedgerRecord, "id" | "createdAt">;

export type ProviderAuditRepository = Readonly<{
  recordProviderEvent(input: CreateProviderEventInput): Promise<ProviderEventRecord>;
  listProviderEvents(filters: { orderId?: string; userId?: string; limit?: number }): Promise<readonly ProviderEventRecord[]>;
  recordLedgerEntry(input: CreateLedgerEntryInput): Promise<BalanceLedgerRecord>;
  listLedgerEntries(filters: { provider?: ProviderName; limit?: number }): Promise<readonly BalanceLedgerRecord[]>;
}>;
