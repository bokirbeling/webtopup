import { describe, expect, it } from "@jest/globals";
import request from "supertest";

import { createApp } from "../../app";

const credentials = {
  email: "User@Example.com",
  password: "correct-password"
};

describe("auth routes", () => {
  it("registers pengguna users, logs in, and returns current user on both mounts", async () => {
    const app = createApp();

    const roleEscalationResponse = await request(app).post("/api/auth/register").send({
      email: credentials.email,
      password: credentials.password,
      role: "admin"
    });

    expect(roleEscalationResponse.status).toBe(400);
    expect(roleEscalationResponse.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid registration payload.",
        details: [
          {
            field: "role",
            message: "role is server-controlled and cannot be provided."
          }
        ]
      }
    });

    const registerResponse = await request(app).post("/api/auth/register").send(credentials);

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body).toEqual({
      user: {
        id: expect.any(String),
        email: "user@example.com",
        role: "pengguna",
        is_reseller_active: false,
        reseller_status: "none",
        created_at: expect.any(String),
        updated_at: expect.any(String)
      },
      token: expect.any(String),
      expires_in: "1h"
    });
    expect(JSON.stringify(registerResponse.body)).not.toContain("password_hash");
    expect(JSON.stringify(registerResponse.body)).not.toContain("passwordHash");

    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "user@example.com",
      password: credentials.password
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toMatchObject({
      user: {
        id: registerResponse.body.user.id,
        email: "user@example.com",
        role: "pengguna"
      },
      token: expect.any(String),
      expires_in: "1h"
    });
    expect(JSON.stringify(loginResponse.body)).not.toContain("password_hash");
    expect(JSON.stringify(loginResponse.body)).not.toContain("passwordHash");

    const meResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer " + loginResponse.body.token);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body).toMatchObject({
      user: {
        id: registerResponse.body.user.id,
        email: "user@example.com",
        role: "pengguna"
      }
    });

    const prefixedMeResponse = await request(app)
      .get("/ppob-api/api/auth/me")
      .set("Authorization", "Bearer " + loginResponse.body.token);

    expect(prefixedMeResponse.status).toBe(200);
    expect(prefixedMeResponse.body).toEqual(meResponse.body);
  });

  it("uses generic login failures and rejects missing or invalid bearer tokens", async () => {
    const app = createApp();

    await request(app).post("/api/auth/register").send(credentials).expect(201);

    const invalidLoginResponse = await request(app).post("/api/auth/login").send({
      email: "user@example.com",
      password: "wrong-password"
    });

    expect(invalidLoginResponse.status).toBe(401);
    expect(invalidLoginResponse.body).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password."
      }
    });

    const missingTokenResponse = await request(app).get("/api/auth/me");

    expect(missingTokenResponse.status).toBe(401);
    expect(missingTokenResponse.body).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required."
      }
    });

    const invalidTokenResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid-token");

    expect(invalidTokenResponse.status).toBe(401);
    expect(invalidTokenResponse.body).toEqual(missingTokenResponse.body);
  });
});
