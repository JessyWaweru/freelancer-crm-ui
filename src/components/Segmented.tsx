import { motion } from "framer-motion";
import { useId } from "react";

// Pill tabs with a sliding white highlight.
export default function Segmented<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  const id = useId();
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} data-active={value === o.value} onClick={() => onChange(o.value)}>
          {value === o.value && (
            <motion.span layoutId={`seg-${id}`} className="seg-bg" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
          )}
          {o.label}
          {o.count != null && o.count > 0 && (
            <span className="ml-1.5 rounded-full bg-brand/10 px-1.5 text-[0.7rem] text-brand">{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
