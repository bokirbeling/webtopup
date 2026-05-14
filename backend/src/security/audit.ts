export type AuditEvent = Readonly<{
  type: "rate_limit_exceeded" | "webhook_signature_invalid" | "fulfillment_security_rejection";
  provider?: "midtrans" | "digiflazz";
  route: string;
  method: string;
  statusCode: number;
  reason: string;
  orderId?: string | null;
  eventKey?: string | null;
  occurredAt: string;
}>;

export interface AuditLogger {
  record(event: AuditEvent): void;
}

export class InMemoryAuditLogger implements AuditLogger {
  private readonly events: AuditEvent[] = [];

  record(event: AuditEvent): void {
    this.events.push(event);
  }

  getEvents(): AuditEvent[] {
    return [...this.events];
  }
}

export const noopAuditLogger: AuditLogger = {
  record: () => {}
};
