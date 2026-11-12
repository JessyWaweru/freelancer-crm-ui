import { motion } from "framer-motion";
import { CalendarRange, Sparkles, TrendingUp, Trophy } from "lucide-react";
import { useState } from "react";
import CountUp from "@/components/reactbits/CountUp";
import Stagger, { item } from "@/components/Stagger";
import { money } from "@/lib/format";
import type { Currency, Earnings } from "@/lib/types";

// One series, so one colour: a brand maroon step that passes the contrast and lightness checks on white.
const BAR = "#a3305a";

function monthName(iso: string, style: "short" | "long" = "short") {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", style === "long" ? { month: "long", year: "numeric" } : { month: "short" });
}

function Tile({ label, value, currency, hint, icon, big = false }: {
  label: string; value: number; currency: Currency; hint?: string; icon: React.ReactNode; big?: boolean;
}) {
  return (
    <motion.div variants={item} className={`card p-4 sm:p-5 flex flex-col gap-2 ${big ? "col-span-2 lg:col-span-1 bg-brand-800 !border-brand-800 text-cream" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-sm font-bold ${big ? "text-cream/75" : "text-muted-foreground"}`}>{label}</span>
        <span className={`grid place-items-center h-9 w-9 rounded-xl ${big ? "bg-gold/15 text-gold" : "bg-brand-50 text-brand"}`}>{icon}</span>
      </div>
      <div className={`font-extrabold tracking-tight leading-none ${big ? "text-[2rem] sm:text-[2.2rem] text-gold" : "text-[1.5rem] sm:text-[1.65rem] text-ink"}`}>
        <span className={`text-sm font-bold mr-1 ${big ? "text-cream/70" : "text-muted-foreground"}`}>{currency}</span>
        <CountUp to={value} separator="," decimals={0} duration={1.4} />
      </div>
      {hint && <span className={`text-xs ${big ? "text-cream/65" : "text-muted-foreground"}`}>{hint}</span>}
    </motion.div>
  );
}

/** Earnings by month: one bar per month, tap or hover a bar for its amount. */
function MonthBars({ data, currency }: { data: Earnings["by_month"]; currency: Currency }) {
  const values = data.map((d) => Number(d.amount));
  const max = Math.max(...values, 0);
  const best = values.indexOf(max);
  const [active, setActive] = useState<number | null>(null);
  const shown = active ?? (max > 0 ? best : null);

  return (
    <div>
      {/* Readout: the bar you're on, or the best month by default. */}
      <div className="h-11 mb-2">
        {shown != null && (
          <div>
            <div className="text-xs text-muted-foreground">{active == null ? "Best month · " : ""}{monthName(data[shown].month, "long")}</div>
            <div className="font-extrabold text-ink tabular-nums">{money(values[shown], currency)}</div>
          </div>
        )}
      </div>
      <div className="relative h-40 sm:h-48" onMouseLeave={() => setActive(null)}>
        {/* Recessive guides at half and full scale */}
        <div className="absolute inset-x-0 top-0 border-t border-dashed border-line" />
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-line" />
        <div className="absolute inset-0 flex items-end gap-[2px]" role="list" aria-label="Earnings by month">
          {data.map((d, i) => {
            const h = max > 0 ? (values[i] / max) * 100 : 0;
            const on = active === i;
            return (
              <button
                key={d.month}
                type="button"
                role="listitem"
                aria-label={`${monthName(d.month, "long")}: ${money(values[i], currency)}`}
                className="group relative flex-1 h-full flex items-end justify-center outline-none"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(on ? null : i)}
              >
                <motion.span
                  className="block w-full max-w-[28px] rounded-t-[4px]"
                  style={{ background: BAR, opacity: active == null || on ? 1 : 0.45, minHeight: values[i] > 0 ? 3 : 0 }}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.6, delay: i * 0.03, ease: [0.22, 1, 0.36, 1] }}
                />
              </button>
            );
          })}
        </div>
      </div>
      <div className="border-t border-ink/20" />
      <div className="flex gap-[2px] mt-1.5">
        {data.map((d, i) => (
          <span key={d.month} className={`flex-1 text-center text-[0.65rem] sm:text-xs ${active === i ? "text-ink font-bold" : "text-muted-foreground"}`}>
            <span className="sm:hidden">{monthName(d.month)[0]}</span>
            <span className="hidden sm:inline">{monthName(d.month)}</span>
          </span>
        ))}
      </div>
      {/* Same numbers as a table for screen readers */}
      <table className="sr-only">
        <caption>Earnings by month</caption>
        <tbody>{data.map((d, i) => <tr key={d.month}><th>{monthName(d.month, "long")}</th><td>{money(values[i], currency)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export default function EarningsPanel({ earnings, currency }: { earnings: Earnings | undefined; currency: Currency }) {
  if (!earnings || Number(earnings.all_time) === 0) {
    return (
      <div className="card p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2 mb-8">
        <TrendingUp size={30} className="text-brand" />
        No earnings in {currency} yet. Mark an invoice or a month as paid and it shows up here.
      </div>
    );
  }
  const year = new Date().getFullYear();
  const topMax = Math.max(...earnings.by_client.map((c) => Number(c.amount)), 1);

  return (
    <div className="mb-8">
      <Stagger className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
        <Tile big label="All-time earnings" value={Number(earnings.all_time)} currency={currency} icon={<Sparkles size={18} />}
          hint={`${earnings.payments} payment${earnings.payments === 1 ? "" : "s"} received`} />
        <Tile label={`This year (${year})`} value={Number(earnings.this_year)} currency={currency} icon={<CalendarRange size={18} />} />
        <Tile label="This month" value={Number(earnings.this_month)} currency={currency} icon={<TrendingUp size={18} />} />
      </Stagger>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="card p-4 sm:p-5 min-w-0">
          <h2 className="text-base font-extrabold">Earnings by month</h2>
          <p className="text-xs text-muted-foreground mb-2">Last 12 months · tap a bar</p>
          <MonthBars data={earnings.by_month} currency={currency} />
        </section>

        <section className="card p-4 sm:p-5 min-w-0">
          <h2 className="text-base font-extrabold flex items-center gap-2"><Trophy size={17} className="text-brand" /> Top clients</h2>
          <p className="text-xs text-muted-foreground mb-3">All time</p>
          <ul className="grid gap-3">
            {earnings.by_client.map((c) => (
              <li key={c.client}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-bold text-ink truncate">{c.name}</span>
                  <span className="font-extrabold text-ink tabular-nums shrink-0">{money(c.amount, currency)}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-tint overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: BAR }} initial={{ width: 0 }}
                    animate={{ width: `${(Number(c.amount) / topMax) * 100}%` }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
