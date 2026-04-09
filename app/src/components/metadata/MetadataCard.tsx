import { ReactNode } from "react";

interface MetadataCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function MetadataCard({ title, icon, children, className = "" }: MetadataCardProps) {
  return (
    <div className={`bg-paper border border-border/40 rounded-md overflow-hidden h-full ${className}`}>
      <div className="flex flex-col gap-2 px-4 py-3 h-full">
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
}

export function Property({ label, value, linked }: PropertyProps) {
  return (
    <div className="flex flex-col items-start">
      {label && (
        <span className="text-xs text-ink-tertiary leading-relaxed">{label}</span>
      )}
      <span
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
