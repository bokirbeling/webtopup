import { describe, expect, it, jest } from "@jest/globals";

import {
  buildDigiflazzBalanceRequest,
  buildDigiflazzDepositTicketRequest,
  buildDigiflazzPlnInquiryRequest,
  buildDigiflazzPostpaidInquiryRequest,
  buildDigiflazzPostpaidPayRequest,
  buildDigiflazzPostpaidStatusRequest,
  buildDigiflazzPriceListRequest,
  buildDigiflazzTopupRequest,
  createDigiflazzBuyerClient,
  parseDigiflazzBuyerResponse,
  requireDigiflazzBuyerCredentials,
  signDigiflazzBuyer
} from "./buyer-client";

const credentials = {
  username: "buyer-user",
  apiKey: "buyer-api-key"
};

describe("Digiflazz Buyer client contracts", () => {
  it("builds prepaid topup and recheck payloads with md5(username + apiKey + ref_id)", () => {
    expect(signDigiflazzBuyer(credentials, "ref-001")).toBe("6c4f822bea21bfb8a29da37b318703b5");
    expect(
      buildDigiflazzTopupRequest({
        credentials,
        buyerSkuCode: "xld25",
        customerNo: "087800001233",
        refId: "ref-001",
        testing: true,
        maxPrice: 25000,
        callbackUrl: "https://example.test/digiflazz/callback",
        allowDot: true
      })
    ).toEqual({
      username: "buyer-user",
      buyer_sku_code: "xld25",
      customer_no: "087800001233",
      ref_id: "ref-001",
      sign: "6c4f822bea21bfb8a29da37b318703b5",
      testing: true,
      max_price: 25000,
      cb_url: "https://example.test/digiflazz/callback",
      allow_dot: true
    });
  });

  it("builds price list, balance, deposit, and PLN inquiry payload signatures", () => {
    expect(buildDigiflazzPriceListRequest({ credentials, cmd: "prepaid", brand: "PLN" })).toEqual({
      cmd: "prepaid",
      username: "buyer-user",
      sign: "315f8be55c50aac93fb58f16328b605e",
      brand: "PLN"
    });
    expect(buildDigiflazzBalanceRequest(credentials)).toEqual({
      cmd: "deposit",
      username: "buyer-user",
      sign: "e643abd4620fed01b1d262e3fb2f4260"
    });
    expect(buildDigiflazzDepositTicketRequest({ credentials, amount: 10000000, bank: "BCA", ownerName: "John Doe" })).toEqual({
      username: "buyer-user",
      amount: 10000000,
      bank: "BCA",
      owner_name: "John Doe",
      sign: "8e714655c8c7d022f2044a7c7e25cf91"
    });
    expect(buildDigiflazzPlnInquiryRequest({ credentials, customerNo: "530000000003" })).toEqual({
      username: "buyer-user",
      customer_no: "530000000003",
      sign: "457047a708cf1b245b912285257f510b"
    });
  });

  it("builds postpaid inquiry, pay, and status payloads with ref_id signatures", () => {
    const base = {
      username: "buyer-user",
      buyer_sku_code: "pln",
      customer_no: "530000000003",
      ref_id: "ref-001",
      sign: "6c4f822bea21bfb8a29da37b318703b5"
    };

    expect(buildDigiflazzPostpaidInquiryRequest({ credentials, buyerSkuCode: "pln", customerNo: "530000000003", refId: "ref-001" })).toEqual({
      commands: "inq-pasca",
      ...base
    });
    expect(buildDigiflazzPostpaidPayRequest({ credentials, buyerSkuCode: "pln", customerNo: "530000000003", refId: "ref-001" })).toEqual({
      commands: "pay-pasca",
      ...base
    });
    expect(buildDigiflazzPostpaidStatusRequest({ credentials, buyerSkuCode: "pln", customerNo: "530000000003", refId: "ref-001" })).toEqual({
      commands: "status-pasca",
      ...base
    });
  });

  it("unwraps data responses while preserving status fields and raw payload", () => {
    const raw = {
      data: {
        ref_id: "ref-001",
        rc: "03",
        message: "Transaksi Pending",
        status: "Pending"
      }
    };

    expect(parseDigiflazzBuyerResponse(raw)).toEqual({
      data: raw.data,
      raw,
      rc: "03",
      message: "Transaksi Pending",
      status: "Pending"
    });
  });

  it("names missing credential fields without leaking configured secrets or calling fetch", async () => {
    const fetchImpl = jest.fn<typeof fetch>();
    const client = createDigiflazzBuyerClient(
      {
        username: "buyer-user",
        apiKey: null,
        apiBaseUrl: "https://api.digiflazz.test"
      },
      fetchImpl
    );

    expect(() => requireDigiflazzBuyerCredentials({ username: null, apiKey: "configured-secret-value" })).toThrow("DIGIFLAZZ_USERNAME");
    expect(() => requireDigiflazzBuyerCredentials({ username: null, apiKey: "configured-secret-value" })).not.toThrow("configured-secret-value");
    await expect(client.balance()).rejects.toThrow("DIGIFLAZZ_API_KEY");
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
