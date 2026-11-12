import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import api from "@/api";
import Modal from "@/components/Modal";
import { addDaysIso, errorText, money, todayIso } from "@/lib/format";
import { CURRENCIES, type Client, type Currency, type Invoice, type Profile, type Project } from "@/lib/types";

type Line = { key: number; description: string; quantity: string; unit_price: string };

let nextKey = 1;
const blankLine = (): Line => ({ key: nextKey++, description: "", quantity: "1", unit_price: "" });

export default function InvoiceEditor({ open, onClose, invoice, onSaved }: {
  open: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
  onSaved: (inv: Invoice) => void;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [client, setClient] = useState<number | "">("");
  const [project, setProject] = useState<number | "">("");
  const [currency, setCurrency] = useState<Currency>("KES");
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(addDaysIso(14));
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([api.get<Client[]>("/clients/"), api.get<Project[]>("/projects/"), api.get<Profile>("/profile/")]).then(([c, p, pr]) => {
      setClients(c.data);
      setProjects(p.data);
      setProfile(pr.data);
      if (invoice) {
        setClient(invoice.client);
        setProject(invoice.project ?? "");
        setCurrency(invoice.currency);
        setIssueDate(invoice.issue_date);
        setDueDate(invoice.due_date);
        setNotes(invoice.notes);
        setLines(invoice.items.map((i) => ({ key: nextKey++, description: i.description, quantity: String(Number(i.quantity)), unit_price: String(Number(i.unit_price)) })));
      } else {
        setClient(c.data.length === 1 ? c.data[0].id : "");
        setProject("");
        setCurrency(pr.data.default_currency);
        setIssueDate(todayIso());
        setDueDate(addDaysIso(pr.data.payment_terms_days));
        setNotes("");
        setLines([blankLine()]);
      }
    });
  }, [open, invoice]);

  const clientProjects = projects.filter((p) => p.client === client);
  const total = useMemo(() => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0), [lines]);

  function pickProject(id: number | "") {
    setProject(id);
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    setCurrency(p.payment_currency);
    // Pre-fill the first empty line from the project's price.
    setLines((ls) => {
      if (ls.length !== 1 || ls[0].description || ls[0].unit_price) return ls;
      const monthly = p.billing_type === "monthly";
      return [{ ...ls[0], description: monthly ? `${p.title}: monthly retainer` : `${p.title}: project fee`, unit_price: String(Number(monthly ? p.monthly_amount : p.payment_amount) || "") }];
    });
  }

  function update(key: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const items = lines
      .filter((l) => l.description.trim())
      .map((l) => ({ description: l.description.trim(), quantity: Number(l.quantity) || 1, unit_price: Number(l.unit_price) || 0 }));
    if (!client) return void toast.error("Pick a client.");
    if (items.length === 0) return void toast.error("Add at least one line item.");
    setSaving(true);
    const payload = { client, project: project || null, currency, issue_date: issueDate, due_date: dueDate, notes, items };
    try {
      const { data } = invoice
        ? await api.patch<Invoice>(`/invoices/${invoice.id}/`, payload)
        : await api.post<Invoice>("/invoices/", { ...payload, kind: "custom" });
      toast.success(invoice ? "Invoice updated" : `${data.number} created`);
      onSaved(data);
    } catch (err) {
      toast.error(errorText(err, "Couldn't save the invoice."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={invoice ? `Edit ${invoice.number}` : "New invoice"}
      subtitle={invoice ? "Changes apply before you send it." : `Saved as a draft. Numbering continues from ${profile ? `${profile.invoice_prefix}-${String(profile.next_invoice_number).padStart(4, "0")}` : "your settings"}.`}
      footer={
        <>
          <div className="mr-auto self-center text-sm text-muted-foreground">
            Total <b className="text-ink text-lg ml-1">{money(total, currency)}</b>
          </div>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" form="invoice-form" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : invoice ? "Save changes" : "Create draft"}
          </button>
        </>
      }
    >
      <form id="invoice-form" onSubmit={save} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span className="field-label">Bill to</span>
            <select className="input" value={client} onChange={(e) => { setClient(Number(e.target.value) || ""); setProject(""); }} required>
              <option value="">Choose a client…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Project <span className="text-muted-foreground font-medium">(optional)</span></span>
            <select className="input" value={project} onChange={(e) => pickProject(Number(e.target.value) || "")} disabled={!client}>
              <option value="">No project</option>
              {clientProjects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </label>
        </div>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
          <label className="field">
            <span className="field-label">Currency</span>
            <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Issue date</span>
            <input className="input" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
          </label>
          <label className="field col-span-2 sm:col-span-1">
            <span className="field-label">Due date</span>
            <input className="input" type="date" value={dueDate} min={issueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </label>
        </div>

        <div className="field">
          <span className="field-label">Line items</span>
          <div className="rounded-2xl border border-line bg-white p-2 sm:p-3">
            <div className="hidden sm:grid grid-cols-[1fr_80px_130px_110px_36px] gap-2 px-1 pb-2 text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">
              <span>Description</span><span>Qty</span><span>Price</span><span className="text-right">Amount</span><span />
            </div>
            <AnimatePresence initial={false}>
              {lines.map((l) => (
                <motion.div
                  key={l.key}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_80px_130px_110px_36px] gap-2 py-1.5 border-b border-line/70 sm:border-0 last:border-0">
                    <input className="input col-span-2 sm:col-span-1" placeholder="What you did" value={l.description} onChange={(e) => update(l.key, { description: e.target.value })} />
                    <div className="col-span-2 sm:contents grid grid-cols-[70px_1fr_auto_36px] gap-2 items-center">
                      <input className="input" type="number" min={0} step="0.01" aria-label="Quantity" value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} />
                      <input className="input" type="number" min={0} step="0.01" placeholder="0.00" aria-label="Unit price" value={l.unit_price} onChange={(e) => update(l.key, { unit_price: e.target.value })} />
                      <div className="text-right font-bold text-ink text-sm self-center tabular-nums">{money((Number(l.quantity) || 0) * (Number(l.unit_price) || 0), currency)}</div>
                      <button type="button" className="icon-btn !h-9 !w-9 hover:!text-destructive" onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : [blankLine()]))} aria-label="Remove line">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <button type="button" className="btn btn-ghost btn-sm mt-1" onClick={() => setLines((ls) => [...ls, blankLine()])}>
              <Plus size={15} /> Add line
            </button>
          </div>
        </div>

        <label className="field">
          <span className="field-label">Note to client <span className="text-muted-foreground font-medium">(optional)</span></span>
          <textarea className="input" placeholder="Thank you for your business!" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </form>
    </Modal>
  );
}
