import { type OrderStatus } from "../order/order.types";

export type FulfillmentStatus = "queued" | "processing" | "success" | "failed";
export type FulfillmentProviderMode = "live" | "mock";

export type FulfillmentOrderLookup = Readonly<{
  id: string;
  orderNumber: string;
  customerRef: string | null;
  productCode: string;
  provider: string;
  amountMinor: number;
  currency: string;
  status: OrderStatus;
  metadata: Record<string, unknown>;
}>;

export type FulfillmentRecord = Readonly<{
  id: string;
  orderId: string;
  provider: string;
  attemptNo: number;
  providerFulfillmentId: string | null;
  providerReference: string | null;
  status: FulfillmentStatus;
  serialNumber: string | null;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type FulfillmentWebhookEventRecord = Readonly<{
  id: string;
  provider: string;
  eventKey: string;
  eventType: string;
  orderId: string | null;
  fulfillmentId: string | null;
  payload: Record<string, unknown>;
  processingState: "pending" | "processed" | "ignored" | "failed";
  receivedAt: Date;
  processedAt: Date | null;
  errorMessage: string | null;
}>;

export type DigiflazzCallbackPayload = Readonly<{
  data?: unknown;
  [key: string]: unknown;
}>;
