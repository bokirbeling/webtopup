import { type AuthUserRole } from "../auth/auth.types";

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
  productId?: string | null;
  productCode: string;
  provider: string;
  amountMinor: number;
  currency: string;
  referralCode?: string | null;
  discountCode?: string | null;
  metadata: Record<string, unknown>;
}>;

export type CreateOrderInput = CreateGuestOrderInput &
  Readonly<{
    userId: string | null;
    roleType: AuthUserRole;
  }>;

export type OrderRecord = Readonly<{
  id: string;
  orderNumber: string;
  customerRef: string | null;
  userId: string | null;
  productCode: string;
  provider: string;
  amountMinor: number;
  currency: string;
  status: OrderStatus;
  referralCode: string | null;
  discountCode: string | null;
  discountAmountMinor: number | null;
  metadata: Record<string, unknown>;
  basePriceSnapshot: number | null;
  markupSnapshot: number | null;
  rolePriceSnapshot: number | null;
  pricingRuleIdSnapshot: string | null;
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
  userId: string | null;
  productCode: string;
  provider: string;
  amountMinor: number;
  currency: string;
  status: OrderStatus;
  referralCode: string | null;
  discountCode: string | null;
  discountAmountMinor: number | null;
  metadata: Record<string, unknown>;
  basePriceSnapshot: number | null;
  markupSnapshot: number | null;
  rolePriceSnapshot: number | null;
  pricingRuleIdSnapshot: string | null;
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
