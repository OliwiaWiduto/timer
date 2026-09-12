import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconChevronLeft } from "@/components/icons";
import { defaultDueDateIso } from "@/lib/invoiceDefaults";
import {
  payableToFromProject,
  recipientFromProject,
  type InvoiceFormValues,
  type Project,
} from "@/lib/invoiceForm";

type Props = {
  open: boolean;
  project: Project | null;
  nextInvoiceNumber: number;
  onClose: () => void;
  onConfirm: (values: InvoiceFormValues) => Promise<void>;
};

export function CreateInvoiceModal({ open, project, nextInvoiceNumber, onClose, onConfirm }: Props) {
  const [invoiceNumber, setInvoiceNumber] = useState(String(nextInvoiceNumber));
  const [company, setCompany] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [postcode, setPostcode] = useState("");
  const [payableTo, setPayableTo] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDateIso);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !project) return;
    const recipient = recipientFromProject(project);
    setInvoiceNumber(String(nextInvoiceNumber));
    setCompany(recipient.company);
    setStreet(recipient.street);
    setCity(recipient.city);
    setCountry(recipient.country);
    setPostcode(recipient.postcode);
    setPayableTo(payableToFromProject(project));
    setDueDate(defaultDueDateIso());
    setError(null);
    setBusy(false);
  }, [open, project?.id, nextInvoiceNumber]);

  if (!open || !project) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(invoiceNumber);
    if (!Number.isInteger(num) || num < 1) {
      setError("Enter a valid invoice number.");
      return;
    }
    if (!dueDate) {
      setError("Choose a due date.");
      return;
    }

    const values: InvoiceFormValues = {
      invoiceNumber: num,
      recipient: { company, street, city, country, postcode },
      payableTo,
      dueDate,
    };

    setBusy(true);
    setError(null);
    try {
      await onConfirm(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create invoice.");
      setBusy(false);
    }
  }

  return createPortal(
    <div className="sv-overlay sv-overlay--modal" role="dialog" aria-modal="true" aria-label="Invoice details">
      <form className="sv-modal" onSubmit={submit}>
        <div className="sv-header">
          <img className="sv-header__icon" src="/logo.png" alt="Studio Voodoo" />
          <div className="sv-header__title">Studio Voodoo Timer</div>
        </div>

        <div className="sv-topbar">
          <button type="button" className="sv-icon-btn sv-icon-btn--ghost" onClick={onClose} aria-label="Back" disabled={busy}>
            <IconChevronLeft />
          </button>
          <div className="sv-topbar__title">Invoice details</div>
          <div style={{ width: 24 }} aria-hidden="true" />
        </div>

        <div className="sv-form">
          <p className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, margin: 0 }}>
            Project: <strong style={{ color: "rgba(255,255,255,0.95)" }}>{project.name}</strong>
          </p>

          <label style={{ display: "grid", gap: 8 }}>
            <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
              Invoice number
            </span>
            <input
              inputMode="numeric"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              required
            />
          </label>

          <div className="sv-label" style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 600, marginTop: 4 }}>
            Invoice for
          </div>

          <label style={{ display: "grid", gap: 8 }}>
            <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
              Company name
            </span>
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Client company" />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
              Street
            </span>
            <input value={street} onChange={(e) => setStreet(e.target.value)} />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
              City
            </span>
            <input value={city} onChange={(e) => setCity(e.target.value)} />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
              Country
            </span>
            <input value={country} onChange={(e) => setCountry(e.target.value)} />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
              Postcode
            </span>
            <input value={postcode} onChange={(e) => setPostcode(e.target.value)} />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
              Payable to
            </span>
            <textarea
              rows={4}
              value={payableTo}
              onChange={(e) => setPayableTo(e.target.value)}
              style={{ resize: "vertical", minHeight: 88 }}
            />
          </label>

          <label style={{ display: "grid", gap: 8 }}>
            <span className="sv-label sv-label--muted" style={{ fontFamily: "Inter", fontSize: 12, letterSpacing: 0.4 }}>
              Due date
            </span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </label>

          {error ? (
            <p style={{ color: "rgba(255,255,255,0.85)", margin: 0 }} role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="sv-actions">
          <button type="button" className="sv-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="sv-btn sv-btn--primary" disabled={busy}>
            {busy ? "Creating…" : "Create invoice + download PDF"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
