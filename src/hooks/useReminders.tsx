import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import api from "@/api";
import type { Reminder } from "@/lib/types";
import { money, todayIso } from "@/lib/format";

type Ctx = {
  reminders: Reminder[];
  loading: boolean;
  refresh: () => Promise<void>;
  notifyEnabled: boolean;
  notifySupported: boolean;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => void;
};

const RemindersContext = createContext<Ctx | null>(null);

const POLL_MS = 5 * 60 * 1000;
const NOTIFY_KEY = "crm.notify";
const SEEN_KEY = "crm.notified";

function readSeen(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || "{}");
  } catch {
    return {};
  }
}

/** Fires a system notification for each due/overdue reminder, at most once a day per reminder. */
function notifyNew(reminders: Reminder[], onClick: () => void) {
  const today = todayIso();
  const seen = readSeen();
  // Forget entries from previous days so the list doesn't grow forever.
  for (const k of Object.keys(seen)) if (seen[k] !== today) delete seen[k];
  for (const r of reminders) {
    if (r.severity === "upcoming" || seen[r.id] === today) continue;
    try {
      const n = new Notification(r.title, {
        body: `${r.detail} · ${money(r.amount, r.currency)}`,
        tag: r.id,
        icon: `${import.meta.env.BASE_URL}favicon.svg`,
      });
      n.onclick = () => {
        window.focus();
        onClick();
        n.close();
      };
    } catch {
      /* some mobile browsers only allow notifications from a service worker */
    }
    seen[r.id] = today;
  }
  localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
}

export function RemindersProvider({ children, onOpen }: { children: ReactNode; onOpen: () => void }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const notifySupported = typeof window !== "undefined" && "Notification" in window;
  const [notifyEnabled, setNotifyEnabled] = useState(
    () => notifySupported && Notification.permission === "granted" && localStorage.getItem(NOTIFY_KEY) === "1"
  );
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const enabledRef = useRef(notifyEnabled);
  enabledRef.current = notifyEnabled;

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get<Reminder[]>("/reminders/");
      setReminders(data);
      if (enabledRef.current) notifyNew(data, () => onOpenRef.current());
    } catch {
      /* keep the last list; the api layer handles expired sessions */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const enableNotifications = useCallback(async () => {
    if (!notifySupported) return false;
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    const ok = permission === "granted";
    if (ok) {
      localStorage.setItem(NOTIFY_KEY, "1");
      setNotifyEnabled(true);
      enabledRef.current = true;
      notifyNew(reminders, () => onOpenRef.current());
    }
    return ok;
  }, [notifySupported, reminders]);

  const disableNotifications = useCallback(() => {
    localStorage.removeItem(NOTIFY_KEY);
    setNotifyEnabled(false);
  }, []);

  return (
    <RemindersContext.Provider
      value={{ reminders, loading, refresh, notifyEnabled, notifySupported, enableNotifications, disableNotifications }}
    >
      {children}
    </RemindersContext.Provider>
  );
}

export function useReminders() {
  const ctx = useContext(RemindersContext);
  if (!ctx) throw new Error("useReminders must be used inside RemindersProvider");
  return ctx;
}
