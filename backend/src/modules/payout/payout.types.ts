export type PayoutStatus = "pending" | "approved" | "processing" | "paid" | "rejected" | "cancelled";

export type PayoutRequestRecord = Readonly<{
  id: string;
  userId: string;
  amountMinor: number;
  bankFeeMinor: number;
  netAmountMinor: number;
  status: PayoutStatus;
  
  // Encrypted fields
  encryptedLegalName: string;
  encryptedNik: string;
  encryptedAddress: string;
  encryptedBankName: string;
  encryptedAccountNumber: string;
  encryptedAccountHolder: string;
  encryptedPhone: string | null;
  encryptedEmail: string | null;
  
  identityFingerprint: string;
  
  adminId: string | null;
  adminNote: string | null;
  proofReference: string | null;
  processedAt: Date | null;
  
  createdAt: Date;
  updatedAt: Date;
}>;

export type PayoutBalanceLedgerRecord = Readonly<{
  id: string;
  userId: string;
  payoutRequestId: string | null;
  commissionId: string | null;
  type: "commission_earned" | "payout_reserved" | "payout_released" | "payout_paid";
  amountMinor: number;
  balanceAfterMinor: number;
  description: string | null;
  createdAt: Date;
}>;

export type PayoutDecryptAuditRecord = Readonly<{
  id: string;
  payoutRequestId: string;
  adminId: string;
  reason: string;
  decryptedFields: readonly string[];
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}>;

export type DecryptedIdentityData = Readonly<{
  legalName: string;
  nik: string;
  address: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  phone: string | null;
  email: string | null;
}>;

export type CreatePayoutRequestInput = Readonly<{
  userId: string;
  amountMinor: number;
  identityData: {
    legalName: string;
    nik: string;
    address: string;
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    phone?: string;
    email?: string;
  };
}>;

export type PayoutRepository = Readonly<{
  getUserPayableBalance(userId: string): Promise<number>;
  createPayoutRequest(input: CreatePayoutRequestInput): Promise<PayoutRequestRecord>;
  findPayoutRequestById(id: string): Promise<PayoutRequestRecord | null>;
  findPayoutRequestsByUserId(userId: string): Promise<readonly PayoutRequestRecord[]>;
  findAllPayoutRequests(filters?: { status?: PayoutStatus }): Promise<readonly PayoutRequestRecord[]>;
  updatePayoutStatus(id: string, status: PayoutStatus, adminId: string, note?: string): Promise<PayoutRequestRecord>;
  markPayoutPaid(id: string, adminId: string, proofReference: string): Promise<PayoutRequestRecord>;
  
  addBalanceLedgerEntry(entry: Omit<PayoutBalanceLedgerRecord, "id" | "createdAt">): Promise<PayoutBalanceLedgerRecord>;
  getUserBalanceLedgers(userId: string): Promise<readonly PayoutBalanceLedgerRecord[]>;
  
  logDecryptAccess(log: Omit<PayoutDecryptAuditRecord, "id" | "createdAt">): Promise<PayoutDecryptAuditRecord>;
}>;

export type EncryptionService = Readonly<{
  encrypt(plaintext: string): string;
  decrypt(ciphertext: string): string;
  hash(data: string): string;
}>;
