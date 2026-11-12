import { AnimatePresence, motion } from "framer-motion";
import { FolderKanban, LayoutDashboard, LogOut, ReceiptText, Settings, Users } from "lucide-react";
import { cloneElement, useEffect } from "react";
import { NavLink, useLocation, useNavigate, useOutlet } from "react-router-dom";
import { Toaster } from "sonner";
import { currentUsername, logout } from "./auth";
import Logo from "./components/Logo";
import NotificationBell from "./components/NotificationBell";
import ClickSpark from "./components/reactbits/ClickSpark";
import { RemindersProvider, useReminders } from "./hooks/useReminders";
import { initials } from "./lib/format";
import { MONEY_REMINDERS } from "./lib/types";

const NAV = [
  { to: "/app", label: "Dashboard", short: "Home", icon: LayoutDashboard, end: true },
  { to: "/app/clients", label: "Clients", short: "Clients", icon: Users },
  { to: "/app/projects", label: "Projects", short: "Projects", icon: FolderKanban },
  { to: "/app/invoices", label: "Invoices", short: "Invoices", icon: ReceiptText },
  { to: "/app/settings", label: "Settings", short: "Settings", icon: Settings },
];

function Sidebar({ onLogout }: { onLogout: () => void }) {
  const { reminders } = useReminders();
  const moneyCount = reminders.filter((r) => MONEY_REMINDERS.includes(r.type)).length;
  const user = currentUsername();
  return (
    <aside className="sidebar no-print hidden lg:flex fixed inset-y-0 left-0 w-[264px] flex-col p-5 text-cream z-30">
      <div className="flex items-center justify-between px-2 pt-1 pb-8">
        <Logo light />
        <NotificationBell dark />
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="nav-bg" className="nav-bg" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                <Icon size={19} />
                {label}
                {label === "Invoices" && moneyCount > 0 && (
                  <span className="ml-auto rounded-full bg-gold text-ink text-[0.7rem] font-extrabold px-2 py-0.5">{moneyCount}</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex items-center gap-3 rounded-2xl bg-white/5 p-3">
        <div className="grid place-items-center h-10 w-10 rounded-xl bg-gold text-ink font-extrabold">{initials(user || "Me")}</div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold truncate">{user || "Signed in"}</div>
          <div className="text-xs text-cream/60">Freelancer</div>
        </div>
        <button className="icon-btn text-cream/70 hover:bg-white/10 hover:text-white" onClick={onLogout} aria-label="Log out">
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}

function MobileBars({ onLogout }: { onLogout: () => void }) {
  return (
    <>
      <header className="no-print lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-16 bg-cream/85 backdrop-blur-xl border-b border-line">
        <Logo />
        <div className="flex items-center">
          <NotificationBell />
          <button className="icon-btn" onClick={onLogout} aria-label="Log out">
            <LogOut size={19} />
          </button>
        </div>
      </header>
      <nav className="no-print lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/90 backdrop-blur-xl border-t border-line pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {NAV.map(({ to, short, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="relative flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-bold">
              {({ isActive }) => (
                <>
                  {isActive && <motion.span layoutId="tab-bg" className="absolute top-0 h-[3px] w-10 rounded-b-full bg-brand" />}
                  <motion.span animate={{ scale: isActive ? 1.12 : 1, y: isActive ? -1 : 0 }} className={isActive ? "text-brand" : "text-muted-foreground"}>
                    <Icon size={21} />
                  </motion.span>
                  <span className={isActive ? "text-brand" : "text-muted-foreground"}>{short}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const outlet = useOutlet();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <RemindersProvider onOpen={() => navigate("/app")}>
      <ClickSpark sparkColor="#e8a83b" sparkSize={10} sparkRadius={22} sparkCount={8} duration={450}>
        <div className="min-h-dvh">
          <Sidebar onLogout={handleLogout} />
          <MobileBars onLogout={handleLogout} />
          <main className="lg:pl-[264px] print-reset">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 pt-6 sm:pt-10 pb-28 lg:pb-14 print-reset">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {outlet && cloneElement(outlet)}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </ClickSpark>
      <Toaster position="top-center" richColors closeButton toastOptions={{ style: { fontFamily: "var(--font-sans)", borderRadius: 16 } }} />
    </RemindersProvider>
  );
}
