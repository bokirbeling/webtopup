import express, { type Request } from "express";

import { InMemoryAuthRepository, SupabaseAuthRepository, type AuthRepository } from "./modules/auth/auth.repository";
import { createAuthenticationMiddleware, requireRoles } from "./modules/auth/auth.middleware";
import { createAuthRouter } from "./modules/auth/auth.router";
import { createAuthService, type AuthService, type EmailVerificationSender } from "./modules/auth/auth.service";
import { createAccountRouter } from "./modules/account/account.router";
import { createAccountService, type AccountService } from "./modules/account/account.service";
import { createAdminRouter } from "./modules/admin/admin.router";
import { createAdminService, type AdminService } from "./modules/admin/admin.service";
import { createAdminMonitoringRouter, createMemberTransactionsRouter } from "./modules/dashboard/dashboard.router";
import { createDashboardService, type DashboardService } from "./modules/dashboard/dashboard.service";
import { createAdminDigiflazzOperationsRouter } from "./modules/dashboard/digiflazz-operations.router";
import {
  InMemoryOrderRepository,
  SupabaseOrderRepository,
  type OrderRepository
} from "./modules/order/order.repository";
import { createOrdersRouter } from "./modules/order/order.router";
import { createOrderService, type OrderService } from "./modules/order/order.service";
import { InMemoryPaymentRepository, SupabasePaymentRepository, type PaymentRepository } from "./modules/payment/payment.repository";
import {
  InMemoryFulfillmentRepository,
  SupabaseFulfillmentRepository,
  type FulfillmentRepository
} from "./modules/fulfillment/fulfillment.repository";
import { createFulfillmentRouter } from "./modules/fulfillment/fulfillment.router";
import { createFulfillmentService, type FulfillmentService } from "./modules/fulfillment/fulfillment.service";
import { createPaymentRouter } from "./modules/payment/payment.router";
import { createPaymentService, type PaymentService } from "./modules/payment/payment.service";
import { createInvoiceStatusRouter } from "./modules/invoice-status/invoice-status.router";
import { InMemoryCatalogRepository, SupabaseCatalogRepository, type CatalogRepository } from "./modules/catalog/catalog.repository";
import { createCatalogAdminRouter, createCatalogRouter } from "./modules/catalog/catalog.router";
import { createDigiflazzPriceListSyncService, type DigiflazzPriceListSyncService } from "./modules/catalog/digiflazz-price-sync.service";
import { createCatalogService, type CatalogService } from "./modules/catalog/pricing.service";
import { InMemoryPostpaidRepository, SupabasePostpaidRepository, type PostpaidRepository } from "./modules/postpaid/postpaid.repository";
import { createPostpaidRouter } from "./modules/postpaid/postpaid.router";
import { createPostpaidService, type PostpaidService } from "./modules/postpaid/postpaid.service";
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
  dashboardService?: DashboardService;
  orderRepository?: OrderRepository;
  paymentRepository?: PaymentRepository;
  fulfillmentRepository?: FulfillmentRepository;
  orderService?: OrderService;
  paymentService?: PaymentService;
  fulfillmentService?: FulfillmentService;
  invoiceStatusService?: InvoiceStatusService;
  catalogRepository?: CatalogRepository;
  catalogService?: CatalogService;
  postpaidRepository?: PostpaidRepository;
  postpaidService?: PostpaidService;
  digiflazzPriceListSyncService?: DigiflazzPriceListSyncService;
  fetchImpl?: typeof fetch;
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
  emailVerificationSender?: EmailVerificationSender;
  authClock?: () => Date;
  midtransConfig?: Readonly<{
    serverKey: string;
    apiBaseUrl: string;
  }>;
  digiflazzConfig?: Readonly<{
    username: string | null;
    apiKey: string | null;
    apiBaseUrl: string;
    nodeEnv: "development" | "test" | "production";
    webhookSecret?: string | null;
    topupOptions?: Readonly<{
      testing?: boolean;
      maxPrice?: number;
      callbackUrl?: string;
      allowDot?: boolean;
    }>;
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
    dependencies.orderRepository ??
    (dependencies.supabaseConfig === undefined
      ? new InMemoryOrderRepository()
      : new SupabaseOrderRepository({
          supabaseUrl: dependencies.supabaseConfig.supabaseUrl,
          supabaseServiceRoleKey: dependencies.supabaseConfig.supabaseServiceRoleKey,
          tablePrefix: dependencies.supabaseConfig.tablePrefix
        }));

  const paymentRepository =
    dependencies.paymentRepository ??
    (dependencies.supabaseConfig === undefined
      ? new InMemoryPaymentRepository(orderRepository as InMemoryOrderRepository)
      : new SupabasePaymentRepository({
          supabaseUrl: dependencies.supabaseConfig.supabaseUrl,
          supabaseServiceRoleKey: dependencies.supabaseConfig.supabaseServiceRoleKey,
          tablePrefix: dependencies.supabaseConfig.tablePrefix
        }));

  const fulfillmentRepository =
    dependencies.fulfillmentRepository ??
    (dependencies.supabaseConfig === undefined
      ? new InMemoryFulfillmentRepository(orderRepository as InMemoryOrderRepository)
      : new SupabaseFulfillmentRepository({
          supabaseUrl: dependencies.supabaseConfig.supabaseUrl,
          supabaseServiceRoleKey: dependencies.supabaseConfig.supabaseServiceRoleKey,
          tablePrefix: dependencies.supabaseConfig.tablePrefix
        }));

  const catalogRepository =
    dependencies.catalogRepository ??
    (dependencies.supabaseConfig === undefined
      ? new InMemoryCatalogRepository()
      : new SupabaseCatalogRepository({
          supabaseUrl: dependencies.supabaseConfig.supabaseUrl,
          supabaseServiceRoleKey: dependencies.supabaseConfig.supabaseServiceRoleKey,
          tablePrefix: dependencies.supabaseConfig.tablePrefix
        }));

  const postpaidRepository =
    dependencies.postpaidRepository ??
    (dependencies.supabaseConfig === undefined
      ? new InMemoryPostpaidRepository()
      : new SupabasePostpaidRepository({
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
      passwordHashCost: dependencies.authConfig?.passwordHashCost ?? 4,
      clock: dependencies.authClock,
      emailVerificationSender: dependencies.emailVerificationSender
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

  const digiflazzConfig = {
    username: dependencies.digiflazzConfig?.username ?? null,
    apiKey: dependencies.digiflazzConfig?.apiKey ?? null,
    apiBaseUrl: dependencies.digiflazzConfig?.apiBaseUrl ?? "https://api.digiflazz.com"
  };

  const postpaidService =
    dependencies.postpaidService ??
    createPostpaidService({
      repository: postpaidRepository,
      digiflazzConfig: {
        ...digiflazzConfig,
        nodeEnv: dependencies.digiflazzConfig?.nodeEnv ?? "test",
        topupOptions: dependencies.digiflazzConfig?.topupOptions
      },
      fetchImpl: dependencies.fetchImpl
    });

  const priceListSyncService =
    dependencies.digiflazzPriceListSyncService ??
    createDigiflazzPriceListSyncService({
      repository: catalogRepository,
      digiflazzConfig,
      fetchImpl: dependencies.fetchImpl
    });

  const catalogService =
    dependencies.catalogService ??
    createCatalogService({
      repository: catalogRepository,
      priceListSyncService
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
        ...digiflazzConfig,
        nodeEnv: dependencies.digiflazzConfig?.nodeEnv ?? "test",
        topupOptions: dependencies.digiflazzConfig?.topupOptions
      }
    });

  const invoiceStatusService =
    dependencies.invoiceStatusService ??
    createInvoiceStatusService({
      orderRepository,
      paymentRepository,
      fulfillmentRepository
    });

  const dashboardService =
    dependencies.dashboardService ??
    createDashboardService({
      orderRepository,
      paymentRepository,
      fulfillmentRepository
    });

  app.disable("x-powered-by");
  app.use(express.json({
    verify: (request: Request, _response, buffer) => {
      (request as Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
    }
  }));

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
    app.use(basePath + "/api/account", authenticationMiddleware, createMemberTransactionsRouter({ dashboardService }));
    app.use(basePath + "/api/admin", authenticationMiddleware, adminOnlyMiddleware, createAdminRouter({ adminService }));
    app.use(basePath + "/api/admin", authenticationMiddleware, adminOnlyMiddleware, createAdminMonitoringRouter({ dashboardService }));
    app.use(basePath + "/api/admin", authenticationMiddleware, adminOnlyMiddleware, createAdminDigiflazzOperationsRouter({ catalogRepository, paymentRepository, digiflazzConfig, fetchImpl: dependencies.fetchImpl }));
    app.use(basePath + "/api/admin/catalog", authenticationMiddleware, adminOnlyMiddleware, createCatalogAdminRouter({ catalogService }));
    app.use(basePath + "/api/catalog", createCatalogRouter({ catalogService, authService }));
    app.use(basePath + "/api/digiflazz", authenticationMiddleware, createPostpaidRouter({ postpaidService }));
    app.use(basePath + "/api/orders", createOrdersRouter({ orderService, authService }));
    app.use(
      basePath + "/api/payments",
      sensitiveEndpointRateLimit,
      createPaymentRouter({ paymentService, auditLogger })
    );
    app.use(
      basePath + "/api/fulfillments",
      sensitiveEndpointRateLimit,
      createFulfillmentRouter({
        fulfillmentService,
        auditLogger,
        digiflazzWebhookSecret: dependencies.digiflazzConfig?.webhookSecret ?? null
      })
    );
    app.use(basePath + "/api/invoices", createInvoiceStatusRouter({ invoiceStatusService }));
    app.use(basePath + "/health", healthRouter);
  }

  mountRoutes("");
  mountRoutes("/ppob-api");

  return app;
}





