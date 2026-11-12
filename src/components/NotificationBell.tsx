import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellRing, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useReminders } from "@/hooks/useReminders";
import ReminderCard from "./ReminderCard";

export default function NotificationBell({ dark = false }: { dark?: boolean }) {
  const { reminders, notifyEnabled, notifySupported, enableNotifications } = useReminders();
  const [open, setOpen] = useState(false);
  const [ringKey, setRingKey] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const urgent = reminders.filter((r) => r.severity !== "upcoming").length;
  const prevCount = useRef(0);

  // Wiggle the bell whenever new reminders arrive.
  useEffect(() => {
    if (reminders.length > prevCount.current) setRingKey((k) => k + 1);
    prevCount.current = reminders.length;
  }, [reminders.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        className={`icon-btn ${dark ? "text-cream/80 hover:bg-white/10 hover:text-white" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={`Reminders${reminders.length ? ` (${reminders.length})` : ""}`}
      >
        <span key={ringKey} className={ringKey ? "bell-ring" : ""}>
          <Bell size={20} />
        </span>
        {reminders.length > 0 && (
          <span className={`absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full text-[0.65rem] font-extrabold grid place-items-center ${urgent ? "bg-gold text-ink ping-soft" : "bg-brand-100 text-brand"}`}>
            {reminders.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className={`fixed sm:absolute left-3 right-3 top-16 sm:top-12 z-50 sm:w-[380px] card shadow-[var(--shadow-lg)] p-2 text-text ${dark ? "sm:left-0 sm:right-auto origin-top-left" : "sm:left-auto sm:right-0 origin-top-right"}`}
          >
            <div className="flex items-center justify-between px-3 pt-2 pb-1">
              <h3 className="font-extrabold">Reminders</h3>
              <span className="text-xs text-muted-foreground">{reminders.length} to do</span>
            </div>
            {notifySupported && !notifyEnabled && (
              <button
                className="mx-1 my-2 w-[calc(100%-0.5rem)] flex items-center gap-3 rounded-2xl bg-brand-800 text-cream p-3 text-left text-sm"
                onClick={async () => {
                  const ok = await enableNotifications();
                  toast[ok ? "success" : "error"](ok ? "Notifications on" : "Notifications are blocked in your browser settings");
                }}
              >
                <BellRing size={18} className="text-gold shrink-0" />
                <span><b>Turn on alerts</b><br /><span className="text-cream/70">Get a notification when an invoice, payment, deadline or to-do is due.</span></span>
              </button>
            )}
            <div className="max-h-[60dvh] overflow-y-auto">
              {reminders.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                  <CheckCircle2 className="text-ok" size={28} />
                  All caught up. Nothing due.
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {reminders.map((r) => (
                    <ReminderCard key={r.id} reminder={r} compact onDone={() => setOpen(false)} />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
