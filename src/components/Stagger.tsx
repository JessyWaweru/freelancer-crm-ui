import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const container: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
export const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

// Children wrapped in <motion.X variants={item}> animate in one after another.
export default function Stagger({ children, className = "", as = "div" }: { children: ReactNode; className?: string; as?: "div" | "ul" }) {
  const Comp = as === "ul" ? motion.ul : motion.div;
  return (
    <Comp className={className} variants={container} initial="hidden" animate="show">
      {children}
    </Comp>
  );
}
