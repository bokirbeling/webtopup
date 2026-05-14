"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceNotFoundError = void 0;
exports.createInvoiceStatusService = createInvoiceStatusService;
class InvoiceNotFoundError extends Error {
    invoiceCode;
    constructor(invoiceCode) {
        super("Invoice tidak ditemukan");
        this.name = "InvoiceNotFoundError";
        this.invoiceCode = invoiceCode;
    }
}
exports.InvoiceNotFoundError = InvoiceNotFoundError;
function createInvoiceStatusService(options) {
    return {
        async getInvoiceStatus(invoiceCode) {
            const order = await options.orderRepository.findOrderByInvoiceCode(invoiceCode);
            if (!order) {
                throw new InvoiceNotFoundError(invoiceCode);
            }
            const [payment, fulfillment, timeline] = await Promise.all([
                options.paymentRepository.findLatestPaymentByOrderId(order.id),
                options.fulfillmentRepository.findLatestFulfillmentByOrderId(order.id),
                options.orderRepository.findStatusHistoryByOrderId(order.id)
            ]);
            return {
                order,
                payment,
                fulfillment,
                timeline
            };
        }
    };
}
