import { describe, expect, it } from "@jest/globals";
import request from "supertest";

import { createApp } from "../app";

describe("GET /health", () => {
  it("returns 200 and status ok", async () => {
    const app = createApp();

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
    expect(response.headers["content-type"]).toContain("application/json");
  });
});
