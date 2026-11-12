import { motion } from "framer-motion";
import { BellRing, ReceiptText, Repeat } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
import Aurora from "./reactbits/Aurora";

const POINTS = [
  { icon: Repeat, text: "Fixed fees, monthly retainers, or both" },
  { icon: BellRing, text: "Reminders when an invoice is due to go out" },
  { icon: ReceiptText, text: "Clean invoices you can send as PDF or on WhatsApp" },
];

export default function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-[1fr_1.05fr] bg-cream">
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-brand-800 text-cream p-12">
        <Aurora className="aurora-bg" colorStops={["#3d0d20", "#c0456b", "#e8a83b"]} amplitude={1} blend={0.55} speed={0.5} opacity={0.75} />
        <Link to="/" className="relative z-10"><Logo light /></Link>
        <div className="relative z-10 max-w-md">
          <motion.h2
            className="text-cream text-[2.6rem] font-extrabold leading-[1.05]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            Do the work.<br />We'll remember <span className="text-gold">the invoices.</span>
          </motion.h2>
          <ul className="mt-8 grid gap-3">
            {POINTS.map(({ icon: Icon, text }, i) => (
              <motion.li
                key={text}
                className="flex items-center gap-3 text-cream/85"
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <span className="grid place-items-center h-9 w-9 rounded-xl bg-white/10 text-gold"><Icon size={18} /></span>
                {text}
              </motion.li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-xs text-cream/50">© {new Date().getFullYear()} Freelancer CRM</p>
      </aside>

      <main className="relative flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="absolute top-0 inset-x-0 h-56 overflow-hidden lg:hidden">
          <Aurora className="aurora-bg" colorStops={["#7a1d3f", "#c0456b", "#e8a83b"]} lightMode amplitude={1} blend={0.6} height={0.6} speed={0.6} opacity={0.7} />
        </div>
        <Link to="/" className="relative lg:hidden mb-8"><Logo /></Link>
        <motion.div
          className="relative w-full max-w-[420px]"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="card p-6 sm:p-8 shadow-[var(--shadow-lg)]">
            <h1 className="text-[1.75rem] font-extrabold">{title}</h1>
            <p className="text-muted-foreground mt-1 mb-6">{subtitle}</p>
            {children}
          </div>
        </motion.div>
      </main>
    </div>
  );
}
