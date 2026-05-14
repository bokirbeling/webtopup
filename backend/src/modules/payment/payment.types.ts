export type PaymentRecord = Readonly<{
  id: string;
  orderId: string;
  provider: string;
  idempotencyKey: string;
  providerPaymentId: string | null;
  providerReference: string | null;
  amountMinor: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "expired" | "cancelled" | "refunded";
  paidAt: Date | null;
  payload: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}>;

export type WebhookEventRecord = Readonly<{
  id: string;
  provider: string;
  eventKey: string;
  eventType: string;
  orderId: string | null;
  paymentId: string | null;
  payload: Record<string, unknown>;
  processingState: "pending" | "processed" | "ignored" | "failed";
  receivedAt: Date;
  processedAt: Date | null;
  errorMessage: string | null;
}>;

export type PaymentOrderLookup = Readonly<{
  id: string;
  orderNumber: string;
  amountMinor: number;
  currency: string;
  status: "created" | "pending_payment" | "paid" | "fulfillment_pending" | "success" | "failed" | "expired";
}>;

export type MidtransWebhookPayload = Readonly<{
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  transaction_status?: string;
  fraud_status?: string;
  transaction_id?: string;
  signature_key?: string;
  [key: string]: unknown;
}>;
