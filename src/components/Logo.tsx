// The Freelancer CRM mark (a document with three linked nodes) plus the wordmark,
// drawn as SVG so it stays crisp and takes the theme colours.
export function LogoMark({ className = "", nodeColor = "var(--gold)" }: { className?: string; nodeColor?: string }) {
  return (
    <svg viewBox="0 0 40 48" className={className} aria-hidden="true">
      <path d="M4 4h22l10 10v30H4z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <path d="M26 4v10h10" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <g stroke={nodeColor} strokeWidth="3" strokeLinecap="round">
        <line x1="16" y1="20" x2="10" y2="34" />
        <line x1="16" y1="20" x2="28" y2="31" />
        <line x1="10" y1="34" x2="28" y2="31" />
      </g>
      <g fill={nodeColor}>
        <circle cx="16" cy="20" r="4" />
        <circle cx="10" cy="34" r="4" />
        <circle cx="28" cy="31" r="4" />
      </g>
    </svg>
  );
}

export default function Logo({ light = false, className = "" }: { light?: boolean; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className={`h-9 w-8 shrink-0 ${light ? "text-cream" : "text-brand-800"}`} />
      <span className={`display leading-[1.1] font-extrabold text-[0.95rem] ${light ? "text-cream" : "text-brand-800"}`}>
        FREELANCER
        <br />
        <b className="text-gold font-medium tracking-[0.18em]">CRM</b>
      </span>
    </span>
  );
}
