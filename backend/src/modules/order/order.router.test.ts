import { describe, expect, it } from "@jest/globals";
import request from "supertest";

import { createApp } from "../../app";
import { InMemoryOrderRepository } from "./order.repository";
import { createOrderService } from "./order.service";

describe("POST /api/orders", () => {
  it("returns order_id, invoice_code, and pending_payment for valid payload", async () => {
    const repository = new InMemoryOrderRepository();
    const service = createOrderService({
      repository,
      idGenerator: () => "order-1001",
      invoiceCodeGenerator: () => "INV-20260422-1001",
      clock: () => new Date("2026-04-22T08:00:00.000Z")
    });

    const app = createApp({
      orderService: service
    });

    const response = await request(app).post("/api/orders").send({
      customer_ref: "12345678:1234",
      product_code: "ml-diamond-86",
      provider: "digiflazz",
      amount_minor: 20000,
      currency: "idr",
      metadata: {
        source: "web_checkout"
      },
      status: "paid"
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid order payload.",
        details: [
          {
            field: "status",
            message: "status is server-controlled and cannot be provided."
          }
        ]
      }
    });

    const successResponse = await request(app).post("/api/orders").send({
      customer_ref: "12345678:1234",
      product_code: "ml-diamond-86",
      provider: "digiflazz",
      amount_minor: 20000,
      currency: "idr",
      metadata: {
        source: "web_checkout"
      }
    });

    expect(successResponse.status).toBe(201);
    expect(successResponse.body).toEqual({
      order_id: "order-1001",
      invoice_code: "INV-20260422-1001",
      status: "pending_payment"
    });

    const history = repository.getStatusHistoryByOrderId("order-1001");
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      orderId: "order-1001",
      fromStatus: "created",
      toStatus: "pending_payment"
    });
  });

  it("returns stable validation error for invalid payload", async () => {
    const app = createApp();

    const response = await request(app).post("/api/orders").send({
      amount_minor: 0,
      metadata: "invalid"
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid order payload.",
        details: [
          {
            field: "product_code",
            message: "product_code is required and must be a non-empty string."
          },
          {
            field: "provider",
            message: "provider is required and must be a non-empty string."
          },
          {
            field: "amount_minor",
            message: "amount_minor is required and must be a positive integer."
          },
          {
            field: "metadata",
            message: "metadata must be an object when provided."
          }
        ]
      }
    });
  });
});
