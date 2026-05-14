import { type OrderStatus } from "./order.types";

const ALLOWED_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  created: ["pending_payment"],
  pending_payment: ["paid"],
  paid: ["fulfillment_pending"],
  fulfillment_pending: ["success", "failed", "expired"],
  success: [],
  failed: [],
  expired: []
};

export class OrderTransitionError extends Error {
  readonly fromStatus: OrderStatus;
  readonly toStatus: OrderStatus;

  constructor(fromStatus: OrderStatus, toStatus: OrderStatus) {
    super(`Invalid order status transition from ${fromStatus} to ${toStatus}.`);
    this.name = "OrderTransitionError";
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
  }
}

export class OrderTransitionService {
  ensureForwardOnlyTransition(fromStatus: OrderStatus, toStatus: OrderStatus): void {
    const allowedTargets = ALLOWED_TRANSITIONS[fromStatus];

    if (allowedTargets.includes(toStatus)) {
      return;
    }

    throw new OrderTransitionError(fromStatus, toStatus);
  }
}
