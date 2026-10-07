import { useMemo } from "react";
import { formatClock } from "../../data/vegas/links";
import { SYNC_DEFAULT_WINDOW, type SyncModel } from "../../data/vegas/syncLanes";

const BIN = 10;
const H = 56;

/** The Overview's Sync teaser: over the shooting's twelve minutes, how many
 *  recordings are known to run in each ten seconds, with the volleys marked.
 *  One button: the strip opens the Sync view at the first volley. */
export function OverviewSync({ model, onOpen }: { model: SyncModel; onOpen: () => void }) {
  const { from, to } = SYNC_DEFAULT_WINDOW;
  const bins = useMemo(() => {
    const out = new Array<number>(Math.ceil((to - from) / BIN)).fill(0);
    for (const l of model.lanes) {
      if (l.start === undefined || l.knownEnd === undefined) continue;
      for (let i = 0; i < out.length; i++) {
        const b0 = from + i * BIN;
        if (l.start < b0 + BIN && l.knownEnd >= b0) out[i]++;
      }
    }
    return out;
  }, [model, from, to]);
  const max = Math.max(1, ...bins);
  const x = (t: number) => ((t - from) / (to - from)) * 100;
  const peak = Math.max(...bins);
  const first = model.volleys[0];
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open Sync at the first volley, ${first ? formatClock(first.at) : ""}. Up to ${peak} recordings run at once between ${formatClock(from)} and ${formatClock(to)}.`}
      className="group w-full flex flex-col gap-1 rounded-md p-2 -m-2 text-start cursor-pointer hover:bg-warm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
    >
      <svg aria-hidden viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: H }}>
        {model.volleys.map((m) => (
          <rect
            key={m.id}
            x={x(m.bandFrom)}
            y={0}
            width={Math.max(0.25, x(m.bandTo) - x(m.bandFrom))}
            height={H}
            style={{ fill: "var(--bg-muted)" }}
          />
        ))}
        {bins.map((c, i) => {
          const h = (c / max) * (H - 14);
          return (
            <rect
              key={i}
              x={x(from + i * BIN) + 0.08}
              y={H - h}
              width={(BIN / (to - from)) * 100 - 0.16}
              height={h}
              style={{ fill: "var(--text-tertiary)", opacity: 0.45 }}
            />
          );
        })}
      </svg>
      {/* Volley numbers in HTML: SVG text stretches with the viewBox. */}
      <div aria-hidden className="relative h-4">
        {model.volleys.map((m) => (
          <span
            key={m.id}
            className="absolute -translate-x-1/2 text-meta font-semibold text-ink-secondary tabular-nums"
            style={{ left: `${x((m.bandFrom + m.bandTo) / 2)}%` }}
          >
            {m.number}
          </span>
        ))}
      </div>
      <div aria-hidden className="flex justify-between text-meta text-ink-tertiary tabular-nums" dir="ltr">
        <span>{formatClock(from)}</span>
        <span>{formatClock(to)}</span>
      </div>
    </button>
  );
}
