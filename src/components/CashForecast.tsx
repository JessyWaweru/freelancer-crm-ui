import { motion } from "framer-motion";
import { AlertTriangle, CalendarClock, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CountUp from "@/components/reactbits/CountUp";
import { money, todayIso } from "@/lib/format";
import type { Currency, Forecast, ForecastItem } from "@/lib/types";

// One series: the brand maroon step already used for earnings bars.
const BAR = "#a3305a";
// "Late" is a status, not a series. It is told apart by its own column, a divider, hatching, an icon and a label,
// never by colour alone (it sits too close to the maroon for colour to carry it).
const LATE = "#b42318";
const DAYS = 30;

const dayDiff = (iso: string, from: string) =>
  Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000);
const short = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const plusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

type Slot = { key: string; label: string; total: number; items: ForecastItem[]; late?: boolean };

export default function CashForecast({ forecast, currency }: { forecast: Forecast | undefined; currency: Currency }) {
  const today = todayIso();
  const [active, setActive] = useState<number | null>(null);

  const slots = useMemo<Slot[]>(() => {
    const late: Slot = { key: "late", label: "Late", total: 0, items: [], late: true };
    const days: Slot[] = Array.from({ length: DAYS + 1 }, (_, i) => {
      const d = plusDays(today, i);
      return { key: d, label: i === 0 ? "Today" : short(d), total: 0, items: [] };
    });
    for (const it of forecast?.items ?? []) {
      const i = dayDiff(it.date, today);
      const slot = i < 0 ? late : days[i];
      if (!slot) continue;
      slot.total += Number(it.amount);
      slot.items.push(it);
    }
    return [late, ...days];
  }, [forecast, today]);

  const max = Math.max(...slots.map((s) => s.total), 0);
  const next = Number(forecast?.next_30_days ?? 0);
  const lateTotal = Number(forecast?.late ?? 0);
  const upcoming = (forecast?.items ?? []).filter((i) => i.date >= today).slice(0, 3);
  const shown = active != null ? slots[active] : null;

  if (!forecast || (next === 0 && lateTotal === 0)) {
    return (
      <section className="card p-5 flex items-center gap-4 mb-8">
        <span className="grid place-items-center h-11 w-11 rounded-2xl bg-brand-50 text-brand shrink-0"><TrendingUp size={20} /></span>
        <div className="text-sm">
          <b className="text-ink">Nothing expected in {currency} over the next 30 days.</b>
          <p className="text-muted-foreground">Sent invoices and upcoming retainer months show up here as a timeline.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card p-4 sm:p-6 mb-8 grid gap-6 lg:grid-cols-[230px_1fr] min-w-0">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-bold text-muted-foreground flex items-center gap-2"><CalendarClock size={16} className="text-brand" /> Coming in, next 30 days</h2>
        <div className="text-[2rem] font-extrabold text-ink tracking-tight leading-none mt-1 tabular-nums">
          <span className="text-sm font-bold text-muted-foreground mr-1">{currency}</span>
          <CountUp to={next} separator="," decimals={0} duration={1.3} />
        </div>
        <p className="text-xs text-muted-foreground">Sent invoices plus retainer months not yet billed.</p>
        {lateTotal > 0 && (
          <Link to="/app/invoices" className="mt-3 self-start inline-flex items-center gap-1.5 rounded-full bg-[#fdecea] px-3 py-1.5 text-xs font-extrabold text-destructive hover:brightness-95">
            <AlertTriangle size={13} /> {money(lateTotal, currency)} late, chase it
          </Link>
        )}
        {upcoming.length > 0 && (
          <ul className="mt-4 grid gap-2 lg:hidden">
            {upcoming.map((u, i) => (
              <li key={i}>
                <Link to={u.link} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0"><b className="text-ink block truncate">{u.label}</b><span className="text-xs text-muted-foreground block truncate">{u.detail} · {short(u.date)}</span></span>
                  <span className="font-extrabold text-ink tabular-nums shrink-0">{money(u.amount, currency, { compact: true })}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="min-w-0">
        {/* Readout: the column you're on (values lead, labels follow) */}
        <div className="h-[52px] mb-1" aria-live="polite">
          {shown ? (
            <div className="min-w-0">
              <div className="font-extrabold text-ink tabular-nums">{money(shown.total, currency)} <span className="text-xs font-bold text-muted-foreground">{shown.late ? "already late" : shown.label === "Today" ? "today" : short(shown.key)}</span></div>
              <div className="text-xs text-muted-foreground truncate">{shown.items.map((i) => `${i.label} · ${i.detail}`).join("  ·  ") || "Nothing due"}</div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground pt-1">Hover or tap a bar to see who's paying.</div>
          )}
        </div>

        <div className="relative h-32 sm:h-36" onMouseLeave={() => setActive(null)}>
          <div className="absolute inset-x-0 top-0 border-t border-dashed border-line" />
          <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-line" />
          <div className="absolute inset-0 flex items-end" role="list" aria-label="Money expected by day">
            {slots.map((s, i) => {
              const h = max > 0 ? (s.total / max) * 100 : 0;
              const on = active === i;
              return (
                <button
                  key={s.key}
                  type="button"
                  role="listitem"
                  aria-label={`${s.late ? "Late" : s.label}: ${money(s.total, currency)}`}
                  className={`relative h-full flex items-end justify-center outline-none ${s.late ? "w-9 mr-3 sm:mr-4" : "flex-1"} ${s.total ? "cursor-pointer" : "cursor-default"}`}
                  onMouseEnter={() => s.total && setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(on ? null : i)}
                >
                  {s.late && <span className="absolute -right-2 sm:-right-2.5 top-0 bottom-0 border-r border-line" />}
                  {s.total > 0 && (
                    <motion.span
                      className="block w-[calc(100%-2px)] max-w-[16px] rounded-t-[4px]"
                      style={{
                        background: s.late ? `repeating-linear-gradient(135deg, ${LATE} 0 3px, #d9534a 3px 6px)` : BAR,
                        opacity: active == null || on ? 1 : 0.4,
                        minHeight: 4,
                      }}
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.6, delay: Math.min(i, 20) * 0.02, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="border-t border-ink/20" />
        <div className="flex mt-1.5 text-[0.68rem] sm:text-xs text-muted-foreground">
          <span className="w-9 mr-3 sm:mr-4 inline-flex items-center justify-center gap-0.5 font-bold text-destructive">
            {lateTotal > 0 && <><AlertTriangle size={11} /> Late</>}
          </span>
          <span className="flex-1 flex justify-between">
            <span>Today</span><span>{short(plusDays(today, 15))}</span><span>{short(plusDays(today, DAYS))}</span>
          </span>
        </div>

        {/* A table can't shrink to sr-only's 1px, so the wrapper hides it. */}
        <div className="sr-only">
          <table>
            <caption>Money expected in the next 30 days</caption>
            <tbody>
              {(forecast.items).map((it, i) => (
                <tr key={i}><th>{it.date < today ? `Late (${it.date})` : it.date}</th><td>{it.label}, {it.detail}</td><td>{money(it.amount, currency)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
