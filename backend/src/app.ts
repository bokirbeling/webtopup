import express from "express";

import { InMemoryAuthRepository, SupabaseAuthRepository, type AuthRepository } from "./modules/auth/auth.repository";
import { createAuthenticationMiddleware, requireRoles } from "./modules/auth/auth.middleware";
import { createAuthRouter } from "./modules/auth/auth.router";
import { createAuthService, type AuthService } from "./modules/auth/auth.service";
import { createAccountRouter } from "./modules/account/account.router";
import { createAccountService, type AccountService } from "./modules/account/account.service";
import { createAdminRouter } from "./modules/admin/admin.router";
import { createAdminService, type AdminService } from "./modules/admin/admin.service";
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
import { InMemoryCatalogRepository, SupabaseCatalogRepository, type CatalogRepository } from "./modules/catalog/catalog.repository";
import { createCatalogAdminRouter, createCatalogRouter } from "./modules/catalog/catalog.router";
import { createCatalogService, type CatalogService } from "./modules/catalog/pricing.service";
import {
  createInvoiceStatusService,
  type InvoiceStatusService
} from "./modules/invoice-status/invoice-status.service";
import { healthRouter } from "./routes/health";
import { type AuditLogger, noopAuditLogger } from "./security/audit";
import { createRateLimitMiddleware } from "./security/rate-limit";

const DEFAULT_TEST_JWT_SECRET = "test-only-jwt-secret-at-least-32-bytes";

export type AppDependencies = Readonly<{
  authRepository?: AuthRepository;
  authService?: AuthService;
  accountService?: AccountService;
  adminService?: AdminService;
  orderService?: OrderService;
  paymentService?: PaymentService;
  fulfillmentService?: FulfillmentService;
  invoiceStatusService?: InvoiceStatusService;
  catalogRepository?: CatalogRepository;
  catalogService?: CatalogService;
  supabaseConfig?: Readonly<{
    supabaseUrl: string;
    supabaseServiceRoleKey: string;
    tablePrefix?: string;
  }>;
  authConfig?: Readonly<{
    jwtSecret: string;
    jwtExpiresIn: string;
    passwordHashCost: number;
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
  const authRepository =
    dependencies.authRepository ??
    (dependencies.supabaseConfig === undefined
      ? new InMemoryAuthRepository()
      : new SupabaseAuthRepository({
          supabaseUrl: dependencies.supabaseConfig.supabaseUrl,
          supabaseServiceRoleKey: dependencies.supabaseConfig.supabaseServiceRoleKey,
          tablePrefix: dependencies.supabaseConfig.tablePrefix
        }));
  const orderRepository =
    dependencies.supabaseConfig === undefined
      ? new InMemoryOrderRepository()
      : new SupabaseOrderRepository({
          supabaseUrl: dependencies.supabaseConfig.supabaseUrl,
          supabaseServiceRoleKey: dependencies.supabaseConfig.supabaseServiceRoleKey,
          tablePrefix: dependencies.supabaseConfig.tablePrefix
        });

  const paymentRepository =
    dependencies.supabaseConfig === undefined
      ? new InMemoryPaymentRepository(orderRepository as InMemoryOrderRepository)
      : new SupabasePaymentRepository({
          supabaseUrl: dependencies.supabaseConfig.supabaseUrl,
          supabaseServiceRoleKey: dependencies.supabaseConfig.supabaseServiceRoleKey,
          tablePrefix: dependencies.supabaseConfig.tablePrefix
        });

  const fulfillmentRepository =
    dependencies.supabaseConfig === undefined
      ? new InMemoryFulfillmentRepository(orderRepository as InMemoryOrderRepository)
      : new SupabaseFulfillmentRepository({
          supabaseUrl: dependencies.supabaseConfig.supabaseUrl,
          supabaseServiceRoleKey: dependencies.supabaseConfig.supabaseServiceRoleKey,
          tablePrefix: dependencies.supabaseConfig.tablePrefix
        });

  const catalogRepository =
    dependencies.catalogRepository ??
    (dependencies.supabaseConfig === undefined
      ? new InMemoryCatalogRepository()
      : new SupabaseCatalogRepository({
          supabaseUrl: dependencies.supabaseConfig.supabaseUrl,
          supabaseServiceRoleKey: dependencies.supabaseConfig.supabaseServiceRoleKey,
          tablePrefix: dependencies.supabaseConfig.tablePrefix
        }));

  const authService =
    dependencies.authService ??
    createAuthService({
      repository: authRepository,
      jwtSecret: dependencies.authConfig?.jwtSecret ?? DEFAULT_TEST_JWT_SECRET,
      jwtExpiresIn: dependencies.authConfig?.jwtExpiresIn ?? "1h",
      passwordHashCost: dependencies.authConfig?.passwordHashCost ?? 4
    });

  const accountService =
    dependencies.accountService ??
    createAccountService({
      repository: authRepository
    });

  const adminService =
    dependencies.adminService ??
    createAdminService({
      repository: authRepository
    });

  const catalogService =
    dependencies.catalogService ??
    createCatalogService({
      repository: catalogRepository
    });

  const orderService =
    dependencies.orderService ??
    createOrderService({
      repository: orderRepository,
      catalogService
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

  const authenticationMiddleware = createAuthenticationMiddleware(authService);
  const adminOnlyMiddleware = requireRoles(["admin"]);

  function mountRoutes(basePath: string) {
    app.use(basePath + "/api/auth", createAuthRouter({ authService }));
    app.use(basePath + "/api/account", authenticationMiddleware, createAccountRouter({ accountService }));
    app.use(basePath + "/api/admin", authenticationMiddleware, adminOnlyMiddleware, createAdminRouter({ adminService }));
    app.use(basePath + "/api/admin/catalog", authenticationMiddleware, adminOnlyMiddleware, createCatalogAdminRouter({ catalogService }));
    app.use(basePath + "/api/catalog", createCatalogRouter({ catalogService, authService }));
    app.use(basePath + "/api/orders", createOrdersRouter({ orderService, authService }));
    app.use(
      basePath + "/api/payments",
      sensitiveEndpointRateLimit,
      createPaymentRouter({ paymentService, auditLogger })
    );
    app.use(
      basePath + "/api/fulfillments",
      sensitiveEndpointRateLimit,
      createFulfillmentRouter({ fulfillmentService, auditLogger })
    );
    app.use(basePath + "/api/invoices", createInvoiceStatusRouter({ invoiceStatusService }));
    app.use(basePath + "/health", healthRouter);
  }

  mountRoutes("");
  mountRoutes("/ppob-api");

  return app;
}





