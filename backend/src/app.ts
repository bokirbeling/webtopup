import express, { type Request } from "express";

import { InMemoryAuthRepository, SupabaseAuthRepository, type AuthRepository } from "./modules/auth/auth.repository";
import { createAuthenticationMiddleware, requireRoles } from "./modules/auth/auth.middleware";
import { createAuthRouter } from "./modules/auth/auth.router";
import { createAuthService, type AuthService, type EmailVerificationSender } from "./modules/auth/auth.service";
import { createAccountRouter } from "./modules/account/account.router";
import { createAccountService, type AccountService } from "./modules/account/account.service";
import { createAdminRouter } from "./modules/admin/admin.router";
import { createAdminService, type AdminService } from "./modules/admin/admin.service";
import { createProductUploadService } from "./modules/admin/product-upload.service";
import { createAdminMonitoringRouter, createMemberTransactionsRouter } from "./modules/dashboard/dashboard.router";
import { createDashboardService, type DashboardService } from "./modules/dashboard/dashboard.service";
import { createAdminDigiflazzOperationsRouter } from "./modules/dashboard/digiflazz-operations.router";
import { createDashboardContentRouter } from "./routes/dashboard.router";
import { SupabaseDashboardContentRepository } from "./modules/dashboard/dashboard-content.repository";
import { createAdminAuditRouter, createProviderAuditRouter } from "./modules/audit/provider-audit.router";
import { InMemoryProviderAuditRepository, SupabaseProviderAuditRepository } from "./modules/audit/provider-audit.repository";
import { type ProviderAuditRepository } from "./modules/audit/provider-audit.types";
import { InMemoryCommissionRepository, SupabaseCommissionRepository } from "./modules/commission/commission.repository";
import { type CommissionRepository } from "./modules/commission/commission.types";
import { createAdminCommissionRouter, createCommissionRouter } from "./modules/commission/commission.router";
import { createCommissionService, type CommissionService } from "./modules/commission/commission.service";
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
import { createInvoiceStatusService, type InvoiceStatusService } from "./modules/invoice-status/invoice-status.service";
import { InMemoryCatalogRepository, SupabaseCatalogRepository, type CatalogRepository } from "./modules/catalog/catalog.repository";
import { createCatalogAdminRouter, createCatalogRouter } from "./modules/catalog/catalog.router";
import { createDigiflazzPriceListSyncService, type DigiflazzPriceListSyncService } from "./modules/catalog/digiflazz-price-sync.service";
import { createCatalogService, type CatalogService } from "./modules/catalog/pricing.service";
import { InMemoryPostpaidRepository, SupabasePostpaidRepository, type PostpaidRepository } from "./modules/postpaid/postpaid.repository";
import { createPostpaidRouter } from "./modules/postpaid/postpaid.router";
import { createPostpaidService, type PostpaidService } from "./modules/postpaid/postpaid.service";

export type MidtransConfig = Readonly<{
  clientKey: string;
  serverKey: string;
  apiBaseUrl: string;
  merchantId: string;
}>;

export type DigiflazzConfig = Readonly<{
  username: string | null;
  apiKey: string | null;
  apiBaseUrl: string;
  webhookSecret: string | null;
  nodeEnv: "development" | "test" | "production";
  topupOptions?: Readonly<{
    testing?: boolean;
    maxPrice?: number;
    callbackUrl?: string;
    allowDot?: boolean;
  }>;
}>;

export type AppDependencies = Readonly<{
  authRepository?: AuthRepository;
  authService?: AuthService;
  emailVerificationSender?: EmailVerificationSender;
  accountService?: AccountService;
  adminService?: AdminService;
  dashboardService?: DashboardService;
  orderRepository?: OrderRepository;
  orderService?: OrderService;
  paymentRepository?: PaymentRepository;
  paymentService?: PaymentService;
  fulfillmentRepository?: FulfillmentRepository;
  fulfillmentService?: FulfillmentService;
  catalogRepository?: CatalogRepository;
  catalogService?: CatalogService;
  postpaidRepository?: PostpaidRepository;
  postpaidService?: PostpaidService;
  providerAuditRepository?: ProviderAuditRepository;
  commissionRepository?: CommissionRepository;
  commissionService?: CommissionService;
  supabaseConfig?: Readonly<{ url: string; serviceRoleKey: string; tablePrefix?: string }>;
  authConfig?: Readonly<{ jwtSecret: string; jwtExpiresIn: string; passwordHashCost: number }>;
  midtransConfig?: MidtransConfig;
  digiflazzConfig?: DigiflazzConfig;
  fetchImpl?: typeof fetch;
}>;

export function createApp(dependencies: AppDependencies) {
  const app = express();
  const tablePrefix = dependencies.supabaseConfig?.tablePrefix ?? "";

  // 1. Audit & Ledger
  const providerAuditRepository = dependencies.providerAuditRepository ?? (
    dependencies.supabaseConfig
      ? new SupabaseProviderAuditRepository(
          dependencies.supabaseConfig.url,
          dependencies.supabaseConfig.serviceRoleKey,
          tablePrefix
        )
      : new InMemoryProviderAuditRepository()
  );

  // 2. Commission & Affiliate
  const commissionRepository = dependencies.commissionRepository ?? (
    dependencies.supabaseConfig
      ? new SupabaseCommissionRepository(
          dependencies.supabaseConfig.url,
          dependencies.supabaseConfig.serviceRoleKey,
          tablePrefix
        )
      : new InMemoryCommissionRepository()
  );
  const commissionService = dependencies.commissionService ?? createCommissionService({ repository: commissionRepository });

  // 3. Auth
  const authRepository = dependencies.authRepository ?? (
    dependencies.supabaseConfig
      ? new SupabaseAuthRepository({
          supabaseUrl: dependencies.supabaseConfig.url,
          supabaseServiceRoleKey: dependencies.supabaseConfig.serviceRoleKey,
          tablePrefix
        })
      : new InMemoryAuthRepository()
  );
  const authService = dependencies.authService ?? createAuthService({ 
    repository: authRepository,
    jwtSecret: dependencies.authConfig?.jwtSecret ?? "test-only-jwt-secret-at-least-32-bytes",
    jwtExpiresIn: dependencies.authConfig?.jwtExpiresIn ?? "1h",
    passwordHashCost: dependencies.authConfig?.passwordHashCost ?? 4,
    emailVerificationSender: dependencies.emailVerificationSender
  });

  // 4. Account & Admin
  const accountService = dependencies.accountService ?? createAccountService({ repository: authRepository });
  const adminService = dependencies.adminService ?? createAdminService({ repository: authRepository });

  // 5. Catalog & Products
  const catalogRepository = dependencies.catalogRepository ?? (
    dependencies.supabaseConfig
      ? new SupabaseCatalogRepository({
          supabaseUrl: dependencies.supabaseConfig.url,
          supabaseServiceRoleKey: dependencies.supabaseConfig.serviceRoleKey,
          tablePrefix
        })
      : new InMemoryCatalogRepository()
  );
  const productUploadService = createProductUploadService(catalogRepository);

  // Dashboard Content Repository
  const dashboardContentRepository = dependencies.supabaseConfig
    ? new SupabaseDashboardContentRepository({
        supabaseUrl: dependencies.supabaseConfig.url,
        supabaseServiceRoleKey: dependencies.supabaseConfig.serviceRoleKey,
        tablePrefix
      })
    : null;

  const priceListSyncService = createDigiflazzPriceListSyncService({
    repository: catalogRepository,
    digiflazzConfig: dependencies.digiflazzConfig ? {
      username: dependencies.digiflazzConfig.username,
      apiKey: dependencies.digiflazzConfig.apiKey,
      apiBaseUrl: dependencies.digiflazzConfig.apiBaseUrl
    } : { 
      username: null, apiKey: null, apiBaseUrl: "" 
    },
    fetchImpl: dependencies.fetchImpl
  });

  const catalogService = dependencies.catalogService ?? createCatalogService({ 
    repository: catalogRepository,
    priceListSyncService
  });

  // 6. Orders
  const orderRepository = dependencies.orderRepository ?? (
    dependencies.supabaseConfig
      ? new SupabaseOrderRepository({
          supabaseUrl: dependencies.supabaseConfig.url,
          supabaseServiceRoleKey: dependencies.supabaseConfig.serviceRoleKey,
          tablePrefix
        })
      : new InMemoryOrderRepository()
  );
  const orderService = dependencies.orderService ?? createOrderService({ 
    repository: orderRepository,
    catalogService,
    commissionService
  });

  // 7. Payments
  const paymentRepository = dependencies.paymentRepository ?? (
    dependencies.supabaseConfig
      ? new SupabasePaymentRepository({
          supabaseUrl: dependencies.supabaseConfig.url,
          supabaseServiceRoleKey: dependencies.supabaseConfig.serviceRoleKey,
          tablePrefix
        })
      : new InMemoryPaymentRepository(orderRepository)
  );
  const paymentService = dependencies.paymentService ?? createPaymentService({
    paymentRepository,
    orderService,
    commissionService,
    midtransConfig: dependencies.midtransConfig ?? { 
      clientKey: "", serverKey: "", apiBaseUrl: "", merchantId: "" 
    },
    providerAuditRepository,
    fetchImpl: dependencies.fetchImpl
  });

  // 8. Fulfillments
  const fulfillmentRepository = dependencies.fulfillmentRepository ?? (
    dependencies.supabaseConfig
      ? new SupabaseFulfillmentRepository({
          supabaseUrl: dependencies.supabaseConfig.url,
          supabaseServiceRoleKey: dependencies.supabaseConfig.serviceRoleKey,
          tablePrefix
        })
      : new InMemoryFulfillmentRepository(orderRepository)
  );
  const fulfillmentService = dependencies.fulfillmentService ?? createFulfillmentService({
    fulfillmentRepository,
    orderService,
    commissionService,
    digiflazzConfig: dependencies.digiflazzConfig ?? { 
      username: null, apiKey: null, apiBaseUrl: "", webhookSecret: null, nodeEnv: "development" 
    },
    providerAuditRepository,
    fetchImpl: dependencies.fetchImpl
  });

  // 9. Postpaid
  const postpaidRepository = dependencies.postpaidRepository ?? (
    dependencies.supabaseConfig
      ? new SupabasePostpaidRepository({
          supabaseUrl: dependencies.supabaseConfig.url,
          supabaseServiceRoleKey: dependencies.supabaseConfig.serviceRoleKey,
          tablePrefix
        })
      : new InMemoryPostpaidRepository()
  );
  const postpaidService = dependencies.postpaidService ?? createPostpaidService({
    repository: postpaidRepository,
    digiflazzConfig: dependencies.digiflazzConfig ?? { 
      username: null, apiKey: null, apiBaseUrl: "", webhookSecret: null, nodeEnv: "development" 
    },
    fetchImpl: dependencies.fetchImpl
  });

  // 10. Dashboard
  const dashboardService = dependencies.dashboardService ?? createDashboardService({
    orderRepository,
    paymentRepository,
    fulfillmentRepository
  });

  // 11. Invoice Status
  const invoiceStatusService = createInvoiceStatusService({
    orderRepository,
    paymentRepository,
    fulfillmentRepository
  });

  const authenticationMiddleware = createAuthenticationMiddleware(authService);
  const adminOnlyMiddleware = requireRoles(["admin"]);

  app.use(express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    }
  }));

  const apiPaths = ["", "/ppob-api"];

  for (const path of apiPaths) {
    const fullPath = (p: string) => path + p;

    app.use(fullPath("/api/auth"), createAuthRouter({ authService }));
    app.use(fullPath("/api/account"), authenticationMiddleware, createAccountRouter({ accountService }));
    app.use(fullPath("/api/account/transactions"), authenticationMiddleware, createMemberTransactionsRouter({ dashboardService }));
    app.use(fullPath("/api/account/audit"), authenticationMiddleware, createProviderAuditRouter({ repository: providerAuditRepository }));
    app.use(fullPath("/api/account/commission"), authenticationMiddleware, createCommissionRouter({ commissionService, repository: commissionRepository }));
    
    app.use(fullPath("/api/admin"), authenticationMiddleware, adminOnlyMiddleware, createAdminRouter({ adminService, productUploadService }));
    app.use(fullPath("/api/admin/monitoring"), authenticationMiddleware, adminOnlyMiddleware, createAdminMonitoringRouter({ dashboardService }));
    app.use(fullPath("/api/admin/catalog"), authenticationMiddleware, adminOnlyMiddleware, createCatalogAdminRouter({ catalogService }));
    app.use(fullPath("/api/admin/audit"), authenticationMiddleware, adminOnlyMiddleware, createAdminAuditRouter({ repository: providerAuditRepository }));
    app.use(fullPath("/api/admin/commission"), authenticationMiddleware, adminOnlyMiddleware, createAdminCommissionRouter({ repository: commissionRepository }));
    app.use(fullPath("/api/admin/digiflazz/operations"), authenticationMiddleware, adminOnlyMiddleware, createAdminDigiflazzOperationsRouter({ 
      catalogRepository, 
      paymentRepository, 
      digiflazzConfig: dependencies.digiflazzConfig ? {
        username: dependencies.digiflazzConfig.username,
        apiKey: dependencies.digiflazzConfig.apiKey,
        apiBaseUrl: dependencies.digiflazzConfig.apiBaseUrl
      } : { 
        username: null, apiKey: null, apiBaseUrl: "" 
      }, 
      fetchImpl: dependencies.fetchImpl 
    }));

    app.use(fullPath("/api/catalog"), createCatalogRouter({ catalogService, authService }));
    if (dashboardContentRepository) {
      app.use(fullPath("/api/dashboard"), createDashboardContentRouter({ 
        repository: dashboardContentRepository, 
        authService 
      }));
    }
    app.use(fullPath("/api/orders"), createOrdersRouter({ orderService, authService }));
    app.use(fullPath("/api/payments"), createPaymentRouter({ 
      paymentService
    }));
    app.use(fullPath("/api/fulfillments"), createFulfillmentRouter({ 
      fulfillmentService,
      digiflazzWebhookSecret: dependencies.digiflazzConfig?.webhookSecret ?? null
    }));
    app.use(fullPath("/api/digiflazz"), authenticationMiddleware, createPostpaidRouter({ postpaidService }));
    app.use(fullPath("/api/invoices"), createInvoiceStatusRouter({ invoiceStatusService }));

    app.get(fullPath("/health"), (_req, res) => {
      res.json({ status: "ok" });
    });
  }

  return app;
}
