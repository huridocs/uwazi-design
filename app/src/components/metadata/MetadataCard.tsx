import { ReactNode } from "react";

interface MetadataCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** The card head NAMES the thing in the card — a metadata field, a connection,
 *  the document — so it is the app's label recipe, not a heading.
 *
 *  It was `text-sm font-bold text-ink leading-tight`: 14px/700, no case change,
 *  no tracking. TYPOGRAPHY.md names that string as matching exactly one
 *  component in the codebase, and this was the component. Once the record became
 *  a stack of one card per field it also became the failure that file records
 *  for form labels — "a 14px bold word naming an input, two full steps above
 *  every other field label in the app" — printed a dozen times down a column
 *  whose values are 14px regular.
 *
 *  Now the `table header` combo at one colour step up: 11px semibold uppercase
 *  `tracking-wider`, `ink-secondary`. Same level as every other label for a
 *  piece of data in this app (the connection tables' column heads, the
 *  per-entity cards' cell labels, the old record table's `th`), and
 *  `-secondary` rather than `-tertiary` because a card head has to outrank the
 *  labels INSIDE it — in a ConnectionGroupCard the head and its column headers
 *  would otherwise be the same text. One colour step, no second size.
 *
 *  Icons in this row belong at 11px to match; the callers pass them. */
export function MetadataCard({ title, icon, children, className = "" }: MetadataCardProps) {
  return (
    <div className={`bg-paper border border-border/40 rounded-md overflow-hidden ${className}`}>
      <div className="flex flex-col gap-2 px-4 py-3">
        <div className="flex items-center gap-1.5">
          {icon}
          <h4 className="text-meta font-semibold uppercase tracking-wider text-ink-secondary">
            {title}
          </h4>
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
