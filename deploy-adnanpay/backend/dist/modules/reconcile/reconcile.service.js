"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReconcileService = createReconcileService;
const order_service_1 = require("../order/order.service");
function terminalPaymentTarget(status) {
    if (status === "failed" || status === "cancelled" || status === "refunded") {
        return "failed";
    }
    if (status === "expired") {
        return "expired";
    }
    return null;
}
function metadataFor(checkedAt, payment, fulfillment) {
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
function noIssueResult(order, checkedAt) {
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
function notFoundResult(orderId, checkedAt) {
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
function detectCorrection(order, payment, fulfillment) {
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
function createReconcileService(options) {
    const clock = options.clock ?? (() => new Date());
    async function reconcileOrder(input) {
        const results = [];
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
            }
            catch (error) {
                const afterOrder = await options.orderRepository.findOrderById(order.id);
                const message = error instanceof Error ? error.message : "Unknown reconciliation error.";
                results.push({
                    orderId: order.id,
                    issue: correction.issue,
                    action: error instanceof order_service_1.OrderTransitionError ? "denied" : "error",
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
        async reconcileOrders(input) {
            const checkedAt = clock();
            const resultGroups = await Promise.all(input.orderIds.map((orderId) => reconcileOrder({ orderId })));
            return {
                checkedAt,
                results: resultGroups.flat()
            };
        }
    };
}
