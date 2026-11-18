import { Command } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, Building2, CornerDownLeft, FilePlus2, FolderKanban, FolderPlus, LayoutDashboard, ReceiptText, Search,
  Settings, UserPlus, Users, Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api";
import { useReminders } from "@/hooks/useReminders";
import { money, relativeDay } from "@/lib/format";
import type { Client, Invoice, Project } from "@/lib/types";

const OPEN_EVENT = "crm:palette";

/** Open the palette from anywhere (sidebar button, mobile header). */
export function openPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

const JUMPS: Record<string, string> = { d: "/app", c: "/app/clients", p: "/app/projects", i: "/app/invoices", s: "/app/settings" };

function typingIn(el: EventTarget | null) {
  const t = el as HTMLElement | null;
  return !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
}

function Row({ icon, title, hint, right, onSelect, value, keywords }: {
  icon: ReactNode; title: ReactNode; hint?: ReactNode; right?: ReactNode; onSelect: () => void; value: string; keywords?: string[];
}) {
  return (
    <Command.Item value={value} keywords={keywords} onSelect={onSelect}>
      <span className="palette-icon">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{title}</span>
        {hint && <span className="block truncate text-xs font-medium text-muted-foreground">{hint}</span>}
      </span>
      {right && <span className="shrink-0 text-xs font-bold text-muted-foreground tabular-nums">{right}</span>}
      <ArrowRight size={16} className="palette-go shrink-0" />
    </Command.Item>
  );
}

export default function CommandPalette() {
  const nav = useNavigate();
  const { reminders } = useReminders();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<{ clients: Client[]; projects: Project[]; invoices: Invoice[] } | null>(null);
  const pendingG = useRef(0);

  const close = useCallback(() => { setOpen(false); setQuery(""); }, []);
  const go = useCallback((to: string) => { close(); nav(to); }, [close, nav]);

  // Shortcuts: ⌘K / Ctrl+K / "/" open the palette, "g" then a letter jumps, "n" starts an invoice.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (open || e.metaKey || e.ctrlKey || e.altKey || typingIn(e.target) || document.querySelector("[role=dialog]")) return;
      const k = e.key.toLowerCase();
      if (k === "/") { e.preventDefault(); setOpen(true); return; }
      if (Date.now() - pendingG.current < 1200 && JUMPS[k]) {
        pendingG.current = 0;
        nav(JUMPS[k]);
        return;
      }
      if (k === "g") { pendingG.current = Date.now(); return; }
      if (k === "n") nav("/app/invoices?new=1");
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, [open, nav]);

  // Fresh data each time it opens; it's small and this keeps results current.
  useEffect(() => {
    if (!open) return;
    let live = true;
    Promise.all([api.get<Client[]>("/clients/"), api.get<Project[]>("/projects/"), api.get<Invoice[]>("/invoices/")])
      .then(([c, p, i]) => live && setData({ clients: c.data, projects: p.data, invoices: i.data }))
      .catch(() => {});
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { live = false; document.body.style.overflow = prev; };
  }, [open]);

  const urgent = reminders.filter((r) => r.severity !== "upcoming").slice(0, 4);
  const searching = query.trim().length > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center px-3 pt-[10vh] sm:pt-[14vh]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
        >
          <div className="absolute inset-0 bg-brand-800/50 backdrop-blur-[6px]" onClick={close} />
          <motion.div
            className="palette relative w-full max-w-[620px] overflow-hidden rounded-[24px] bg-cream border border-white/60 shadow-[0_40px_120px_-30px_rgba(42,9,20,.6)]"
            initial={{ opacity: 0, y: -12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 520, damping: 38 }}
            role="dialog" aria-modal="true" aria-label="Search and commands"
          >
            <Command loop label="Search and commands" onKeyDown={(e) => e.key === "Escape" && close()}>
              <div className="flex items-center gap-3 px-4 sm:px-5 h-[60px] border-b border-line">
                <Search size={19} className="text-brand shrink-0" />
                <Command.Input autoFocus value={query} onValueChange={setQuery} placeholder="Search clients, projects, invoices… or type a command" />
                <button className="kbd shrink-0" onClick={close} aria-label="Close">esc</button>
              </div>
              <Command.List className="max-h-[min(58vh,460px)] overflow-y-auto overscroll-contain p-2">
                <Command.Empty>{data ? `Nothing matches “${query}”.` : "Loading…"}</Command.Empty>

                {!searching && urgent.length > 0 && (
                  <Command.Group heading="Needs attention">
                    {urgent.map((r) => (
                      <Row
                        key={r.id} value={`attention ${r.title}`} icon={<Zap size={16} />} title={r.title}
                        hint={`${r.detail} · ${relativeDay(r.date)}`}
                        right={r.amount != null ? money(r.amount, r.currency, { compact: true }) : undefined}
                        onSelect={() => go(r.invoice ? `/app/invoices/${r.invoice}` : r.project ? `/app/projects/${r.project}` : "/app")}
                      />
                    ))}
                  </Command.Group>
                )}

                <Command.Group heading="Create">
                  <Row value="new invoice" keywords={["bill", "create"]} icon={<FilePlus2 size={16} />} title="New invoice" onSelect={() => go("/app/invoices?new=1")} right={<span className="kbd">N</span>} />
                  <Row value="new client" keywords={["add", "customer", "create"]} icon={<UserPlus size={16} />} title="New client" onSelect={() => go("/app/clients?new=1")} />
                  <Row value="new project" keywords={["add", "create", "retainer"]} icon={<FolderPlus size={16} />} title="New project" onSelect={() => go("/app/projects?new=1")} />
                </Command.Group>

                <Command.Group heading="Go to">
                  {([
                    ["Dashboard", "/app", LayoutDashboard, "D"],
                    ["Clients", "/app/clients", Users, "C"],
                    ["Projects", "/app/projects", FolderKanban, "P"],
                    ["Invoices", "/app/invoices", ReceiptText, "I"],
                    ["Settings", "/app/settings", Settings, "S"],
                  ] as const).map(([label, to, Icon, key]) => (
                    <Row key={to} value={`go ${label}`} icon={<Icon size={16} />} title={label} onSelect={() => go(to)}
                      right={<span className="inline-flex gap-1"><span className="kbd">G</span><span className="kbd">{key}</span></span>} />
                  ))}
                </Command.Group>

                {searching && data && (
                  <>
                    <Command.Group heading="Clients">
                      {data.clients.map((c) => (
                        <Row key={`c${c.id}`} value={`client ${c.id} ${c.name}`} keywords={[c.company, c.email ?? "", c.phone]}
                          icon={<Building2 size={16} />} title={c.name} hint={[c.company, c.phone].filter(Boolean).join(" · ")}
                          onSelect={() => go(`/app/clients/${c.id}`)} />
                      ))}
                    </Command.Group>
                    <Command.Group heading="Projects">
                      {data.projects.map((p) => (
                        <Row key={`p${p.id}`} value={`project ${p.id} ${p.title}`} keywords={[p.client_name ?? ""]}
                          icon={<FolderKanban size={16} />} title={p.title} hint={`${p.client_name} · ${p.status}`}
                          onSelect={() => go(`/app/projects/${p.id}`)} />
                      ))}
                    </Command.Group>
                    <Command.Group heading="Invoices">
                      {data.invoices.map((i) => (
                        <Row key={`i${i.id}`} value={`invoice ${i.id} ${i.number}`} keywords={[i.client_name, i.project_title ?? "", i.status]}
                          icon={<ReceiptText size={16} />} title={<>{i.number} <span className="text-muted-foreground font-medium">· {i.client_name}</span></>}
                          hint={i.status === "paid" ? "Paid" : i.status === "void" ? "Void" : `${i.status === "draft" ? "Draft" : "Sent"} · due ${relativeDay(i.due_date)}`}
                          right={money(i.status === "sent" ? i.balance : i.total, i.currency, { compact: true })}
                          onSelect={() => go(`/app/invoices/${i.id}`)} />
                      ))}
                    </Command.Group>
                  </>
                )}
              </Command.List>
              <div className="hidden sm:flex items-center gap-4 border-t border-line px-5 h-11 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><span className="kbd">↑</span><span className="kbd">↓</span> move</span>
                <span className="inline-flex items-center gap-1.5"><span className="kbd"><CornerDownLeft size={11} /></span> open</span>
                <span className="ml-auto inline-flex items-center gap-1.5">Anywhere: <span className="kbd">{isMac ? "⌘" : "Ctrl"}</span><span className="kbd">K</span> or <span className="kbd">/</span></span>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
