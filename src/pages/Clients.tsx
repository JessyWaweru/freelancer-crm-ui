import { AnimatePresence, motion } from "framer-motion";
import { Building2, FolderKanban, Mail, Pencil, Phone, Plus, Search, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/api";
import EmptyState from "@/components/EmptyState";
import Modal from "@/components/Modal";
import PageHeader from "@/components/PageHeader";
import PhoneInput from "@/helpers/PhoneInput";
import { errorText, initials, money } from "@/lib/format";
import type { Client, Invoice, Project } from "@/lib/types";

type Form = { name: string; email: string; phone: string; company: string };
const EMPTY: Form = { name: "", email: "", phone: "", company: "" };

// Warm avatar colours drawn from the brand palette.
const AVATARS = ["bg-brand text-cream", "bg-gold text-ink", "bg-brand-800 text-gold", "bg-brand-100 text-brand", "bg-[#c0456b] text-cream"];

export default function Clients() {
  const nav = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Client | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [phoneValid, setPhoneValid] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Client | null>(null);

  useEffect(() => {
    Promise.all([api.get<Client[]>("/clients/"), api.get<Project[]>("/projects/"), api.get<Invoice[]>("/invoices/")])
      .then(([c, p, i]) => {
        setClients(c.data);
        setProjects(p.data);
        setInvoices(i.data);
      })
      .catch(() => toast.error("Couldn't load clients."))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const map: Record<number, { projects: number; outstanding: Record<string, number> }> = {};
    for (const p of projects) (map[p.client] ??= { projects: 0, outstanding: {} }).projects++;
    const add = (client: number, cur: string, amt: number) => {
      const s = (map[client] ??= { projects: 0, outstanding: {} });
      s.outstanding[cur] = (s.outstanding[cur] ?? 0) + amt;
    };
    // Sent invoices waiting for payment.
    for (const i of invoices) if (i.status === "sent") add(i.client, i.currency, Number(i.total));
    // Plus fees owed that aren't on a sent invoice yet (same as the Projects "Unpaid fees" tab).
    for (const p of projects) {
      const own = invoices.filter((i) => i.project === p.id && i.status !== "void");
      const sentMonths = new Set(own.filter((i) => i.kind === "monthly" && i.status !== "draft").map((i) => i.period_start));
      const months = (p.unpaid_periods ?? []).filter((d) => !sentMonths.has(d)).length;
      if (months) add(p.client, p.payment_currency, months * Number(p.monthly_amount));
      const feeInvoiced = own.some((i) => i.kind !== "monthly" && i.status !== "draft");
      if (p.billing_type !== "monthly" && p.payment_status === "unpaid" && !feeInvoiced && Number(p.payment_amount) > 0) {
        add(p.client, p.payment_currency, Number(p.payment_amount));
      }
    }
    return map;
  }, [projects, invoices]);

  const filtered = clients.filter((c) =>
    [c.name, c.company, c.email, c.phone].some((v) => v?.toLowerCase().includes(search.toLowerCase()))
  );

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setPhoneValid(false);
    setFormOpen(true);
  }

  function openEdit(c: Client) {
    setEditing(c);
    setForm({ name: c.name, email: c.email ?? "", phone: c.phone, company: c.company ?? "" });
    setPhoneValid(true);
    setFormOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneValid) return;
    setSaving(true);
    try {
      if (editing) {
        const { data } = await api.put<Client>(`/clients/${editing.id}/`, form);
        setClients((cs) => cs.map((c) => (c.id === editing.id ? data : c)));
        toast.success("Client updated");
      } else {
        const { data } = await api.post<Client>("/clients/", form);
        setClients((cs) => [data, ...cs]);
        toast.success(`${data.name} added`);
      }
      setFormOpen(false);
    } catch (err) {
      toast.error(errorText(err, "Couldn't save the client."));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const prev = clients;
    setClients((cs) => cs.filter((c) => c.id !== deleting.id));
    setDeleting(null);
    try {
      await api.delete(`/clients/${deleting.id}/`);
      toast.success("Client deleted");
    } catch {
      setClients(prev);
      toast.error("Couldn't delete the client.");
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="People you work for"
        title="Clients"
        subtitle="Everyone you bill, with their projects and what they owe you."
        actions={<button className="btn btn-primary" onClick={openNew}><Plus size={18} /> Add client</button>}
      />

      {clients.length > 0 && (
        <div className="relative mb-5 max-w-sm">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input className="input !pl-10 !rounded-full" placeholder="Search clients" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-[170px]" />)}</div>
      ) : clients.length === 0 ? (
        <EmptyState
          icon={<Users size={28} />}
          title="No clients yet"
          text="Add the people and businesses you work for. You'll attach projects and invoices to them."
          action={<button className="btn btn-primary" onClick={openNew}><Plus size={18} /> Add your first client</button>}
        />
      ) : (
        <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {filtered.map((c, idx) => {
              const s = stats[c.id];
              const owed = Object.entries(s?.outstanding ?? {});
              return (
                <motion.article
                  key={c.id}
                  layout
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: Math.min(idx, 8) * 0.04 } }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="card card-hover p-4 sm:p-5 group flex flex-col min-w-0"
                >
                  <div className="flex items-start gap-3">
                    <div className={`grid place-items-center h-12 w-12 rounded-2xl font-extrabold text-lg shrink-0 ${AVATARS[c.id % AVATARS.length]}`}>
                      {initials(c.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-ink truncate">{c.name}</h3>
                      {c.company && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1.5 truncate"><Building2 size={13} /> {c.company}</div>
                      )}
                    </div>
                    <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button className="icon-btn !h-8 !w-8" onClick={() => openEdit(c)} aria-label={`Edit ${c.name}`}><Pencil size={15} /></button>
                      <button className="icon-btn !h-8 !w-8 hover:!text-destructive hover:!bg-[#fdecea]" onClick={() => setDeleting(c)} aria-label={`Delete ${c.name}`}><Trash2 size={15} /></button>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1.5 text-sm">
                    <a href={`tel:${c.phone}`} className="flex items-center gap-2 py-1 text-text hover:text-brand"><Phone size={14} className="text-brand" /> {c.phone}</a>
                    {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-2 py-1 text-text hover:text-brand min-w-0"><Mail size={14} className="text-brand shrink-0" /> <span className="truncate">{c.email}</span></a>}
                  </div>
                  <div className="mt-auto pt-4 flex items-center justify-between gap-2 border-t border-line mt-4">
                    <button className="text-xs font-bold text-muted-foreground inline-flex items-center gap-1.5 hover:text-brand" onClick={() => nav(`/app/projects?client=${c.id}`)}>
                      <FolderKanban size={14} /> {s?.projects ?? 0} project{s?.projects === 1 ? "" : "s"}
                    </button>
                    {owed.length > 0 ? (
                      <span className="pill pill-sent">Owes {owed.map(([cur, amt]) => money(amt, cur, { compact: true })).join(" + ")}</span>
                    ) : (
                      <span className="pill pill-paid">All settled</span>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
          {filtered.length === 0 && <p className="text-muted-foreground text-sm col-span-full">No clients match “{search}”.</p>}
        </motion.div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit client" : "New client"}
        subtitle={editing ? editing.name : "Their details appear on the invoices you send them."}
        footer={
          <>
            <button type="button" className="btn btn-outline" onClick={() => setFormOpen(false)}>Cancel</button>
            <button type="submit" form="client-form" className="btn btn-primary" disabled={!phoneValid || saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add client"}
            </button>
          </>
        }
      >
        <form id="client-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <label className="field sm:col-span-2">
            <span className="field-label">Name</span>
            <input className="input" placeholder="e.g. Jane Wanjiru" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </label>
          <label className="field">
            <span className="field-label">Company <span className="text-muted-foreground font-medium">(optional)</span></span>
            <input className="input" placeholder="e.g. Acme Ltd" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </label>
          <label className="field">
            <span className="field-label">Email <span className="text-muted-foreground font-medium">(optional)</span></span>
            <input className="input" type="email" placeholder="jane@acme.co.ke" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <div className="field sm:col-span-2">
            <span className="field-label">Phone</span>
            <PhoneInput key={editing?.id ?? "new"} value={form.phone} onChange={(phone) => setForm((f) => ({ ...f, phone }))} onValidChange={setPhoneValid} />
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete client?"
        subtitle={deleting ? `${deleting.name} and all their projects and invoices will be removed. This can't be undone.` : ""}
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
