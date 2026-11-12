import { motion } from "framer-motion";
import type { ReactNode } from "react";

export default function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <motion.div className="card px-6 py-14 text-center flex flex-col items-center" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <motion.div
        className="grid place-items-center h-16 w-16 rounded-[20px] bg-brand-50 text-brand mb-4"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        {icon}
      </motion.div>
      <h3 className="text-lg font-extrabold">{title}</h3>
      <p className="text-muted-foreground text-sm mt-1 max-w-sm">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
