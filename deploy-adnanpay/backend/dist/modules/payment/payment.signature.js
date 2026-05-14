"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeMidtransSignatureKey = computeMidtransSignatureKey;
exports.verifyMidtransSignature = verifyMidtransSignature;
const node_crypto_1 = require("node:crypto");
function computeMidtransSignatureKey(input) {
    return (0, node_crypto_1.createHash)("sha512")
        .update(`${input.orderId}${input.statusCode}${input.grossAmount}${input.serverKey}`)
        .digest("hex");
}
function verifyMidtransSignature(input) {
    const expected = computeMidtransSignatureKey(input);
    const expectedBuffer = Buffer.from(expected, "utf8");
    const providedBuffer = Buffer.from(input.signatureKey, "utf8");
    if (expectedBuffer.length !== providedBuffer.length) {
        return false;
    }
    return (0, node_crypto_1.timingSafeEqual)(expectedBuffer, providedBuffer);
}
