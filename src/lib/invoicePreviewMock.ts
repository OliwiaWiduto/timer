import type { InvoicePdfBuildArgs } from "@/lib/invoicePdf";
import { DEFAULT_INVOICE_PAYABLE_TO } from "@/lib/invoiceDefaults";

/** Sample data for `/invoice-preview` (dev only). */
export const INVOICE_PREVIEW_MOCK: InvoicePdfBuildArgs = {
  projectName: "Love My Lounger",
  submittedAt: new Date("2026-06-03T12:00:00.000Z").toISOString(),
  dueDate: "2026-06-17",
  invoiceNumber: 2,
  invoiceFor: {
    company: "Escape to the Sun",
    street: "59-61 Charlotte Street",
    city: "Birmingham",
    country: "England",
    postcode: "B3 1PX",
  },
  payableTo: DEFAULT_INVOICE_PAYABLE_TO,
  currency: "GBP",
  rate: 100,
  rows: [
    {
      startedAt: "2026-05-27T11:00:00.000Z",
      endedAt: "2026-05-27T13:05:00.000Z",
      description: "Homepage layout and component library",
      hours: 2.08,
      lineTotal: 208,
    },
    {
      startedAt: "2026-05-28T09:30:00.000Z",
      endedAt: "2026-05-28T12:00:00.000Z",
      description: "Timer app — invoice flow and PDF styling",
      hours: 2.5,
      lineTotal: 250,
    },
    {
      startedAt: "2026-05-28T14:15:00.000Z",
      endedAt: "2026-05-28T15:00:00.000Z",
      description: "Bug fixes and QA",
      hours: 0.75,
      lineTotal: 75,
    },
  ],
  total: 533,
};
