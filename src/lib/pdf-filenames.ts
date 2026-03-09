
type PdfDocumentType = "devis" | "facture" | "bon_commande" | "recu";

export function buildPdfFileName(options: {
  type: PdfDocumentType;
  reference: string;       // e.g. DEVIS-2026-0001, FAC-2026-0003, LENS-80-6025
  date?: Date;             // optional, if needed
}): string {
  const { type, reference } = options;

  const base =
    type === "devis"         ? "DEVIS"   :
    type === "facture"       ? "FACTURE" :
    type === "bon_commande"  ? "BC"      :
    type === "recu"          ? "RECU"    :
                               "DOC";

  // Sanitize reference for filesystem (no spaces, slashes, etc.)
  const safeRef = reference
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9._-]/g, "");

  return `${base}-${safeRef}.pdf`;
}
