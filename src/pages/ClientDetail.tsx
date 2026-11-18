import { motion } from "framer-motion";
import {
  ArrowLeft, Building2, CalendarClock, ChevronRight, FilePlus2, FolderKanban, FolderPlus, Hourglass, Mail, MessageCircle,
  Phone, ReceiptText, Sparkles, Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import api from "@/api";
import Stagger, { item } from "@/components/Stagger";
import StatusPill from "@/components/StatusPill";
import CountUp from "@/components/reactbits/CountUp";
import { date, initials, money, relativeDay } from "@/lib/format";
import type { Client, Currency, Invoice, Project } from "@/lib/types";

type Earned = { currency: Currency; paid: string | number; payments: number; first_paid: string; last_paid: string };

const BILLING_LABEL = { fixed: "Fixed fee", monthly: "Monthly", both: "Fixed + monthly" } as const;

function Tile({ label, icon, children, hint, dark = false }: { label: string; icon: ReactNode; children: ReactNode; hint?: ReactNode; dark?: boolean }) {
  return (
    <motion.div variants={item} className={`card p-4 sm:p-5 flex flex-col gap-2 min-w-0 ${dark ? "!bg-brand-800 !border-brand-800 text-cream" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-bold ${dark ? "text-cream/75" : "text-muted-foreground"}`}>{label}</span>
        <span className={`grid place-items-center h-9 w-9 rounded-xl ${dark ? "bg-gold/15 text-gold" : "bg-brand-50 text-brand"}`}>{icon}</span>
      </div>
      <div className={`font-extrabold tracking-tight leading-none text-[1.2rem] min-[400px]:text-[1.4rem] sm:text-[1.6rem] whitespace-nowrap ${dark ? "text-gold" : "text-ink"}`}>{children}</div>
      {hint && <span className={`text-xs ${dark ? "text-cream/65" : "text-muted-foreground"}`}>{hint}</span>}
    </motion.div>
  );
}

export default function ClientDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [earned, setEarned] = useState<Earned[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<Client>(`/clients/${id}/`),
      api.get<Project[]>(`/projects/?client=${id}`),
      api.get<Invoice[]>(`/invoices/?client=${id}`),
      api.get<{ earned: Earned[] }>(`/clients/${id}/summary/`),
    ])
      .then(([c, p, i, s]) => { setClient(c.data); setProjects(p.data); setInvoices(i.data); setEarned(s.data.earned); })
      .catch(() => { toast.error("Client not found."); nav("/app/clients"); });
  }, [id, nav]);

  // What they owe now: sent balances, plus months and fees not on a sent invoice (same rule as the Clients page).
  const owed = useMemo(() => {
    const out: Record<string, number> = {};
    const add = (cur: string, n: number) => { out[cur] = (out[cur] ?? 0) + n; };
    for (const i of invoices) if (i.status === "sent") add(i.currency, Number(i.balance));
    for (const p of projects) {
      const own = invoices.filter((i) => i.project === p.id && i.status !== "void");
      const sentMonths = new Set(own.filter((i) => i.kind === "monthly" && i.status !== "draft").map((i) => i.period_start));
      const months = (p.unpaid_periods ?? []).filter((d) => !sentMonths.has(d)).length;
      if (months) add(p.payment_currency, months * Number(p.monthly_amount));
      const feeInvoiced = own.some((i) => i.kind !== "monthly" && i.status !== "draft");
      if (p.billing_type !== "monthly" && p.payment_status === "unpaid" && !feeInvoiced && Number(p.payment_amount) > 0) add(p.payment_currency, Number(p.payment_amount));
    }
    return Object.entries(out).filter(([, n]) => n > 0);
  }, [invoices, projects]);

  // How long they usually take to pay, from sending (or issuing) to paid.
  const avgDays = useMemo(() => {
    const days = invoices
      .filter((i) => i.status === "paid" && i.paid_at)
      .map((i) => (new Date(i.paid_at!).getTime() - new Date(i.sent_at ?? `${i.issue_date}T00:00:00`).getTime()) / 86400000)
      .filter((d) => d >= 0);
    return days.length ? Math.round(days.reduce((a, b) => a + b, 0) / days.length) : null;
  }, [invoices]);

  if (!client) {
    return <div className="grid gap-4"><div className="skeleton h-28" /><div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><div className="skeleton h-28" /><div className="skeleton h-28" /><div className="skeleton h-28" /><div className="skeleton h-28" /></div><div className="skeleton h-64" /></div>;
  }

  const top = earned[0];
  const active = projects.filter((p) => p.status === "active");
  const phone = client.phone?.replace(/\D/g, "");
  const lateCount = invoices.filter((i) => i.is_overdue).length;

  return (
    <div>
      {/* Header */}
      <motion.section
        className="relative overflow-hidden rounded-[28px] bg-brand-800 text-cream mb-6"
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-0" style={{ background: "radial-gradient(70% 120% at 0% 0%, rgba(192,69,107,.45), transparent 60%), radial-gradient(50% 90% at 100% 100%, rgba(232,168,59,.22), transparent 60%)" }} />
        <div className="relative p-5 sm:p-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <div className="flex items-start gap-3 sm:gap-4">
              <Link to="/app/clients" className="icon-btn text-cream/70 hover:bg-white/10 hover:text-white shrink-0 -ml-2" aria-label="Back to clients"><ArrowLeft size={20} /></Link>
              <div className="hidden min-[400px]:grid place-items-center h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gold text-ink display font-extrabold text-xl shrink-0">{initials(client.name)}</div>
              <div className="min-w-0">
                <h1 className="text-cream text-[1.6rem] sm:text-[2.2rem] font-extrabold break-words">{client.name}</h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-cream/70 mt-1">
                  {client.company && <span className="inline-flex items-center gap-1.5"><Building2 size={14} /> {client.company}</span>}
                  {client.created_at && <span className="inline-flex items-center gap-1.5"><CalendarClock size={14} /> Client since {date(client.created_at)}</span>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 sm:pl-32">
              <a href={`tel:${client.phone}`} className="btn btn-sm border-cream/25 text-cream hover:bg-white/10" aria-label="Call"><Phone size={14} /><span className="max-[359px]:hidden">Call</span></a>
              {phone && <a href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer" className="btn btn-sm border-cream/25 text-cream hover:bg-white/10" aria-label="WhatsApp"><MessageCircle size={14} /><span className="max-[359px]:hidden">WhatsApp</span></a>}
              {client.email && <a href={`mailto:${client.email}`} className="btn btn-sm border-cream/25 text-cream hover:bg-white/10" aria-label="Email"><Mail size={14} /><span className="max-[359px]:hidden">Email</span></a>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-gold max-[359px]:flex-1" onClick={() => nav(`/app/invoices?new=1&client=${client.id}`)}><FilePlus2 size={17} /> New invoice</button>
            <button className="btn border-cream/30 text-cream hover:bg-white/10 max-[359px]:flex-1" onClick={() => nav(`/app/projects?client=${client.id}&new=1`)}><FolderPlus size={17} /> New project</button>
          </div>
        </div>
      </motion.section>

      {/* Numbers */}
      <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Tile dark label="Paid you, all time" icon={<Sparkles size={18} />}
          hint={top ? `${top.payments} payment${top.payments === 1 ? "" : "s"} · last ${relativeDay(top.last_paid)}` : "No payments yet"}>
          <span className="text-sm font-bold text-cream/70 mr-1">{top?.currency ?? ""}</span>
          <CountUp to={Number(top?.paid ?? 0)} separator="," decimals={0} duration={1.3} />
          {earned.length > 1 && <div className="text-xs font-bold text-cream/70 mt-1.5">+ {earned.slice(1).map((e) => money(e.paid, e.currency, { compact: true })).join(" + ")}</div>}
        </Tile>
        <Tile label="Owes you now" icon={<Wallet size={18} />} hint={lateCount ? <span className="text-destructive font-bold">{lateCount} invoice{lateCount === 1 ? "" : "s"} overdue</span> : owed.length ? "Sent invoices and unbilled fees" : "Nothing outstanding"}>
          {owed.length
            ? owed.map(([cur, n]) => <div key={cur}><span className="text-sm font-bold text-muted-foreground mr-1">{cur}</span>{Math.round(n).toLocaleString("en-KE")}</div>)
            : <span className="text-ok">Settled</span>}
        </Tile>
        <Tile label="Usually pays in" icon={<Hourglass size={18} />} hint={avgDays == null ? "Shows after a paid invoice" : "From sending to paid"}>
          {avgDays == null ? "—" : avgDays === 0 ? "Same day" : `${avgDays} day${avgDays === 1 ? "" : "s"}`}
        </Tile>
        <Tile label="Projects" icon={<FolderKanban size={18} />} hint={`${active.length} active`}>
          {projects.length}
        </Tile>
      </Stagger>

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] items-start">
        <section className="card p-4 sm:p-5 min-w-0">
          <h2 className="text-base font-extrabold flex items-center gap-2 mb-3"><FolderKanban size={17} className="text-brand" /> Projects</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <ul className="grid gap-2">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link to={`/app/projects/${p.id}`} className="group flex items-center gap-3 rounded-2xl border border-line p-3 hover:border-brand-100 hover:bg-tint/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-ink truncate">{p.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <span className="pill pill-brand">{BILLING_LABEL[p.billing_type]}</span>
                        {p.status !== "active" && <span className="pill pill-draft capitalize">{p.status}</span>}
                        {p.unpaid_periods?.length > 0 && <span className="pill pill-overdue">{p.unpaid_periods.length} month{p.unpaid_periods.length === 1 ? "" : "s"} unpaid</span>}
                      </div>
                    </div>
                    <div className="text-right text-sm tabular-nums shrink-0">
                      {p.billing_type !== "fixed" && <div className="font-extrabold text-ink">{money(p.monthly_amount, p.payment_currency, { compact: true })}<span className="text-xs text-muted-foreground font-bold">/mo</span></div>}
                      {p.billing_type !== "monthly" && <div className={p.billing_type === "both" ? "text-xs text-muted-foreground" : "font-extrabold text-ink"}>{money(p.payment_amount, p.payment_currency, { compact: true })}</div>}
                    </div>
                    <ChevronRight size={17} className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card overflow-hidden min-w-0">
          <h2 className="text-base font-extrabold flex items-center gap-2 p-4 sm:p-5 pb-3"><ReceiptText size={17} className="text-brand" /> Invoices</h2>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground px-4 sm:px-5 pb-5">No invoices yet.</p>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {invoices.map((inv) => (
                <li key={inv.id}>
                  <Link to={`/app/invoices/${inv.id}`} className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-tint/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-ink text-sm">{inv.number} <span className="font-medium text-muted-foreground">· {inv.project_title ?? "Custom"}</span></div>
                      <div className="text-xs text-muted-foreground">
                        {inv.status === "paid" ? `Paid ${date(inv.paid_at)}` : inv.status === "sent" ? `Due ${relativeDay(inv.due_date)}` : `Issued ${date(inv.issue_date)}`}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-ink text-sm tabular-nums">{money(inv.status === "sent" ? inv.balance : inv.total, inv.currency)}</div>
                      <StatusPill invoice={inv} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
