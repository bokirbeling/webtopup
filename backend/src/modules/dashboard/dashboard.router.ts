import { Router } from "express";

import { type AuthenticatedRequest } from "../auth/auth.middleware";
import { type FulfillmentRecord } from "../fulfillment/fulfillment.types";
import { type PaymentRecord, type WebhookEventRecord } from "../payment/payment.types";
import { type DashboardService, type TransactionHistoryLookup } from "./dashboard.types";

type DashboardRouterDependencies = Readonly<{
  dashboardService: DashboardService;
}>;

function serializePayment(payment: PaymentRecord | null) {
  return payment === null
    ? null
    : {
        payment_id: payment.id,
        provider: payment.provider,
        status: payment.status,
        paid_at: payment.paidAt?.toISOString() ?? null,
        updated_at: payment.updatedAt.toISOString()
      };
}

function serializeFulfillment(fulfillment: FulfillmentRecord | null) {
  return fulfillment === null
    ? null
    : {
        fulfillment_id: fulfillment.id,
        provider: fulfillment.provider,
        status: fulfillment.status,
        serial_number: fulfillment.serialNumber,
        processed_at: fulfillment.processedAt?.toISOString() ?? null,
        updated_at: fulfillment.updatedAt.toISOString()
      };
}

function serializeTransaction(item: TransactionHistoryLookup) {
  return {
    order_id: item.order.id,
    invoice_code: item.order.orderNumber,
    user_id: item.order.userId,
    customer_ref: item.order.customerRef,
    status: item.order.status,
    product_code: item.order.productCode,
    provider: item.order.provider,
    amount_minor: item.order.amountMinor,
    currency: item.order.currency,
    created_at: item.order.createdAt.toISOString(),
    updated_at: item.order.updatedAt.toISOString(),
    payment: serializePayment(item.payment),
    fulfillment: serializeFulfillment(item.fulfillment)
  };
}

function serializeWebhook(event: WebhookEventRecord) {
  return {
    webhook_id: event.id,
    provider: event.provider,
    event_key: event.eventKey,
    event_type: event.eventType,
    order_id: event.orderId,
    payment_id: event.paymentId,
    processing_state: event.processingState,
    received_at: event.receivedAt.toISOString(),
    processed_at: event.processedAt?.toISOString() ?? null,
    error_message: event.errorMessage
  };
}

export function createMemberTransactionsRouter(dependencies: DashboardRouterDependencies) {
  const router = Router();

  router.get("/", async (request, response) => {
    const authUser = (request as unknown as AuthenticatedRequest).authUser;
    const transactions = await dependencies.dashboardService.listMemberTransactions(authUser.id);

    response.status(200).json({ transactions: transactions.map(serializeTransaction) });
  });

  return router;
}

export function createAdminMonitoringRouter(dependencies: DashboardRouterDependencies) {
  const router = Router();

  router.get("/", async (_request, response) => {
    const monitoring = await dependencies.dashboardService.getAdminMonitoring();

    response.status(200).json({
      transactions: monitoring.transactions.map(serializeTransaction),
      webhooks: monitoring.webhooks.map(serializeWebhook),
      summary: {
        transaction_count: monitoring.transactions.length,
        webhook_count: monitoring.webhooks.length,
        failed_webhook_count: monitoring.webhooks.filter((event) => event.processingState === "failed").length
      }
    });
  });

  return router;
}
