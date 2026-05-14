import { randomUUID } from "node:crypto";

import { type CatalogService } from "../catalog/pricing.service";
import { type OrderRepository } from "./order.repository";
import {
  OrderTransitionError,
  OrderTransitionService
} from "./order.transition.service";
import {
  type CreateGuestOrderInput,
  type CreateOrderInput,
  type OrderStatus,
  type OrderTransitionInput,
  type OrderRecord
} from "./order.types";

type OrderServiceOptions = Readonly<{
  repository: OrderRepository;
  catalogService?: CatalogService;
  idGenerator?: () => string;
  invoiceCodeGenerator?: (createdAt: Date) => string;
  clock?: () => Date;
  transitionService?: OrderTransitionService;
}>;

type CreateOrderResult = Readonly<{
  orderId: string;
  invoiceCode: string;
  status: OrderStatus;
}>;

export type OrderService = Readonly<{
  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  createGuestOrder(input: CreateGuestOrderInput): Promise<CreateOrderResult>;
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

  async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const createdAt = clock();
    const orderId = idGenerator();
    const invoiceCode = invoiceCodeGenerator(createdAt);

    let productCode = input.productCode;
    let provider = input.provider;
    let amountMinor = input.amountMinor;
    let basePriceSnapshot: number | null = null;
    let markupSnapshot: number | null = null;
    let rolePriceSnapshot: number | null = null;
    let pricingRuleIdSnapshot: string | null = null;

    if (input.productId !== undefined && input.productId !== null) {
      if (options.catalogService === undefined) {
        throw new Error("Catalog service is required for product-priced orders.");
      }

      const pricedProduct = await options.catalogService.quoteProduct(input.productId, input.roleType);
      productCode = pricedProduct.product.skuDigiflazz;
      provider = pricedProduct.product.provider;
      amountMinor = pricedProduct.finalPriceMinor;
      basePriceSnapshot = pricedProduct.basePriceMinor;
      markupSnapshot = pricedProduct.markupMinor;
      rolePriceSnapshot = pricedProduct.finalPriceMinor;
      pricingRuleIdSnapshot = pricedProduct.pricing.ruleId;
    }

    await options.repository.createOrder({
      id: orderId,
      orderNumber: invoiceCode,
      customerRef: input.customerRef,
      userId: input.userId,
      productCode,
      provider,
      amountMinor,
      currency: input.currency,
      status: "created",
      metadata: input.metadata,
      basePriceSnapshot,
      markupSnapshot,
      rolePriceSnapshot,
      pricingRuleIdSnapshot,
      createdAt,
      updatedAt: createdAt
    });

    await service.transitionOrderStatus({
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
  }

  const service: OrderService = {
    createOrder,

    async createGuestOrder(input: CreateGuestOrderInput) {
      return createOrder({
        ...input,
        userId: null,
        roleType: "pengguna"
      });
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

  return service;
}

export { OrderTransitionError };
