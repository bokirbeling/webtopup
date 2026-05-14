import { type FulfillmentRecord } from "../fulfillment/fulfillment.types";
import { type OrderRecord, type OrderStatus, type StatusHistoryRecord } from "../order/order.types";
import { type PaymentRecord } from "../payment/payment.types";

export type InvoiceStatusTimelineItem = Readonly<{
  id: number;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  createdBy: string;
  createdAt: string;
}>;

export type InvoiceStatusLookup = Readonly<{
  order: OrderRecord;
  payment: PaymentRecord | null;
  fulfillment: FulfillmentRecord | null;
  timeline: StatusHistoryRecord[];
}>;

export type InvoiceStatusResponse = Readonly<{
  invoice_code: string;
  order_id: string;
  status: OrderStatus;
  product_code: string;
  provider: string;
  amount_minor: number;
  currency: string;
  payment: null | Readonly<{
    payment_id: string;
    provider: string;
    status: PaymentRecord["status"];
    paid_at: string | null;
    updated_at: string;
  }>;
  fulfillment: null | Readonly<{
    fulfillment_id: string;
    provider: string;
    status: FulfillmentRecord["status"];
    serial_number: string | null;
    processed_at: string | null;
    updated_at: string;
  }>;
  timeline: InvoiceStatusTimelineItem[];
}>;
