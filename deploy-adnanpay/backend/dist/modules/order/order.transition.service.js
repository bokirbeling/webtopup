"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderTransitionService = exports.OrderTransitionError = void 0;
const ALLOWED_TRANSITIONS = {
    created: ["pending_payment"],
    pending_payment: ["paid"],
    paid: ["fulfillment_pending"],
    fulfillment_pending: ["success", "failed", "expired"],
    success: [],
    failed: [],
    expired: []
};
class OrderTransitionError extends Error {
    fromStatus;
    toStatus;
    constructor(fromStatus, toStatus) {
        super(`Invalid order status transition from ${fromStatus} to ${toStatus}.`);
        this.name = "OrderTransitionError";
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
    }
}
exports.OrderTransitionError = OrderTransitionError;
class OrderTransitionService {
    ensureForwardOnlyTransition(fromStatus, toStatus) {
        const allowedTargets = ALLOWED_TRANSITIONS[fromStatus];
        if (allowedTargets.includes(toStatus)) {
            return;
        }
        throw new OrderTransitionError(fromStatus, toStatus);
    }
}
exports.OrderTransitionService = OrderTransitionService;
