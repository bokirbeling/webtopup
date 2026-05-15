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

describe("admin RBAC routes", () => {
  it("returns 401 without token, 403 for wrong role, and lets admins manage reseller status", async () => {
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
    const admin = await registerUser(app, "admin@example.com");
    const pengguna = await registerUser(app, "pengguna@example.com");

    await authRepository.updateUser(admin.user.id, {
      role: "admin",
      updatedAt: new Date("2026-05-14T10:00:00.000Z")
    });

    const missingTokenResponse = await request(app).get("/api/admin/users");
    expect(missingTokenResponse.status).toBe(401);
    expect(missingTokenResponse.body).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required."
      }
    });

    const wrongRoleResponse = await request(app)
      .get("/api/admin/users")
      .set("Authorization", "Bearer " + pengguna.token);
    expect(wrongRoleResponse.status).toBe(403);
    expect(wrongRoleResponse.body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "Insufficient permissions."
      }
    });

    const userListResponse = await request(app).get("/api/admin/users").set("Authorization", "Bearer " + admin.token);
    expect(userListResponse.status).toBe(200);
    expect(userListResponse.body.users).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: admin.user.id, role: "admin" }),
        expect.objectContaining({ id: pengguna.user.id, role: "pengguna" })
      ])
    );

    const unverifiedApprovalResponse = await request(app)
      .post("/api/admin/users/" + pengguna.user.id + "/reseller/approve")
      .set("Authorization", "Bearer " + admin.token);
    expect(unverifiedApprovalResponse.status).toBe(403);
    expect(unverifiedApprovalResponse.body).toEqual({
      error: {
        code: "EMAIL_VERIFICATION_REQUIRED",
        message: "Email verification is required before approving reseller access."
      }
    });

    const verificationRequestResponse = await request(app)
      .post("/api/auth/email-verification/request")
      .set("Authorization", "Bearer " + pengguna.token)
      .send({});
    expect(verificationRequestResponse.status).toBe(200);
    expect(sentMessages).toHaveLength(1);

    const verifyResponse = await request(app)
      .post("/api/auth/email-verification/verify")
      .set("Authorization", "Bearer " + pengguna.token)
      .send({ token: sentMessages[0].token });
    expect(verifyResponse.status).toBe(200);

    const resellerRequestResponse = await request(app)
      .post("/api/account/reseller-request")
      .set("Authorization", "Bearer " + pengguna.token)
      .send({});
    expect(resellerRequestResponse.status).toBe(200);
    expect(resellerRequestResponse.body.user).toMatchObject({
      id: pengguna.user.id,
      role: "pengguna",
      is_reseller_active: false,
      reseller_status: "requested",
      email_verified: true,
      email_verified_at: expect.any(String)
    });

    const approvalResponse = await request(app)
      .post("/api/admin/users/" + pengguna.user.id + "/reseller/approve")
      .set("Authorization", "Bearer " + admin.token)
      .send({ role: "admin" });
    expect(approvalResponse.status).toBe(200);
    expect(approvalResponse.body.user).toMatchObject({
      id: pengguna.user.id,
      role: "seller",
      is_reseller_active: true,
      reseller_status: "approved"
    });

    const refreshedStatusResponse = await request(app)
      .get("/api/account/status")
      .set("Authorization", "Bearer " + pengguna.token);
    expect(refreshedStatusResponse.status).toBe(200);
    expect(refreshedStatusResponse.body.user).toMatchObject({
      id: pengguna.user.id,
      role: "seller",
      is_reseller_active: true,
      reseller_status: "approved"
    });

    const suspendedResponse = await request(app)
      .post("/api/admin/users/" + pengguna.user.id + "/reseller/suspend")
      .set("Authorization", "Bearer " + admin.token);
    expect(suspendedResponse.status).toBe(200);
    expect(suspendedResponse.body.user).toMatchObject({
      id: pengguna.user.id,
      role: "seller",
      is_reseller_active: false,
      reseller_status: "approved"
    });

    const demotedResponse = await request(app)
      .post("/api/admin/users/" + pengguna.user.id + "/reseller/demote")
      .set("Authorization", "Bearer " + admin.token);
    expect(demotedResponse.status).toBe(200);
    expect(demotedResponse.body.user).toMatchObject({
      id: pengguna.user.id,
      role: "pengguna",
      is_reseller_active: false,
      reseller_status: "none"
    });
  });
});
