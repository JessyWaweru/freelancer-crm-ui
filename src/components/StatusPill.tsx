import type { Invoice } from "@/lib/types";

export default function StatusPill({ invoice }: { invoice: Pick<Invoice, "status" | "is_overdue"> & Partial<Pick<Invoice, "amount_paid">> }) {
  const part = invoice.status === "sent" && Number(invoice.amount_paid ?? 0) > 0;
  if (invoice.is_overdue) return <span className="pill pill-dot pill-overdue">{part ? "Overdue · part paid" : "Overdue"}</span>;
  if (part) return <span className="pill pill-dot pill-partial">Part paid</span>;
  return <span className={`pill pill-dot capitalize pill-${invoice.status}`}>{invoice.status}</span>;
}
