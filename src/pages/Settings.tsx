import { motion } from "framer-motion";
import { Bell, BellOff, Building2, Hash, Save } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import api from "@/api";
import PageHeader from "@/components/PageHeader";
import { useReminders } from "@/hooks/useReminders";
import { errorText } from "@/lib/format";
import { CURRENCIES, type Currency, type Profile } from "@/lib/types";

function Section({ icon, title, text, children, delay = 0 }: { icon: ReactNode; title: string; text: string; children: ReactNode; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="card p-5 sm:p-7 grid gap-5 lg:grid-cols-[240px_1fr]"
    >
      <div>
        <div className="grid place-items-center h-10 w-10 rounded-xl bg-brand-50 text-brand mb-3">{icon}</div>
        <h2 className="font-extrabold text-lg">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{text}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 content-start">{children}</div>
    </motion.section>
  );
}

export default function Settings() {
  const { notifyEnabled, notifySupported, enableNotifications, disableNotifications, refresh } = useReminders();
  const [p, setP] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Profile>("/profile/").then((r) => setP(r.data)).catch(() => toast.error("Couldn't load settings."));
  }, []);

  if (!p) return <div className="grid gap-4"><div className="skeleton h-24 w-72" /><div className="skeleton h-72" /><div className="skeleton h-56" /></div>;

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP({ ...p, [k]: v });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put<Profile>("/profile/", p);
      setP(data);
      toast.success("Settings saved");
      refresh();
    } catch (err) {
      toast.error(errorText(err, "Couldn't save settings."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save}>
      <PageHeader
        eyebrow="Your business"
        title="Settings"
        subtitle="These details are printed on every invoice you send."
        actions={<button type="submit" className="btn btn-primary" disabled={saving}><Save size={17} /> {saving ? "Saving…" : "Save"}</button>}
      />
      <div className="grid gap-5">
        <Section icon={<Building2 size={20} />} title="Business details" text="Who the invoice is from, and how clients pay you.">
          <label className="field">
            <span className="field-label">Business or your name</span>
            <input className="input" value={p.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="e.g. Jane Wanjiru Design" />
          </label>
          <label className="field">
            <span className="field-label">Email</span>
            <input className="input" type="email" value={p.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
          </label>
          <label className="field">
            <span className="field-label">Phone</span>
            <input className="input" value={p.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+254 7xx xxx xxx" />
          </label>
          <label className="field">
            <span className="field-label">Address</span>
            <input className="input" value={p.address} onChange={(e) => set("address", e.target.value)} placeholder="Nairobi, Kenya" />
          </label>
          <label className="field sm:col-span-2">
            <span className="field-label">How to pay you</span>
            <textarea className="input" value={p.payment_details} onChange={(e) => set("payment_details", e.target.value)} placeholder={"M-Pesa Till: …\nBank: …, Account: …"} />
            <span className="field-hint">Shown at the bottom of invoices and in the WhatsApp/email message.</span>
          </label>
        </Section>

        <Section icon={<Hash size={20} />} title="Invoices" text="Numbering, currency and payment terms for new invoices." delay={0.06}>
          <label className="field">
            <span className="field-label">Number prefix</span>
            <input className="input uppercase" maxLength={10} value={p.invoice_prefix} onChange={(e) => set("invoice_prefix", e.target.value.toUpperCase())} required />
          </label>
          <label className="field">
            <span className="field-label">Next number</span>
            <input className="input" type="number" min={1} value={p.next_invoice_number} onChange={(e) => set("next_invoice_number", Number(e.target.value))} required />
            <span className="field-hint">Next invoice: {p.invoice_prefix}-{String(p.next_invoice_number).padStart(4, "0")}</span>
          </label>
          <label className="field">
            <span className="field-label">Default currency</span>
            <select className="input" value={p.default_currency} onChange={(e) => set("default_currency", e.target.value as Currency)}>
              {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Payment due after</span>
            <select className="input" value={p.payment_terms_days} onChange={(e) => set("payment_terms_days", Number(e.target.value))}>
              {[0, 3, 7, 14, 30, 45, 60].map((d) => <option key={d} value={d}>{d === 0 ? "On receipt" : `${d} days`}</option>)}
            </select>
          </label>
        </Section>

        <Section icon={<Bell size={20} />} title="Reminders" text="When to nudge you about invoices that need to go out." delay={0.12}>
          <label className="field">
            <span className="field-label">Remind me</span>
            <select className="input" value={p.reminder_days_before} onChange={(e) => set("reminder_days_before", Number(e.target.value))}>
              {[0, 1, 2, 3, 5, 7, 14].map((d) => <option key={d} value={d}>{d === 0 ? "On the day" : `${d} day${d === 1 ? "" : "s"} before`}</option>)}
            </select>
            <span className="field-hint">Applies to monthly retainers and project deadlines.</span>
          </label>
          <div className="field">
            <span className="field-label">Desktop alerts</span>
            {notifySupported ? (
              notifyEnabled ? (
                <button type="button" className="btn btn-outline justify-start" onClick={() => { disableNotifications(); toast("Desktop alerts off"); }}>
                  <BellOff size={16} /> Turn off alerts
                </button>
              ) : (
                <button type="button" className="btn btn-gold justify-start" onClick={async () => {
                  const ok = await enableNotifications();
                  toast[ok ? "success" : "error"](ok ? "Desktop alerts on" : "Alerts are blocked. Allow notifications for this site in your browser.");
                }}>
                  <Bell size={16} /> Turn on alerts
                </button>
              )
            ) : (
              <span className="text-sm text-muted-foreground">This browser doesn't support notifications.</span>
            )}
            <span className="field-hint">Alerts show while the CRM is open in a tab.</span>
          </div>
        </Section>
      </div>
    </form>
  );
}
