import { Router } from "express";

import {
  EmailAlreadyRegisteredError,
  InvalidAuthTokenError,
  InvalidCredentialsError,
  type AuthService
} from "./auth.service";
import { readBearerToken, sendUnauthorized } from "./auth.middleware";
import { type AuthSession, type AuthUser } from "./auth.types";

type AuthRouterDependencies = Readonly<{
  authService: AuthService;
}>;

type ValidationIssue = Readonly<{
  field: string;
  message: string;
}>;

type CredentialsValidationResult =
  | Readonly<{
      ok: true;
      email: string;
      password: string;
    }>
  | Readonly<{
      ok: false;
      issues: ValidationIssue[];
    }>;

const FORBIDDEN_REGISTER_FIELDS = new Set([
  "id",
  "role",
  "password_hash",
  "is_reseller_active",
  "reseller_status",
  "created_at",
  "updated_at"
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateCredentialsPayload(payload: unknown, rejectServerControlledFields: boolean): CredentialsValidationResult {
  if (!isPlainObject(payload)) {
    return {
      ok: false,
      issues: [
        {
          field: "body",
          message: "Request body must be a JSON object."
        }
      ]
    };
  }

  const issues: ValidationIssue[] = [];

  if (rejectServerControlledFields) {
    for (const field of FORBIDDEN_REGISTER_FIELDS) {
      if (field in payload) {
        issues.push({
          field,
          message: field + " is server-controlled and cannot be provided."
        });
      }
    }
  }

  const emailRaw = payload.email;
  const passwordRaw = payload.password;

  if (typeof emailRaw !== "string" || emailRaw.trim() === "" || !emailRaw.includes("@")) {
    issues.push({
      field: "email",
      message: "email is required and must be a valid email address."
    });
  }

  if (typeof passwordRaw !== "string" || passwordRaw.length < 8) {
    issues.push({
      field: "password",
      message: "password is required and must be at least 8 characters."
    });
  }

  if (issues.length > 0) {
    return {
      ok: false,
      issues
    };
  }

  return {
    ok: true,
    email: (emailRaw as string).trim(),
    password: passwordRaw as string
  };
}

function toUserResponse(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    is_reseller_active: user.isResellerActive,
    reseller_status: user.resellerStatus,
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


export function createAuthRouter(dependencies: AuthRouterDependencies) {
  const authRouter = Router();

  authRouter.post("/register", async (request, response) => {
    const validation = validateCredentialsPayload(request.body, true);
    if (!validation.ok) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid registration payload.",
          details: validation.issues
        }
      });

      return;
    }

    try {
      const session = await dependencies.authService.register({
        email: validation.email,
        password: validation.password
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

  authRouter.post("/login", async (request, response) => {
    const validation = validateCredentialsPayload(request.body, false);
    if (!validation.ok) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid login payload.",
          details: validation.issues
        }
      });

      return;
    }

    try {
      const session = await dependencies.authService.login({
        email: validation.email,
        password: validation.password
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
    const token = readBearerToken(request.header("authorization"));
    if (token === null) {
      sendUnauthorized(response);
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

  return authRouter;
}
