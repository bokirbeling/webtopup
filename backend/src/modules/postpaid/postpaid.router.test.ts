import { describe, expect, it, jest } from "@jest/globals";
import request from "supertest";

import { createApp } from "../../app";
import { InMemoryPostpaidRepository } from "./postpaid.repository";

type RegisteredUser = Readonly<{
  user: Readonly<{ id: string }>;
  token: string;
}>;

async function registerUser(app: ReturnType<typeof createApp>, email: string): Promise<RegisteredUser> {
  const response = await request(app).post("/api/auth/register").send({
    email,
    password: "correct-password"
  });

  expect(response.status).toBe(201);
  return response.body as RegisteredUser;
}

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify({ data }), { status: 200, headers: { "Content-Type": "application/json" } });
}

function readPayload(init: RequestInit | undefined): Record<string, unknown> {
  return JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
}

function createPostpaidApp(fetchImpl: jest.MockedFunction<typeof fetch>, repository = new InMemoryPostpaidRepository()) {
  return {
    repository,
    app: createApp({
      postpaidRepository: repository,
      fetchImpl,
      digiflazzConfig: {
        username: "buyer-user",
        apiKey: "buyer-api-key",
        apiBaseUrl: "https://api.digiflazz.test",
        nodeEnv: "test",
        topupOptions: {
          testing: true
        }
      }
    })
  };
}

describe("Digiflazz postpaid routes", () => {
  it("runs inquiry, pay, status-pasca, and PLN inquiry through the Buyer client", async () => {
    const fetchImpl = jest.fn<typeof fetch>(async (_url, init) => {
      const payload = readPayload(init);
      if (payload.commands === "inq-pasca") {
        return jsonResponse({
          ref_id: payload.ref_id,
          customer_no: payload.customer_no,
          customer_name: "Nama Pelanggan Pertama",
          buyer_sku_code: payload.buyer_sku_code,
          admin: 2500,
          message: "Transaksi Sukses",
          status: "Sukses",
          rc: "00",
          buyer_last_saldo: 100000,
          price: 10000,
          selling_price: 11000,
          desc: {
            tarif: "R1",
            daya: 1300,
            lembar_tagihan: 1,
            detail: [{ periode: "201901", nilai_tagihan: "8000", admin: "2500", denda: "500" }]
          }
        });
      }
      if (payload.commands === "pay-pasca") {
        return jsonResponse({
          ref_id: payload.ref_id,
          customer_no: payload.customer_no,
          customer_name: "Nama Pelanggan Pertama",
          buyer_sku_code: payload.buyer_sku_code,
          admin: 2500,
          message: "Transaksi Pending",
          status: "Pending",
          rc: "03",
          sn: "S1234554321N",
          price: 10000,
          selling_price: 11000
        });
      }
      if (payload.commands === "status-pasca") {
        return jsonResponse({
          ref_id: payload.ref_id,
          customer_no: payload.customer_no,
          customer_name: "Nama Pelanggan Pertama",
          buyer_sku_code: payload.buyer_sku_code,
          admin: 2500,
          message: "Transaksi Sukses",
          status: "Sukses",
          rc: "00",
          sn: "S1234554321N",
          price: 10000,
          selling_price: 11000
        });
      }

      return jsonResponse({
        message: "Transaksi Sukses",
        status: "Sukses",
        rc: "00",
        customer_no: payload.customer_no,
        meter_no: "1234554321",
        subscriber_id: "523300817840",
        name: "DAVID",
        segment_power: "R1 /000001300"
      });
    });
    const fixture = createPostpaidApp(fetchImpl);
    const owner = await registerUser(fixture.app, "postpaid-owner@example.com");

    const inquiry = await request(fixture.app)
      .post("/api/digiflazz/v1/transaction")
      .set("Authorization", "Bearer " + owner.token)
      .send({
        commands: "inq-pasca",
        buyer_sku_code: "pln",
        customer_no: "530000000001",
        ref_id: "postpaid-ref-001"
      });

    expect(inquiry.status).toBe(201);
    expect(inquiry.body.inquiry).toMatchObject({
      user_id: owner.user.id,
      ref_id: "postpaid-ref-001",
      buyer_sku_code: "pln",
      customer_no: "530000000001",
      customer_name: "Nama Pelanggan Pertama",
      admin: 2500,
      price: 10000,
      selling_price: 11000,
      amount_minor: 11000,
      status: "Sukses",
      rc: "00",
      inquiry_status: "Sukses",
      metadata: {
        desc: {
          tarif: "R1",
          daya: 1300,
          lembar_tagihan: 1,
          detail: [{ periode: "201901", nilai_tagihan: "8000", admin: "2500", denda: "500" }]
        }
      }
    });

    const payment = await request(fixture.app)
      .post("/api/digiflazz/pay-pasca")
      .set("Authorization", "Bearer " + owner.token)
      .send({ ref_id: "postpaid-ref-001" });

    expect(payment.status).toBe(200);
    expect(payment.body.inquiry).toMatchObject({
      ref_id: "postpaid-ref-001",
      status: "Pending",
      rc: "03",
      sn: "S1234554321N",
      selling_price: 11000,
      amount_minor: 11000
    });

    const status = await request(fixture.app)
      .post("/api/digiflazz/status-pasca")
      .set("Authorization", "Bearer " + owner.token)
      .send({ ref_id: "postpaid-ref-001" });

    expect(status.status).toBe(200);
    expect(status.body.inquiry).toMatchObject({
      ref_id: "postpaid-ref-001",
      status: "Sukses",
      rc: "00",
      selling_price: 11000,
      amount_minor: 11000,
      paid_at: expect.any(String)
    });

    const pln = await request(fixture.app)
      .post("/api/digiflazz/v1/inquiry-pln")
      .set("Authorization", "Bearer " + owner.token)
      .send({ customer_no: "1234554321" });

    expect(pln.status).toBe(201);
    expect(pln.body.inquiry).toMatchObject({
      user_id: owner.user.id,
      customer_no: "1234554321",
      meter_no: "1234554321",
      subscriber_id: "523300817840",
      name: "DAVID",
      segment_power: "R1 /000001300",
      status: "Sukses",
      rc: "00"
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://api.digiflazz.test/v1/transaction",
      expect.objectContaining({ body: expect.stringContaining('"commands":"inq-pasca"') })
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      4,
      "https://api.digiflazz.test/v1/inquiry-pln",
      expect.objectContaining({ body: expect.stringContaining('"customer_no":"1234554321"') })
    );
  });

  it("rejects client amount tampering and pays with the stored inquiry amount and identifiers", async () => {
    const requestPayloads: Record<string, unknown>[] = [];
    const fetchImpl = jest.fn<typeof fetch>(async (_url, init) => {
      const payload = readPayload(init);
      requestPayloads.push(payload);
      if (payload.commands === "inq-pasca") {
        return jsonResponse({
          ref_id: "tamper-ref-001",
          customer_no: "530000000001",
          customer_name: "Nama Pelanggan Pertama",
          buyer_sku_code: "pln",
          admin: 2500,
          message: "Transaksi Sukses",
          status: "Sukses",
          rc: "00",
          price: 10000,
          selling_price: 11000,
          desc: { detail: [] }
        });
      }

      return jsonResponse({
        ref_id: payload.ref_id,
        customer_no: payload.customer_no,
        customer_name: "Nama Pelanggan Pertama",
        buyer_sku_code: payload.buyer_sku_code,
        admin: 999999,
        message: "Transaksi Sukses",
        status: "Sukses",
        rc: "00",
        price: 999999,
        selling_price: 999999,
        sn: "S-TAMPER-IGNORED"
      });
    });
    const fixture = createPostpaidApp(fetchImpl);
    const owner = await registerUser(fixture.app, "tamper-owner@example.com");

    const inquiry = await request(fixture.app)
      .post("/api/digiflazz/inq-pasca")
      .set("Authorization", "Bearer " + owner.token)
      .send({ buyer_sku_code: "pln", customer_no: "530000000001", ref_id: "tamper-ref-001" });
    expect(inquiry.status).toBe(201);

    const rejected = await request(fixture.app)
      .post("/api/digiflazz/pay-pasca")
      .set("Authorization", "Bearer " + owner.token)
      .send({ ref_id: "tamper-ref-001", amount_minor: 1, selling_price: 1 });
    expect(rejected.status).toBe(400);
    expect(rejected.body.error.details).toEqual(
      expect.arrayContaining([
        { field: "amount_minor", message: "amount_minor is server-controlled and cannot be provided." },
        { field: "selling_price", message: "selling_price is server-controlled and cannot be provided." }
      ])
    );

    const paid = await request(fixture.app)
      .post("/api/digiflazz/pay-pasca")
      .set("Authorization", "Bearer " + owner.token)
      .send({ ref_id: "tamper-ref-001", buyer_sku_code: "evil-sku", customer_no: "evil-customer" });

    expect(paid.status).toBe(200);
    expect(paid.body.inquiry).toMatchObject({
      ref_id: "tamper-ref-001",
      buyer_sku_code: "pln",
      customer_no: "530000000001",
      price: 10000,
      selling_price: 11000,
      amount_minor: 11000,
      sn: "S-TAMPER-IGNORED"
    });
    expect(requestPayloads.at(-1)).toMatchObject({
      commands: "pay-pasca",
      buyer_sku_code: "pln",
      customer_no: "530000000001",
      ref_id: "tamper-ref-001"
    });
  });


  it("validates category metadata and forwards documented postpaid inquiry fields", async () => {
    const requestPayloads: Record<string, unknown>[] = [];
    const fetchImpl = jest.fn<typeof fetch>(async (_url, init) => {
      const payload = readPayload(init);
      requestPayloads.push(payload);
      return jsonResponse({
        ref_id: payload.ref_id,
        customer_no: payload.customer_no,
        customer_name: "Category Customer",
        buyer_sku_code: payload.buyer_sku_code,
        admin: 2500,
        message: "Transaksi Sukses",
        status: "Sukses",
        rc: "00",
        price: 24700,
        selling_price: 25000,
        desc: { detail: [] }
      });
    });
    const fixture = createPostpaidApp(fetchImpl);
    const owner = await registerUser(fixture.app, "category-fields@example.com");

    const missingAmount = await request(fixture.app)
      .post("/api/digiflazz/inq-pasca")
      .set("Authorization", "Bearer " + owner.token)
      .send({ buyer_sku_code: "emoney", customer_no: "082100000001", ref_id: "category-ref-001" });
    expect(missingAmount.status).toBe(400);

    const invalidSamsat = await request(fixture.app)
      .post("/api/digiflazz/inq-pasca")
      .set("Authorization", "Bearer " + owner.token)
      .send({ buyer_sku_code: "samsat", customer_no: "9658548523568705", ref_id: "category-ref-002" });
    expect(invalidSamsat.status).toBe(400);

    const emoney = await request(fixture.app)
      .post("/api/digiflazz/inq-pasca")
      .set("Authorization", "Bearer " + owner.token)
      .send({
        buyer_sku_code: "emoney",
        customer_no: "082100000001",
        ref_id: "category-ref-003",
        metadata: { amount: 22500 }
      });
    expect(emoney.status).toBe(201);

    const pbb = await request(fixture.app)
      .post("/api/digiflazz/inq-pasca")
      .set("Authorization", "Bearer " + owner.token)
      .send({
        buyer_sku_code: "cimahi",
        customer_no: "329801092375999991",
        ref_id: "category-ref-004",
        metadata: { year: 2019 }
      });
    expect(pbb.status).toBe(201);

    expect(requestPayloads).toEqual([
      expect.objectContaining({ commands: "inq-pasca", buyer_sku_code: "emoney", customer_no: "082100000001", ref_id: "category-ref-003", amount: 22500 }),
      expect.objectContaining({ commands: "inq-pasca", buyer_sku_code: "cimahi", customer_no: "329801092375999991", ref_id: "category-ref-004", year: 2019 })
    ]);
  });

  it("enforces owner-only access to stored postpaid inquiries", async () => {
    const fetchImpl = jest.fn<typeof fetch>(async (_url, init) => {
      const payload = readPayload(init);
      return jsonResponse({
        ref_id: payload.ref_id,
        customer_no: payload.customer_no,
        customer_name: "Nama Pelanggan Pertama",
        buyer_sku_code: payload.buyer_sku_code,
        admin: 2500,
        message: "Transaksi Sukses",
        status: "Sukses",
        rc: "00",
        price: 10000,
        selling_price: 11000,
        desc: { detail: [] }
      });
    });
    const fixture = createPostpaidApp(fetchImpl);
    const owner = await registerUser(fixture.app, "owner-only@example.com");
    const other = await registerUser(fixture.app, "other-user@example.com");

    const inquiry = await request(fixture.app)
      .post("/api/digiflazz/inq-pasca")
      .set("Authorization", "Bearer " + owner.token)
      .send({ buyer_sku_code: "pln", customer_no: "530000000001", ref_id: "owner-ref-001" });
    expect(inquiry.status).toBe(201);

    const otherPay = await request(fixture.app)
      .post("/api/digiflazz/pay-pasca")
      .set("Authorization", "Bearer " + other.token)
      .send({ ref_id: "owner-ref-001" });
    expect(otherPay.status).toBe(403);

    const ownerPay = await request(fixture.app)
      .post("/api/digiflazz/pay-pasca")
      .set("Authorization", "Bearer " + owner.token)
      .send({ ref_id: "owner-ref-001" });
    expect(ownerPay.status).toBe(200);
  });
});
