import { describe, expect, it } from "@jest/globals";
import request from "supertest";

import { createApp } from "../../app";
import { type EmailVerificationMessage } from "./auth.service";

const credentials = {
  email: "User@Example.com",
  password: "correct-password"
};

function expectNoVerificationSecret(payload: unknown) {
  expect(JSON.stringify(payload)).not.toContain("password_hash");
  expect(JSON.stringify(payload)).not.toContain("passwordHash");
  expect(JSON.stringify(payload)).not.toContain("email_verification_token_hash");
  expect(JSON.stringify(payload)).not.toContain("emailVerificationTokenHash");
}

describe("auth routes", () => {
  it("registers pengguna users, logs in, and returns current user on both mounts", async () => {
    const app = createApp({});

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
        email_verified: false,
        email_verified_at: null,
        name: "",
        phone_number: "",
        has_pin: false,
        created_at: expect.any(String),
        updated_at: expect.any(String)
      },
      token: expect.any(String),
      expires_in: "1h"
    });
    expectNoVerificationSecret(registerResponse.body);

    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "user@example.com",
      password: credentials.password
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body).toMatchObject({
      user: {
        id: registerResponse.body.user.id,
        email: "user@example.com",
        role: "pengguna",
        email_verified: false,
        email_verified_at: null
      },
      token: expect.any(String),
      expires_in: "1h"
    });
    expectNoVerificationSecret(loginResponse.body);

    const meResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer " + loginResponse.body.token);

    expect(meResponse.status).toBe(200);
    expect(meResponse.body).toMatchObject({
      user: {
        id: registerResponse.body.user.id,
        email: "user@example.com",
        role: "pengguna",
        email_verified: false,
        email_verified_at: null
      }
    });
    expectNoVerificationSecret(meResponse.body);

    const prefixedMeResponse = await request(app)
      .get("/ppob-api/api/auth/me")
      .set("Authorization", "Bearer " + loginResponse.body.token);

    expect(prefixedMeResponse.status).toBe(200);
    expect(prefixedMeResponse.body).toEqual(meResponse.body);
  });

  it("requests, resends, and verifies email without exposing token hashes or raw tokens", async () => {
    const sentMessages: EmailVerificationMessage[] = [];
    const app = createApp({
      emailVerificationSender: {
        async sendVerificationEmail(message) {
          sentMessages.push(message);
        }
      }
    });

    const registerResponse = await request(app).post("/api/auth/register").send(credentials);
    expect(registerResponse.status).toBe(201);

    const requestResponse = await request(app)
      .post("/api/auth/email-verification/request")
      .set("Authorization", "Bearer " + registerResponse.body.token)
      .send({});

    expect(requestResponse.status).toBe(200);
    expect(requestResponse.body).toEqual({
      email_verification: {
        email_verified: false,
        email_verified_at: null,
        email_verification_sent_at: expect.any(String),
        email_verification_expires_at: expect.any(String),
        email_verification_resend_count: 1,
        email_sent: true
      }
    });
    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].to).toBe("user@example.com");
    expectNoVerificationSecret(requestResponse.body);
    expect(JSON.stringify(requestResponse.body)).not.toContain(sentMessages[0].token);

    const verifyResponse = await request(app)
      .post("/api/auth/email-verification/verify")
      .set("Authorization", "Bearer " + registerResponse.body.token)
      .send({ token: sentMessages[0].token });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body).toMatchObject({
      user: {
        id: registerResponse.body.user.id,
        email: "user@example.com",
        email_verified: true,
        email_verified_at: expect.any(String)
      }
    });
    expectNoVerificationSecret(verifyResponse.body);

    const verifiedRequestResponse = await request(app)
      .post("/api/auth/email-verification/resend")
      .set("Authorization", "Bearer " + registerResponse.body.token)
      .send({});

    expect(verifiedRequestResponse.status).toBe(200);
    expect(verifiedRequestResponse.body.email_verification.email_verified).toBe(true);
    expect(verifiedRequestResponse.body.email_verification.email_sent).toBe(false);
    expect(sentMessages).toHaveLength(1);
  });

  it("enforces verification resend cooldown and rate limit", async () => {
    const sentMessages: EmailVerificationMessage[] = [];
    let nowMs = Date.parse("2026-05-15T10:00:00.000Z");
    (global as any).authClock = () => new Date(nowMs);
    const app = createApp({
      emailVerificationSender: {
        async sendVerificationEmail(message) {
          sentMessages.push(message);
        }
      }
    });

    const registerResponse = await request(app).post("/api/auth/register").send(credentials);
    expect(registerResponse.status).toBe(201);

    const firstResponse = await request(app)
      .post("/api/auth/email-verification/request")
      .set("Authorization", "Bearer " + registerResponse.body.token)
      .send({});
    expect(firstResponse.status).toBe(200);

    const cooldownResponse = await request(app)
      .post("/api/auth/email-verification/resend")
      .set("Authorization", "Bearer " + registerResponse.body.token)
      .send({});
    expect(cooldownResponse.status).toBe(429);
    expect(cooldownResponse.body).toEqual({
      error: {
        code: "EMAIL_VERIFICATION_COOLDOWN",
        message: "Please wait before requesting another verification email."
      }
    });

    for (let attempt = 2; attempt <= 5; attempt += 1) {
      nowMs += 61_000;
      const resendResponse = await request(app)
        .post("/api/auth/email-verification/resend")
        .set("Authorization", "Bearer " + registerResponse.body.token)
        .send({});
      expect(resendResponse.status).toBe(200);
      expect(resendResponse.body.email_verification.email_verification_resend_count).toBe(attempt);
    }

    nowMs += 61_000;
    const rateLimitedResponse = await request(app)
      .post("/api/auth/email-verification/resend")
      .set("Authorization", "Bearer " + registerResponse.body.token)
      .send({});
    expect(rateLimitedResponse.status).toBe(429);
    expect(rateLimitedResponse.body).toEqual({
      error: {
        code: "EMAIL_VERIFICATION_RATE_LIMITED",
        message: "Email verification resend limit reached. Try again after the current token expires."
      }
    });
    expect(sentMessages).toHaveLength(5);
    delete (global as any).authClock;
  });

  it("uses generic login failures and rejects missing or invalid bearer tokens", async () => {
    const app = createApp({});

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
