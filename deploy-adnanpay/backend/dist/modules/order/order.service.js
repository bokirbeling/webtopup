"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderTransitionError = exports.OrderNotFoundError = void 0;
exports.createOrderService = createOrderService;
const node_crypto_1 = require("node:crypto");
const order_transition_service_1 = require("./order.transition.service");
Object.defineProperty(exports, "OrderTransitionError", { enumerable: true, get: function () { return order_transition_service_1.OrderTransitionError; } });
class OrderNotFoundError extends Error {
    orderId;
    constructor(orderId) {
        super(`Order ${orderId} was not found.`);
        this.name = "OrderNotFoundError";
        this.orderId = orderId;
    }
}
exports.OrderNotFoundError = OrderNotFoundError;
function defaultIdGenerator() {
    return (0, node_crypto_1.randomUUID)();
}
function createSequentialInvoiceCodeGenerator() {
    let sequence = 0;
    return (createdAt) => {
        sequence += 1;
        const yyyymmdd = createdAt.toISOString().slice(0, 10).replaceAll("-", "");
        const paddedSequence = String(sequence).padStart(6, "0");
        return `INV-${yyyymmdd}-${paddedSequence}`;
    };
}
function defaultClock() {
    return new Date();
}
function createOrderService(options) {
    const idGenerator = options.idGenerator ?? defaultIdGenerator;
    const invoiceCodeGenerator = options.invoiceCodeGenerator ?? createSequentialInvoiceCodeGenerator();
    const clock = options.clock ?? defaultClock;
    const transitionService = options.transitionService ?? new order_transition_service_1.OrderTransitionService();
    return {
        async createGuestOrder(input) {
            const createdAt = clock();
            const orderId = idGenerator();
            const invoiceCode = invoiceCodeGenerator(createdAt);
            await options.repository.createOrder({
                id: orderId,
                orderNumber: invoiceCode,
                customerRef: input.customerRef,
                productCode: input.productCode,
                provider: input.provider,
                amountMinor: input.amountMinor,
                currency: input.currency,
                status: "created",
                metadata: input.metadata,
                createdAt,
                updatedAt: createdAt
            });
            await this.transitionOrderStatus({
                orderId,
                toStatus: "pending_payment",
                note: "order_created",
                metadata: {
                    source: "orders_api"
                },
                createdBy: "system"
            });
            return {
                orderId,
                invoiceCode,
                status: "pending_payment"
            };
        },
        async transitionOrderStatus(input) {
            const existingOrder = await options.repository.findOrderById(input.orderId);
            if (!existingOrder) {
                throw new OrderNotFoundError(input.orderId);
            }
            transitionService.ensureForwardOnlyTransition(existingOrder.status, input.toStatus);
            const updatedAt = clock();
            const updatedOrder = await options.repository.updateOrderStatus(existingOrder.id, input.toStatus, updatedAt);
            await options.repository.createStatusHistory({
                orderId: updatedOrder.id,
                fromStatus: existingOrder.status,
                toStatus: input.toStatus,
                note: input.note ?? null,
                metadata: input.metadata ?? {},
                createdBy: input.createdBy ?? "system",
                createdAt: updatedAt
            });
            return updatedOrder;
        }
    };
}
