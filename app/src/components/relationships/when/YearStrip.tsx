import type { MouseEvent } from "react";
import { ActiveFilterChip } from "../../shared/ActiveFilterChip";

export interface YearCount {
  year: number;
  count: number;
}

interface Props {
  years: YearCount[];
  /** Inclusive year range, or null for every year. */
  range: [number, number] | null;
  onChange: (range: [number, number] | null) => void;
  /** What one unit is called in the bar labels ("event"). */
  unit?: string;
}

/** Events per year as a row of bars, one per year across the whole span — empty
 *  years included, so the gaps read. A bar is a button: click narrows to that
 *  year (click it again to clear), Shift+click extends the range. The range
 *  shows as a chip in a line that is always mounted, so choosing one moves
 *  nothing below it. */
export function YearStrip({ years, range, onChange, unit = "event" }: Props) {
  if (!years.length) return null;
  const max = Math.max(1, ...years.map((y) => y.count));
  const first = years[0].year;
  const last = years[years.length - 1].year;
  const mid = Math.round((first + last) / 2);
  const inRange = (y: number) => !!range && y >= range[0] && y <= range[1];

  const pick = (e: MouseEvent, year: number) => {
    if (e.shiftKey && range) onChange([Math.min(range[0], year), Math.max(range[1], year)]);
    else if (range && range[0] === year && range[1] === year) onChange(null);
    else onChange([year, year]);
  };
  const plural = (n: number) => `${n} ${unit}${n === 1 ? "" : "s"}`;

  return (
    <div data-component="YearStrip" className="border border-border/60 rounded-md bg-paper px-3 pt-2 pb-1.5">
      <div data-part="head" className="flex items-center gap-2 h-6">
        <span className="text-meta text-ink-tertiary">By year</span>
        <span className="flex-1" />
        {range ? (
          <ActiveFilterChip
            label={range[0] === range[1] ? String(range[0]) : `${range[0]}–${range[1]}`}
            onRemove={() => onChange(null)}
            removeLabel="Show every year"
          />
        ) : (
          <span className="text-meta text-ink-tertiary hidden sm:inline">Click a year, Shift+click to extend</span>
        )}
      </div>
      <div data-part="bars" className="flex items-end gap-px h-10 mt-1" role="group" aria-label={`${unit}s by year`}>
        {years.map(({ year, count }) => (
          <button
            key={year}
            type="button"
            data-part="bar"
            aria-pressed={inRange(year)}
            aria-label={`${year}: ${plural(count)}`}
            title={`${year} · ${plural(count)}`}
            onClick={(e) => pick(e, year)}
            className={`flex-1 min-w-0 rounded-[1px] transition-colors cursor-pointer
              focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40 ${
                inRange(year) ? "bg-ink" : "bg-border-soft hover:bg-ink-muted"
              }`}
            style={{ height: count ? `${20 + (count / max) * 80}%` : "8%" }}
          />
        ))}
      </div>
      <div data-part="axis" aria-hidden className="flex justify-between mt-1 text-meta tabular-nums text-ink-tertiary">
        <span>{first}</span>
        {last - first > 4 && <span>{mid}</span>}
        <span>{last}</span>
      </div>
    </div>
  );
}
