import { Router } from "express";
import { type AuthenticatedRequest } from "../auth/auth.middleware";
import { type ProviderAuditRepository, type ProviderEventRecord } from "./provider-audit.types";

export function createProviderAuditRouter(options: { repository: ProviderAuditRepository }) {
  const router = Router();

  router.get("/events", async (req, res) => {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.authUser.role === "admin" ? undefined : authReq.authUser.id;
    const limit = parseInt(req.query.limit as string, 10) || 50;

    const events = await options.repository.listProviderEvents({ userId, limit });
    res.json({ events: events.map(toEventResponse) });
  });

  return router;
}

export function createAdminAuditRouter(options: { repository: ProviderAuditRepository }) {
  const router = Router();

  router.get("/ledger", async (req, res) => {
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const entries = await options.repository.listLedgerEntries({ limit });
    res.json({ entries: entries.map(toLedgerResponse) });
  });

  return router;
}

function toEventResponse(event: ProviderEventRecord) {
  return {
    id: event.id,
    order_id: event.orderId,
    provider: event.provider,
    event_type: event.eventType,
    provider_status: event.providerStatus,
    provider_code: event.providerCode,
    provider_message: event.providerMessage,
    amount_minor: event.amountMinor,
    sku_digiflazz: event.skuDigiflazz,
    customer_no_masked: event.customerNoMasked,
    serial_number: event.serialNumber,
    safe_summary: event.safeSummary,
    created_at: event.createdAt.toISOString()
  };
}

function toLedgerResponse(entry: any) {
  return {
    id: entry.id,
    provider: entry.provider,
    source: entry.source,
    amount_minor: entry.amountMinor,
    balance_after_minor: entry.balanceAfterMinor,
    note: entry.note,
    actor_id: entry.actorId,
    order_id: entry.orderId,
    created_at: entry.createdAt.toISOString()
  };
}
