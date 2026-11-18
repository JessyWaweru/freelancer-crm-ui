import { AnimatePresence, motion } from "framer-motion";
import { forwardRef } from "react";
import { LogoMark } from "@/components/Logo";
import { date, money } from "@/lib/format";
import type { Profile, PublicInvoice } from "@/lib/types";

type Business = Pick<Profile, "business_name" | "email" | "phone" | "address" | "payment_details">;
type SheetInvoice = Omit<PublicInvoice, "business"> & { client_email?: string; client_phone?: string };

const Label = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">{children}</div>
);

/** The printable invoice. Used in the app, for the PDF, and on the client's shared link. */
const InvoiceSheet = forwardRef<HTMLElement, { inv: SheetInvoice; business: Business | null; justPaid?: boolean }>(
  function InvoiceSheet({ inv, business, justPaid = false }, ref) {
    const discount = Number(inv.discount);
    const tax = Number(inv.tax_rate);
    const paid = Number(inv.amount_paid);
    const showSubtotal = discount > 0 || tax > 0;

    return (
      <motion.article
        ref={ref}
        initial={{ opacity: 0, y: 20, rotateX: 4 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="print-sheet relative mx-auto max-w-3xl bg-white rounded-[24px] border border-line shadow-[var(--shadow-lg)] overflow-hidden"
      >
        <div className="h-2 bg-gradient-to-r from-brand-800 via-brand to-gold" />
        <AnimatePresence>
          {inv.status === "paid" && (
            <motion.div
              initial={justPaid ? { scale: 2.4, opacity: 0, rotate: -30 } : false}
              animate={{ scale: 1, opacity: 1, rotate: -14 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              className="pointer-events-none absolute right-5 top-[150px] sm:right-auto sm:top-auto sm:left-14 sm:bottom-[160px] border-[3px] border-ok text-ok rounded-xl px-4 py-1.5 display font-extrabold text-2xl tracking-widest opacity-90"
            >
              PAID
            </motion.div>
          )}
          {inv.status === "void" && (
            <div className="pointer-events-none absolute right-5 top-[150px] sm:right-auto sm:top-auto sm:left-14 sm:bottom-[160px] border-[3px] border-[#999] text-[#999] rounded-xl px-4 py-1.5 display font-extrabold text-2xl tracking-widest -rotate-12">VOID</div>
          )}
        </AnimatePresence>

        <div className="p-6 sm:p-10">
          <header className="flex flex-col-reverse gap-6 sm:flex-row sm:justify-between">
            <div>
              <div className="display text-3xl sm:text-4xl font-extrabold text-brand-800">INVOICE</div>
              <div className="mt-2 text-sm text-muted-foreground">
                <div><span className="inline-block w-20">Number</span> <b className="text-ink">{inv.number}</b></div>
                <div><span className="inline-block w-20">Issued</span> <b className="text-ink">{date(inv.issue_date, "long")}</b></div>
                <div><span className="inline-block w-20">Due</span> <b className={inv.is_overdue ? "text-destructive" : "text-ink"}>{date(inv.due_date, "long")}</b></div>
                {inv.period_start && <div><span className="inline-block w-20">Period</span> <b className="text-ink">{date(inv.period_start)} – {date(inv.period_end)}</b></div>}
              </div>
            </div>
            <div className="sm:text-right">
              {business?.business_name ? (
                <>
                  <div className="font-extrabold text-ink text-lg">{business.business_name}</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-line">
                    {[business.address, business.phone, business.email].filter(Boolean).join("\n")}
                  </div>
                </>
              ) : (
                <LogoMark className="h-12 w-10 text-brand-800 sm:ml-auto" />
              )}
            </div>
          </header>

          <div className="mt-8 rounded-2xl bg-cream p-4 sm:p-5">
            <Label>Bill to</Label>
            <div className="font-extrabold text-ink mt-1">{inv.client_name}</div>
            <div className="text-sm text-muted-foreground">
              {[inv.client_company, inv.client_phone, inv.client_email].filter(Boolean).join(" · ")}
            </div>
            {inv.project_title && <div className="text-sm mt-1"><span className="text-muted-foreground">Project:</span> <b className="text-ink">{inv.project_title}</b></div>}
          </div>

          <table className="w-full mt-8 text-sm">
            <thead>
              <tr className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground border-b-2 border-brand-800">
                <th className="text-left py-2.5">Description</th>
                <th className="text-right py-2.5 w-14">Qty</th>
                <th className="text-right py-2.5 w-28 hidden sm:table-cell">Price</th>
                <th className="text-right py-2.5 w-32">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it, i) => (
                <motion.tr key={i} className="border-b border-line" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.06 }}>
                  <td className="py-3 pr-2 text-ink">{it.description}</td>
                  <td className="py-3 text-right tabular-nums">{Number(it.quantity)}</td>
                  <td className="py-3 text-right tabular-nums hidden sm:table-cell">{money(it.unit_price, inv.currency)}</td>
                  <td className="py-3 text-right font-bold text-ink tabular-nums">{money(it.amount, inv.currency)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex justify-end">
            <div className="w-full sm:w-80 rounded-2xl bg-brand-800 text-cream p-5">
              <div className="grid gap-1.5 text-sm text-cream/70">
                {showSubtotal && <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{money(inv.subtotal, inv.currency)}</span></div>}
                {discount > 0 && <div className="flex justify-between"><span>Discount</span><span className="tabular-nums">−{money(discount, inv.currency)}</span></div>}
                {tax > 0 && <div className="flex justify-between"><span>{inv.tax_label || "Tax"} ({tax}%)</span><span className="tabular-nums">{money(inv.tax_amount, inv.currency)}</span></div>}
                <div className={`flex justify-between ${showSubtotal ? "text-cream font-bold" : ""}`}><span>Total</span><span className="tabular-nums">{money(inv.total, inv.currency)}</span></div>
                {paid > 0 && <div className="flex justify-between text-[#9fe0bd]"><span>Paid</span><span className="tabular-nums">−{money(paid, inv.currency)}</span></div>}
              </div>
              <div className="mt-3 pt-3 border-t border-white/15 flex items-end justify-between">
                <span className="font-bold whitespace-nowrap mr-3">{inv.status === "paid" ? "Balance" : "Total due"}</span>
                <span className="display text-lg sm:text-xl font-extrabold text-gold tabular-nums text-right">{money(inv.balance, inv.currency)}</span>
              </div>
            </div>
          </div>

          {(business?.payment_details || inv.notes) && (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 text-sm">
              {business?.payment_details && (
                <div>
                  <div className="mb-1"><Label>How to pay</Label></div>
                  <div className="whitespace-pre-line text-ink">{business.payment_details}</div>
                </div>
              )}
              {inv.notes && (
                <div>
                  <div className="mb-1"><Label>Note</Label></div>
                  <div className="whitespace-pre-line text-ink">{inv.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.article>
    );
  }
);

export default InvoiceSheet;
