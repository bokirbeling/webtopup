import { randomUUID } from "node:crypto";
import {
  type BalanceLedgerRecord,
  type CreateLedgerEntryInput,
  type CreateProviderEventInput,
  type ProviderAuditRepository,
  type ProviderEventRecord,
  type ProviderName
} from "./provider-audit.types";

export class InMemoryProviderAuditRepository implements ProviderAuditRepository {
  private readonly events: ProviderEventRecord[] = [];
  private readonly ledger: BalanceLedgerRecord[] = [];

  async recordProviderEvent(input: CreateProviderEventInput): Promise<ProviderEventRecord> {
    const event: ProviderEventRecord = {
      ...input,
      id: randomUUID(),
      createdAt: new Date()
    };
    this.events.push(event);
    return event;
  }

  async listProviderEvents(filters: { orderId?: string; userId?: string; limit?: number }): Promise<readonly ProviderEventRecord[]> {
    let results = this.events;
    if (filters.orderId) results = results.filter(e => e.orderId === filters.orderId);
    // Note: in-memory simple filter. Real version joins with orders for userId.
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, filters.limit ?? 50);
  }

  async recordLedgerEntry(input: CreateLedgerEntryInput): Promise<BalanceLedgerRecord> {
    const entry: BalanceLedgerRecord = {
      ...input,
      id: randomUUID(),
      createdAt: new Date()
    };
    this.ledger.push(entry);
    return entry;
  }

  async listLedgerEntries(filters: { provider?: ProviderName; limit?: number }): Promise<readonly BalanceLedgerRecord[]> {
    let results = this.ledger;
    if (filters.provider) results = results.filter(l => l.provider === filters.provider);
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, filters.limit ?? 50);
  }
}

export class SupabaseProviderAuditRepository implements ProviderAuditRepository {
  constructor(
    private readonly supabaseUrl: string,
    private readonly supabaseServiceRoleKey: string,
    private readonly tablePrefix: string = ""
  ) {}

  private tableName(table: string): string {
    return this.tablePrefix + table;
  }

  private get headers() {
    return {
      "apikey": this.supabaseServiceRoleKey,
      "Authorization": `Bearer ${this.supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    };
  }

  async recordProviderEvent(input: CreateProviderEventInput): Promise<ProviderEventRecord> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/${this.tableName("provider_events")}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        order_id: input.orderId,
        payment_id: input.paymentId,
        fulfillment_id: input.fulfillmentId,
        provider: input.provider,
        event_type: input.eventType,
        provider_reference: input.providerReference,
        provider_status: input.providerStatus,
        provider_code: input.providerCode,
        provider_message: input.providerMessage,
        amount_minor: input.amountMinor,
        sku_digiflazz: input.skuDigiflazz,
        customer_no_masked: input.customerNoMasked,
        serial_number: input.serialNumber,
        signature_verified: input.signatureVerified,
        amount_matched: input.amountMatched,
        idempotency_key: input.idempotencyKey,
        raw_payload: input.rawPayload,
        safe_summary: input.safeSummary
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to record provider event: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    return this.mapRowToRecord(data[0]);
  }

  async listProviderEvents(filters: { orderId?: string; userId?: string; limit?: number }): Promise<readonly ProviderEventRecord[]> {
    let url = `${this.supabaseUrl}/rest/v1/${this.tableName("provider_events")}?select=*&order=created_at.desc&limit=${filters.limit ?? 50}`;
    
    if (filters.orderId) url += `&order_id=eq.${encodeURIComponent(filters.orderId)}`;
    
    // Note: userId filtering in REST requires a join or separate query if not in provider_events table.
    // Assuming for now user only sees their order events via orderId filter from route.

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "apikey": this.supabaseServiceRoleKey,
        "Authorization": `Bearer ${this.supabaseServiceRoleKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to list provider events: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map((row: any) => this.mapRowToRecord(row));
  }

  async recordLedgerEntry(input: CreateLedgerEntryInput): Promise<BalanceLedgerRecord> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/${this.tableName("balance_ledgers")}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        provider: input.provider,
        source: input.source,
        amount_minor: input.amountMinor,
        balance_after_minor: input.balanceAfterMinor,
        note: input.note,
        actor_id: input.actorId,
        order_id: input.orderId
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to record ledger entry: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    return this.mapLedgerRowToRecord(data[0]);
  }

  async listLedgerEntries(filters: { provider?: ProviderName; limit?: number }): Promise<readonly BalanceLedgerRecord[]> {
    let url = `${this.supabaseUrl}/rest/v1/${this.tableName("balance_ledgers")}?select=*&order=created_at.desc&limit=${filters.limit ?? 50}`;
    
    if (filters.provider) url += `&provider=eq.${encodeURIComponent(filters.provider)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "apikey": this.supabaseServiceRoleKey,
        "Authorization": `Bearer ${this.supabaseServiceRoleKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to list ledger entries: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map((row: any) => this.mapLedgerRowToRecord(row));
  }

  private mapRowToRecord(row: any): ProviderEventRecord {
    return {
      id: row.id,
      orderId: row.order_id,
      paymentId: row.payment_id,
      fulfillmentId: row.fulfillment_id,
      provider: row.provider,
      eventType: row.event_type,
      providerReference: row.provider_reference,
      providerStatus: row.provider_status,
      providerCode: row.provider_code,
      providerMessage: row.provider_message,
      amountMinor: row.amount_minor,
      skuDigiflazz: row.sku_digiflazz,
      customerNoMasked: row.customer_no_masked,
      serialNumber: row.serial_number,
      signatureVerified: row.signature_verified,
      amountMatched: row.amount_matched,
      idempotencyKey: row.idempotency_key,
      rawPayload: row.raw_payload,
      safeSummary: row.safe_summary,
      createdAt: new Date(row.created_at)
    };
  }

  private mapLedgerRowToRecord(row: any): BalanceLedgerRecord {
    return {
      id: row.id,
      provider: row.provider,
      source: row.source,
      amountMinor: row.amount_minor,
      balanceAfterMinor: row.balance_after_minor,
      note: row.note,
      actorId: row.actor_id,
      orderId: row.order_id,
      createdAt: new Date(row.created_at)
    };
  }
}
