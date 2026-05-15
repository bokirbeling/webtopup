export type PostpaidRecord = Readonly<{
  id: string;
  userId: string;
  refId: string;
  buyerSkuCode: string;
  customerNo: string;
  customerName: string | null;
  adminMinor: number | null;
  priceMinor: number | null;
  sellingPriceMinor: number | null;
  status: string | null;
  rc: string | null;
  message: string | null;
  inquiryStatus: string | null;
  inquiryRc: string | null;
  inquiryMessage: string | null;
  serialNumber: string | null;
  metadata: Record<string, unknown>;
  rawResponse: Record<string, unknown>;
  paymentRawResponse: Record<string, unknown> | null;
  statusRawResponse: Record<string, unknown> | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type CreatePostpaidInquiryInput = Readonly<{
  userId: string;
  refId: string;
  buyerSkuCode: string;
  customerNo: string;
  customerName: string | null;
  adminMinor: number | null;
  priceMinor: number | null;
  sellingPriceMinor: number | null;
  status: string | null;
  rc: string | null;
  message: string | null;
  inquiryStatus: string | null;
  inquiryRc: string | null;
  inquiryMessage: string | null;
  serialNumber: string | null;
  metadata: Record<string, unknown>;
  rawResponse: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}>;

export type UpdatePostpaidStateInput = Readonly<{
  refId: string;
  status: string | null;
  rc: string | null;
  message: string | null;
  serialNumber: string | null;
  rawResponse: Record<string, unknown>;
  rawResponseKind: "payment" | "status";
  paidAt: Date | null;
  updatedAt: Date;
}>;

export type PlnInquiryRecord = Readonly<{
  id: string;
  userId: string;
  customerNo: string;
  meterNo: string | null;
  subscriberId: string | null;
  customerName: string | null;
  segmentPower: string | null;
  status: string | null;
  rc: string | null;
  message: string | null;
  rawResponse: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}>;

export type CreatePlnInquiryInput = Readonly<{
  userId: string;
  customerNo: string;
  meterNo: string | null;
  subscriberId: string | null;
  customerName: string | null;
  segmentPower: string | null;
  status: string | null;
  rc: string | null;
  message: string | null;
  rawResponse: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}>;
