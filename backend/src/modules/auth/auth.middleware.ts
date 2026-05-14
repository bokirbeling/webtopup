import { type NextFunction, type Request, type Response } from "express";

import { InvalidAuthTokenError, type AuthService } from "./auth.service";
import { type AuthUser, type AuthUserRole } from "./auth.types";

export type AuthenticatedRequest = Request & Readonly<{
  authUser: AuthUser;
}>;

export function readBearerToken(authorizationHeader: string | undefined): string | null {
  if (authorizationHeader === undefined) {
    return null;
  }

  const [scheme, token, extra] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || token === undefined || token.trim() === "" || extra !== undefined) {
    return null;
  }

  return token;
}

export function sendUnauthorized(response: Response) {
  response.status(401).json({
    error: {
      code: "UNAUTHORIZED",
      message: "Authentication required."
    }
  });
}

export function sendForbidden(response: Response) {
  response.status(403).json({
    error: {
      code: "FORBIDDEN",
      message: "Insufficient permissions."
    }
  });
}

export function createAuthenticationMiddleware(authService: AuthService) {
  return async function authenticationMiddleware(request: Request, response: Response, next: NextFunction) {
    const token = readBearerToken(request.header("authorization"));
    if (token === null) {
      sendUnauthorized(response);
      return;
    }

    try {
      Object.assign(request, {
        authUser: await authService.getCurrentUser(token)
      });
      next();
    } catch (error) {
      if (error instanceof InvalidAuthTokenError) {
        sendUnauthorized(response);
        return;
      }

      next(error);
    }
  };
}

export function requireRoles(roles: readonly AuthUserRole[]) {
  return function roleGuard(request: Request, response: Response, next: NextFunction) {
    const authUser = (request as unknown as AuthenticatedRequest).authUser;

    if (!roles.includes(authUser.role)) {
      sendForbidden(response);
      return;
    }

    next();
  };
}
