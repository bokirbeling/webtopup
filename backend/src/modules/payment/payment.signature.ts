import { createHash, timingSafeEqual } from "node:crypto";

type MidtransSignatureInput = Readonly<{
  orderId: string;
  statusCode: string;
  grossAmount: string;
  serverKey: string;
}>;

export function computeMidtransSignatureKey(input: MidtransSignatureInput): string {
  return createHash("sha512")
    .update(`${input.orderId}${input.statusCode}${input.grossAmount}${input.serverKey}`)
    .digest("hex");
}

export function verifyMidtransSignature(input: MidtransSignatureInput & Readonly<{ signatureKey: string }>): boolean {
  const expected = computeMidtransSignatureKey(input);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(input.signatureKey, "utf8");

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}
