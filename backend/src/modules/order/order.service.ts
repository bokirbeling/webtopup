import { randomUUID } from "node:crypto";

import { type CatalogService } from "../catalog/pricing.service";
import { type CommissionService } from "../commission/commission.service";
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
  commissionService?: CommissionService;
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
  findOrderById(orderId: string): Promise<OrderRecord | null>;
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

    // S5: Calculate commission
    let commissionId: string | null = null;
    let finalAmountMinor = amountMinor;
    if (options.commissionService) {
      const commissionResult = await options.commissionService.calculateAndRecordCommission({
        orderId,
        resellerId: input.userId,
        referralCode: input.referralCode ?? null,
        discountCode: input.discountCode ?? null,
        grossSaleMinor: amountMinor,
        basePriceMinor: basePriceSnapshot ?? amountMinor
      });
      commissionId = commissionResult.commissionId;
      finalAmountMinor = commissionResult.netSaleMinor;
    }

    const order = await options.repository.createOrder({
      id: orderId,
      orderNumber: invoiceCode,
      customerRef: input.customerRef,
      userId: input.userId,
      productCode,
      provider,
      amountMinor: finalAmountMinor,
      currency: input.currency,
      status: "created",
      referralCode: input.referralCode ?? null,
      discountCode: input.discountCode ?? null,
      discountAmountMinor: null, // Set by commission service if applicable
      metadata: {
        ...input.metadata,
        commission_id: commissionId
      },
      basePriceSnapshot,
      markupSnapshot,
      rolePriceSnapshot,
      pricingRuleIdSnapshot,
      createdAt,
      updatedAt: createdAt
    });

    await options.repository.createStatusHistory({
      orderId: order.id,
      fromStatus: null,
      toStatus: "created",
      note: "order_created",
      metadata: {
        source: "orders_api"
      },
      createdBy: "system",
      createdAt
    });

    return {
      orderId: order.id,
      invoiceCode: order.orderNumber,
      status: order.status
    };
  }

  async function createGuestOrder(input: CreateGuestOrderInput): Promise<CreateOrderResult> {
    return createOrder({
      ...input,
      userId: null,
      roleType: "pengguna"
    });
  }

  async function findOrderById(orderId: string): Promise<OrderRecord | null> {
    return options.repository.findOrderById(orderId);
  }

  async function transitionOrderStatus(input: OrderTransitionInput): Promise<OrderRecord> {
    const order = await options.repository.findOrderById(input.orderId);
    if (!order) {
      throw new OrderNotFoundError(input.orderId);
    }

    transitionService.ensureForwardOnlyTransition(order.status, input.toStatus);
    const nextStatus = input.toStatus;
    const transitionNote = `Transition to ${input.toStatus}`;

    const updatedOrder = await options.repository.updateOrderStatus(input.orderId, nextStatus, clock());

    await options.repository.createStatusHistory({
      orderId: input.orderId,
      fromStatus: order.status,
      toStatus: nextStatus,
      note: input.note ?? transitionNote,
      metadata: input.metadata ?? {},
      createdBy: input.createdBy ?? "system",
      createdAt: clock()
    });

    return updatedOrder;
  }

  return {
    createOrder,
    createGuestOrder,
    findOrderById,
    transitionOrderStatus
  };
}
