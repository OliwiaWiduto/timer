export const STUDIO_VOODOO_ISSUER = {
  name: "Studio Voodoo",
  lines: ["Osiedle Młodych 1/24", "Ostróda 14-100, Poland", "(+44) 79 3653 6548"],
} as const;

export const DEFAULT_INVOICE_PAYABLE_TO = "Studio Voodoo\nSWIFT: ALBPPLPW\nIBAN: ";

export function defaultDueDateIso(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + 14);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
