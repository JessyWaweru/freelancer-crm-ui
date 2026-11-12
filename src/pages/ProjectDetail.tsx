import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle, ArrowLeft, CalendarDays, Check, CheckCircle2, ChevronDown, CircleDollarSign, FileText, ListTodo,
  NotebookPen, Pencil, Plus, ReceiptText, Repeat, RotateCcw, Trash2, Undo2,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import api from "@/api";
import Modal from "@/components/Modal";
import ProjectForm, { ordinal } from "@/components/ProjectForm";
import StatusPill from "@/components/StatusPill";
import { useReminders } from "@/hooks/useReminders";
import { date, errorText, money, relativeDay, todayIso } from "@/lib/format";
import type { Client, Invoice, Note, Profile, Project, RetainerMonth, Todo } from "@/lib/types";

const BILLING_LABEL = { fixed: "Fixed fee", monthly: "Monthly", both: "Fixed + monthly" } as const;

function Section({ icon, title, right, children }: { icon: ReactNode; title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 mb-3">
        <h2 className="text-base font-extrabold flex items-center gap-2"><span className="text-brand">{icon}</span>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function shortMonth(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function monthLabel(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/* ── Retainer months ─────────────────────────────── */
function RetainerMonths({ project, months, onChange }: {
  project: Project; months: RetainerMonth[]; onChange: (p: Project, m: RetainerMonth[]) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const { refresh } = useReminders();
  const visible = showAll ? months : months.slice(0, 4);

  async function toggle(m: RetainerMonth) {
    setBusy(m.period);
    try {
      const { data } = await api.post<{ project: Project; months: RetainerMonth[] }>(`/projects/${project.id}/retainer/`, {
        period: m.period, paid: m.status !== "paid",
      });
      onChange(data.project, data.months);
      toast.success(m.status === "paid" ? `${monthLabel(m.period)} marked unpaid` : `${monthLabel(m.period)} marked paid`);
      refresh();
    } catch (e) {
      toast.error(errorText(e, "Couldn't update that month."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Section
      icon={<Repeat size={17} />}
      title="Monthly payments"
      right={project.unpaid_periods.length > 0
        ? <span className="pill pill-overdue">{money(project.unpaid_retainer_total, project.payment_currency)} unpaid</span>
        : <span className="pill pill-paid"><Check size={12} /> Up to date</span>}
    >
      <p className="text-xs text-muted-foreground mb-3">
        {money(project.monthly_amount, project.payment_currency)} due on the {ordinal(project.billing_day)} of each month
        {project.retainer_start ? `, since ${date(project.retainer_start)}` : ""}{project.retainer_end ? `, until ${date(project.retainer_end)}` : ""}.
      </p>
      <ul className="divide-y divide-line">
        {visible.map((m) => (
          <li key={m.period} className="flex items-center gap-3 py-2.5">
            <span className={`grid place-items-center h-9 w-9 shrink-0 rounded-xl ${m.status === "paid" ? "bg-[#e6f4ec] text-ok" : m.status === "unpaid" ? "bg-[#fdecea] text-destructive" : "bg-tint text-muted-foreground"}`}>
              {m.status === "paid" ? <Check size={16} /> : m.status === "unpaid" ? <AlertCircle size={16} /> : <CalendarDays size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-ink text-sm">
                <span className="sm:hidden">{shortMonth(m.period)}</span><span className="hidden sm:inline">{monthLabel(m.period)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {m.status === "paid"
                  ? `Paid ${date(m.paid_on)}`
                  : `Due ${relativeDay(m.period)}`}
                {m.invoice && <> · <Link className="text-brand font-bold" to={`/app/invoices/${m.invoice.id}`}>{m.invoice.number}</Link></>}
              </div>
            </div>
            <span className="text-sm font-extrabold text-ink tabular-nums hidden sm:block">{money(m.amount, project.payment_currency)}</span>
            <button
              className={`btn btn-sm ${m.status === "paid" ? "btn-ghost" : m.status === "unpaid" ? "btn-ok" : "btn-outline"}`}
              disabled={busy === m.period}
              onClick={() => toggle(m)}
            >
              {m.status === "paid" ? <><Undo2 size={14} /> Undo</> : <><Check size={14} /> Mark paid</>}
            </button>
          </li>
        ))}
      </ul>
      {months.length > 4 && (
        <button className="btn btn-ghost btn-sm mt-1" onClick={() => setShowAll((s) => !s)}>
          <ChevronDown size={15} className={showAll ? "rotate-180" : ""} /> {showAll ? "Show less" : `Show all ${months.length} months`}
        </button>
      )}
    </Section>
  );
}

/* ── To-dos ─────────────────────────────── */
function Todos({ projectId }: { projectId: number }) {
  const { refresh } = useReminders();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    api.get<Todo[]>(`/todos/?project=${projectId}`).then((r) => setTodos(r.data)).catch(() => {});
  }, [projectId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const { data } = await api.post<Todo>("/todos/", { project: projectId, title: title.trim(), due_date: due || null });
      setTodos((t) => [...t, data]);
      setTitle("");
      setDue("");
      if (data.due_date) refresh();
    } catch (err) {
      toast.error(errorText(err, "Couldn't add the to-do."));
    }
  }

  async function update(t: Todo, change: Partial<Todo>) {
    setTodos((ts) => ts.map((x) => (x.id === t.id ? { ...x, ...change } : x)));
    try {
      const { data } = await api.patch<Todo>(`/todos/${t.id}/`, change);
      setTodos((ts) => ts.map((x) => (x.id === t.id ? data : x)));
      refresh();
    } catch {
      setTodos((ts) => ts.map((x) => (x.id === t.id ? t : x)));
      toast.error("Couldn't update the to-do.");
    }
  }

  async function remove(t: Todo) {
    setTodos((ts) => ts.filter((x) => x.id !== t.id));
    try {
      await api.delete(`/todos/${t.id}/`);
      refresh();
    } catch {
      setTodos((ts) => [...ts, t]);
      toast.error("Couldn't delete the to-do.");
    }
  }

  const open = todos.filter((t) => !t.done).sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
  const done = todos.filter((t) => t.done);
  const today = todayIso();

  const row = (t: Todo) => (
    <motion.li key={t.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 20 }} className="flex items-center gap-3 py-2 group">
      <button
        className="group/check grid place-items-center h-10 w-10 -m-2 shrink-0"
        onClick={() => update(t, { done: !t.done })}
        aria-label={t.done ? "Mark not done" : "Mark done"}
      >
        <span className={`grid place-items-center h-6 w-6 rounded-lg border-2 transition-colors ${t.done ? "bg-ok border-ok text-white" : "border-line group-hover/check:border-brand"}`}>
          {t.done && <Check size={14} strokeWidth={3} />}
        </span>
      </button>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-semibold break-words ${t.done ? "line-through text-muted-foreground" : "text-ink"}`}>{t.title}</div>
        {t.due_date && !t.done && (
          <div className={`text-xs ${t.due_date < today ? "text-destructive font-bold" : t.due_date === today ? "text-[#9a6514] font-bold" : "text-muted-foreground"}`}>
            <CalendarDays size={11} className="inline -mt-0.5 mr-1" />Due {relativeDay(t.due_date)}
          </div>
        )}
      </div>
      <button className="icon-btn !h-8 !w-8 sm:opacity-0 sm:group-hover:opacity-100 hover:!text-destructive" onClick={() => remove(t)} aria-label="Delete to-do">
        <Trash2 size={15} />
      </button>
    </motion.li>
  );

  return (
    <Section icon={<ListTodo size={17} />} title="To-dos" right={open.length > 0 && <span className="pill pill-brand">{open.length} open</span>}>
      <form onSubmit={add} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_150px_auto] gap-2 mb-2">
        <input className="input col-span-2 sm:col-span-1" placeholder="Add a to-do…" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input min-w-0" type="date" aria-label="Due date (optional)" value={due} onChange={(e) => setDue(e.target.value)} />
        <button className="btn btn-primary !px-4" disabled={!title.trim()} aria-label="Add to-do"><Plus size={18} /></button>
      </form>
      <p className="field-hint mb-1">Give it a due date to get a reminder and notification.</p>
      <ul className="divide-y divide-line">
        <AnimatePresence initial={false}>{open.map(row)}</AnimatePresence>
      </ul>
      {open.length === 0 && <p className="text-sm text-muted-foreground py-3">Nothing to do yet.</p>}
      {done.length > 0 && (
        <>
          <button className="btn btn-ghost btn-sm mt-1" onClick={() => setShowDone((s) => !s)}>
            <ChevronDown size={15} className={showDone ? "rotate-180" : ""} /> {done.length} done
          </button>
          {showDone && <ul className="divide-y divide-line"><AnimatePresence initial={false}>{done.map(row)}</AnimatePresence></ul>}
        </>
      )}
    </Section>
  );
}

/* ── Notes ─────────────────────────────── */
function Notes({ projectId }: { projectId: number }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    api.get<Note[]>(`/notes/?project=${projectId}`).then((r) => setNotes(r.data)).catch(() => {});
  }, [projectId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      const { data } = await api.post<Note>("/notes/", { project: projectId, body: body.trim() });
      setNotes((n) => [data, ...n]);
      setBody("");
    } catch (err) {
      toast.error(errorText(err, "Couldn't save the note."));
    }
  }

  async function saveEdit(n: Note) {
    if (!draft.trim()) return;
    try {
      const { data } = await api.patch<Note>(`/notes/${n.id}/`, { body: draft.trim() });
      setNotes((ns) => ns.map((x) => (x.id === n.id ? data : x)));
      setEditing(null);
    } catch {
      toast.error("Couldn't save the note.");
    }
  }

  async function remove(n: Note) {
    setNotes((ns) => ns.filter((x) => x.id !== n.id));
    try {
      await api.delete(`/notes/${n.id}/`);
    } catch {
      setNotes((ns) => [n, ...ns]);
      toast.error("Couldn't delete the note.");
    }
  }

  return (
    <Section icon={<NotebookPen size={17} />} title="Notes">
      <form onSubmit={add} className="grid gap-2 mb-3">
        <textarea className="input !min-h-[72px]" placeholder="Write a note: logins, client requests, ideas…" value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="btn btn-primary btn-sm justify-self-end" disabled={!body.trim()}><Plus size={15} /> Add note</button>
      </form>
      <div className="grid gap-2">
        <AnimatePresence initial={false}>
          {notes.map((n) => (
            <motion.div key={n.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="rounded-2xl bg-cream border border-line p-3">
              {editing === n.id ? (
                <div className="grid gap-2">
                  <textarea className="input" value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
                  <div className="flex justify-end gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
                    <button className="btn btn-primary btn-sm" onClick={() => saveEdit(n)}>Save</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-sm text-ink whitespace-pre-wrap break-words">{n.body}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{date(n.updated_at)}</span>
                    <div className="flex">
                      <button className="icon-btn !h-8 !w-8" onClick={() => { setEditing(n.id); setDraft(n.body); }} aria-label="Edit note"><Pencil size={14} /></button>
                      <button className="icon-btn !h-8 !w-8 hover:!text-destructive" onClick={() => remove(n)} aria-label="Delete note"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
    </Section>
  );
}

/* ── Page ─────────────────────────────── */
export default function ProjectDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { refresh } = useReminders();
  const [project, setProject] = useState<Project | null>(null);
  const [months, setMonths] = useState<RetainerMonth[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      api.get<{ project: Project; months: RetainerMonth[] }>(`/projects/${id}/retainer/`),
      api.get<Invoice[]>(`/invoices/?project=${id}`),
    ])
      .then(([r, i]) => { setProject(r.data.project); setMonths(r.data.months); setInvoices(i.data); })
      .catch(() => { toast.error("Project not found."); nav("/app/projects"); });
  }, [id, nav]);

  useEffect(() => {
    load();
    Promise.all([api.get<Client[]>("/clients/"), api.get<Profile>("/profile/")])
      .then(([c, p]) => { setClients(c.data); setProfile(p.data); })
      .catch(() => {});
  }, [load]);

  async function patch(change: Partial<Project>, message: string) {
    if (!project) return;
    try {
      await api.patch<Project>(`/projects/${project.id}/`, change);
      toast.success(message);
      load();
      refresh();
    } catch (e) {
      toast.error(errorText(e, "Couldn't update the project."));
    }
  }

  async function invoice(kind: "fixed" | "monthly") {
    if (!project) return;
    try {
      const { data } = await api.post<Invoice>(`/projects/${project.id}/generate_invoice/`, { kind });
      toast.success(`${data.number} created as a draft`);
      refresh();
      nav(`/app/invoices/${data.id}`);
    } catch (err) {
      toast.error(errorText(err, "Couldn't create the invoice."));
    }
  }

  async function remove() {
    if (!project) return;
    try {
      await api.delete(`/projects/${project.id}/`);
      toast.success("Project deleted");
      refresh();
      nav("/app/projects");
    } catch {
      toast.error("Couldn't delete the project.");
    }
  }

  if (!project) {
    return <div className="grid gap-4"><div className="skeleton h-24" /><div className="grid gap-4 lg:grid-cols-2"><div className="skeleton h-72" /><div className="skeleton h-72" /></div></div>;
  }

  const p = project;
  const hasFixed = p.billing_type !== "monthly";
  const recurring = p.billing_type !== "fixed";
  const overdue = p.status === "active" && !!p.due_date && p.due_date < todayIso();
  const fixedItems = p.items.filter((i) => !i.recurring);
  const monthlyItems = p.items.filter((i) => i.recurring);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-2 sm:gap-3 mb-5">
        <Link to="/app/projects" className="icon-btn shrink-0 -ml-2" aria-label="Back to projects"><ArrowLeft size={20} /></Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="pill pill-brand">{BILLING_LABEL[p.billing_type]}</span>
            {p.status === "completed" && <span className="pill pill-paid"><Check size={12} /> Done</span>}
            {overdue && <span className="pill pill-overdue">Past deadline</span>}
          </div>
          <h1 className="text-[1.6rem] sm:text-[2.1rem] font-extrabold break-words">{p.title}</h1>
          <Link to={`/app/projects?client=${p.client}`} className="tap text-sm text-muted-foreground hover:text-brand">{p.client_name}</Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {hasFixed && <button className="btn btn-primary btn-sm" onClick={() => invoice("fixed")}><FileText size={15} /> Invoice fee</button>}
        {recurring && p.next_invoice_date && <button className="btn btn-primary btn-sm" onClick={() => invoice("monthly")}><Repeat size={15} /> Invoice {monthLabel(p.next_invoice_date).split(" ")[0]}</button>}
        <button className="btn btn-outline btn-sm" onClick={() => setEditOpen(true)}><Pencil size={15} /> Edit</button>
        <button className="btn btn-outline btn-sm" onClick={() => patch({ status: p.status === "completed" ? "active" : "completed" }, p.status === "completed" ? "Marked active" : "Marked complete")}>
          {p.status === "completed" ? <><RotateCcw size={15} /> Reopen</> : <><CheckCircle2 size={15} /> Complete</>}
        </button>
        <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}><Trash2 size={15} /> Delete</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 mb-6">
        {hasFixed && (
          <div className="card p-3 sm:p-4 min-w-0">
            <div className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><CircleDollarSign size={12} /> Project fee</div>
            <div className="font-extrabold text-ink text-base sm:text-lg mt-1 break-words">{money(p.payment_amount, p.payment_currency)}</div>
            <select
              className={`mt-2 pill border-0 cursor-pointer capitalize min-h-[36px] ${p.payment_status === "paid" ? "pill-paid" : p.payment_status === "partial" ? "pill-sent" : "pill-overdue"}`}
              value={p.payment_status}
              onChange={(e) => patch({ payment_status: e.target.value as Project["payment_status"] }, "Payment status updated")}
              aria-label="Project fee paid?"
            >
              <option value="unpaid">Unpaid</option>
              <option value="partial">Part paid</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        )}
        {recurring && (
          <div className="card p-3 sm:p-4 min-w-0">
            <div className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Repeat size={12} /> Monthly</div>
            <div className="font-extrabold text-ink text-base sm:text-lg mt-1 break-words">{money(p.monthly_amount, p.payment_currency)}</div>
            <div className="text-xs mt-2">
              {p.unpaid_periods.length > 0
                ? <span className="pill pill-overdue">{p.unpaid_periods.length} unpaid</span>
                : p.next_invoice_date ? <span className="text-muted-foreground">Next due <b className="text-ink">{relativeDay(p.next_invoice_date)}</b></span> : <span className="text-muted-foreground">All paid</span>}
            </div>
          </div>
        )}
        <div className={`card p-3 sm:p-4 min-w-0 ${hasFixed && recurring ? "col-span-2 lg:col-span-1" : ""}`}>
          <div className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><CalendarDays size={12} /> Deadline</div>
          <div className={`font-extrabold text-base sm:text-lg mt-1 ${overdue ? "text-destructive" : "text-ink"}`}>{p.due_date ? date(p.due_date) : "None"}</div>
          <div className="text-xs text-muted-foreground mt-2">Started {date(p.start_date)}</div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 items-start">
        <div className="grid grid-cols-1 gap-4 min-w-0">
          <Todos projectId={p.id} />
          <Notes projectId={p.id} />
        </div>
        <div className="grid grid-cols-1 gap-4 min-w-0">
          {recurring && months.length > 0 && (
            <RetainerMonths project={p} months={months} onChange={(np, m) => { setProject(np); setMonths(m); }} />
          )}

          {p.items.length > 0 && (
            <Section icon={<FileText size={17} />} title="Price breakdown">
              {[{ label: "One-off", rows: fixedItems, total: p.payment_amount }, { label: "Every month", rows: monthlyItems, total: p.monthly_amount }]
                .filter((g) => g.rows.length)
                .map((g) => (
                  <div key={g.label} className="mb-2 last:mb-0">
                    {p.billing_type === "both" && <div className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground mb-1">{g.label}</div>}
                    <ul className="text-sm">
                      {g.rows.map((i) => (
                        <li key={i.id} className="flex justify-between gap-3 py-1.5 border-b border-line/70">
                          <span className="text-ink">{i.description}</span>
                          <span className="tabular-nums font-semibold">{money(i.amount, p.payment_currency)}</span>
                        </li>
                      ))}
                      <li className="flex justify-between gap-3 py-1.5 font-extrabold text-ink">
                        <span>Total</span><span className="tabular-nums">{money(g.total, p.payment_currency)}</span>
                      </li>
                    </ul>
                  </div>
                ))}
            </Section>
          )}

          <Section icon={<ReceiptText size={17} />} title="Invoices">
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices for this project yet.</p>
            ) : (
              <ul className="divide-y divide-line -mx-1">
                {invoices.map((inv) => (
                  <li key={inv.id}>
                    <Link to={`/app/invoices/${inv.id}`} className="flex items-center gap-3 px-1 py-2.5 rounded-xl hover:bg-tint/60">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-ink text-sm">{inv.number}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {inv.period_start ? monthLabel(inv.period_start) : inv.kind === "fixed" ? "Project fee" : "Custom"} · due {date(inv.due_date)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-ink text-sm tabular-nums">{money(inv.total, inv.currency)}</div>
                        <StatusPill invoice={inv} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      <ProjectForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        project={p}
        clients={clients}
        profile={profile}
        onSaved={() => { setEditOpen(false); load(); refresh(); }}
      />

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete project?"
        subtitle={`“${p.title}” and its notes and to-dos will be removed. Its invoices are kept.`}
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setConfirmDelete(false)}>Keep</button>
            <button className="btn btn-danger" onClick={remove}><Trash2 size={16} /> Delete</button>
          </>
        }
      >
        <span />
      </Modal>
    </div>
  );
}
