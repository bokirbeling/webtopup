import { Router } from "express";

import { InvoiceNotFoundError, type InvoiceStatusService } from "./invoice-status.service";
import { type InvoiceStatusLookup, type InvoiceStatusResponse } from "./invoice-status.types";

type InvoiceStatusRouterDependencies = Readonly<{
  invoiceStatusService: InvoiceStatusService;
}>;

function serializeInvoiceStatus(lookup: InvoiceStatusLookup): InvoiceStatusResponse {
  return {
    invoice_code: lookup.order.orderNumber,
    order_id: lookup.order.id,
    status: lookup.order.status,
    product_code: lookup.order.productCode,
    provider: lookup.order.provider,
    amount_minor: lookup.order.amountMinor,
    currency: lookup.order.currency,
    payment:
      lookup.payment === null
        ? null
        : {
            payment_id: lookup.payment.id,
            provider: lookup.payment.provider,
            status: lookup.payment.status,
            paid_at: lookup.payment.paidAt?.toISOString() ?? null,
            updated_at: lookup.payment.updatedAt.toISOString()
          },
    fulfillment:
      lookup.fulfillment === null
        ? null
        : {
            fulfillment_id: lookup.fulfillment.id,
            provider: lookup.fulfillment.provider,
            status: lookup.fulfillment.status,
            serial_number: lookup.fulfillment.serialNumber,
            processed_at: lookup.fulfillment.processedAt?.toISOString() ?? null,
            updated_at: lookup.fulfillment.updatedAt.toISOString()
          },
    timeline: lookup.timeline.map((entry) => ({
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      note: entry.note,
      createdBy: entry.createdBy,
      createdAt: entry.createdAt.toISOString()
    }))
  };
}

export function createInvoiceStatusRouter(dependencies: InvoiceStatusRouterDependencies) {
  const invoiceStatusRouter = Router();

  invoiceStatusRouter.get("/:invoiceCode/status", async (request, response) => {
    const invoiceCode = request.params.invoiceCode?.trim();

    if (!invoiceCode) {
      response.status(400).json({
        error: {
          code: "INVALID_INVOICE_CODE",
          message: "Kode invoice tidak valid."
        }
      });

      return;
    }

    try {
      const lookup = await dependencies.invoiceStatusService.getInvoiceStatus(invoiceCode);
      response.status(200).json(serializeInvoiceStatus(lookup));
    } catch (error) {
      console.error("[InvoiceStatus] Error looking up invoice status:", error);
      if (error instanceof InvoiceNotFoundError) {
        response.status(404).json({
          error: {
            code: "INVOICE_NOT_FOUND",
            message: "Invoice tidak ditemukan"
          }
        });

        return;
      }

      response.status(500).json({
        error: {
          code: "INVOICE_STATUS_LOOKUP_FAILED",
          message: "Gagal memuat status invoice."
        }
      });
    }
  });

  return invoiceStatusRouter;
}
