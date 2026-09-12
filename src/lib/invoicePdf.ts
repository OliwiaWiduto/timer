import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { formatMoney } from "@/lib/format";
import { PDF_FONT, registerPdfFonts } from "@/lib/jspdfFonts";
import { STUDIO_VOODOO_ISSUER } from "@/lib/invoiceDefaults";
import { payableToLines, recipientToLines, type InvoiceRecipient } from "@/lib/invoiceForm";

export type InvoicePdfSessionRow = {
  startedAt: string;
  endedAt: string;
  description: string;
  hours: number;
  lineTotal: number;
};

export type InvoicePdfBuildArgs = {
  projectName: string;
  submittedAt: string;
  dueDate: string;
  invoiceNumber: number;
  invoiceFor: InvoiceRecipient;
  payableTo: string;
  currency: string;
  rate: number;
  rows: InvoicePdfSessionRow[];
  total: number;
};

const PDF_COLORS = {
  brand: [108, 99, 255] as [number, number, number],
  title: [51, 62, 151] as [number, number, number],
  submitted: [228, 168, 0] as [number, number, number],
  label: [55, 55, 55] as [number, number, number],
  value: [120, 120, 120] as [number, number, number],
};

function formatSubmittedOn(iso: string) {
  return format(new Date(iso), "dd/MM/yyyy");
}

function formatDueOn(isoDate: string) {
  return format(new Date(`${isoDate}T00:00:00`), "d MMMM yyyy");
}

function drawBlock(
  doc: jsPDF,
  x: number,
  startY: number,
  colWidth: number,
  blocks: { label: string; lines: string[] }[],
) {
  let y = startY;
  for (const block of blocks) {
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_COLORS.label);
    doc.text(block.label, x, y, { maxWidth: colWidth });
    y += 14;
    doc.setFont(PDF_FONT, "normal");
    doc.setTextColor(...PDF_COLORS.value);
    for (const line of block.lines) {
      doc.text(line, x, y, { maxWidth: colWidth });
      y += 13;
    }
    y += 6;
  }
  return y;
}

export async function buildInvoicePdfDoc(args: InvoicePdfBuildArgs): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  await registerPdfFonts(doc);

  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  const colWidth = contentWidth / 3;
  let y = margin;

  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(16);
  doc.setTextColor(...PDF_COLORS.brand);
  doc.text(STUDIO_VOODOO_ISSUER.name, margin, y);
  y += 20;

  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_COLORS.value);
  for (const line of STUDIO_VOODOO_ISSUER.lines) {
    doc.text(line, margin, y);
    y += 13;
  }
  y += 18;

  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(32);
  doc.setTextColor(...PDF_COLORS.title);
  doc.text("Invoice", margin, y);
  y += 36;

  doc.setFontSize(12);
  doc.setTextColor(...PDF_COLORS.submitted);
  doc.text(`Submitted on ${formatSubmittedOn(args.submittedAt)}`, margin, y);
  y += 32;

  const col1 = margin;
  const col2 = margin + colWidth;
  const col3 = margin + colWidth * 2;

  const invoiceForLines = recipientToLines(args.invoiceFor);
  const payableLines = payableToLines(args.payableTo);

  const end1 = drawBlock(doc, col1, y, colWidth, [
    { label: "Project", lines: [args.projectName] },
    { label: "Invoice for", lines: invoiceForLines.length ? invoiceForLines : ["—"] },
  ]);
  const end2 = drawBlock(doc, col2, y, colWidth, [
    { label: "Invoice #", lines: [String(args.invoiceNumber)] },
    { label: "Payable to", lines: payableLines.length ? payableLines : ["—"] },
  ]);
  const end3 = drawBlock(doc, col3, y, colWidth, [
    { label: "Due date", lines: [formatDueOn(args.dueDate)] },
  ]);

  y = Math.max(end1, end2, end3) + 16;

  const tableBody = args.rows.map((r) => [
    r.description || "—",
    r.hours.toFixed(2),
    formatMoney(r.lineTotal, args.currency),
  ]);

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Description",
        { content: "Hours", styles: { halign: "right" } },
        { content: "Amount", styles: { halign: "right" } },
      ],
    ],
    body: tableBody,
    styles: { font: PDF_FONT, fontSize: 9, cellPadding: 6 },
    headStyles: { font: PDF_FONT, fontStyle: "bold", fillColor: [64, 64, 64], textColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { halign: "right", cellWidth: 56 },
      2: { halign: "right", cellWidth: 72 },
    },
    didParseCell: (data) => {
      if (data.column.index === 1 || data.column.index === 2) {
        data.cell.styles.halign = "right";
      }
    },
  });

  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 120;
  let totalY = finalY + 24;
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.setFont(PDF_FONT, "normal");
  doc.text(`Rate: ${formatMoney(args.rate, args.currency)} / hr`, margin, totalY);
  totalY += 18;
  doc.setFont(PDF_FONT, "bold");
  doc.text(`Total: ${formatMoney(args.total, args.currency)}`, margin, totalY);

  return doc;
}

export async function downloadInvoicePdf(args: InvoicePdfBuildArgs, fileName: string) {
  const doc = await buildInvoicePdfDoc(args);
  doc.save(fileName);
}
