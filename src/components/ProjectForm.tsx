import { AnimatePresence, motion } from "framer-motion";
import { Check, FileText, Layers, Plus, Repeat, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/api";
import Modal from "@/components/Modal";
import { date, errorText, money, todayIso } from "@/lib/format";
import { CURRENCIES, type BillingType, type Client, type Currency, type PaymentStatus, type Profile, type Project } from "@/lib/types";

type Row = { key: number; description: string; amount: string; recurring: boolean };

type Form = {
  title: string;
  client: number | "";
  due_date: string;
  billing_type: BillingType;
  payment_currency: Currency;
  payment_amount: string;
  monthly_amount: string;
  retainer_start: string;
  payment_status: PaymentStatus;
  rows: Row[];
};

let nextKey = 1;
const blankRow = (recurring = false): Row => ({ key: nextKey++, description: "", amount: "", recurring });

const BILLING_OPTIONS: { value: BillingType; label: string; text: string; icon: typeof FileText }[] = [
  { value: "fixed", label: "Fixed fee", text: "One price for the whole project", icon: FileText },
  { value: "monthly", label: "Monthly", text: "A retainer paid every month", icon: Repeat },
  { value: "both", label: "Both", text: "Setup fee plus a monthly retainer", icon: Layers },
];

export function ordinal(d: number) {
  return `${d}${[1, 21, 31].includes(d) ? "st" : [2, 22].includes(d) ? "nd" : [3, 23].includes(d) ? "rd" : "th"}`;
}

function toForm(p: Project | null, currency: Currency, client: number | ""): Form {
  if (!p) {
    return {
      title: "", client, due_date: "", billing_type: "fixed", payment_currency: currency, payment_amount: "",
      monthly_amount: "", retainer_start: todayIso(), payment_status: "unpaid", rows: [],
    };
  }
  return {
    title: p.title, client: p.client, due_date: p.due_date ?? "", billing_type: p.billing_type,
    payment_currency: p.payment_currency, payment_amount: String(Number(p.payment_amount) || ""),
    monthly_amount: String(Number(p.monthly_amount) || ""),
    retainer_start: p.retainer_start ?? p.next_invoice_date ?? todayIso(),
    payment_status: p.payment_status,
    rows: (p.items ?? []).map((i) => ({ key: nextKey++, description: i.description, amount: String(Number(i.amount) || ""), recurring: i.recurring })),
  };
}

/** Create or edit a project: billing, the first monthly payment date and a price breakdown. */
export default function ProjectForm({ open, onClose, project, clients, profile, defaultClient = "", onSaved }: {
  open: boolean;
  onClose: () => void;
  project: Project | null;
  clients: Client[];
  profile: Profile | null;
  defaultClient?: number | "";
  onSaved: (p: Project, created: boolean) => void;
}) {
  const [form, setForm] = useState<Form>(() => toForm(project, profile?.default_currency ?? "KES", defaultClient));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(toForm(project, profile?.default_currency ?? "KES", defaultClient));
  }, [open, project, profile, defaultClient]);

  const showFixed = form.billing_type !== "monthly";
  const showMonthly = form.billing_type !== "fixed";
  const isRecurringRow = (r: Row) => form.billing_type === "monthly" || (form.billing_type === "both" && r.recurring);
  const filled = form.rows.filter((r) => r.description.trim());
  const fixedRows = filled.filter((r) => !isRecurringRow(r));
  const monthlyRows = filled.filter(isRecurringRow);
  const sum = (rows: Row[]) => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  // With a breakdown, the fee is its total.
  const fixedTotal = fixedRows.length ? sum(fixedRows) : null;
  const monthlyTotal = monthlyRows.length ? sum(monthlyRows) : null;
  const day = form.retainer_start ? Number(form.retainer_start.slice(8, 10)) : null;

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const setRow = (key: number, patch: Partial<Row>) => set({ rows: form.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client) return void toast.error("Pick a client first.");
    if (showMonthly && !form.retainer_start) return void toast.error("Set the date the first monthly payment is due.");
    setSaving(true);
    const recurring = showMonthly;
    const payload: Record<string, unknown> = {
      title: form.title,
      client: form.client,
      due_date: form.due_date || null,
      billing_type: form.billing_type,
      payment_currency: form.payment_currency,
      payment_amount: showFixed ? (fixedTotal ?? Number(form.payment_amount || 0)) : 0,
      monthly_amount: recurring ? (monthlyTotal ?? Number(form.monthly_amount || 0)) : 0,
      payment_status: form.payment_status,
      retainer_start: recurring ? form.retainer_start : null,
      items: filled.map((r) => ({ description: r.description.trim(), amount: Number(r.amount) || 0, recurring: isRecurringRow(r) })),
    };
    try {
      if (project) {
        const { data } = await api.patch<Project>(`/projects/${project.id}/`, payload);
        toast.success("Project updated");
        onSaved(data, false);
      } else {
        const { data } = await api.post<Project>("/projects/", { ...payload, status: "active" });
        toast.success("Project created", {
          description: data.next_invoice_date ? `First monthly payment is due ${date(data.next_invoice_date)}.` : undefined,
        });
        onSaved(data, true);
      }
    } catch (err) {
      toast.error(errorText(err, "Couldn't save the project."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={project ? "Edit project" : "New project"}
      subtitle="How you bill decides when you get reminded and what counts as unpaid."
      wide
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" form="project-form" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : project ? "Save changes" : "Create project"}
          </button>
        </>
      }
    >
      <form id="project-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <label className="field sm:col-span-2">
          <span className="field-label">Project name</span>
          <input className="input" placeholder="e.g. Company website" value={form.title} onChange={(e) => set({ title: e.target.value })} required />
        </label>
        <label className="field">
          <span className="field-label">Client</span>
          <select className="input" value={form.client} onChange={(e) => set({ client: Number(e.target.value) || "" })} required>
            <option value="">Choose a client…</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</option>)}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Deadline <span className="text-muted-foreground font-medium">(optional)</span></span>
          <input className="input" type="date" value={form.due_date} onChange={(e) => set({ due_date: e.target.value })} />
        </label>

        <div className="field sm:col-span-2">
          <span className="field-label">How is it billed?</span>
          <div className="grid grid-cols-3 gap-2">
            {BILLING_OPTIONS.map(({ value, label, text, icon: Icon }) => {
              const on = form.billing_type === value;
              return (
                <button
                  type="button"
                  key={value}
                  onClick={() => set({ billing_type: value })}
                  className={`relative text-left rounded-2xl border-[1.5px] p-3 transition-colors ${on ? "border-brand bg-brand-50" : "border-line bg-white hover:border-brand-100"}`}
                >
                  {on && <motion.span layoutId="billing-check" className="absolute top-2.5 right-2.5 grid place-items-center h-5 w-5 rounded-full bg-brand text-white"><Check size={12} /></motion.span>}
                  <Icon size={20} className={on ? "text-brand" : "text-muted-foreground"} />
                  <div className="font-extrabold text-sm text-ink mt-2">{label}</div>
                  <div className="text-xs text-muted-foreground hidden sm:block">{text}</div>
                </button>
              );
            })}
          </div>
        </div>

        <label className="field">
          <span className="field-label">Currency</span>
          <select className="input" value={form.payment_currency} onChange={(e) => set({ payment_currency: e.target.value as Currency })}>
            {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>

        {showFixed && (
          <label className="field">
            <span className="field-label">{form.billing_type === "both" ? "Setup / project fee" : "Project fee"}</span>
            {fixedTotal != null ? (
              <div className="input flex items-center justify-between bg-tint/60">
                <b className="text-ink">{money(fixedTotal, form.payment_currency)}</b>
                <span className="text-xs text-muted-foreground">from breakdown</span>
              </div>
            ) : (
              <input className="input" type="number" inputMode="decimal" min={0} step="0.01" placeholder="25000" value={form.payment_amount} onChange={(e) => set({ payment_amount: e.target.value })} required />
            )}
          </label>
        )}

        {showMonthly && (
          <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2 rounded-2xl bg-white border border-line p-4">
            <label className="field">
              <span className="field-label">Monthly amount</span>
              {monthlyTotal != null ? (
                <div className="input flex items-center justify-between bg-tint/60">
                  <b className="text-ink">{money(monthlyTotal, form.payment_currency)}</b>
                  <span className="text-xs text-muted-foreground">from breakdown</span>
                </div>
              ) : (
                <input className="input" type="number" inputMode="decimal" min={0} step="0.01" placeholder="6000" value={form.monthly_amount} onChange={(e) => set({ monthly_amount: e.target.value })} required />
              )}
            </label>
            <label className="field">
              <span className="field-label">First payment due</span>
              <input className="input" type="date" value={form.retainer_start} onChange={(e) => set({ retainer_start: e.target.value })} required />
            </label>
            <p className="field-hint sm:col-span-2 -mt-1">
              {day ? <>Then every month on the <b className="text-ink">{ordinal(day)}</b>{day > 28 ? " (or the month's last day)" : ""}. </> : null}
              Each month counts as an <b className="text-ink">unpaid fee</b> from its date until you mark it paid or its invoice is paid.
            </p>
          </div>
        )}

        {/* Price breakdown → one invoice line each */}
        <div className="field sm:col-span-2">
          <span className="field-label">
            Price breakdown <span className="text-muted-foreground font-medium">(optional, each becomes an invoice line)</span>
          </span>
          <div className="rounded-2xl border border-line bg-white p-2 sm:p-3">
            <AnimatePresence initial={false}>
              {form.rows.map((r) => (
                <motion.div key={r.key} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="grid grid-cols-[1fr_110px_36px] sm:grid-cols-[1fr_140px_auto_36px] gap-2 py-1.5 items-center">
                    <input className="input" placeholder="e.g. Hosting" value={r.description} onChange={(e) => setRow(r.key, { description: e.target.value })} />
                    <input className="input" type="number" inputMode="decimal" min={0} step="0.01" placeholder="0" aria-label="Amount" value={r.amount} onChange={(e) => setRow(r.key, { amount: e.target.value })} />
                    {form.billing_type === "both" && (
                      <div className="col-span-3 sm:col-span-1 row-start-2 sm:row-start-auto order-last sm:order-none">
                        <div className="segmented !p-0.5 text-xs">
                          {[false, true].map((rec) => (
                            <button type="button" key={String(rec)} data-active={r.recurring === rec} onClick={() => setRow(r.key, { recurring: rec })} className="!px-3 !py-1.5">
                              {r.recurring === rec && <span className="seg-bg" />}
                              {rec ? "Monthly" : "One-off"}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <button type="button" className="icon-btn !h-9 !w-9 hover:!text-destructive" onClick={() => set({ rows: form.rows.filter((x) => x.key !== r.key) })} aria-label="Remove line">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {form.rows.length === 0 && (
              <p className="text-xs text-muted-foreground px-1 py-1.5">E.g. Developer fees 5,000 · Hosting 4,000 · Domain 1,000. Leave empty to bill one total.</p>
            )}
            <button type="button" className="btn btn-ghost btn-sm mt-1" onClick={() => set({ rows: [...form.rows, blankRow(form.billing_type === "monthly")] })}>
              <Plus size={15} /> Add line
            </button>
          </div>
        </div>

        {showFixed && project && (
          <label className="field">
            <span className="field-label">Project fee paid?</span>
            <select className="input" value={form.payment_status} onChange={(e) => set({ payment_status: e.target.value as PaymentStatus })}>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partly paid</option>
              <option value="paid">Paid</option>
            </select>
          </label>
        )}
      </form>
    </Modal>
  );
}
