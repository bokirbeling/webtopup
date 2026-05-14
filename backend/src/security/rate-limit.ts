import { type NextFunction, type Request, type Response } from "express";

import { type AuditLogger, noopAuditLogger } from "./audit";

type RateLimitOptions = Readonly<{
  windowMs: number;
  maxRequests: number;
  auditLogger?: AuditLogger;
  clock?: () => Date;
}>;

type Bucket = {
  count: number;
  resetAt: number;
};

function getClientKey(request: Request): string {
  const forwardedFor = request.header("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.ip || "unknown";
}

export function createRateLimitMiddleware(options: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();
  const auditLogger = options.auditLogger ?? noopAuditLogger;
  const clock = options.clock ?? (() => new Date());

  return function rateLimitMiddleware(request: Request, response: Response, next: NextFunction) {
    const now = clock().getTime();
    const key = `${request.method}:${request.path}:${getClientKey(request)}`;
    const current = buckets.get(key);

    if (current === undefined || current.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs
      });
      next();
      return;
    }

    current.count += 1;
    if (current.count <= options.maxRequests) {
      next();
      return;
    }

    auditLogger.record({
      type: "rate_limit_exceeded",
      route: request.path,
      method: request.method,
      statusCode: 429,
      reason: "Sensitive endpoint rate limit exceeded.",
      occurredAt: clock().toISOString()
    });

    response.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please retry later."
      }
    });
  };
}
