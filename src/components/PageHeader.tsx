import { motion } from "framer-motion";
import type { ReactNode } from "react";

export default function PageHeader({ eyebrow, title, subtitle, actions }: {
  eyebrow?: string; title: ReactNode; subtitle?: ReactNode; actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6 sm:mb-8">
      <div>
        {eyebrow && (
          <motion.span className="eyebrow mb-3" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            {eyebrow}
          </motion.span>
        )}
        <motion.h1
          className="text-[1.9rem] sm:text-[2.4rem] font-extrabold"
          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {title}
        </motion.h1>
        {subtitle && (
          <motion.p className="text-muted-foreground mt-1.5 max-w-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            {subtitle}
          </motion.p>
        )}
      </div>
      {actions && (
        <motion.div className="flex flex-wrap gap-2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {actions}
        </motion.div>
      )}
    </div>
  );
}
