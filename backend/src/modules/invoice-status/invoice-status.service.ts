import { type FulfillmentRepository } from "../fulfillment/fulfillment.repository";
import { type OrderRepository } from "../order/order.repository";
import { type PaymentRepository } from "../payment/payment.repository";
import { type InvoiceStatusLookup } from "./invoice-status.types";

export class InvoiceNotFoundError extends Error {
  readonly invoiceCode: string;

  constructor(invoiceCode: string) {
    super("Invoice tidak ditemukan");
    this.name = "InvoiceNotFoundError";
    this.invoiceCode = invoiceCode;
  }
}

type InvoiceStatusServiceOptions = Readonly<{
  orderRepository: OrderRepository;
  paymentRepository: PaymentRepository;
  fulfillmentRepository: FulfillmentRepository;
}>;

export type InvoiceStatusService = Readonly<{
  getInvoiceStatus(invoiceCode: string): Promise<InvoiceStatusLookup>;
}>;

export function createInvoiceStatusService(options: InvoiceStatusServiceOptions): InvoiceStatusService {
  return {
    async getInvoiceStatus(invoiceCode: string) {
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
