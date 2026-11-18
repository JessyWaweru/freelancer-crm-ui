import { AnimatePresence, motion } from "framer-motion";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type MenuItem = { icon: LucideIcon; label: string; onClick: () => void; danger?: boolean; hidden?: boolean };

/** A "⋯" button with a small dropdown. Closes on outside click, Escape, or picking an item. */
export default function ActionMenu({ items, label = "More actions", trigger }: { items: MenuItem[]; label?: string; trigger?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button type="button" className={trigger ? "btn btn-outline" : "icon-btn !h-9 !w-9"} onClick={() => setOpen((o) => !o)} aria-label={label} aria-expanded={open}>
        {trigger ?? <MoreHorizontal size={18} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.14 }}
            className="absolute right-0 top-[calc(100%+6px)] z-30 w-56 card p-1.5 shadow-[var(--shadow)] origin-top-right"
          >
            {items.filter((i) => !i.hidden).map(({ icon: Icon, label: text, onClick, danger }) => (
              <button
                key={text}
                role="menuitem"
                type="button"
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-left ${danger ? "text-destructive hover:bg-[#fdecea]" : "text-ink hover:bg-tint"}`}
                onClick={() => { setOpen(false); onClick(); }}
              >
                <Icon size={15} /> {text}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
