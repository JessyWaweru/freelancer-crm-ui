import { motion } from "framer-motion";
import { AlertTriangle, ArrowRight, CheckCircle2, Plus, ReceiptText, Repeat, Wallet } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/api";
import { currentUsername } from "@/auth";
import EarningsPanel from "@/components/EarningsPanel";
import Segmented from "@/components/Segmented";
import Stagger, { item } from "@/components/Stagger";
import StatusPill from "@/components/StatusPill";
import ReminderCard from "@/components/ReminderCard";
import Aurora from "@/components/reactbits/Aurora";
import CountUp from "@/components/reactbits/CountUp";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { useFinePointer } from "@/hooks/useFinePointer";
import { useReminders } from "@/hooks/useReminders";
import { date, money } from "@/lib/format";
import type { Currency, Dashboard as DashboardData, Invoice, Profile } from "@/lib/types";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Stat({ label, value, currency, icon, tone, hint }: {
  label: string; value: number; currency: string; icon: ReactNode; tone: string; hint?: string;
}) {
  const fine = useFinePointer();
  return (
    <motion.div variants={item}>
      <SpotlightCard theme="light" spotlightColor="#7a1d3f" ambient={!fine} className="!rounded-[20px] !p-0 h-full">
        <div className="p-5 flex flex-col gap-3 h-full">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-muted-foreground">{label}</span>
            <span className={`grid place-items-center h-9 w-9 rounded-xl ${tone}`}>{icon}</span>
          </div>
          <div className="text-[1.65rem] font-extrabold text-ink tracking-tight leading-none">
            <span className="text-sm font-bold text-muted-foreground mr-1">{currency}</span>
            <CountUp to={value} separator="," decimals={0} duration={1.4} />
          </div>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
      </SpotlightCard>
    </motion.div>
  );
}

export default function Dashboard() {
  const nav = useNavigate();
  const { reminders, loading: remindersLoading } = useReminders();
  const [data, setData] = useState<DashboardData | null>(null);
  const [recent, setRecent] = useState<Invoice[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currency, setCurrency] = useState<Currency | null>(null);
  const [view, setView] = useState<"overview" | "earnings">(() => {
    try { return localStorage.getItem("crm.dashView") === "earnings" ? "earnings" : "overview"; } catch { return "overview"; }
  });
  const pickView = (v: "overview" | "earnings") => {
    setView(v);
    try { localStorage.setItem("crm.dashView", v); } catch { /* private mode */ }
  };

  useEffect(() => {
    Promise.all([
      api.get<DashboardData>("/dashboard/"),
      api.get<Invoice[]>("/invoices/"),
      api.get<Profile>("/profile/"),
    ]).then(([d, i, p]) => {
      setData(d.data);
      setRecent(i.data.slice(0, 6));
      setProfile(p.data);
    }).catch(() => {});
  }, [reminders.length]);

  const currencies = useMemo(() => {
    const set = new Set<Currency>();
    data?.totals.forEach((t) => set.add(t.currency));
    data?.mrr.forEach((m) => set.add(m.currency));
    data?.earnings?.forEach((e) => set.add(e.currency));
    if (set.size === 0 && profile) set.add(profile.default_currency);
    return [...set];
  }, [data, profile]);

  const active = currency && currencies.includes(currency)
    ? currency
    : currencies.includes(profile?.default_currency as Currency) ? (profile!.default_currency) : currencies[0] ?? "KES";
  const t = data?.totals.find((x) => x.currency === active);
  const mrr = Number(data?.mrr.find((m) => m.currency === active)?.amount ?? 0);
  const urgent = reminders.filter((r) => r.severity !== "upcoming").length;
  const name = currentUsername();

  return (
    <div>
      {/* Hero banner */}
      <motion.section
        className="relative overflow-hidden rounded-[28px] bg-brand-800 text-cream mb-6 sm:mb-8"
        initial={{ opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Aurora className="aurora-bg" colorStops={["#3d0d20", "#c0456b", "#e8a83b"]} amplitude={0.9} blend={0.55} speed={0.5} opacity={0.7} mouseInteraction={false} />
        <div className="relative z-10 p-6 sm:p-9 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="eyebrow !bg-gold/15 !text-gold mb-3">{date(new Date().toISOString(), "long")}</span>
            <h1 className="text-cream text-[1.9rem] sm:text-[2.6rem] font-extrabold">
              {greeting()}{name ? `, ${name}` : ""}.
            </h1>
            <p className="text-cream/75 mt-2 max-w-md">
              {remindersLoading
                ? "Checking what needs your attention…"
                : urgent > 0
                  ? <>You have <b className="text-gold">{urgent} thing{urgent === 1 ? "" : "s"}</b> that need{urgent === 1 ? "s" : ""} attention today.</>
                  : reminders.length > 0
                    ? <>Nothing urgent. {reminders.length} coming up soon.</>
                    : "You're all caught up. Nothing to send right now."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-gold" onClick={() => nav("/app/invoices?new=1")}><Plus size={18} /> New invoice</button>
            <Link to="/app/projects" className="btn border-cream/30 text-cream hover:bg-white/10">Projects</Link>
          </div>
        </div>
      </motion.section>

      {/* Overview / Earnings tabs + currency */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Segmented
          value={view}
          onChange={pickView}
          options={[{ value: "overview", label: "Overview" }, { value: "earnings", label: "Earnings" }]}
        />
        {currencies.length > 1 && (
          <Segmented value={active} onChange={(v) => setCurrency(v)} options={currencies.map((c) => ({ value: c, label: c }))} />
        )}
      </div>
      {view === "earnings" ? (
        data ? <EarningsPanel earnings={data.earnings?.find((e) => e.currency === active)} currency={active} />
          : <div className="skeleton h-[300px] mb-8" />
      ) : data ? (
        <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <Stat label="Outstanding" value={Number(t?.outstanding ?? 0)} currency={active} icon={<Wallet size={18} />} tone="bg-gold-50 text-[#9a6514]" hint="Sent, waiting for payment" />
          <Stat label="Overdue" value={Number(t?.overdue ?? 0)} currency={active} icon={<AlertTriangle size={18} />} tone="bg-[#fdecea] text-destructive" hint="Past the due date" />
          <Stat label="Paid this month" value={Number(t?.paid_this_month ?? 0)} currency={active} icon={<CheckCircle2 size={18} />} tone="bg-[#e6f4ec] text-ok" />
          <Stat label="Monthly retainers" value={mrr} currency={active} icon={<Repeat size={18} />} tone="bg-brand-50 text-brand" hint="Billed every month" />
        </Stagger>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[132px]" />)}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        {/* To do */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold">To do</h2>
            {reminders.length > 0 && <span className="pill pill-brand">{reminders.length}</span>}
          </div>
          {remindersLoading ? (
            <div className="grid gap-3">{[0, 1].map((i) => <div key={i} className="skeleton h-[104px]" />)}</div>
          ) : reminders.length === 0 ? (
            <div className="card p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
              <CheckCircle2 size={30} className="text-ok" />
              Nothing due right now. Invoices, unpaid months, deadlines and to-dos show up here {profile?.reminder_days_before ?? 3} days before they're due.
            </div>
          ) : (
            <div className="grid gap-3">
              {reminders.slice(0, 6).map((r) => <ReminderCard key={r.id} reminder={r} />)}
            </div>
          )}
        </section>

        {/* Recent invoices */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold">Recent invoices</h2>
            <Link to="/app/invoices" className="tap text-sm font-bold text-brand inline-flex items-center gap-1 group">
              All <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <div className="card overflow-hidden">
            {recent.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <ReceiptText size={28} className="text-brand" />
                No invoices yet.
              </div>
            ) : (
              <Stagger as="ul" className="divide-y divide-line">
                {recent.map((inv) => (
                  <motion.li key={inv.id} variants={item}>
                    <Link to={`/app/invoices/${inv.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-tint/60 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-ink text-sm">{inv.client_name}</div>
                        <div className="text-xs text-muted-foreground">{inv.number} · due {date(inv.due_date)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-ink text-sm">{money(inv.total, inv.currency)}</div>
                        <StatusPill invoice={inv} />
                      </div>
                    </Link>
                  </motion.li>
                ))}
              </Stagger>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
