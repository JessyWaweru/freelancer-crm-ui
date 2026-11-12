import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Plus, ReceiptText, Repeat, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import api from "@/api";
import EmptyState from "@/components/EmptyState";
import InvoiceEditor from "@/components/InvoiceEditor";
import PageHeader from "@/components/PageHeader";
import ReminderCard from "@/components/ReminderCard";
import Segmented from "@/components/Segmented";
import StatusPill from "@/components/StatusPill";
import { useReminders } from "@/hooks/useReminders";
import { date, money, relativeDay } from "@/lib/format";
import type { Invoice } from "@/lib/types";

type Tab = "all" | "draft" | "sent" | "overdue" | "paid";

export default function Invoices() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { reminders, refresh } = useReminders();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const editorOpen = params.get("new") === "1";

  useEffect(() => {
    api.get<Invoice[]>("/invoices/")
      .then((r) => setInvoices(r.data))
      .catch(() => toast.error("Couldn't load invoices."))
      .finally(() => setLoading(false));
  }, [reminders.length]);

  const counts = useMemo(() => ({
    draft: invoices.filter((i) => i.status === "draft").length,
    sent: invoices.filter((i) => i.status === "sent" && !i.is_overdue).length,
    overdue: invoices.filter((i) => i.is_overdue).length,
  }), [invoices]);

  const filtered = invoices.filter((i) => {
    const inTab = tab === "all" ? true : tab === "overdue" ? i.is_overdue : tab === "sent" ? i.status === "sent" && !i.is_overdue : i.status === tab;
    const q = search.toLowerCase();
    return inTab && [i.number, i.client_name, i.project_title ?? ""].some((v) => v.toLowerCase().includes(q));
  });

  const toSend = reminders.filter((r) => r.type === "monthly_due" || r.type === "fixed_due");

  return (
    <div>
      <PageHeader
        eyebrow="Get paid"
        title="Invoices"
        subtitle="Create, send and track invoices. Monthly retainers are drafted for you when they're due."
        actions={<button className="btn btn-primary" onClick={() => setParams({ new: "1" })}><Plus size={18} /> New invoice</button>}
      />

      <AnimatePresence>
        {toSend.length > 0 && (
          <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-7">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
              <Repeat size={15} /> Ready to invoice
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {toSend.map((r) => <ReminderCard key={r.id} reminder={r} />)}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {invoices.length > 0 && (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: "all", label: "All" },
              { value: "draft", label: "Drafts", count: counts.draft },
              { value: "sent", label: "Sent", count: counts.sent },
              { value: "overdue", label: "Overdue", count: counts.overdue },
              { value: "paid", label: "Paid" },
            ]}
          />
          <div className="relative md:w-72">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className="input !pl-10 !rounded-full" placeholder="Search number, client, project" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[72px]" />)}</div>
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={<ReceiptText size={28} />}
          title="No invoices yet"
          text="Create one by hand, or set up a project with a fee or monthly retainer and you'll be reminded when to invoice."
          action={<button className="btn btn-primary" onClick={() => setParams({ new: "1" })}><Plus size={18} /> New invoice</button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden md:grid grid-cols-[110px_1.4fr_1fr_120px_140px_100px_24px] gap-3 px-5 py-3 text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground border-b border-line bg-tint/40">
            <span>Number</span><span>Client</span><span>Project</span><span>Due</span><span className="text-right">Amount</span><span>Status</span><span />
          </div>
          <motion.ul layout className="divide-y divide-line">
            <AnimatePresence initial={false}>
              {filtered.map((inv, idx) => (
                <motion.li
                  key={inv.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: Math.min(idx, 10) * 0.03 } }}
                  exit={{ opacity: 0 }}
                >
                  <button
                    onClick={() => nav(`/app/invoices/${inv.id}`)}
                    className="group w-full text-left grid grid-cols-[1fr_auto] md:grid-cols-[110px_1.4fr_1fr_120px_140px_100px_24px] gap-x-3 gap-y-1 items-center px-4 md:px-5 py-3.5 hover:bg-tint/50 transition-colors"
                  >
                    <span className="font-bold text-brand text-sm order-2 md:order-none text-right md:text-left">{inv.number}</span>
                    <span className="min-w-0 order-1 md:order-none">
                      <span className="block font-bold text-ink truncate">{inv.client_name}</span>
                      <span className="block text-xs text-muted-foreground md:hidden truncate">{inv.project_title ?? (inv.kind === "custom" ? "Custom invoice" : "")}</span>
                    </span>
                    <span className="hidden md:block text-sm text-muted-foreground truncate">{inv.project_title ?? "—"}</span>
                    <span className={`text-xs md:text-sm order-3 md:order-none ${inv.is_overdue ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                      {inv.status === "paid" ? `Paid ${date(inv.paid_at)}` : inv.status === "sent" ? `Due ${relativeDay(inv.due_date)}` : date(inv.due_date)}
                    </span>
                    <span className="font-extrabold text-ink text-right order-4 md:order-none tabular-nums">{money(inv.total, inv.currency)}</span>
                    <span className="order-5 md:order-none col-span-2 md:col-span-1"><StatusPill invoice={inv} /></span>
                    <ChevronRight size={18} className="hidden md:block text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
          {filtered.length === 0 && <p className="text-muted-foreground text-sm p-6 text-center">Nothing here.</p>}
        </div>
      )}

      <InvoiceEditor
        open={editorOpen}
        onClose={() => setParams({})}
        onSaved={(inv) => {
          setParams({});
          refresh();
          nav(`/app/invoices/${inv.id}`);
        }}
      />
    </div>
  );
}
