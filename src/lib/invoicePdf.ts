import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateTime, formatMoney, formatShortDate } from "@/lib/format";

export type InvoicePdfSessionRow = {
  startedAt: string;
  endedAt: string;
  description: string;
  hours: number;
  lineTotal: number;
};

type BuildArgs = {
  projectName: string;
  clientName: string | null;
  clientEmail: string | null;
  billingAddress: string | null;
  invoiceNumber: number;
  currency: string;
  rate: number;
  rows: InvoicePdfSessionRow[];
  total: number;
};

export function buildInvoicePdfDoc(args: BuildArgs): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let y = margin;

  doc.setFontSize(18);
  doc.text("Invoice", margin, y);
  y += 28;

  doc.setFontSize(11);
  doc.text(`Invoice #${args.invoiceNumber}`, margin, y);
  y += 18;
  doc.text(`Date: ${formatShortDate(new Date().toISOString())}`, margin, y);
  y += 28;

  doc.setFont("helvetica", "bold");
  doc.text("Bill to", margin, y);
  doc.setFont("helvetica", "normal");
  y += 16;
  const billLines = [
    args.clientName || args.projectName,
    args.clientEmail,
    args.billingAddress,
  ].filter(Boolean) as string[];
  if (!billLines.length) billLines.push(args.projectName);
  for (const line of billLines) {
    doc.text(line, margin, y);
    y += 14;
  }
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Project", margin, y);
  doc.setFont("helvetica", "normal");
  y += 16;
  doc.text(args.projectName, margin, y);
  y += 22;

  const tableBody = args.rows.map((r) => [
    formatDateTime(r.startedAt),
    formatDateTime(r.endedAt),
    r.description || "—",
    r.hours.toFixed(2),
    formatMoney(r.lineTotal, args.currency),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Start", "End", "Description", "Hours", "Amount"]],
    body: tableBody,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [37, 99, 235] },
    columnStyles: {
      3: { halign: "right" },
      4: { halign: "right" },
    },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 120;
  let totalY = finalY + 24;
  doc.setFontSize(11);
  doc.text(`Rate: ${formatMoney(args.rate, args.currency)} / hr`, margin, totalY);
  totalY += 18;
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${formatMoney(args.total, args.currency)}`, margin, totalY);

  return doc;
}

export function downloadInvoicePdf(args: BuildArgs, fileName: string) {
  const doc = buildInvoicePdfDoc(args);
  doc.save(fileName);
}
