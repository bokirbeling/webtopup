export const ORDER_STATUSES = [
  "created",
  "pending_payment",
  "paid",
  "fulfillment_pending",
  "success",
  "failed",
  "expired"
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type CreateGuestOrderInput = Readonly<{
  customerRef: string | null;
  productCode: string;
  provider: string;
  amountMinor: number;
  currency: string;
  metadata: Record<string, unknown>;
}>;

export type OrderRecord = Readonly<{
  id: string;
  orderNumber: string;
  customerRef: string | null;
  productCode: string;
  provider: string;
  amountMinor: number;
  currency: string;
  status: OrderStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}>;

export type StatusHistoryRecord = Readonly<{
  id: number;
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
}>;

export type CreateOrderRecordInput = Readonly<{
  id: string;
  orderNumber: string;
  customerRef: string | null;
  productCode: string;
  provider: string;
  amountMinor: number;
  currency: string;
  status: OrderStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}>;

export type CreateStatusHistoryInput = Readonly<{
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  note: string | null;
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
}>;

export type OrderTransitionInput = Readonly<{
  orderId: string;
  toStatus: OrderStatus;
  note?: string;
  metadata?: Record<string, unknown>;
  createdBy?: string;
}>;
