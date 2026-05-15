import { type FulfillmentRecord } from "../fulfillment/fulfillment.types";
import { type OrderRecord } from "../order/order.types";
import { type PaymentRecord, type WebhookEventRecord } from "../payment/payment.types";

export type TransactionHistoryLookup = Readonly<{
  order: OrderRecord;
  payment: PaymentRecord | null;
  fulfillment: FulfillmentRecord | null;
}>;

export type DashboardService = Readonly<{
  listMemberTransactions(userId: string): Promise<TransactionHistoryLookup[]>;
  getAdminMonitoring(): Promise<Readonly<{
    transactions: TransactionHistoryLookup[];
    webhooks: WebhookEventRecord[];
  }>>;
}>;
