import { Router } from "express";

import { type CatalogRepository } from "../catalog/catalog.repository";
import { createDigiflazzBuyerClient } from "../digiflazz/buyer-client";
import { type PaymentRepository } from "../payment/payment.repository";

type DigiflazzOperationsRouterDependencies = Readonly<{
  catalogRepository: CatalogRepository;
  paymentRepository: PaymentRepository;
  digiflazzConfig: Readonly<{
    username: string | null;
    apiKey: string | null;
    apiBaseUrl: string;
  }>;
  fetchImpl?: typeof fetch;
}>;

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function optionalNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function createAdminDigiflazzOperationsRouter(dependencies: DigiflazzOperationsRouterDependencies) {
  const router = Router();
  const buyerClient = createDigiflazzBuyerClient(dependencies.digiflazzConfig, dependencies.fetchImpl);

  router.get("/digiflazz/operations", async (_request, response, next) => {
    try {
      const [balanceResponse, products, webhooks] = await Promise.all([
        buyerClient.balance(),
        dependencies.catalogRepository.listProducts(),
        dependencies.paymentRepository.listRecentWebhookEvents(25)
      ]);
      const balanceData = toRecord(balanceResponse.data);
      const syncedAtValues = products
        .map((product) => optionalString(product.metadata.synced_at))
        .filter((value): value is string => value !== null)
        .sort();

      response.status(200).json({
        balance: {
          deposit: optionalNumber(balanceData.deposit),
          rc: balanceResponse.rc,
          message: balanceResponse.message
        },
        catalog: {
          product_count: products.length,
          active_count: products.filter((product) => product.isActive).length,
          inactive_count: products.filter((product) => !product.isActive).length,
          last_synced_at: syncedAtValues.at(-1) ?? null
        },
        webhooks: {
          recent_count: webhooks.length,
          failed_count: webhooks.filter((event) => event.processingState === "failed").length
        }
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
