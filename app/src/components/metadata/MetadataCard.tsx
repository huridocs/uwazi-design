import { ReactNode } from "react";

interface MetadataCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Body runs edge to edge — for content that draws its own rules to the card's
   *  border (the fields lattice). Padding it would leave a gutter between the
   *  grid's hairlines and the card's, which is the very seam we're removing. */
  flush?: boolean;
}

export function MetadataCard({ title, icon, children, className = "", flush }: MetadataCardProps) {
  const header = (
    <div className={`flex items-center gap-1.5 ${flush ? "px-4 py-3" : ""}`}>
      {icon}
      <h4 className="text-sm font-bold text-ink leading-tight">{title}</h4>
    </div>
  );

  return (
    <div className={`bg-paper border border-border/40 rounded-md overflow-hidden ${className}`}>
      {flush ? (
        <>
          {header}
          {children}
        </>
      ) : (
        <div className="flex flex-col gap-2 px-4 py-3">
          {header}
          {children}
        </div>
      )}
    </div>
  );
}

interface PropertyProps {
  label?: string;
  value: string;
  linked?: boolean;
  /** Keep the value left-to-right (filenames, sizes, dates) so RTL bidi
   *  doesn't reorder it to e.g. "KB 948" or "2000-11-25". */
  ltr?: boolean;
}

export function Property({ label, value, linked, ltr }: PropertyProps) {
  return (
    <div className="flex flex-col items-start">
      {label && (
        <span className="text-xs text-ink-tertiary leading-relaxed">{label}</span>
      )}
      <span
        dir={ltr ? "ltr" : undefined}
        className={`text-sm font-medium text-ink leading-relaxed ${
          linked ? "underline decoration-solid" : ""
        }`}
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
