import type { Database } from "@/types/database";
import { DEFAULT_INVOICE_PAYABLE_TO } from "@/lib/invoiceDefaults";

export type Project = Database["public"]["Tables"]["projects"]["Row"];

export type InvoiceRecipient = {
  company: string;
  street: string;
  city: string;
  country: string;
  postcode: string;
};

export type InvoiceFormValues = {
  invoiceNumber: number;
  recipient: InvoiceRecipient;
  payableTo: string;
  dueDate: string;
};

export function recipientFromProject(project: Project): InvoiceRecipient {
  return {
    company: project.invoice_to_company?.trim() || project.client_name?.trim() || "",
    street: project.invoice_to_street?.trim() || "",
    city: project.invoice_to_city?.trim() || "",
    country: project.invoice_to_country?.trim() || "",
    postcode: project.invoice_to_postcode?.trim() || "",
  };
}

export function payableToFromProject(project: Project): string {
  return project.invoice_payable_to?.trim() || DEFAULT_INVOICE_PAYABLE_TO;
}

export function recipientToLines(recipient: InvoiceRecipient): string[] {
  return [
    recipient.company,
    recipient.street,
    recipient.city,
    recipient.country,
    recipient.postcode,
  ].filter(Boolean);
}

export function payableToLines(payableTo: string): string[] {
  return payableTo
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export function projectUpdateFromForm(values: InvoiceFormValues) {
  return {
    invoice_to_company: values.recipient.company.trim() || null,
    invoice_to_street: values.recipient.street.trim() || null,
    invoice_to_city: values.recipient.city.trim() || null,
    invoice_to_country: values.recipient.country.trim() || null,
    invoice_to_postcode: values.recipient.postcode.trim() || null,
    invoice_payable_to: values.payableTo.trim() || null,
  };
}
