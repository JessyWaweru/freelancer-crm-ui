import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Ban, CheckCircle2, Copy, Download, Mail, MessageCircle, Pencil, Printer, Send, Share2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import api from "@/api";
import InvoiceEditor from "@/components/InvoiceEditor";
import { LogoMark } from "@/components/Logo";
import Modal from "@/components/Modal";
import StatusPill from "@/components/StatusPill";
import { useReminders } from "@/hooks/useReminders";
import { date, money } from "@/lib/format";
import { canShareFiles, downloadFile, renderPdf } from "@/lib/pdf";
import type { Invoice, Profile } from "@/lib/types";

function shareText(inv: Invoice, profile: Profile | null) {
  const from = profile?.business_name || "me";
  const lines = [
    `Hi ${inv.client_name.split(" ")[0]},`,
    ``,
    `Here is invoice ${inv.number} from ${from} for ${money(inv.total, inv.currency)}${inv.period_start ? ` (${date(inv.period_start)} to ${date(inv.period_end)})` : ""}.`,
    `It is due on ${date(inv.due_date, "long")}.`,
  ];
  if (profile?.payment_details) lines.push(``, `How to pay:`, profile.payment_details);
  lines.push(``, `Thank you!`);
  return lines.join("\n");
}

export default function InvoiceView() {
  const { id } = useParams();
  const nav = useNavigate();
  const { refresh } = useReminders();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [justPaid, setJustPaid] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const sheetRef = useRef<HTMLElement>(null);
  const shareable = canShareFiles();

  useEffect(() => {
    Promise.all([api.get<Invoice>(`/invoices/${id}/`), api.get<Profile>("/profile/")])
      .then(([i, p]) => { setInv(i.data); setProfile(p.data); })
      .catch(() => { toast.error("Invoice not found."); nav("/app/invoices"); });
  }, [id, nav]);

  async function act(action: "mark_sent" | "mark_paid" | "void", message: string) {
    if (!inv) return;
    setBusy(true);
    try {
      const { data } = await api.post<Invoice>(`/invoices/${inv.id}/${action}/`);
      setInv(data);
      if (action === "mark_paid") setJustPaid(true);
      toast.success(message);
      refresh();
    } catch {
      toast.error("Couldn't update the invoice.");
    } finally {
      setBusy(false);
    }
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
    return <div className="grid gap-4"><div className="skeleton h-12 w-64" /><div className="skeleton h-[560px]" /></div>;
  }

  const text = shareText(inv, profile);
  const phone = inv.client_phone?.replace(/\D/g, "");
  const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  const mailLink = `mailto:${inv.client_email}?subject=${encodeURIComponent(`Invoice ${inv.number}${profile?.business_name ? ` from ${profile.business_name}` : ""}`)}&body=${encodeURIComponent(text)}`;
  const profileMissing = !profile?.business_name || !profile?.payment_details;

  return (
    <div>
      {/* Toolbar */}
      <div className="no-print flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/app/invoices" className="icon-btn" aria-label="Back to invoices"><ArrowLeft size={20} /></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold">{inv.number}</h1>
              <StatusPill invoice={inv} />
            </div>
            <p className="text-sm text-muted-foreground">{inv.client_name} · {money(inv.total, inv.currency)}</p>
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
            <button className="btn btn-ok" disabled={busy} onClick={() => act("mark_paid", "Payment recorded")}><CheckCircle2 size={16} /> Mark as paid</button>
          )}
          <button className="btn btn-outline" disabled={pdfBusy} onClick={() => makePdf("download")}><Download size={16} /> {pdfBusy ? "Making PDF…" : "Download PDF"}</button>
          {shareable && <button className="btn btn-outline" disabled={pdfBusy} onClick={() => makePdf("share")}><Share2 size={16} /> Share PDF</button>}
          <button className="btn btn-ghost hidden sm:inline-flex" onClick={() => window.print()}><Printer size={16} /> Print</button>
          {(inv.status === "draft" || inv.status === "sent") && (
            <button className="btn btn-ghost" onClick={() => setConfirmVoid(true)}><Ban size={16} /> Void</button>
          )}
          <button className="btn btn-ghost hover:!text-destructive hover:!bg-[#fdecea]" onClick={() => setConfirmDelete(true)}><Trash2 size={16} /> Delete</button>
        </div>
      </div>

      {/* Share strip */}
      {(inv.status === "draft" || inv.status === "sent") && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="no-print card p-4 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 text-sm">
            <b className="text-ink">{inv.status === "draft" ? "Send it to your client" : inv.is_overdue ? "Send a payment reminder" : "Share it again"}</b>
            <p className="text-muted-foreground">{shareable ? "Share PDF sends the file and a message in one go." : "Download the PDF, then share it with a ready-made message."}{inv.status === "draft" && " Mark it as sent afterwards."}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {phone && <a className="btn btn-sm bg-[#25d366] text-white hover:bg-[#1da851]" href={waLink} target="_blank" rel="noreferrer"><MessageCircle size={15} /> WhatsApp</a>}
            {inv.client_email && <a className="btn btn-sm btn-outline" href={mailLink}><Mail size={15} /> Email</a>}
            <button className="btn btn-sm btn-outline" onClick={() => navigator.clipboard.writeText(text).then(() => toast.success("Message copied"))}><Copy size={15} /> Copy message</button>
          </div>
        </motion.div>
      )}

      {profileMissing && (
        <div className="no-print mb-6 rounded-2xl bg-gold-50 border border-gold/40 p-4 text-sm">
          <b className="text-ink">Add your business details.</b>{" "}
          Your name and how to pay you aren't on this invoice yet. <Link to="/app/settings" className="text-brand font-bold underline">Open settings</Link>
        </div>
      )}

      {/* The sheet */}
      <motion.article
        ref={sheetRef}
        initial={{ opacity: 0, y: 20, rotateX: 4 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="print-sheet relative mx-auto max-w-3xl bg-white rounded-[24px] border border-line shadow-[var(--shadow-lg)] overflow-hidden"
      >
        <div className="h-2 bg-gradient-to-r from-brand-800 via-brand to-gold" />
        <AnimatePresence>
          {inv.status === "paid" && (
            <motion.div
              initial={justPaid ? { scale: 2.4, opacity: 0, rotate: -30 } : false}
              animate={{ scale: 1, opacity: 1, rotate: -14 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              className="pointer-events-none absolute right-5 top-[150px] sm:right-auto sm:top-auto sm:left-14 sm:bottom-[160px] border-[3px] border-ok text-ok rounded-xl px-4 py-1.5 display font-extrabold text-2xl tracking-widest opacity-90"
            >
              PAID
            </motion.div>
          )}
          {inv.status === "void" && (
            <div className="pointer-events-none absolute right-5 top-[150px] sm:right-auto sm:top-auto sm:left-14 sm:bottom-[160px] border-[3px] border-[#999] text-[#999] rounded-xl px-4 py-1.5 display font-extrabold text-2xl tracking-widest -rotate-12">VOID</div>
          )}
        </AnimatePresence>

        <div className="p-6 sm:p-10">
          <header className="flex flex-col-reverse gap-6 sm:flex-row sm:justify-between">
            <div>
              <div className="display text-3xl sm:text-4xl font-extrabold text-brand-800">INVOICE</div>
              <div className="mt-2 text-sm text-muted-foreground">
                <div><span className="inline-block w-20">Number</span> <b className="text-ink">{inv.number}</b></div>
                <div><span className="inline-block w-20">Issued</span> <b className="text-ink">{date(inv.issue_date, "long")}</b></div>
                <div><span className="inline-block w-20">Due</span> <b className={inv.is_overdue ? "text-destructive" : "text-ink"}>{date(inv.due_date, "long")}</b></div>
                {inv.period_start && <div><span className="inline-block w-20">Period</span> <b className="text-ink">{date(inv.period_start)} – {date(inv.period_end)}</b></div>}
              </div>
            </div>
            <div className="sm:text-right">
              {profile?.business_name ? (
                <>
                  <div className="font-extrabold text-ink text-lg">{profile.business_name}</div>
                  <div className="text-sm text-muted-foreground whitespace-pre-line">
                    {[profile.address, profile.phone, profile.email].filter(Boolean).join("\n")}
                  </div>
                </>
              ) : (
                <LogoMark className="h-12 w-10 text-brand-800 sm:ml-auto" />
              )}
            </div>
          </header>

          <div className="mt-8 rounded-2xl bg-cream p-4 sm:p-5">
            <div className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground">Bill to</div>
            <div className="font-extrabold text-ink mt-1">{inv.client_name}</div>
            <div className="text-sm text-muted-foreground">
              {[inv.client_company, inv.client_phone, inv.client_email].filter(Boolean).join(" · ")}
            </div>
            {inv.project_title && <div className="text-sm mt-1"><span className="text-muted-foreground">Project:</span> <b className="text-ink">{inv.project_title}</b></div>}
          </div>

          <table className="w-full mt-8 text-sm">
            <thead>
              <tr className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground border-b-2 border-brand-800">
                <th className="text-left py-2.5">Description</th>
                <th className="text-right py-2.5 w-14">Qty</th>
                <th className="text-right py-2.5 w-28 hidden sm:table-cell">Price</th>
                <th className="text-right py-2.5 w-32">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.items.map((it, i) => (
                <motion.tr key={it.id ?? i} className="border-b border-line" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 + i * 0.06 }}>
                  <td className="py-3 pr-2 text-ink">{it.description}</td>
                  <td className="py-3 text-right tabular-nums">{Number(it.quantity)}</td>
                  <td className="py-3 text-right tabular-nums hidden sm:table-cell">{money(it.unit_price, inv.currency)}</td>
                  <td className="py-3 text-right font-bold text-ink tabular-nums">{money(it.amount, inv.currency)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex justify-end">
            <div className="w-full sm:w-72 rounded-2xl bg-brand-800 text-cream p-5">
              <div className="flex items-center justify-between text-sm text-cream/70"><span>Subtotal</span><span className="tabular-nums">{money(inv.total, inv.currency)}</span></div>
              <div className="mt-2 pt-3 border-t border-white/15 flex items-end justify-between">
                <span className="font-bold whitespace-nowrap mr-3">Total due</span>
                <span className="display text-xl font-extrabold text-gold tabular-nums">{money(inv.total, inv.currency)}</span>
              </div>
            </div>
          </div>

          {(profile?.payment_details || inv.notes) && (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 text-sm">
              {profile?.payment_details && (
                <div>
                  <div className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground mb-1">How to pay</div>
                  <div className="whitespace-pre-line text-ink">{profile.payment_details}</div>
                </div>
              )}
              {inv.notes && (
                <div>
                  <div className="text-[0.7rem] font-bold uppercase tracking-wider text-muted-foreground mb-1">Note</div>
                  <div className="whitespace-pre-line text-ink">{inv.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.article>

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
            ? "It's removed for good. That month shows up as ready to invoice again."
            : "It's removed for good. To keep a record of a sent invoice, void it instead."
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
