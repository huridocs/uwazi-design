import { signedSeconds } from "../../metadata/VegasSyncCard";

/** A contested anchor's mark on its row: the recording's clock there is more
 *  than 2 s off the median of its moment across recordings (the Vegas sync
 *  check). The evidence card says the rest. */
export function ContestedClock({ deviation }: { deviation: number }) {
  const s = signedSeconds(deviation);
  return (
    <span
      data-component="ContestedClock"
      title={`Clock ${s} from the moment's median`}
      className="inline-flex items-center gap-1 shrink-0 text-meta font-medium text-warning-label tabular-nums whitespace-nowrap"
    >
      <span aria-hidden className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--warning)" }} />
      <span aria-hidden>{s}</span>
      <span className="sr-only">Contested anchor: clock {s} from the moment's median</span>
    </span>
  );
}
