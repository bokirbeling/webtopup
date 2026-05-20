import { Router } from "express";

import {
  EmailAlreadyRegisteredError,
  EmailVerificationCooldownError,
  EmailVerificationRateLimitError,
  InvalidAuthTokenError,
  InvalidCredentialsError,
  InvalidEmailVerificationTokenError,
  type AuthService,
  type EmailVerificationRequestResult
} from "./auth.service";
import { readBearerToken, sendUnauthorized } from "./auth.middleware";
import { type AuthSession, type AuthUser, type EmailVerificationStatus } from "./auth.types";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePinSchema,
  verificationTokenSchema,
  zodValidate
} from "../../shared/validation";

type AuthRouterDependencies = Readonly<{
  authService: AuthService;
}>;

function toUserResponse(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    is_reseller_active: user.isResellerActive,
    reseller_status: user.resellerStatus,
    email_verified: user.emailVerifiedAt !== null,
    email_verified_at: user.emailVerifiedAt?.toISOString() ?? null,
    name: user.metadata?.name || "",
    phone_number: user.metadata?.no_hp || "",
    has_pin: !!user.metadata?.pin_hash,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString()
  };
}

function toSessionResponse(session: AuthSession) {
  return {
    user: toUserResponse(session.user),
    token: session.token,
    expires_in: session.expiresIn
  };
}

function toEmailVerificationResponse(status: EmailVerificationStatus, emailSent: boolean) {
  return {
    email_verification: {
      email_verified: status.emailVerified,
      email_verified_at: status.emailVerifiedAt?.toISOString() ?? null,
      email_verification_sent_at: status.emailVerificationSentAt?.toISOString() ?? null,
      email_verification_expires_at: status.emailVerificationExpiresAt?.toISOString() ?? null,
      email_verification_resend_count: status.emailVerificationResendCount,
      email_sent: emailSent
    }
  };
}

function sendVerificationRequestResponse(response: import("express").Response, result: EmailVerificationRequestResult) {
  response.status(200).json(toEmailVerificationResponse(result.status, result.emailSent));
}

function readRequiredBearerToken(authorizationHeader: string | undefined, response: import("express").Response): string | null {
  const token = readBearerToken(authorizationHeader);
  if (token === null) {
    sendUnauthorized(response);
    return null;
  }

  return token;
}

export function createAuthRouter(dependencies: AuthRouterDependencies) {
  const authRouter = Router();

  authRouter.post("/register", zodValidate(registerSchema), async (request, response) => {
    if ("role" in request.body) {
      response.status(400).json({
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
      return;
    }

    try {
      const session = await dependencies.authService.register({
        email: request.body.email,
        password: request.body.password
      });

      response.status(201).json(toSessionResponse(session));
    } catch (error) {
      if (error instanceof EmailAlreadyRegisteredError) {
        response.status(409).json({
          error: {
            code: "EMAIL_ALREADY_REGISTERED",
            message: "Email is already registered."
          }
        });

        return;
      }

      throw error;
    }
  });

  authRouter.post("/login", zodValidate(loginSchema), async (request, response) => {
    try {
      const session = await dependencies.authService.login({
        email: request.body.email,
        password: request.body.password
      });

      response.status(200).json(toSessionResponse(session));
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        response.status(401).json({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password."
          }
        });

        return;
      }

      throw error;
    }
  });

  authRouter.get("/me", async (request, response) => {
    const token = readRequiredBearerToken(request.header("authorization"), response);
    if (token === null) {
      return;
    }

    try {
      const user = await dependencies.authService.getCurrentUser(token);
      response.status(200).json({
        user: toUserResponse(user)
      });
    } catch (error) {
      if (error instanceof InvalidAuthTokenError) {
        sendUnauthorized(response);
        return;
      }

      throw error;
    }
  });

  async function handleVerificationRequest(request: import("express").Request, response: import("express").Response) {
    const token = readRequiredBearerToken(request.header("authorization"), response);
    if (token === null) {
      return;
    }

    try {
      sendVerificationRequestResponse(response, await dependencies.authService.requestEmailVerification(token));
    } catch (error) {
      if (error instanceof InvalidAuthTokenError) {
        sendUnauthorized(response);
        return;
      }

      if (error instanceof EmailVerificationCooldownError) {
        response.status(429).json({
          error: {
            code: "EMAIL_VERIFICATION_COOLDOWN",
            message: "Please wait before requesting another verification email."
          }
        });
        return;
      }

      if (error instanceof EmailVerificationRateLimitError) {
        response.status(429).json({
          error: {
            code: "EMAIL_VERIFICATION_RATE_LIMITED",
            message: "Email verification resend limit reached. Try again after the current token expires."
          }
        });
        return;
      }

      throw error;
    }
  }

  authRouter.post("/email-verification/request", handleVerificationRequest);
  authRouter.post("/email-verification/resend", handleVerificationRequest);

  authRouter.post("/email-verification/verify", zodValidate(verificationTokenSchema), async (request, response) => {
    const token = readRequiredBearerToken(request.header("authorization"), response);
    if (token === null) {
      return;
    }

    try {
      const user = await dependencies.authService.verifyEmail(token, request.body.token);
      response.status(200).json({
        user: toUserResponse(user)
      });
    } catch (error) {
      if (error instanceof InvalidAuthTokenError) {
        sendUnauthorized(response);
        return;
      }

      if (error instanceof InvalidEmailVerificationTokenError) {
        response.status(400).json({
          error: {
            code: "INVALID_EMAIL_VERIFICATION_TOKEN",
            message: "Invalid or expired email verification token."
          }
        });
        return;
      }

      throw error;
    }
  });

  authRouter.get("/profile", async (request, response) => {
    const token = readRequiredBearerToken(request.header("authorization"), response);
    if (token === null) {
      return;
    }

    try {
      const user = await dependencies.authService.getCurrentUser(token);
      response.status(200).json({
        success: true,
        user: toUserResponse(user)
      });
    } catch (error) {
      if (error instanceof InvalidAuthTokenError) {
        sendUnauthorized(response);
        return;
      }
      response.status(500).json({ success: false, message: "Gagal mengambil data profil" });
    }
  });

  authRouter.put("/profile", zodValidate(updateProfileSchema), async (request, response) => {
    const token = readRequiredBearerToken(request.header("authorization"), response);
    if (token === null) {
      return;
    }

    try {
      const user = await dependencies.authService.updateProfile(token, {
        name: request.body.name,
        phoneNumber: request.body.phone_number
      });
      response.status(200).json({
        success: true,
        message: "Profil berhasil diperbarui",
        user: toUserResponse(user)
      });
    } catch (error) {
      if (error instanceof InvalidAuthTokenError) {
        sendUnauthorized(response);
        return;
      }
      response.status(500).json({ success: false, message: "Gagal memperbarui profil" });
    }
  });

  authRouter.post("/change-pin", zodValidate(changePinSchema), async (request, response) => {
    const token = readRequiredBearerToken(request.header("authorization"), response);
    if (token === null) {
      return;
    }

    try {
      const user = await dependencies.authService.changePin(token, request.body.old_pin || null, request.body.new_pin);
      response.status(200).json({
        success: true,
        message: "PIN transaksi berhasil diperbarui",
        user: toUserResponse(user)
      });
    } catch (error: any) {
      if (error instanceof InvalidAuthTokenError) {
        sendUnauthorized(response);
        return;
      }
      response.status(400).json({
        success: false,
        message: error.message || "Gagal memperbarui PIN"
      });
    }
  });

  return authRouter;
}
