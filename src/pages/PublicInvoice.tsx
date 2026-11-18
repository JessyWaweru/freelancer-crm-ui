import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock, Copy, Download, FileQuestion, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { toast, Toaster } from "sonner";
import api from "@/api";
import InvoiceSheet from "@/components/InvoiceSheet";
import { LogoMark } from "@/components/Logo";
import { date, money, relativeDay } from "@/lib/format";
import { downloadFile, renderPdf } from "@/lib/pdf";
import type { PublicInvoice as PublicInvoiceData } from "@/lib/types";

/** What a client sees when they open the invoice link: no account, works on any phone. */
export default function PublicInvoice() {
  const { token } = useParams();
  const [params] = useSearchParams();
  const [inv, setInv] = useState<PublicInvoiceData | null>(null);
  const [missing, setMissing] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const sheetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // The freelancer opening their own link (same browser, signed in) isn't counted as a client view.
    let ownBrowser = false;
    try { ownBrowser = !!localStorage.getItem("access"); } catch { /* private mode */ }
    const preview = params.get("preview") === "1" || ownBrowser;
    api.get<PublicInvoiceData>(`/public/invoices/${token}/`, { params: preview ? { preview: 1 } : {} })
      .then((r) => {
        setInv(r.data);
        document.title = `Invoice ${r.data.number}${r.data.business.business_name ? ` · ${r.data.business.business_name}` : ""}`;
      })
      .catch(() => setMissing(true));
  }, [token, params]);

  async function download() {
    if (!inv || !sheetRef.current) return;
    setPdfBusy(true);
    try {
      downloadFile(await renderPdf(sheetRef.current, `${inv.number}.pdf`));
    } catch {
      toast.error("Couldn't make the PDF. Use Print → Save as PDF instead.");
    } finally {
      setPdfBusy(false);
    }
  }

  if (missing) {
    return (
      <div className="min-h-dvh bg-cream grid place-items-center p-6 text-center">
        <div className="max-w-sm">
          <span className="mx-auto grid place-items-center h-14 w-14 rounded-2xl bg-brand-50 text-brand mb-4"><FileQuestion size={26} /></span>
          <h1 className="text-2xl font-extrabold">This link doesn't work</h1>
          <p className="text-muted-foreground mt-2">The invoice may have been removed. Ask the sender for a new link.</p>
        </div>
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="min-h-dvh bg-cream px-4 py-10">
        <div className="mx-auto max-w-3xl grid gap-4"><div className="skeleton h-40" /><div className="skeleton h-[520px]" /></div>
      </div>
    );
  }

  const from = inv.business.business_name || "your freelancer";
  const paid = inv.status === "paid";
  const voided = inv.status === "void";
  const part = !paid && Number(inv.amount_paid) > 0;
  const status = paid
    ? { icon: <CheckCircle2 size={18} />, text: "Paid in full. Thank you!", tone: "bg-[#e6f4ec] text-ok" }
    : voided
      ? { icon: <AlertTriangle size={18} />, text: "This invoice was cancelled. Nothing is owed.", tone: "bg-[#f1f1f1] text-[#666]" }
      : inv.is_overdue
        ? { icon: <AlertTriangle size={18} />, text: `Overdue since ${date(inv.due_date, "long")}`, tone: "bg-[#fdecea] text-destructive" }
        : { icon: <Clock size={18} />, text: `Due ${relativeDay(inv.due_date)} · ${date(inv.due_date, "long")}`, tone: "bg-gold-50 text-[#9a6514]" };

  return (
    <div className="min-h-dvh bg-cream">
      {/* Summary band */}
      <section className="no-print relative overflow-hidden bg-brand-800 text-cream">
        <div className="absolute inset-0 opacity-70" style={{ background: "radial-gradient(80% 120% at 0% 0%, rgba(192,69,107,.45), transparent 60%), radial-gradient(60% 90% at 100% 100%, rgba(232,168,59,.25), transparent 60%)" }} />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-8 pb-24 sm:pb-28">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
            <span className="grid place-items-center h-11 w-11 rounded-2xl bg-white/10"><LogoMark className="h-7 w-6 text-cream" /></span>
            <div className="min-w-0">
              <div className="text-xs text-cream/60">Invoice from</div>
              <div className="font-extrabold truncate">{from}</div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-8">
            <div className="text-sm text-cream/70">{paid ? "Amount paid" : part ? "Balance due" : "Amount due"} · {inv.number}</div>
            <div className="display text-[2.4rem] sm:text-[3.2rem] font-extrabold text-gold leading-none mt-2 tabular-nums break-words">
              {money(paid ? inv.total : inv.balance, inv.currency)}
            </div>
            {part && <div className="text-sm text-cream/70 mt-2">{money(inv.amount_paid, inv.currency)} of {money(inv.total, inv.currency)} already paid</div>}
          </motion.div>
        </div>
      </section>

      <main className="relative mx-auto max-w-3xl px-4 sm:px-6 -mt-16 sm:-mt-20 pb-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="no-print card p-4 sm:p-5 mb-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center shadow-[var(--shadow)]"
        >
          <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold ${status.tone}`}>{status.icon}{status.text}</div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary flex-1 sm:flex-none" disabled={pdfBusy} onClick={download}><Download size={16} /> {pdfBusy ? "Making PDF…" : "Download PDF"}</button>
            <button className="btn btn-outline hidden sm:inline-flex" onClick={() => window.print()}><Printer size={16} /> Print</button>
          </div>
          {!paid && !voided && inv.business.payment_details && (
            <div className="sm:col-span-2 rounded-2xl bg-cream border border-line p-4">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">How to pay</span>
                <button
                  className="tap text-xs font-bold text-brand inline-flex items-center gap-1"
                  onClick={() => navigator.clipboard.writeText(inv.business.payment_details).then(() => toast.success("Payment details copied"))}
                >
                  <Copy size={13} /> Copy
                </button>
              </div>
              <div className="whitespace-pre-line text-sm text-ink font-semibold">{inv.business.payment_details}</div>
              <div className="text-xs text-muted-foreground mt-2">Use <b className="text-ink">{inv.number}</b> as the reference.</div>
            </div>
          )}
        </motion.div>

        <InvoiceSheet ref={sheetRef} inv={inv} business={inv.business} />

        <p className="no-print text-center text-xs text-muted-foreground mt-8">
          Questions? Contact {from}{inv.business.email ? ` at ${inv.business.email}` : inv.business.phone ? ` on ${inv.business.phone}` : ""}.
        </p>
      </main>
      <Toaster position="top-center" richColors />
    </div>
  );
}
