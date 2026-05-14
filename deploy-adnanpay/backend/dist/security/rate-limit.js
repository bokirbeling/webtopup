"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimitMiddleware = createRateLimitMiddleware;
const audit_1 = require("./audit");
function getClientKey(request) {
    const forwardedFor = request.header("x-forwarded-for")?.split(",")[0]?.trim();
    return forwardedFor || request.ip || "unknown";
}
function createRateLimitMiddleware(options) {
    const buckets = new Map();
    const auditLogger = options.auditLogger ?? audit_1.noopAuditLogger;
    const clock = options.clock ?? (() => new Date());
    return function rateLimitMiddleware(request, response, next) {
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
