import { motion } from "framer-motion";
import {
  ArrowLeft, Ban, CheckCircle2, Copy, CopyPlus, Download, Eye, ExternalLink, FilePlus2, Link2, Mail, MessageCircle,
  Pencil, Printer, Send, Share2, Trash2, Wallet, X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import api from "@/api";
import ActionMenu from "@/components/ActionMenu";
import InvoiceEditor from "@/components/InvoiceEditor";
import InvoiceSheet from "@/components/InvoiceSheet";
import Modal from "@/components/Modal";
import PaymentModal from "@/components/PaymentModal";
import StatusPill from "@/components/StatusPill";
import { useReminders } from "@/hooks/useReminders";
import { date, errorText, money, publicInvoiceUrl, timeAgo } from "@/lib/format";
import { canShareFiles, downloadFile, renderPdf } from "@/lib/pdf";
import { PAYMENT_METHODS, type Invoice, type Profile } from "@/lib/types";

function shareText(inv: Invoice, profile: Profile | null, link?: string) {
  const from = profile?.business_name || "me";
  const owed = Number(inv.amount_paid) > 0 ? `${money(inv.balance, inv.currency)} (of ${money(inv.total, inv.currency)})` : money(inv.total, inv.currency);
  const lines = [
    `Hi ${inv.client_name.split(" ")[0]},`,
    ``,
    `Here is invoice ${inv.number} from ${from} for ${owed}${inv.period_start ? ` (${date(inv.period_start)} to ${date(inv.period_end)})` : ""}.`,
    `It is due on ${date(inv.due_date, "long")}.`,
  ];
  if (link) lines.push(``, `View and download it here: ${link}`);
  if (profile?.payment_details) lines.push(``, `How to pay:`, profile.payment_details);
  lines.push(``, `Thank you!`);
  return lines.join("\n");
}

const methodLabel = (m: string) => PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m;

function Panel({ title, icon, right, children }: { title: string; icon: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-2"><span className="text-brand">{icon}</span>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

type Event = { at: string; icon: ReactNode; tone: string; title: string; detail?: string };

function activity(inv: Invoice): Event[] {
  const ev: Event[] = [{ at: inv.created_at, icon: <FilePlus2 size={13} />, tone: "bg-tint text-brand", title: "Created" }];
  if (inv.sent_at) ev.push({ at: inv.sent_at, icon: <Send size={13} />, tone: "bg-gold-50 text-[#9a6514]", title: "Sent to client" });
  if (inv.first_viewed_at) ev.push({ at: inv.first_viewed_at, icon: <Eye size={13} />, tone: "bg-brand-50 text-brand", title: "Client opened the link" });
  if (inv.view_count > 1 && inv.last_viewed_at) {
    ev.push({ at: inv.last_viewed_at, icon: <Eye size={13} />, tone: "bg-brand-50 text-brand", title: `Viewed ${inv.view_count} times`, detail: "Most recent view" });
  }
  for (const p of inv.payments) {
    ev.push({
      at: p.paid_on === p.created_at.slice(0, 10) ? p.created_at : `${p.paid_on}T12:00:00`,
      icon: <Wallet size={13} />, tone: "bg-[#e6f4ec] text-ok",
      title: `${money(p.amount, inv.currency)} received`, detail: [methodLabel(p.method), p.reference].filter(Boolean).join(" · "),
    });
  }
  if (inv.status === "paid" && inv.paid_at) ev.push({ at: inv.paid_at, icon: <CheckCircle2 size={13} />, tone: "bg-ok text-white", title: "Paid in full" });
  // No void timestamp is stored; it's always the latest event.
  if (inv.status === "void") ev.push({ at: "9999", icon: <Ban size={13} />, tone: "bg-[#f1f1f1] text-[#888]", title: "Voided", detail: "No longer counts as owed" });
  return ev.sort((a, b) => b.at.localeCompare(a.at));
}

export default function InvoiceView() {
  const { id } = useParams();
  const nav = useNavigate();
  const { refresh } = useReminders();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [justPaid, setJustPaid] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const sheetRef = useRef<HTMLElement>(null);
  const shareable = canShareFiles();

  useEffect(() => {
    Promise.all([api.get<Invoice>(`/invoices/${id}/`), api.get<Profile>("/profile/")])
      .then(([i, p]) => { setInv(i.data); setProfile(p.data); })
      .catch(() => { toast.error("Invoice not found."); nav("/app/invoices"); });
  }, [id, nav]);

  function updated(data: Invoice) {
    if (data.status === "paid" && inv?.status !== "paid") setJustPaid(true);
    setInv(data);
    refresh();
  }

  async function act(action: "mark_sent" | "mark_paid" | "void", message: string) {
    if (!inv) return;
    setBusy(true);
    try {
      const { data } = await api.post<Invoice>(`/invoices/${inv.id}/${action}/`);
      updated(data);
      toast.success(message);
    } catch {
      toast.error("Couldn't update the invoice.");
    } finally {
      setBusy(false);
    }
  }

  async function removePayment(paymentId: number) {
    if (!inv) return;
    try {
      const { data } = await api.delete<Invoice>(`/invoices/${inv.id}/payments/${paymentId}/`);
      setInv(data);
      refresh();
      toast.success("Payment removed");
    } catch {
      toast.error("Couldn't remove the payment.");
    }
  }

  /** The client link, made on first use. */
  async function ensureLink(): Promise<string | null> {
    if (!inv) return null;
    if (inv.public_token) return publicInvoiceUrl(inv.public_token);
    try {
      const { data } = await api.post<Invoice>(`/invoices/${inv.id}/share/`);
      setInv(data);
      return data.public_token ? publicInvoiceUrl(data.public_token) : null;
    } catch (e) {
      toast.error(errorText(e, "Couldn't make the link."));
      return null;
    }
  }

  async function copyLink() {
    const link = await ensureLink();
    if (link) navigator.clipboard.writeText(link).then(() => toast.success("Client link copied", { description: "You'll see here when they open it." }));
  }

  /** Opens WhatsApp / email with the message and link. The tab opens first so popup blockers allow it. */
  async function sendVia(channel: "whatsapp" | "email") {
    if (!inv) return;
    const tab = channel === "whatsapp" ? window.open("", "_blank") : null;
    const link = (await ensureLink()) ?? undefined;
    const text = shareText(inv, profile, link);
    if (channel === "whatsapp") {
      const url = `https://wa.me/${inv.client_phone?.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
      if (tab) tab.location.href = url; else window.location.href = url;
    } else {
      const subject = `Invoice ${inv.number}${profile?.business_name ? ` from ${profile.business_name}` : ""}`;
      window.location.href = `mailto:${inv.client_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
    }
  }

  async function copyMessage() {
    if (!inv) return;
    const link = (await ensureLink()) ?? undefined;
    navigator.clipboard.writeText(shareText(inv, profile, link)).then(() => toast.success("Message copied"));
  }

  async function makePdf(mode: "download" | "share") {
    if (!inv || !sheetRef.current) return;
    setPdfBusy(true);
    try {
      const name = `${inv.number}${inv.client_name ? ` ${inv.client_name}` : ""}.pdf`.replace(/[\\/:*?"<>|]+/g, "");
      const file = await renderPdf(sheetRef.current, name);
      if (mode === "share") {
        try {
          await navigator.share({ files: [file], title: `Invoice ${inv.number}`, text: shareText(inv, profile) });
        } catch (e) {
          if ((e as Error)?.name !== "AbortError") downloadFile(file);
        }
      } else {
        downloadFile(file);
        toast.success("PDF downloaded");
      }
    } catch {
      toast.error("Couldn't make the PDF. Try Print → Save as PDF instead.");
    } finally {
      setPdfBusy(false);
    }
  }

  async function duplicate() {
    if (!inv) return;
    try {
      const { data } = await api.post<Invoice>(`/invoices/${inv.id}/duplicate/`);
      toast.success(`${data.number} created from ${inv.number}`, { description: "A fresh draft dated today." });
      refresh();
      nav(`/app/invoices/${data.id}`);
    } catch {
      toast.error("Couldn't duplicate the invoice.");
    }
  }

  async function remove() {
    if (!inv) return;
    setConfirmDelete(false);
    try {
      await api.delete(`/invoices/${inv.id}/`);
      toast.success(`${inv.number} deleted`);
      refresh();
      nav("/app/invoices");
    } catch {
      toast.error("Couldn't delete the invoice.");
    }
  }

  if (!inv) {
    return <div className="grid gap-4"><div className="skeleton h-12 w-64" /><div className="grid gap-4 xl:grid-cols-[1fr_320px]"><div className="skeleton h-[560px]" /><div className="skeleton h-[320px]" /></div></div>;
  }

  const open = inv.status === "draft" || inv.status === "sent";
  const total = Number(inv.total);
  const paid = Number(inv.amount_paid);
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : inv.status === "paid" ? 100 : 0;
  const phone = inv.client_phone?.replace(/\D/g, "");
  const profileMissing = !profile?.business_name || !profile?.payment_details;
  const events = activity(inv);

  return (
    <div>
      {/* Toolbar */}
      <div className="no-print flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/app/invoices" className="icon-btn shrink-0" aria-label="Back to invoices"><ArrowLeft size={20} /></Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold">{inv.number}</h1>
              <StatusPill invoice={inv} />
            </div>
            <p className="text-sm text-muted-foreground truncate">
              <Link to={`/app/clients/${inv.client}`} className="hover:text-brand">{inv.client_name}</Link> · {money(inv.total, inv.currency)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {inv.status === "draft" && (
            <>
              <button className="btn btn-outline" onClick={() => setEditing(true)}><Pencil size={16} /> Edit</button>
              <button className="btn btn-primary" disabled={busy} onClick={() => act("mark_sent", "Marked as sent. You'll be reminded if it goes overdue.")}><Send size={16} /> Mark as sent</button>
            </>
          )}
          {inv.status === "sent" && (
            <button className="btn btn-ok" onClick={() => setPaying(true)}><Wallet size={16} /> Record payment</button>
          )}
          <button className="btn btn-outline" disabled={pdfBusy} onClick={() => makePdf("download")}><Download size={16} /> {pdfBusy ? "Making PDF…" : "PDF"}</button>
          {shareable && <button className="btn btn-outline" disabled={pdfBusy} onClick={() => makePdf("share")}><Share2 size={16} /> Share PDF</button>}
          <ActionMenu
            items={[
              { icon: CheckCircle2, label: "Mark paid in full", onClick: () => act("mark_paid", "Payment recorded"), hidden: inv.status !== "sent" },
              { icon: Pencil, label: "Edit", onClick: () => setEditing(true), hidden: inv.status !== "sent" },
              { icon: CopyPlus, label: "Duplicate as new draft", onClick: duplicate },
              { icon: Printer, label: "Print", onClick: () => window.print() },
              { icon: Ban, label: "Void", onClick: () => setConfirmVoid(true), hidden: !open },
              { icon: Trash2, label: "Delete", onClick: () => setConfirmDelete(true), danger: true },
            ]}
          />
        </div>
      </div>

      {profileMissing && (
        <div className="no-print mb-6 rounded-2xl bg-gold-50 border border-gold/40 p-4 text-sm">
          <b className="text-ink">Add your business details.</b>{" "}
          Your name and how to pay you aren't on this invoice yet. <Link to="/app/settings" className="text-brand font-bold underline">Open settings</Link>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px] items-start">
        <div className="min-w-0 order-2 xl:order-1">
          <InvoiceSheet ref={sheetRef} inv={inv} business={profile} justPaid={justPaid} />
        </div>

        {/* Side rail */}
        <motion.aside
          className="no-print grid gap-4 order-1 xl:order-2 xl:sticky xl:top-6"
          initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.4 }}
        >
          {inv.status !== "void" && (
            <Panel
              title="Payment" icon={<Wallet size={15} />}
              right={inv.status === "paid" ? <span className="pill pill-paid"><CheckCircle2 size={12} /> Settled</span> : undefined}
            >
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">{inv.status === "paid" ? "Received" : "Still owed"}</div>
                  <div className="display text-[1.55rem] font-extrabold text-ink leading-tight tabular-nums">{money(inv.status === "paid" ? inv.amount_paid : inv.balance, inv.currency)}</div>
                </div>
                <div className="text-right text-xs text-muted-foreground">{Math.round(pct)}% paid</div>
              </div>
              <div className="meter mt-3"><motion.span initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} /></div>
              <div className="mt-1.5 flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>{money(paid, inv.currency)} paid</span><span>of {money(inv.total, inv.currency)}</span>
              </div>

              {inv.payments.length > 0 && (
                <ul className="mt-4 divide-y divide-line">
                  {inv.payments.map((p) => (
                    <li key={p.id} className="group flex items-center gap-3 py-2.5">
                      <span className="grid place-items-center h-8 w-8 rounded-xl bg-[#e6f4ec] text-ok shrink-0"><Wallet size={14} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-ink tabular-nums">{money(p.amount, inv.currency)}</div>
                        <div className="text-xs text-muted-foreground truncate">{date(p.paid_on)} · {methodLabel(p.method)}{p.reference ? ` · ${p.reference}` : ""}</div>
                      </div>
                      <button className="icon-btn !h-8 !w-8 sm:opacity-0 sm:group-hover:opacity-100 hover:!text-destructive" onClick={() => removePayment(p.id)} aria-label="Remove payment">
                        <X size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {open && (
                <button className="btn btn-ok w-full mt-4" onClick={() => setPaying(true)}>
                  <Wallet size={16} /> {paid > 0 ? "Record another payment" : "Record a payment"}
                </button>
              )}
            </Panel>
          )}

          {open && (
            <Panel
              title="Send" icon={<Send size={15} />}
              right={inv.view_count > 0
                ? <span className="pill pill-brand"><Eye size={12} /> Seen {timeAgo(inv.last_viewed_at)}</span>
                : inv.public_token ? <span className="pill pill-draft">Not opened yet</span> : undefined}
            >
              <p className="text-xs text-muted-foreground mb-3">
                {inv.is_overdue ? "It's overdue: send a friendly reminder with the link." : "Send a link your client can open on any phone, with the invoice, how to pay and a PDF download."}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {phone && <button className="btn btn-sm bg-[#25d366] text-white hover:bg-[#1da851] col-span-2" onClick={() => sendVia("whatsapp")}><MessageCircle size={15} /> Send on WhatsApp</button>}
                {inv.client_email && <button className="btn btn-sm btn-outline" onClick={() => sendVia("email")}><Mail size={15} /> Email</button>}
                <button className="btn btn-sm btn-outline" onClick={copyMessage}><Copy size={15} /> Message</button>
                <button className={`btn btn-sm btn-outline ${inv.client_email ? "col-span-2" : ""}`} onClick={copyLink}><Link2 size={15} /> Copy client link</button>
              </div>
              {inv.public_token && (
                <a className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline" href={`${publicInvoiceUrl(inv.public_token)}?preview=1`} target="_blank" rel="noreferrer">
                  <ExternalLink size={13} /> See what your client sees
                </a>
              )}
              {inv.status === "draft" && <p className="field-hint mt-2">Mark it as sent once it's with them, so overdue reminders start.</p>}
            </Panel>
          )}

          <Panel title="Activity" icon={<Eye size={15} />}>
            <ol className="relative grid gap-3.5 before:absolute before:left-[13px] before:top-2 before:bottom-2 before:w-px before:bg-line">
              {events.map((e, i) => (
                <motion.li key={`${e.title}-${i}`} className="relative flex gap-3" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }}>
                  <span className={`relative z-10 grid place-items-center h-[27px] w-[27px] rounded-full ring-4 ring-white shrink-0 ${e.tone}`}>{e.icon}</span>
                  <div className="min-w-0 pt-0.5">
                    <div className="text-sm font-bold text-ink leading-tight">{e.title}</div>
                    <div className="text-xs text-muted-foreground">{[e.detail, e.at === "9999" ? null : timeAgo(e.at)].filter(Boolean).join(" · ")}</div>
                  </div>
                </motion.li>
              ))}
            </ol>
          </Panel>
        </motion.aside>
      </div>

      <PaymentModal invoice={inv} open={paying} onClose={() => setPaying(false)} onSaved={(data) => { setPaying(false); updated(data); }} />

      <InvoiceEditor
        open={editing}
        invoice={inv}
        onClose={() => setEditing(false)}
        onSaved={(data) => { setInv(data); setEditing(false); refresh(); }}
      />

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${inv.number}?`}
        subtitle={
          inv.kind === "monthly"
            ? "It's removed for good, with its payments. That month shows up as ready to invoice again."
            : "It's removed for good, with its payments. To keep a record of a sent invoice, void it instead."
        }
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setConfirmDelete(false)}>Keep it</button>
            <button className="btn btn-danger" onClick={remove}><Trash2 size={16} /> Delete</button>
          </>
        }
      >
        <span />
      </Modal>

      <Modal
        open={confirmVoid}
        onClose={() => setConfirmVoid(false)}
        title={`Void ${inv.number}?`}
        subtitle="It stays in your records but no longer counts as owed. Use this instead of deleting a sent invoice."
        footer={
          <>
            <button className="btn btn-outline" onClick={() => setConfirmVoid(false)}>Keep it</button>
            <button className="btn btn-danger" onClick={() => { setConfirmVoid(false); act("void", "Invoice voided"); }}><Ban size={16} /> Void</button>
          </>
        }
      >
        <span />
      </Modal>
    </div>
  );
}
