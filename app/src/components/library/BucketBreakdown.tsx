import type { TypeSlice } from "../../utils/timeline";

/** What a period is made of — the tooltip body shared by the timeline's density
 *  rail (whose stacked bars need a key) and the brush strip (whose silhouette
 *  carries no colour at all, so this is the ONLY place its composition shows). */
export function BucketBreakdown({
  label,
  total,
  slices,
  max = 5,
}: {
  label: string;
  total: number;
  slices: TypeSlice[];
  max?: number;
}) {
  // Sorted by count HERE, not by the chart's global stack order. The stack has to
  // keep one order across every bar to stay comparable, but a readout that lists
  // "Causa 8" above "Informe 29" just looks broken.
  const ranked = [...slices].sort((a, b) => b.n - a.n);
  const top = ranked.slice(0, max);
  const rest = ranked.length - top.length;
  return (
    <span data-component="BucketBreakdown" className="block text-start">
      <span data-part="total" className="block font-semibold tabular-nums pb-0.5">
        {label} · {total.toLocaleString()}
      </span>
      {top.map((s) => (
        <span key={s.typeId} data-part="slice" data-type-id={s.typeId} className="flex items-center gap-1.5 leading-[14px]">
          <span data-part="dot" aria-hidden className="w-1.5 h-1.5 rounded-[2px] shrink-0" style={{ backgroundColor: s.color }} />
          <span className="opacity-80">{s.name}</span>
          <span className="ms-auto ps-3 tabular-nums">{s.n.toLocaleString()}</span>
        </span>
      ))}
      {rest > 0 && <span data-part="more" className="block opacity-60 leading-[14px]">+{rest} more</span>}
    </span>
  );
}

/** The dark floating label both charts use. `anchor` picks which side it grows
 *  toward — HTML overlay, never an SVG <text> inside a scaled viewBox. */
export function ChartTip({
  children,
  anchor = "start",
}: {
  children: React.ReactNode;
  anchor?: "start" | "above";
}) {
  return (
    <span
      data-component="ChartTip"
      data-anchor={anchor}
      className="absolute z-50 pointer-events-none text-meta font-medium whitespace-nowrap rounded-md"
      style={{
        ...(anchor === "start"
          ? { right: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" }
          : { bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" }),
        padding: "4px 7px",
        backgroundColor: "var(--text-primary)",
        color: "var(--bg-surface)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      {children}
    </span>
  );
}
