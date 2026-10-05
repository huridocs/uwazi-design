import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string | number;
  accent?: "green" | "blue" | "red" | "amber";
  /** The figure's unit, after it ("total users"). */
  caption?: string;
  /** A line under the figure ("1 Admins | 2 Editors"). */
  detail?: ReactNode;
  /** Makes the card a link to the page the figure comes from. Its name is
   *  "<label>, <value> <caption>". */
  onOpen?: () => void;
}

const accentColor = {
  green: "var(--success)",
  blue: "var(--accent-blue)",
  red: "var(--accent-seal)",
  amber: "var(--warning)",
};

/** One figure on a dashboard: label, value, its unit, and an optional detail
 *  line. With `onOpen` the whole card is a button to where the figure comes
 *  from, with a chevron and a focus ring; without it, plain text, so no card
 *  looks pressable that is not. */
export function StatsCard({ label, value, accent, caption, detail, onOpen }: StatsCardProps) {
  const body = (
    <>
      <span data-part="label" className="flex items-center gap-1.5 text-meta font-semibold text-ink-tertiary uppercase tracking-wider">
        {accent && (
          <span
            data-part="accent"
            aria-hidden
            className="w-1.5 h-1.5 rounded-[1px] shrink-0"
            style={{ backgroundColor: accentColor[accent] }}
          />
        )}
        {label}
        {onOpen && <ChevronRight size={12} aria-hidden className="ms-auto text-ink-muted" />}
      </span>
      <span className="flex items-baseline gap-1.5 min-w-0">
        <span data-part="value" className={`text-xl font-semibold tabular-nums ${accent || caption ? "text-ink" : "text-ink-tertiary"}`}>
          {value}
        </span>
        {caption && <span data-part="caption" className="text-xs text-ink-tertiary truncate">{caption}</span>}
      </span>
      {detail && <span data-part="detail" className="text-xs text-ink-tertiary text-pretty">{detail}</span>}
    </>
  );
  const frame = "flex flex-col gap-1 px-4 py-3 rounded-lg bg-paper text-start min-w-0";
  const border = { border: "1px solid var(--border-primary)" };
  return onOpen ? (
    <button
      type="button"
      data-component="StatsCard"
      data-link
      onClick={onOpen}
      aria-label={`${label}, ${value}${caption ? ` ${caption}` : ""}`}
      className={`${frame} cursor-pointer hover:bg-warm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30`}
      style={border}
    >
      {body}
    </button>
  ) : (
    <div data-component="StatsCard" className={frame} style={border}>
      {body}
    </div>
  );
}
