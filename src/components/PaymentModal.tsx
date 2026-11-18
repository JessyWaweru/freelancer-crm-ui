import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/api";
import Modal from "@/components/Modal";
import { errorText, money, todayIso } from "@/lib/format";
import { PAYMENT_METHODS, type Invoice, type PaymentMethod } from "@/lib/types";

const METHOD_KEY = "crm.payMethod";

/** Record money received against an invoice: full balance by default, or part of it. */
export default function PaymentModal({ invoice, open, onClose, onSaved }: {
  invoice: Invoice; open: boolean; onClose: () => void; onSaved: (inv: Invoice) => void;
}) {
  const balance = Number(invoice.balance);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(todayIso());
  const [method, setMethod] = useState<PaymentMethod>("mpesa");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAmount(String(balance));
    setPaidOn(todayIso());
    setReference("");
    try { setMethod((localStorage.getItem(METHOD_KEY) as PaymentMethod) || "mpesa"); } catch { /* private mode */ }
  }, [open, balance]);

  const n = Number(amount);
  const tooMuch = n > balance + 0.001;
  const full = Math.abs(n - balance) < 0.005;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!(n > 0) || tooMuch) return;
    setSaving(true);
    try {
      const { data } = await api.post<Invoice>(`/invoices/${invoice.id}/payments/`, { amount: n.toFixed(2), paid_on: paidOn, method, reference });
      try { localStorage.setItem(METHOD_KEY, method); } catch { /* private mode */ }
      toast.success(data.status === "paid" ? `${invoice.number} is paid in full` : `${money(n, invoice.currency)} recorded`, {
        description: data.status === "paid" ? undefined : `${money(data.balance, invoice.currency)} still to come.`,
      });
      onSaved(data);
    } catch (err) {
      toast.error(errorText(err, "Couldn't record the payment."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record a payment"
      subtitle={`${invoice.number} · ${invoice.client_name} · ${money(balance, invoice.currency)} owed`}
      footer={
        <>
          <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" form="payment-form" className="btn btn-ok" disabled={saving || !(n > 0) || tooMuch}>
            {saving ? "Saving…" : full ? "Record full payment" : "Record part payment"}
          </button>
        </>
      }
    >
      <form id="payment-form" onSubmit={save} className="grid gap-4">
        <label className="field">
          <span className="field-label">Amount received</span>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">{invoice.currency}</span>
            <input
              className={`input !pl-14 !text-xl !font-extrabold !min-h-[54px] tabular-nums ${tooMuch ? "!border-destructive" : ""}`}
              type="number" min={0.01} step="0.01" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[1, 0.5, 0.25].map((f) => (
              <button key={f} type="button" className="btn btn-sm btn-ghost !bg-tint" onClick={() => setAmount((balance * f).toFixed(2).replace(/\.00$/, ""))}>
                {f === 1 ? "Full balance" : `${f * 100}%`}
              </button>
            ))}
          </div>
          {tooMuch && <span className="text-xs font-bold text-destructive">That's more than the {money(balance, invoice.currency)} owed.</span>}
        </label>

        <div className="field">
          <span className="field-label">How they paid</span>
          <div className="flex flex-wrap gap-1.5">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value} type="button" onClick={() => setMethod(m.value)} aria-pressed={method === m.value}
                className={`btn btn-sm ${method === m.value ? "btn-primary" : "btn-outline"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span className="field-label">Date received</span>
            <input className="input" type="date" value={paidOn} max={todayIso()} onChange={(e) => setPaidOn(e.target.value)} required />
          </label>
          <label className="field">
            <span className="field-label">Reference <span className="text-muted-foreground font-medium">(optional)</span></span>
            <input className="input uppercase placeholder:normal-case" placeholder={method === "mpesa" ? "e.g. SKL4X9ABC2" : "Receipt or transfer ref"} value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} />
          </label>
        </div>
      </form>
    </Modal>
  );
}
