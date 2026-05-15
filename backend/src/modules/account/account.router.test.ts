import { describe, expect, it } from "@jest/globals";
import request from "supertest";

import { createApp } from "../../app";
import { InMemoryAuthRepository } from "../auth/auth.repository";
import { type EmailVerificationMessage } from "../auth/auth.service";

async function registerUser(app: ReturnType<typeof createApp>, email: string) {
  const response = await request(app).post("/api/auth/register").send({
    email,
    password: "correct-password"
  });

  expect(response.status).toBe(201);
  return response.body as { user: { id: string }; token: string };
}

async function verifyUserEmail(app: ReturnType<typeof createApp>, token: string, sentMessages: EmailVerificationMessage[]) {
  const requestResponse = await request(app)
    .post("/api/auth/email-verification/request")
    .set("Authorization", "Bearer " + token)
    .send({});
  expect(requestResponse.status).toBe(200);
  expect(sentMessages).toHaveLength(1);

  const verifyResponse = await request(app)
    .post("/api/auth/email-verification/verify")
    .set("Authorization", "Bearer " + token)
    .send({ token: sentMessages[0].token });
  expect(verifyResponse.status).toBe(200);
}

describe("account RBAC routes", () => {
  it("requires JWTs, enforces ownership, prevents escalation, and gates reseller requests by verified email", async () => {
    const authRepository = new InMemoryAuthRepository();
    const sentMessages: EmailVerificationMessage[] = [];
    const app = createApp({
      authRepository,
      emailVerificationSender: {
        async sendVerificationEmail(message) {
          sentMessages.push(message);
        }
      }
    });
    const owner = await registerUser(app, "owner@example.com");
    const other = await registerUser(app, "other@example.com");

    const missingTokenResponse = await request(app).get("/api/account/status");
    expect(missingTokenResponse.status).toBe(401);
    expect(missingTokenResponse.body).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required."
      }
    });

    const invalidTokenResponse = await request(app).get("/api/account/status").set("Authorization", "Bearer invalid-token");
    expect(invalidTokenResponse.status).toBe(401);
    expect(invalidTokenResponse.body).toEqual(missingTokenResponse.body);

    const forbiddenOwnershipResponse = await request(app)
      .get("/api/account/users/" + other.user.id + "/status")
      .set("Authorization", "Bearer " + owner.token);
    expect(forbiddenOwnershipResponse.status).toBe(403);
    expect(forbiddenOwnershipResponse.body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "Insufficient permissions."
      }
    });

    const escalationResponse = await request(app)
      .post("/api/account/reseller-request")
      .set("Authorization", "Bearer " + owner.token)
      .send({ role: "seller", is_reseller_active: true });
    expect(escalationResponse.status).toBe(400);
    expect(escalationResponse.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid reseller request payload.",
        details: [
          {
            field: "role",
            message: "role is server-controlled and cannot be provided."
          },
          {
            field: "is_reseller_active",
            message: "is_reseller_active is server-controlled and cannot be provided."
          }
        ]
      }
    });

    const unverifiedRequestResponse = await request(app)
      .post("/api/account/reseller-request")
      .set("Authorization", "Bearer " + owner.token)
      .send({});
    expect(unverifiedRequestResponse.status).toBe(403);
    expect(unverifiedRequestResponse.body).toEqual({
      error: {
        code: "EMAIL_VERIFICATION_REQUIRED",
        message: "Email verification is required before requesting reseller access."
      }
    });

    await verifyUserEmail(app, owner.token, sentMessages);

    const requestResponse = await request(app)
      .post("/api/account/reseller-request")
      .set("Authorization", "Bearer " + owner.token)
      .send({});
    expect(requestResponse.status).toBe(200);
    expect(requestResponse.body).toMatchObject({
      user: {
        id: owner.user.id,
        role: "pengguna",
        is_reseller_active: false,
        reseller_status: "requested",
        email_verified: true,
        email_verified_at: expect.any(String)
      }
    });
  });
});
