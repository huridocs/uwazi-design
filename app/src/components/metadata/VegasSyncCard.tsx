import { useAtomValue } from "jotai";
import { vegasSyncAtom } from "../../atoms/vegasSync";
import type { MediaAnchor } from "../../data/references";
import { vegasEntity } from "../../data/vegas/load";
import { formatClock, vegasLinkAt } from "../../data/vegas/links";
import {
  SYNC_CONFIDENCE_LABEL,
  SYNC_FLAG_LABEL,
  SYNC_TOLERANCE_SECONDS,
  type RecordingSync,
  type SourceBearing,
  type SyncAnalysis,
} from "../../utils/syncAnalysis";
import { MetadataCard } from "./MetadataCard";
import { RowEntityPill } from "../relationships/rows/RowParts";
import { TimeTag } from "../shared/TimeTag";

/** "+3 s", "−2 s", "0 s": a signed difference in seconds. */
export function signedSeconds(s: number): string {
  const r = Math.round(s * 10) / 10;
  if (r === 0) return "0\u00a0s";
  return `${r > 0 ? "+" : "−"}${Math.abs(r)}\u00a0s`;
}

const CELL_HEAD = "text-meta font-semibold uppercase tracking-wider text-ink-tertiary text-start font-normal pb-1";
const NUM = "text-xs text-ink-tertiary tabular-nums";

/** Does this record get the Sync card? A Las Vegas recording with a clock or
 *  an anchor; one with neither has nothing to align. */
export const hasSyncCard = (sync: SyncAnalysis | null, id: string): boolean => {
  const rec = sync?.recordingById.get(id);
  return !!rec && (rec.clockStart !== undefined || rec.anchors.length > 0);
};

/** A Las Vegas recording's place on the shared clock (vegasSyncAtom): its
 *  start, its offset to the moments' medians, how sure that is, and each
 *  anchor with its moment's median and this recording's deviation. Read-only;
 *  the corpus's own sync properties stay in the record as given. */
export function VegasSyncCard({ recordingId }: { recordingId: string }) {
  const sync = useAtomValue(vegasSyncAtom);
  const rec = sync?.recordingById.get(recordingId);
  if (!sync || !rec) return null;
  return (
    <MetadataCard title="Sync" component="VegasSyncCard">
      <SyncSummary rec={rec} bearing={sync.bearings.find((b) => b.recordingId === recordingId)} />
      {rec.flags.length > 0 && (
        <ul aria-label="Sync flags" className="flex flex-wrap gap-1.5">
          {rec.flags.map((f) => (
            <li key={f} className="w-fit rounded-md px-1.5 py-0.5 text-meta font-semibold bg-warning-light text-warning-label">
              {SYNC_FLAG_LABEL[f]}
            </li>
          ))}
        </ul>
      )}
      {rec.anchors.length > 0 && (
        <AnchorTable rec={rec} medianOf={(id) => sync.momentById.get(id)?.median ?? null} />
      )}
    </MetadataCard>
  );
}

function SyncSummary({ rec, bearing }: { rec: RecordingSync; bearing?: SourceBearing }) {
  const rows: [string, string][] = [
    ["Clock at start", rec.clockStart !== undefined ? formatClock(rec.clockStart) : "None"],
    ["Offset to shared clock", rec.offset !== null ? signedSeconds(rec.offset) : "No aligned anchor"],
    ["Confidence", SYNC_CONFIDENCE_LABEL[rec.confidence]],
    ["Anchors", String(rec.anchorCount)],
  ];
  if (rec.drift !== null) rows.push(["Drift across anchors", `${rec.drift} s`]);
  if (rec.titleDifference !== null && rec.titleStart !== undefined && rec.impliedStart !== undefined) {
    rows.push([
      "Title against annotations",
      `${formatClock(rec.titleStart)} against ${formatClock(rec.impliedStart)} (${signedSeconds(rec.titleDifference)})`,
    ]);
  }
  if (bearing) {
    // From the camera position to the place the shots came from: computed,
    // not where the camera pointed.
    rows.push([
      "Bearing to source, computed",
      `${Math.round(bearing.bearing)}°, ${bearing.metres >= 1000 ? `${(bearing.metres / 1000).toFixed(1)}\u00a0km` : `${Math.round(bearing.metres)}\u00a0m`}`,
    ]);
  }
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-xs text-ink-tertiary self-baseline">{k}</dt>
          <dd className="text-ink tabular-nums self-baseline">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function AnchorTable({ rec, medianOf }: { rec: RecordingSync; medianOf: (momentId: string) => number | null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-start">
        <caption className="sr-only">Anchors: each annotated moment, its median across recordings and this recording's deviation</caption>
        <thead>
          <tr>
            <th scope="col" className={CELL_HEAD}>Moment</th>
            <th scope="col" className={CELL_HEAD}>At</th>
            <th scope="col" className={CELL_HEAD}>Clock</th>
            <th scope="col" className={CELL_HEAD}>Median</th>
            <th scope="col" className={`${CELL_HEAD} text-end`}>Deviation</th>
          </tr>
        </thead>
        <tbody>
          {rec.anchors.map((a) => {
            const median = medianOf(a.momentId);
            const url = vegasLinkAt(a.recordingId, a.offset);
            const anchor: MediaAnchor = {
              recordingId: a.recordingId,
              offset: a.offset,
              clock: a.clock * 1000,
              ...(url ? { url } : {}),
            };
            const off = a.deviation !== undefined && Math.abs(a.deviation) > SYNC_TOLERANCE_SECONDS;
            return (
              <tr key={a.refId} className="border-t border-border-soft">
                <td className="py-1 pe-2 min-w-0">
                  <RowEntityPill entityId={a.momentId} typeId="vegas_moment" label={momentLabel(a.momentId)} pin={false} />
                </td>
                <td className="py-1 pe-2">
                  <TimeTag anchor={anchor} />
                </td>
                <td className={`py-1 pe-2 ${NUM}`}>{formatClock(a.clock)}</td>
                <td className={`py-1 pe-2 ${NUM}`}>{median !== null ? formatClock(median) : "None"}</td>
                <td className={`py-1 text-end ${NUM} ${off ? "text-warning-label font-semibold" : ""}`}>
                  {a.partial ? "Partial, not counted" : a.deviation !== undefined ? signedSeconds(a.deviation) : "Not aligned"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The moment's title without its clock ("Volley 5 · 22:09:47" → "Volley 5"):
 *  the table prints the times in their own columns. */
function momentLabel(id: string): string {
  return (vegasEntity(id)?.title ?? id).split(" · ")[0];
}
