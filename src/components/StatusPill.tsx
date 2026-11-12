import type { Invoice } from "@/lib/types";

export default function StatusPill({ invoice }: { invoice: Pick<Invoice, "status" | "is_overdue"> }) {
  if (invoice.is_overdue) return <span className="pill pill-dot pill-overdue">Overdue</span>;
  return <span className={`pill pill-dot capitalize pill-${invoice.status}`}>{invoice.status}</span>;
}
