export function money(amount: string | number | null | undefined, currency = "KES", opts: { compact?: boolean } = {}) {
  const n = Number(amount ?? 0);
  if (Number.isNaN(n)) return "—";
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency,
      currencyDisplay: "code",
      notation: opts.compact ? "compact" : "standard",
      minimumFractionDigits: opts.compact ? 0 : 2,
      maximumFractionDigits: opts.compact ? 1 : 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function date(d: string | null | undefined, style: "short" | "long" = "short") {
  if (!d) return "—";
  const dt = new Date(d.length === 10 ? `${d}T00:00:00` : d);
  return dt.toLocaleDateString("en-GB", style === "long"
    ? { day: "numeric", month: "long", year: "numeric" }
    : { day: "numeric", month: "short", year: "numeric" });
}

export function todayIso() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function addDaysIso(days: number, from = todayIso()) {
  const d = new Date(`${from}T00:00:00`);
  d.setDate(d.getDate() + days);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** "in 3 days", "today", "2 days ago" */
export function relativeDay(d: string) {
  const diff = Math.round((new Date(`${d}T00:00:00`).getTime() - new Date(`${todayIso()}T00:00:00`).getTime()) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  return diff > 0 ? `in ${diff} days` : `${-diff} days ago`;
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
}

export function errorText(err: unknown, fallback = "Something went wrong.") {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return fallback;
  if (typeof data === "object") {
    const first = Object.values(data as Record<string, unknown>)[0];
    if (Array.isArray(first)) return String(first[0]);
    if (typeof first === "string") return first;
    if (first && typeof first === "object") return errorText({ response: { data: first } }, fallback);
  }
  return fallback;
}
