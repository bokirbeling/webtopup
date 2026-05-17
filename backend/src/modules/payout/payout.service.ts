import type {
  PayoutRepository,
  EncryptionService,
  CreatePayoutRequestInput,
  PayoutRequestRecord,
  DecryptedIdentityData,
  PayoutStatus
} from "./payout.types";

export type PayoutService = Readonly<{
  requestPayout(input: CreatePayoutRequestInput): Promise<PayoutRequestRecord>;
  getUserPayoutRequests(userId: string): Promise<readonly PayoutRequestRecord[]>;
  getAllPayoutRequests(filters?: { status?: PayoutStatus }): Promise<readonly PayoutRequestRecord[]>;
  approvePayoutRequest(id: string, adminId: string, bankFeeMinor?: number): Promise<PayoutRequestRecord>;
  rejectPayoutRequest(id: string, adminId: string, reason: string): Promise<PayoutRequestRecord>;
  markPayoutPaid(id: string, adminId: string, proofReference: string): Promise<PayoutRequestRecord>;
  decryptIdentityData(payoutRequestId: string, adminId: string, reason: string, ipAddress?: string, userAgent?: string): Promise<DecryptedIdentityData>;
  getUserPayableBalance(userId: string): Promise<number>;
}>;

export function createPayoutService(options: {
  repository: PayoutRepository;
  encryption: EncryptionService;
}): PayoutService {
  return {
    async requestPayout(input) {
      // 1. Check payable balance
      const payableBalance = await options.repository.getUserPayableBalance(input.userId);
      if (payableBalance < input.amountMinor) {
        throw new Error("Insufficient payable balance");
      }

      // 2. Create payout request
      const payoutRequest = await options.repository.createPayoutRequest(input);

      // 3. Reserve balance
      await options.repository.addBalanceLedgerEntry({
        userId: input.userId,
        payoutRequestId: payoutRequest.id,
        commissionId: null,
        type: "payout_reserved",
        amountMinor: -input.amountMinor,
        balanceAfterMinor: payableBalance - input.amountMinor,
        description: `Payout request ${payoutRequest.id} reserved`
      });

      return payoutRequest;
    },

    async getUserPayoutRequests(userId) {
      return options.repository.findPayoutRequestsByUserId(userId);
    },

    async getAllPayoutRequests(filters) {
      return options.repository.findAllPayoutRequests(filters);
    },

    async approvePayoutRequest(id, adminId, bankFeeMinor = 0) {
      const request = await options.repository.findPayoutRequestById(id);
      if (!request) throw new Error("Payout request not found");
      if (request.status !== "pending") throw new Error("Can only approve pending requests");

      return options.repository.updatePayoutStatus(id, "approved", adminId, `Bank fee: ${bankFeeMinor}`);
    },

    async rejectPayoutRequest(id, adminId, reason) {
      const request = await options.repository.findPayoutRequestById(id);
      if (!request) throw new Error("Payout request not found");
      if (request.status !== "pending" && request.status !== "approved") {
        throw new Error("Can only reject pending or approved requests");
      }

      // Release reserved balance
      const payableBalance = await options.repository.getUserPayableBalance(request.userId);
      await options.repository.addBalanceLedgerEntry({
        userId: request.userId,
        payoutRequestId: id,
        commissionId: null,
        type: "payout_released",
        amountMinor: request.amountMinor,
        balanceAfterMinor: payableBalance + request.amountMinor,
        description: `Payout request ${id} rejected: ${reason}`
      });

      return options.repository.updatePayoutStatus(id, "rejected", adminId, reason);
    },

    async markPayoutPaid(id, adminId, proofReference) {
      const request = await options.repository.findPayoutRequestById(id);
      if (!request) throw new Error("Payout request not found");
      if (request.status !== "approved" && request.status !== "processing") {
        throw new Error("Can only mark approved or processing requests as paid");
      }

      // Mark as paid in ledger
      const payableBalance = await options.repository.getUserPayableBalance(request.userId);
      await options.repository.addBalanceLedgerEntry({
        userId: request.userId,
        payoutRequestId: id,
        commissionId: null,
        type: "payout_paid",
        amountMinor: 0, // Already reserved, no balance change
        balanceAfterMinor: payableBalance,
        description: `Payout request ${id} paid. Ref: ${proofReference}`
      });

      return options.repository.markPayoutPaid(id, adminId, proofReference);
    },

    async decryptIdentityData(payoutRequestId, adminId, reason, ipAddress, userAgent) {
      const request = await options.repository.findPayoutRequestById(payoutRequestId);
      if (!request) throw new Error("Payout request not found");

      // Log decrypt access
      await options.repository.logDecryptAccess({
        payoutRequestId,
        adminId,
        reason,
        decryptedFields: ["legalName", "nik", "address", "bankName", "accountNumber", "accountHolder", "phone", "email"],
        ipAddress: ipAddress || null,
        userAgent: userAgent || null
      });

      // Decrypt all fields
      return {
        legalName: options.encryption.decrypt(request.encryptedLegalName),
        nik: options.encryption.decrypt(request.encryptedNik),
        address: options.encryption.decrypt(request.encryptedAddress),
        bankName: options.encryption.decrypt(request.encryptedBankName),
        accountNumber: options.encryption.decrypt(request.encryptedAccountNumber),
        accountHolder: options.encryption.decrypt(request.encryptedAccountHolder),
        phone: request.encryptedPhone ? options.encryption.decrypt(request.encryptedPhone) : null,
        email: request.encryptedEmail ? options.encryption.decrypt(request.encryptedEmail) : null
      };
    },

    async getUserPayableBalance(userId) {
      return options.repository.getUserPayableBalance(userId);
    }
  };
}
