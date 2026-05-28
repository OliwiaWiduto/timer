import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { buildInvoicePdfDoc } from "@/lib/invoicePdf";
import { INVOICE_PREVIEW_MOCK } from "@/lib/invoicePreviewMock";

export function InvoicePreviewPage() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const doc = buildInvoicePdfDoc(INVOICE_PREVIEW_MOCK);
    const url = String(doc.output("bloburl"));
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [refreshKey]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#1a1a1a" }}>
      <div
        style={{
          flex: "0 0 auto",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          color: "#fff",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        <Link to="/" style={{ color: "#ff5449", textDecoration: "none", fontWeight: 600 }}>
          ← Timer
        </Link>
        <span style={{ opacity: 0.7 }}>|</span>
        <strong>Invoice PDF preview</strong>
        <span style={{ opacity: 0.65, flex: 1 }}>
          Edit <code style={{ fontSize: 12 }}>src/lib/invoicePdf.ts</code>, then refresh
        </span>
        <button
          type="button"
          onClick={() => setRefreshKey((k) => k + 1)}
          style={{
            appearance: "none",
            border: "none",
            borderRadius: 999,
            padding: "8px 14px",
            background: "#ff5449",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Refresh preview
        </button>
        {pdfUrl ? (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noreferrer"
            style={{ color: "rgba(255,255,255,0.85)", fontSize: 12 }}
          >
            Open in tab
          </a>
        ) : null}
      </div>

      {pdfUrl ? (
        <iframe
          title="Invoice PDF preview"
          src={pdfUrl}
          style={{ flex: 1, width: "100%", border: "none", background: "#525252" }}
        />
      ) : (
        <div style={{ flex: 1, display: "grid", placeItems: "center", color: "#fff" }}>Generating preview…</div>
      )}
    </div>
  );
}
