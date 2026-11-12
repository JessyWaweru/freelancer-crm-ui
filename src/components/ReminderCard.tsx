import { motion } from "framer-motion";
import { AlertTriangle, CalendarClock, FileText, Repeat, Send } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/api";
import { useReminders } from "@/hooks/useReminders";
import { errorText, money, relativeDay } from "@/lib/format";
import type { Invoice, Reminder } from "@/lib/types";

const ICONS = { monthly_due: Repeat, fixed_due: FileText, draft: Send, overdue: AlertTriangle };
const TONE = {
  overdue: "bg-[#fdecea] text-destructive",
  due: "bg-gold-50 text-[#9a6514]",
  upcoming: "bg-brand-50 text-brand",
};
const ACTION_LABEL = {
  generate_monthly: "Create invoice",
  generate_fixed: "Create invoice",
  send: "Review & send",
  follow_up: "Open invoice",
};

export default function ReminderCard({ reminder, compact = false, onDone }: { reminder: Reminder; compact?: boolean; onDone?: () => void }) {
  const nav = useNavigate();
  const { refresh } = useReminders();
  const [busy, setBusy] = useState(false);
  const Icon = ICONS[reminder.type];

  async function act() {
    if (reminder.action === "generate_monthly" || reminder.action === "generate_fixed") {
      setBusy(true);
      try {
        const kind = reminder.action === "generate_monthly" ? "monthly" : "fixed";
        const { data } = await api.post<Invoice>(`/projects/${reminder.project}/generate_invoice/`, { kind });
        toast.success(`${data.number} created`, { description: "Saved as a draft. Review it, then send it." });
        await refresh();
        onDone?.();
        nav(`/app/invoices/${data.id}`);
      } catch (e) {
        toast.error(errorText(e, "Couldn't create the invoice."));
      } finally {
        setBusy(false);
      }
    } else {
      onDone?.();
      nav(`/app/invoices/${reminder.invoice}`);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 30 }}
      className={`flex gap-3 ${compact ? "p-3 rounded-2xl hover:bg-tint" : "card card-hover p-4"} transition-colors`}
    >
      <div className={`grid place-items-center shrink-0 h-10 w-10 rounded-[14px] ${TONE[reminder.severity]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold text-ink text-[0.92rem] leading-snug">{reminder.title}</div>
        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2">
          <span>{reminder.detail}</span>
          <span className="inline-flex items-center gap-1">
            <CalendarClock size={12} /> {relativeDay(reminder.date)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="font-extrabold text-ink text-sm">{money(reminder.amount, reminder.currency)}</span>
          <button className={`btn btn-sm ${reminder.severity === "overdue" ? "btn-primary" : "btn-outline"}`} disabled={busy} onClick={act}>
            {busy ? "Creating…" : ACTION_LABEL[reminder.action]}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
