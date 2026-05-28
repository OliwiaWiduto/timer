import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMoney, formatShortDate } from "@/lib/format";

export type InvoicePdfSessionRow = {
  startedAt: string;
  endedAt: string;
  description: string;
  hours: number;
  lineTotal: number;
};

export type InvoicePdfBuildArgs = {
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

export function buildInvoicePdfDoc(args: InvoicePdfBuildArgs): jsPDF {
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
    r.description || "—",
    r.hours.toFixed(2),
    formatMoney(r.lineTotal, args.currency),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Description", "Hours", "Amount"]],
    body: tableBody,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [64, 64, 64], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 56 },
      2: { halign: "right", cellWidth: 72 },
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

export function downloadInvoicePdf(args: InvoicePdfBuildArgs, fileName: string) {
  const doc = buildInvoicePdfDoc(args);
  doc.save(fileName);
}
