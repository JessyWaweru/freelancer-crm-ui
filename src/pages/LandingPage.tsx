import { motion } from "framer-motion";
import { ArrowRight, BellRing, Check, FolderKanban, ReceiptText, Repeat, Users } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { isAuthed } from "@/auth";
import Logo from "@/components/Logo";
import Aurora from "@/components/reactbits/Aurora";
import GradientText from "@/components/reactbits/GradientText";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { useFinePointer } from "@/hooks/useFinePointer";

const FEATURES = [
  { icon: Users, title: "Clients in one place", text: "Names, numbers, companies, and what each one owes you." },
  { icon: Repeat, title: "Bill your way", text: "Fixed project fees, monthly retainers, or a setup fee plus a monthly." },
  { icon: BellRing, title: "Never forget to invoice", text: "Reminders before each invoice is due, and when a client pays late." },
  { icon: ReceiptText, title: "Invoices that look good", text: "Print to PDF, or share on WhatsApp and email with one tap." },
];

function InvoicePreview() {
  return (
    <motion.div
      className="relative w-full max-w-[360px] mx-auto"
      initial={{ opacity: 0, y: 30, rotate: 0 }}
      animate={{ opacity: 1, y: 0, rotate: -3 }}
      transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}>
        <div className="rounded-[24px] bg-white border border-line shadow-[var(--shadow-lg)] overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-brand-800 via-brand to-gold" />
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div className="display font-extrabold text-xl text-brand-800">INVOICE</div>
              <span className="pill pill-sent pill-dot">Sent</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">INV-0012 · Monthly retainer</div>
            <div className="mt-5 grid gap-2 text-sm">
              <div className="flex justify-between"><span>Website care, November</span><b className="text-ink">KES 6,000</b></div>
              <div className="flex justify-between"><span>Extra landing page</span><b className="text-ink">KES 4,000</b></div>
            </div>
            <div className="mt-5 rounded-2xl bg-brand-800 text-cream p-4 flex justify-between items-end">
              <span className="text-sm">Total due</span>
              <span className="display font-extrabold text-gold">KES 10,000</span>
            </div>
          </div>
        </div>
      </motion.div>
      <motion.div
        className="absolute -left-6 sm:-left-12 -bottom-6 card p-3 pr-4 flex items-center gap-3 shadow-[var(--shadow)] rotate-3"
        initial={{ opacity: 0, x: -20, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ delay: 0.9, type: "spring", stiffness: 260, damping: 18 }}
      >
        <span className="grid place-items-center h-9 w-9 rounded-xl bg-gold-50 text-[#9a6514]"><BellRing size={17} /></span>
        <span className="text-xs leading-tight"><b className="text-ink block text-sm">Retainer due in 3 days</b>Create the December invoice</span>
      </motion.div>
      <motion.div
        className="absolute -right-3 sm:-right-8 -top-5 card p-2.5 pr-3.5 flex items-center gap-2 shadow-[var(--shadow)] -rotate-2"
        initial={{ opacity: 0, y: -10, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1.2, type: "spring", stiffness: 260, damping: 18 }}
      >
        <span className="grid place-items-center h-7 w-7 rounded-full bg-ok text-white"><Check size={15} /></span>
        <b className="text-sm text-ink">Paid</b>
      </motion.div>
    </motion.div>
  );
}

export default function LandingPage() {
  const fine = useFinePointer();
  if (isAuthed()) return <Navigate to="/app" replace />;

  return (
    <div className="min-h-dvh bg-cream overflow-hidden">
      <header className="relative z-20 mx-auto max-w-6xl px-4 sm:px-6 h-20 flex items-center justify-between">
        <Logo />
        <div className="flex gap-2">
          <Link to="/login" className="btn btn-ghost">Log in</Link>
          <Link to="/signup" className="btn btn-primary hidden sm:inline-flex">Get started</Link>
        </div>
      </header>

      <section className="relative">
        <Aurora className="aurora-bg" colorStops={["#7a1d3f", "#c0456b", "#e8a83b"]} lightMode amplitude={1} blend={0.6} height={0.6} speed={0.6} opacity={0.85} />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-20 sm:pt-14 sm:pb-28 grid gap-14 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <motion.span className="eyebrow mb-5" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>CRM for freelancers</motion.span>
            <motion.h1
              className="text-[2.4rem] sm:text-[3.6rem] font-extrabold leading-[1.04]"
              initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              Clients, projects and{" "}
              <GradientText className="inline" colors={["#7a1d3f", "#c0456b", "#7a1d3f"]} animationSpeed={6}>invoices</GradientText>
              , with a <span className="hl-gold">nudge</span> when it's time to bill.
            </motion.h1>
            <motion.p className="text-lg text-muted-foreground mt-5 max-w-lg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              Set each project as a fixed fee, a monthly retainer, or both. Freelancer CRM tells you when an invoice is due, drafts it, and shows who still owes you.
            </motion.p>
            <motion.div className="mt-8 flex flex-col sm:flex-row gap-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
              <Link to="/signup" className="btn btn-primary !min-h-[52px] !px-7 group">
                Start free <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/login" className="btn btn-outline !min-h-[52px] !px-7">I have an account</Link>
            </motion.div>
          </div>
          <InvoicePreview />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            >
              <SpotlightCard theme="light" spotlightColor="#7a1d3f" ambient={!fine} className="!rounded-[22px] !p-0 h-full">
                <div className="p-6">
                  <span className="grid place-items-center h-11 w-11 rounded-2xl bg-brand-50 text-brand mb-4"><Icon size={21} /></span>
                  <h3 className="font-extrabold text-ink">{title}</h3>
                  <p className="text-sm text-muted-foreground mt-1.5">{text}</p>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-16">
        <div className="relative overflow-hidden rounded-[28px] bg-brand-800 text-cream p-8 sm:p-12 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <Aurora className="aurora-bg" colorStops={["#3d0d20", "#c0456b", "#e8a83b"]} amplitude={0.8} blend={0.55} speed={0.5} opacity={0.5} mouseInteraction={false} />
          <div className="relative z-10">
            <h2 className="text-cream text-2xl sm:text-3xl font-extrabold flex items-center gap-3"><FolderKanban className="text-gold" /> Ready to get paid on time?</h2>
            <p className="text-cream/70 mt-2">Add your first client and project in a couple of minutes.</p>
          </div>
          <Link to="/signup" className="relative z-10 btn btn-gold !min-h-[52px] !px-7">Create your account</Link>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-8">© {new Date().getFullYear()} Freelancer CRM</p>
      </section>
    </div>
  );
}
