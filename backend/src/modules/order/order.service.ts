import { randomUUID } from "node:crypto";

import { type OrderRepository } from "./order.repository";
import {
  OrderTransitionError,
  OrderTransitionService
} from "./order.transition.service";
import {
  type CreateGuestOrderInput,
  type OrderStatus,
  type OrderTransitionInput,
  type OrderRecord
} from "./order.types";

type OrderServiceOptions = Readonly<{
  repository: OrderRepository;
  idGenerator?: () => string;
  invoiceCodeGenerator?: (createdAt: Date) => string;
  clock?: () => Date;
  transitionService?: OrderTransitionService;
}>;

export type OrderService = Readonly<{
  createGuestOrder(input: CreateGuestOrderInput): Promise<{
    orderId: string;
    invoiceCode: string;
    status: OrderStatus;
  }>;
  transitionOrderStatus(input: OrderTransitionInput): Promise<OrderRecord>;
}>;

export class OrderNotFoundError extends Error {
  readonly orderId: string;

  constructor(orderId: string) {
    super(`Order ${orderId} was not found.`);
    this.name = "OrderNotFoundError";
    this.orderId = orderId;
  }
}

function defaultIdGenerator() {
  return randomUUID();
}

function createSequentialInvoiceCodeGenerator() {
  let sequence = 0;

  return (createdAt: Date) => {
    sequence += 1;

    const yyyymmdd = createdAt.toISOString().slice(0, 10).replaceAll("-", "");
    const paddedSequence = String(sequence).padStart(6, "0");

    return `INV-${yyyymmdd}-${paddedSequence}`;
  };
}

function defaultClock() {
  return new Date();
}

export function createOrderService(options: OrderServiceOptions): OrderService {
  const idGenerator = options.idGenerator ?? defaultIdGenerator;
  const invoiceCodeGenerator = options.invoiceCodeGenerator ?? createSequentialInvoiceCodeGenerator();
  const clock = options.clock ?? defaultClock;
  const transitionService = options.transitionService ?? new OrderTransitionService();

  return {
    async createGuestOrder(input: CreateGuestOrderInput) {
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

    async transitionOrderStatus(input: OrderTransitionInput) {
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

export { OrderTransitionError };
