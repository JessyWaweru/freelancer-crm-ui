import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays, Check, CircleDollarSign, FileText, FolderKanban, Layers, MoreHorizontal, Pencil, Plus,
  Repeat, RotateCcw, Search, Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import api from "@/api";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import Segmented from "@/components/Segmented";
import { useReminders } from "@/hooks/useReminders";
import { date, errorText, money, relativeDay, todayIso } from "@/lib/format";
import { CURRENCIES, type BillingType, type Client, type Currency, type Invoice, type PaymentStatus, type Profile, type Project } from "@/lib/types";

type Tab = "all" | "active" | "completed" | "unpaid";

type Form = {
  title: string;
  client: number | "";
  due_date: string;
  billing_type: BillingType;
  payment_currency: Currency;
  payment_amount: string;
  monthly_amount: string;
  billing_day: number;
  next_invoice_date: string;
  payment_status: PaymentStatus;
};

const BILLING_OPTIONS: { value: BillingType; label: string; text: string; icon: typeof FileText }[] = [
  { value: "fixed", label: "Fixed fee", text: "One price for the whole project", icon: FileText },
  { value: "monthly", label: "Monthly", text: "A retainer billed every month", icon: Repeat },
  { value: "both", label: "Both", text: "Setup fee plus a monthly retainer", icon: Layers },
];

const BILLING_LABEL: Record<BillingType, string> = { fixed: "Fixed fee", monthly: "Monthly", both: "Fixed + monthly" };

function ordinal(d: number) {
  return `${d}${[1, 21].includes(d) ? "st" : [2, 22].includes(d) ? "nd" : [3, 23].includes(d) ? "rd" : "th"}`;
}

function emptyForm(currency: Currency, client: number | ""): Form {
  return {
    title: "", client, due_date: "", billing_type: "fixed", payment_currency: currency,
    payment_amount: "", monthly_amount: "", billing_day: 1, next_invoice_date: "", payment_status: "unpaid",
  };
}

function isUnpaidFee(p: Project) {
  return p.billing_type !== "monthly" && p.payment_status !== "paid" && Number(p.payment_amount) > 0;
}

function ProjectMenu({ project, onEdit, onToggle, onDelete, onInvoice }: {
  project: Project; onEdit: () => void; onToggle: () => void; onDelete: () => void; onInvoice: (k: "fixed" | "monthly") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const Item = ({ icon: Icon, label, onClick, danger = false }: { icon: typeof Pencil; label: string; onClick: () => void; danger?: boolean }) => (
    <button
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-left ${danger ? "text-destructive hover:bg-[#fdecea]" : "hover:bg-tint"}`}
      onClick={() => { setOpen(false); onClick(); }}
    >
      <Icon size={15} /> {label}
    </button>
  );
  return (
    <div className="relative" ref={ref}>
      <button className="icon-btn !h-8 !w-8" onClick={() => setOpen((o) => !o)} aria-label="Project actions"><MoreHorizontal size={18} /></button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            className="absolute right-0 top-9 z-20 w-56 card p-1.5 shadow-[var(--shadow)] origin-top-right"
          >
            {project.billing_type !== "monthly" && <Item icon={FileText} label="Invoice the project fee" onClick={() => onInvoice("fixed")} />}
            {project.billing_type !== "fixed" && <Item icon={Repeat} label="Invoice next month now" onClick={() => onInvoice("monthly")} />}
            <Item icon={Pencil} label="Edit" onClick={onEdit} />
            <Item icon={project.status === "completed" ? RotateCcw : Check} label={project.status === "completed" ? "Mark active" : "Mark complete"} onClick={onToggle} />
            <Item icon={Trash2} label="Delete" onClick={onDelete} danger />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Projects() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const clientFilter = Number(params.get("client")) || null;
  const { refresh: refreshReminders } = useReminders();

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("active");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<Form>(emptyForm("KES", ""));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Project | null>(null);

  useEffect(() => {
    Promise.all([api.get<Project[]>("/projects/"), api.get<Client[]>("/clients/"), api.get<Profile>("/profile/")])
      .then(([p, c, pr]) => {
        setProjects(p.data.sort((a, b) => b.id - a.id));
        setClients(c.data);
        setProfile(pr.data);
      })
      .catch(() => toast.error("Couldn't load projects."))
      .finally(() => setLoading(false));
  }, []);

  const scoped = clientFilter ? projects.filter((p) => p.client === clientFilter) : projects;
  const counts = useMemo(() => ({
    active: scoped.filter((p) => p.status === "active").length,
    unpaid: scoped.filter(isUnpaidFee).length,
  }), [scoped]);

  const filtered = scoped.filter((p) => {
    const inTab = tab === "all" ? true : tab === "unpaid" ? isUnpaidFee(p) : p.status === tab;
    const q = search.toLowerCase();
    return inTab && (p.title.toLowerCase().includes(q) || (p.client_name ?? "").toLowerCase().includes(q));
  });

  function openNew() {
    setEditing(null);
    setForm(emptyForm(profile?.default_currency ?? "KES", clientFilter ?? (clients.length === 1 ? clients[0].id : "")));
    setFormOpen(true);
  }

  function openEdit(p: Project) {
    setEditing(p);
    setForm({
      title: p.title, client: p.client, due_date: p.due_date ?? "", billing_type: p.billing_type,
      payment_currency: p.payment_currency, payment_amount: String(Number(p.payment_amount) || ""),
      monthly_amount: String(Number(p.monthly_amount) || ""), billing_day: p.billing_day,
      next_invoice_date: p.next_invoice_date ?? "", payment_status: p.payment_status,
    });
    setFormOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client) return void toast.error("Pick a client first.");
    setSaving(true);
    const recurring = form.billing_type !== "fixed";
    const payload: Record<string, unknown> = {
      title: form.title,
      client: form.client,
      due_date: form.due_date || null,
      billing_type: form.billing_type,
      payment_currency: form.payment_currency,
      payment_amount: form.billing_type === "monthly" ? 0 : Number(form.payment_amount || 0),
      monthly_amount: recurring ? Number(form.monthly_amount || 0) : 0,
      billing_day: form.billing_day,
      payment_status: form.payment_status,
    };
    if (editing && recurring && form.next_invoice_date) payload.next_invoice_date = form.next_invoice_date;
    if (!recurring) payload.next_invoice_date = null;
    try {
      if (editing) {
        const { data } = await api.patch<Project>(`/projects/${editing.id}/`, payload);
        setProjects((ps) => ps.map((p) => (p.id === data.id ? data : p)));
        toast.success("Project updated");
      } else {
        const { data } = await api.post<Project>("/projects/", { ...payload, status: "active" });
        setProjects((ps) => [data, ...ps]);
        setTab("active");
        toast.success("Project created", {
          description: data.next_invoice_date ? `First monthly invoice is due ${date(data.next_invoice_date)}.` : undefined,
        });
      }
      setFormOpen(false);
      refreshReminders();
    } catch (err) {
      toast.error(errorText(err, "Couldn't save the project."));
    } finally {
      setSaving(false);
    }
  }

  async function patch(p: Project, change: Partial<Project>, message: string) {
    setProjects((ps) => ps.map((x) => (x.id === p.id ? { ...x, ...change } : x)));
    try {
      const { data } = await api.patch<Project>(`/projects/${p.id}/`, change);
      setProjects((ps) => ps.map((x) => (x.id === p.id ? data : x)));
      toast.success(message);
      refreshReminders();
    } catch {
      setProjects((ps) => ps.map((x) => (x.id === p.id ? p : x)));
      toast.error("Couldn't update the project.");
    }
  }

  async function invoice(p: Project, kind: "fixed" | "monthly") {
    try {
      const { data } = await api.post<Invoice>(`/projects/${p.id}/generate_invoice/`, { kind });
      toast.success(`${data.number} created as a draft`);
      refreshReminders();
      nav(`/app/invoices/${data.id}`);
    } catch (err) {
      toast.error(errorText(err, "Couldn't create the invoice."));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    setProjects((ps) => ps.filter((p) => p.id !== target.id));
    try {
      await api.delete(`/projects/${target.id}/`);
      toast.success("Project deleted");
      refreshReminders();
    } catch {
      setProjects((ps) => [target, ...ps]);
      toast.error("Couldn't delete the project.");
    }
  }

  const clientName = clientFilter ? clients.find((c) => c.id === clientFilter)?.name : null;
  const showFixed = form.billing_type !== "monthly";
  const showMonthly = form.billing_type !== "fixed";

  return (
    <div>
      <PageHeader
        eyebrow="Work in progress"
        title="Projects"
        subtitle="Set how each project is billed: fixed fee, monthly, or both. You'll get a reminder when it's time to invoice."
        actions={
          <button className="btn btn-primary" onClick={openNew} disabled={!loading && clients.length === 0}>
            <Plus size={18} /> New project
          </button>
        }
      />

      {clientName && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="pill pill-ink">Client: {clientName}</span>
          <button className="text-brand font-bold" onClick={() => setParams({})}>Show all</button>
        </div>
      )}

      {projects.length > 0 && (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: "active", label: "Active", count: counts.active },
              { value: "completed", label: "Completed" },
              { value: "unpaid", label: "Unpaid fees", count: counts.unpaid },
              { value: "all", label: "All" },
            ]}
          />
          <div className="relative md:w-72">
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className="input !pl-10 !rounded-full" placeholder="Search projects or clients" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-[190px]" />)}</div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={28} />}
          title="Add a client first"
          text="Projects belong to a client. Add one, then come back to set up the project and its billing."
          action={<Link to="/app/clients" className="btn btn-primary">Go to clients</Link>}
        />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={28} />}
          title="No projects yet"
          text="Create a project, choose fixed fee, monthly or both, and the CRM will tell you when each invoice is due."
          action={<button className="btn btn-primary" onClick={openNew}><Plus size={18} /> New project</button>}
        />
      ) : (
        <motion.div layout className="grid gap-4 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((p, idx) => {
              const overdue = p.status === "active" && !!p.due_date && p.due_date < todayIso();
              const nextSoon = !!p.next_invoice_date && p.next_invoice_date <= todayIso();
              return (
                <motion.article
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: Math.min(idx, 8) * 0.04 } }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className={`card card-hover p-5 flex flex-col gap-4 ${p.status === "completed" ? "opacity-80" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span className="pill pill-brand">{BILLING_LABEL[p.billing_type]}</span>
                        {p.status === "completed" && <span className="pill pill-paid"><Check size={12} /> Done</span>}
                        {p.status === "on-hold" && <span className="pill pill-draft">On hold</span>}
                        {overdue && <span className="pill pill-overdue">Past deadline</span>}
                      </div>
                      <h3 className="font-extrabold text-ink text-lg leading-snug">{p.title}</h3>
                      <button className="text-sm text-muted-foreground hover:text-brand" onClick={() => setParams({ client: String(p.client) })}>
                        {p.client_name}
                      </button>
                    </div>
                    <ProjectMenu
                      project={p}
                      onEdit={() => openEdit(p)}
                      onToggle={() => patch(p, { status: p.status === "completed" ? "active" : "completed" }, p.status === "completed" ? "Marked active" : "Marked complete")}
                      onDelete={() => setDeleting(p)}
                      onInvoice={(k) => invoice(p, k)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {p.billing_type !== "monthly" && (
                      <div className="rounded-2xl bg-tint/70 p-3">
                        <div className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><CircleDollarSign size={12} /> Project fee</div>
                        <div className="font-extrabold text-ink mt-0.5">{money(p.payment_amount, p.payment_currency)}</div>
                        <span className={`pill capitalize mt-1.5 ${p.payment_status === "paid" ? "pill-paid" : p.payment_status === "partial" ? "pill-sent" : "pill-draft"}`}>
                          {p.payment_status === "partial" ? "Part paid" : p.payment_status}
                        </span>
                      </div>
                    )}
                    {p.billing_type !== "fixed" && (
                      <div className={`rounded-2xl p-3 ${nextSoon && p.status === "active" ? "bg-gold-50" : "bg-tint/70"}`}>
                        <div className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Repeat size={12} /> Monthly</div>
                        <div className="font-extrabold text-ink mt-0.5">{money(p.monthly_amount, p.payment_currency)}</div>
                        <div className="text-xs text-muted-foreground mt-1.5">
                          {p.status !== "active" ? "Paused" : p.next_invoice_date ? <>Next invoice <b className="text-ink">{relativeDay(p.next_invoice_date)}</b></> : "—"}
                        </div>
                      </div>
                    )}
                    <div className="rounded-2xl bg-tint/70 p-3">
                      <div className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><CalendarDays size={12} /> Deadline</div>
                      <div className={`font-extrabold mt-0.5 ${overdue ? "text-destructive" : "text-ink"}`}>{p.due_date ? date(p.due_date) : "None"}</div>
                      <div className="text-xs text-muted-foreground mt-1.5">Started {date(p.start_date)}</div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
          {filtered.length === 0 && <p className="text-muted-foreground text-sm col-span-full py-6">No projects here.</p>}
        </motion.div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit project" : "New project"}
        subtitle="How you bill decides when you get reminded to send invoices."
        wide
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" form="project-form" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create project"}
            </button>
          </>
        }
      >
        <form id="project-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <label className="field sm:col-span-2">
            <span className="field-label">Project name</span>
            <input className="input" placeholder="e.g. Company website" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required autoFocus />
          </label>
          <label className="field">
            <span className="field-label">Client</span>
            <select className="input" value={form.client} onChange={(e) => setForm({ ...form, client: Number(e.target.value) || "" })} required>
              <option value="">Choose a client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Deadline <span className="text-muted-foreground font-medium">(optional)</span></span>
            <input className="input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
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
                    onClick={() => setForm({ ...form, billing_type: value })}
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
            <select className="input" value={form.payment_currency} onChange={(e) => setForm({ ...form, payment_currency: e.target.value as Currency })}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>

          {showFixed && (
            <motion.label key="fixed" className="field" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
              <span className="field-label">{form.billing_type === "both" ? "Setup / project fee" : "Project fee"}</span>
              <input className="input" type="number" min={0} step="0.01" placeholder="25000" value={form.payment_amount} onChange={(e) => setForm({ ...form, payment_amount: e.target.value })} required />
            </motion.label>
          )}

          {showMonthly && (
            <motion.div
              key="monthly"
              className="sm:col-span-2 grid gap-4 sm:grid-cols-3 rounded-2xl bg-white border border-line p-4"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <label className="field">
                <span className="field-label">Monthly amount</span>
                <input className="input" type="number" min={0} step="0.01" placeholder="6000" value={form.monthly_amount} onChange={(e) => setForm({ ...form, monthly_amount: e.target.value })} required />
              </label>
              <label className="field">
                <span className="field-label">Invoice on</span>
                <select className="input" value={form.billing_day} onChange={(e) => setForm({ ...form, billing_day: Number(e.target.value), next_invoice_date: "" })}>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>the {ordinal(d)} of each month</option>)}
                </select>
              </label>
              {editing ? (
                <label className="field">
                  <span className="field-label">Next invoice</span>
                  <input className="input" type="date" value={form.next_invoice_date} onChange={(e) => setForm({ ...form, next_invoice_date: e.target.value })} />
                </label>
              ) : (
                <p className="field-hint self-end pb-2">
                  You'll be reminded {profile?.reminder_days_before ?? 3} days before each monthly invoice is due.
                </p>
              )}
            </motion.div>
          )}

          {showFixed && editing && (
            <label className="field">
              <span className="field-label">Project fee paid?</span>
              <select className="input" value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value as PaymentStatus })}>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partly paid</option>
                <option value="paid">Paid</option>
              </select>
            </label>
          )}
        </form>
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete project?"
        subtitle={deleting ? `“${deleting.title}” will be removed. Its invoices are kept.` : ""}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setDeleting(null)}>Keep</button>
            <button className="btn btn-danger" onClick={confirmDelete}><Trash2 size={16} /> Delete</button>
          </>
        }
      >
        <span />
      </Modal>
    </div>
  );
}
