import express from "express";

import {
  InMemoryOrderRepository,
  SupabaseOrderRepository
} from "./modules/order/order.repository";
import { createOrdersRouter } from "./modules/order/order.router";
import { createOrderService, type OrderService } from "./modules/order/order.service";
import { InMemoryPaymentRepository, SupabasePaymentRepository } from "./modules/payment/payment.repository";
import {
  InMemoryFulfillmentRepository,
  SupabaseFulfillmentRepository
} from "./modules/fulfillment/fulfillment.repository";
import { createFulfillmentRouter } from "./modules/fulfillment/fulfillment.router";
import { createFulfillmentService, type FulfillmentService } from "./modules/fulfillment/fulfillment.service";
import { createPaymentRouter } from "./modules/payment/payment.router";
import { createPaymentService, type PaymentService } from "./modules/payment/payment.service";
import { createInvoiceStatusRouter } from "./modules/invoice-status/invoice-status.router";
import {
  createInvoiceStatusService,
  type InvoiceStatusService
} from "./modules/invoice-status/invoice-status.service";
import { healthRouter } from "./routes/health";
import { type AuditLogger, noopAuditLogger } from "./security/audit";
import { createRateLimitMiddleware } from "./security/rate-limit";

export type AppDependencies = Readonly<{
  orderService?: OrderService;
  paymentService?: PaymentService;
  fulfillmentService?: FulfillmentService;
  invoiceStatusService?: InvoiceStatusService;
  supabaseConfig?: Readonly<{
    supabaseUrl: string;
    supabaseServiceRoleKey: string;
  }>;
  midtransConfig?: Readonly<{
    serverKey: string;
    apiBaseUrl: string;
  }>;
  digiflazzConfig?: Readonly<{
    username: string | null;
    apiKey: string | null;
    apiBaseUrl: string;
    nodeEnv: "development" | "test" | "production";
  }>;
  auditLogger?: AuditLogger;
  rateLimit?: Readonly<{
    windowMs: number;
    maxRequests: number;
  }>;
}>;

export function createApp(dependencies: AppDependencies = {}) {
  const app = express();
  const auditLogger = dependencies.auditLogger ?? noopAuditLogger;
  const orderRepository =
    dependencies.supabaseConfig === undefined
      ? new InMemoryOrderRepository()
      : new SupabaseOrderRepository({
          supabaseUrl: dependencies.supabaseConfig.supabaseUrl,
          supabaseServiceRoleKey: dependencies.supabaseConfig.supabaseServiceRoleKey
        });

  const paymentRepository =
    dependencies.supabaseConfig === undefined
      ? new InMemoryPaymentRepository(orderRepository as InMemoryOrderRepository)
      : new SupabasePaymentRepository({
          supabaseUrl: dependencies.supabaseConfig.supabaseUrl,
          supabaseServiceRoleKey: dependencies.supabaseConfig.supabaseServiceRoleKey
        });

  const fulfillmentRepository =
    dependencies.supabaseConfig === undefined
      ? new InMemoryFulfillmentRepository(orderRepository as InMemoryOrderRepository)
      : new SupabaseFulfillmentRepository({
          supabaseUrl: dependencies.supabaseConfig.supabaseUrl,
          supabaseServiceRoleKey: dependencies.supabaseConfig.supabaseServiceRoleKey
        });

  const orderService =
    dependencies.orderService ??
    createOrderService({
      repository: orderRepository
    });

  const paymentService =
    dependencies.paymentService ??
    createPaymentService({
      paymentRepository,
      orderService,
      midtransConfig: {
        serverKey: dependencies.midtransConfig?.serverKey ?? "test-midtrans-server-key",
        apiBaseUrl: dependencies.midtransConfig?.apiBaseUrl ?? "https://app.sandbox.midtrans.com"
      }
    });

  const fulfillmentService =
    dependencies.fulfillmentService ??
    createFulfillmentService({
      fulfillmentRepository,
      orderService,
      digiflazzConfig: {
        username: dependencies.digiflazzConfig?.username ?? null,
        apiKey: dependencies.digiflazzConfig?.apiKey ?? null,
        apiBaseUrl: dependencies.digiflazzConfig?.apiBaseUrl ?? "https://api.digiflazz.com",
        nodeEnv: dependencies.digiflazzConfig?.nodeEnv ?? "test"
      }
    });

  const invoiceStatusService =
    dependencies.invoiceStatusService ??
    createInvoiceStatusService({
      orderRepository,
      paymentRepository,
      fulfillmentRepository
    });

  app.disable("x-powered-by");
  app.use(express.json());

  const sensitiveEndpointRateLimit = createRateLimitMiddleware({
    windowMs: dependencies.rateLimit?.windowMs ?? 60_000,
    maxRequests: dependencies.rateLimit?.maxRequests ?? 60,
    auditLogger
  });

  app.use("/api/orders", createOrdersRouter({ orderService }));
  app.use("/api/payments", sensitiveEndpointRateLimit, createPaymentRouter({ paymentService, auditLogger }));
  app.use("/api/fulfillments", sensitiveEndpointRateLimit, createFulfillmentRouter({ fulfillmentService, auditLogger }));
  app.use("/api/invoices", createInvoiceStatusRouter({ invoiceStatusService }));
  app.use("/health", healthRouter);

  return app;
}
