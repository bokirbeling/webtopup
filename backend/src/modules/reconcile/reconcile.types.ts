import { type FulfillmentRecord } from "../fulfillment/fulfillment.types";
import { type OrderStatus } from "../order/order.types";
import { type PaymentRecord } from "../payment/payment.types";

export type ReconciliationIssue =
  | "payment_paid_order_not_paid"
  | "payment_terminal_order_not_terminal"
  | "fulfillment_success_order_not_started"
  | "fulfillment_success_order_not_success"
  | "fulfillment_failed_order_not_failed"
  | "none";

export type ReconciliationAction = "transitioned" | "skipped" | "denied" | "error";

export type ReconciliationMetadata = Readonly<{
  source: "reconciliation_job";
  paymentId?: string;
  paymentStatus?: PaymentRecord["status"];
  fulfillmentId?: string;
  fulfillmentStatus?: FulfillmentRecord["status"];
  checkedAt: string;
}>;

export type ReconciliationResult = Readonly<{
  orderId: string;
  issue: ReconciliationIssue;
  action: ReconciliationAction;
  beforeStatus: OrderStatus | null;
  targetStatus: OrderStatus | null;
  afterStatus: OrderStatus | null;
  reason: string;
  metadata: ReconciliationMetadata;
}>;

export type ReconcileOrderInput = Readonly<{
  orderId: string;
}>;

export type ReconcileOrdersInput = Readonly<{
  orderIds: readonly string[];
}>;

export type ReconcileOrdersOutput = Readonly<{
  checkedAt: Date;
  results: ReconciliationResult[];
}>;
