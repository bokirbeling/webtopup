import { type Response, Router } from "express";

import { sendForbidden } from "../auth/auth.middleware";
import { type AuthUser } from "../auth/auth.types";
import {
  AccountEmailUnverifiedError,
  AccountForbiddenError,
  AccountUserNotFoundError,
  type AccountService
} from "./account.service";
import { type AuthenticatedRequest } from "../auth/auth.middleware";

export type AccountRouterDependencies = Readonly<{
  accountService: AccountService;
}>;

const FORBIDDEN_ACCOUNT_FIELDS = new Set([
  "role",
  "password_hash",
  "is_reseller_active",
  "reseller_status",
  "email_verified_at",
  "email_verification_token_hash",
  "email_verification_expires_at",
  "email_verification_sent_at",
  "email_verification_resend_count"
]);

type ValidationIssue = Readonly<{
  field: string;
  message: string;
}>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateResellerRequestPayload(payload: unknown): ValidationIssue[] {
  if (payload === undefined || (isPlainObject(payload) && Object.keys(payload).length === 0)) {
    return [];
  }

  if (!isPlainObject(payload)) {
    return [
      {
        field: "body",
        message: "Request body must be a JSON object."
      }
    ];
  }

  const issues: ValidationIssue[] = [];
  for (const field of FORBIDDEN_ACCOUNT_FIELDS) {
    if (field in payload) {
      issues.push({
        field,
        message: field + " is server-controlled and cannot be provided."
      });
    }
  }

  return issues;
}

export function toUserResponse(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    is_reseller_active: user.isResellerActive,
    reseller_status: user.resellerStatus,
    email_verified: user.emailVerifiedAt !== null,
    email_verified_at: user.emailVerifiedAt?.toISOString() ?? null,
    created_at: user.createdAt.toISOString(),
    updated_at: user.updatedAt.toISOString()
  };
}

function sendNotFound(response: Response) {
  response.status(404).json({
    error: {
      code: "USER_NOT_FOUND",
      message: "User was not found."
    }
  });
}

export function createAccountRouter(dependencies: AccountRouterDependencies) {
  const accountRouter = Router();

  accountRouter.get("/status", (request, response) => {
    response.status(200).json({
      user: toUserResponse(dependencies.accountService.getOwnStatus((request as unknown as AuthenticatedRequest).authUser))
    });
  });

  accountRouter.get("/users/:userId/status", async (request, response) => {
    try {
      const user = await dependencies.accountService.getUserStatus(
        (request as unknown as AuthenticatedRequest).authUser,
        request.params.userId
      );

      response.status(200).json({
        user: toUserResponse(user)
      });
    } catch (error) {
      if (error instanceof AccountForbiddenError) {
        sendForbidden(response);
        return;
      }

      if (error instanceof AccountUserNotFoundError) {
        sendNotFound(response);
        return;
      }

      throw error;
    }
  });

  accountRouter.post("/reseller-request", async (request, response) => {
    const issues = validateResellerRequestPayload(request.body);
    if (issues.length > 0) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid reseller request payload.",
          details: issues
        }
      });
      return;
    }

    try {
      const user = await dependencies.accountService.requestReseller((request as unknown as AuthenticatedRequest).authUser);
      response.status(200).json({
        user: toUserResponse(user)
      });
    } catch (error) {
      if (error instanceof AccountForbiddenError) {
        sendForbidden(response);
        return;
      }

      if (error instanceof AccountEmailUnverifiedError) {
        response.status(403).json({
          error: {
            code: "EMAIL_VERIFICATION_REQUIRED",
            message: "Email verification is required before requesting reseller access."
          }
        });
        return;
      }

      throw error;
    }
  });

  return accountRouter;
}
