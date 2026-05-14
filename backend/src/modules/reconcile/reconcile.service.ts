import { type FulfillmentRepository } from "../fulfillment/fulfillment.repository";
import { type FulfillmentRecord } from "../fulfillment/fulfillment.types";
import { type OrderRepository } from "../order/order.repository";
import { OrderTransitionError, type OrderService } from "../order/order.service";
import { type OrderRecord, type OrderStatus } from "../order/order.types";
import { type PaymentRepository } from "../payment/payment.repository";
import { type PaymentRecord } from "../payment/payment.types";
import {
  type ReconciliationIssue,
  type ReconciliationMetadata,
  type ReconciliationResult,
  type ReconcileOrderInput,
  type ReconcileOrdersInput,
  type ReconcileOrdersOutput
} from "./reconcile.types";

type ReconcileServiceOptions = Readonly<{
  orderRepository: OrderRepository;
  paymentRepository: PaymentRepository;
  fulfillmentRepository: FulfillmentRepository;
  orderService: OrderService;
  clock?: () => Date;
}>;

type DetectedCorrection = Readonly<{
  issue: ReconciliationIssue;
  targetStatus: OrderStatus;
  reason: string;
  payment: PaymentRecord | null;
  fulfillment: FulfillmentRecord | null;
}>;

export type ReconcileService = Readonly<{
  reconcileOrder(input: ReconcileOrderInput): Promise<ReconciliationResult[]>;
  reconcileOrders(input: ReconcileOrdersInput): Promise<ReconcileOrdersOutput>;
}>;

function terminalPaymentTarget(status: PaymentRecord["status"]): OrderStatus | null {
  if (status === "failed" || status === "cancelled" || status === "refunded") {
    return "failed";
  }

  if (status === "expired") {
    return "expired";
  }

  return null;
}

function metadataFor(
  checkedAt: Date,
  payment: PaymentRecord | null,
  fulfillment: FulfillmentRecord | null
): ReconciliationMetadata {
  return {
    source: "reconciliation_job",
    ...(payment === null
      ? {}
      : {
          paymentId: payment.id,
          paymentStatus: payment.status
        }),
    ...(fulfillment === null
      ? {}
      : {
          fulfillmentId: fulfillment.id,
          fulfillmentStatus: fulfillment.status
        }),
    checkedAt: checkedAt.toISOString()
  };
}

function noIssueResult(order: OrderRecord, checkedAt: Date): ReconciliationResult {
  return {
    orderId: order.id,
    issue: "none",
    action: "skipped",
    beforeStatus: order.status,
    targetStatus: null,
    afterStatus: order.status,
    reason: "No inconsistent asynchronous status combination detected.",
    metadata: metadataFor(checkedAt, null, null)
  };
}

function notFoundResult(orderId: string, checkedAt: Date): ReconciliationResult {
  return {
    orderId,
    issue: "none",
    action: "error",
    beforeStatus: null,
    targetStatus: null,
    afterStatus: null,
    reason: `Order ${orderId} was not found for reconciliation.`,
    metadata: metadataFor(checkedAt, null, null)
  };
}

function detectCorrection(
  order: OrderRecord,
  payment: PaymentRecord | null,
  fulfillment: FulfillmentRecord | null
): DetectedCorrection | null {
  if (payment?.status === "paid" && order.status === "pending_payment") {
    return {
      issue: "payment_paid_order_not_paid",
      targetStatus: "paid",
      reason: "Latest payment is paid while order is still pending_payment.",
      payment,
      fulfillment: null
    };
  }

  if (fulfillment?.status === "success" && order.status === "paid") {
    return {
      issue: "fulfillment_success_order_not_started",
      targetStatus: "fulfillment_pending",
      reason: "Successful fulfillment exists while order has not recorded fulfillment start.",
      payment: null,
      fulfillment
    };
  }

  if (fulfillment?.status === "success" && order.status !== "success") {
    return {
      issue: "fulfillment_success_order_not_success",
      targetStatus: "success",
      reason: "Latest fulfillment is success while order is not success.",
      payment: null,
      fulfillment
    };
  }

  if (fulfillment?.status === "failed" && order.status !== "failed") {
    return {
      issue: "fulfillment_failed_order_not_failed",
      targetStatus: "failed",
      reason: "Latest fulfillment is failed while order is not failed.",
      payment: null,
      fulfillment
    };
  }

  const paymentTerminalTarget = payment === null ? null : terminalPaymentTarget(payment.status);
  if (payment !== null && paymentTerminalTarget !== null && order.status !== paymentTerminalTarget) {
    return {
      issue: "payment_terminal_order_not_terminal",
      targetStatus: paymentTerminalTarget,
      reason: `Latest payment is ${payment.status} while order is ${order.status}.`,
      payment,
      fulfillment: null
    };
  }

  return null;
}

export function createReconcileService(options: ReconcileServiceOptions): ReconcileService {
  const clock = options.clock ?? (() => new Date());

  async function reconcileOrder(input: ReconcileOrderInput): Promise<ReconciliationResult[]> {
    const results: ReconciliationResult[] = [];

    for (let step = 0; step < 4; step += 1) {
      const checkedAt = clock();
      const order = await options.orderRepository.findOrderById(input.orderId);

      if (order === null) {
        return [notFoundResult(input.orderId, checkedAt)];
      }

      const [payment, fulfillment] = await Promise.all([
        options.paymentRepository.findLatestPaymentByOrderId(order.id),
        options.fulfillmentRepository.findLatestFulfillmentByOrderId(order.id)
      ]);
      const correction = detectCorrection(order, payment, fulfillment);

      if (correction === null) {
        if (results.length === 0) {
          results.push(noIssueResult(order, checkedAt));
        }
        return results;
      }

      try {
        const updated = await options.orderService.transitionOrderStatus({
          orderId: order.id,
          toStatus: correction.targetStatus,
          note: correction.issue,
          metadata: {
            reconciliationReason: correction.reason,
            ...metadataFor(checkedAt, correction.payment, correction.fulfillment)
          },
          createdBy: "reconciliation_job"
        });

        results.push({
          orderId: order.id,
          issue: correction.issue,
          action: "transitioned",
          beforeStatus: order.status,
          targetStatus: correction.targetStatus,
          afterStatus: updated.status,
          reason: correction.reason,
          metadata: metadataFor(checkedAt, correction.payment, correction.fulfillment)
        });
      } catch (error) {
        const afterOrder = await options.orderRepository.findOrderById(order.id);
        const message = error instanceof Error ? error.message : "Unknown reconciliation error.";

        results.push({
          orderId: order.id,
          issue: correction.issue,
          action: error instanceof OrderTransitionError ? "denied" : "error",
          beforeStatus: order.status,
          targetStatus: correction.targetStatus,
          afterStatus: afterOrder?.status ?? null,
          reason: `Correction denied: ${message}`,
          metadata: metadataFor(checkedAt, correction.payment, correction.fulfillment)
        });

        return results;
      }
    }

    return results;
  }

  return {
    reconcileOrder,

    async reconcileOrders(input: ReconcileOrdersInput) {
      const checkedAt = clock();
      const resultGroups = await Promise.all(input.orderIds.map((orderId) => reconcileOrder({ orderId })));

      return {
        checkedAt,
        results: resultGroups.flat()
      };
    }
  };
}
