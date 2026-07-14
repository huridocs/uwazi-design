import { ReactNode } from "react";

interface MetadataCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function MetadataCard({ title, icon, children, className = "" }: MetadataCardProps) {
  return (
    <div className={`bg-paper border border-border/40 rounded-md overflow-hidden ${className}`}>
      <div className="flex flex-col gap-2 px-4 py-3">
        <div className="flex items-center gap-1.5">
          {icon}
          <h4 className="text-sm font-bold text-ink leading-tight">{title}</h4>
        </div>
        {children}
      </div>
    </div>
  );
}

interface PropertyProps {
  label?: string;
  value: string;
  linked?: boolean;
  /** Clip to one line, full value on hover. Filenames don't wrap or break — a
   *  Velasquez-Rodriguez_v_Honduras_Judgment_1988.pdf ran straight out of the
   *  card on a phone. */
  truncate?: boolean;
  /** Keep the value left-to-right (filenames, sizes, dates) so RTL bidi
   *  doesn't reorder it to e.g. "KB 948" or "2000-11-25". */
  ltr?: boolean;
}

export function Property({ label, value, linked, ltr, truncate }: PropertyProps) {
  return (
    <div className="flex flex-col items-start min-w-0 w-full">
      {label && (
        <span className="text-xs text-ink-tertiary leading-relaxed">{label}</span>
      )}
      <span
        dir={ltr ? "ltr" : undefined}
        title={truncate ? value : undefined}
        className={`text-sm font-medium text-ink leading-relaxed max-w-full ${
          linked ? "underline decoration-solid" : ""
        } ${truncate ? "truncate" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

export function PropertyRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-6 items-start w-full">
      {children}
    </div>
  );
}
