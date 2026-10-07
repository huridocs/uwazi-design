import { useMemo, useState } from "react";
import { DataTable, type Column, type SortDir } from "../shared/DataTable";
import { Modal } from "../shared/Modal";
import { ModalSectionLabel } from "../shared/ModalParts";
import { formatClock } from "../../data/vegas/links";
import type { MomentSync, SyncAnalysis, SyncComparison } from "../../utils/syncAnalysis";

const TYPE_LABEL: Record<MomentSync["type"], string> = {
  volley: "Volley",
  "single-shot": "Single shot",
  "first-shots": "First shots",
  "corridor-shots": "Corridor shots",
};

const RESULT_LABEL: Record<SyncComparison["result"], string> = {
  match: "Match",
  differs: "Differs",
  possible: "Possible match, not established",
  "within-precision": "Inside the official minute",
};

/** A moment's title without its clock ("Volley 5 · 22:09:47" → "Volley 5"). */
export const momentName = (m: MomentSync) => m.title.split(" · ")[0];

const NUM = "text-xs text-ink-tertiary tabular-nums";

type Key = "moment" | "type" | "median" | "recordings" | "annotations" | "spread" | "mad" | "within1" | "outliers";

const SORT: Record<Key, (m: MomentSync) => number | string> = {
  moment: (m) => m.median ?? Infinity,
  type: (m) => TYPE_LABEL[m.type],
  median: (m) => m.median ?? Infinity,
  recordings: (m) => m.recordings,
  annotations: (m) => m.counted,
  spread: (m) => m.spread,
  mad: (m) => m.mad,
  within1: (m) => (m.counted ? m.within1 / m.counted : 0),
  outliers: (m) => m.outliers.length,
};

/** Every aligned moment of the Las Vegas collection, how many recordings
 *  annotate it and how closely they agree, then the volley times against the
 *  NYT analysis and the official timeline. A row opens the moment's record. */
export function VegasSyncTable({
  sync,
  onClose,
  onOpenMoment,
}: {
  sync: SyncAnalysis;
  onClose: () => void;
  onOpenMoment: (id: string) => void;
}) {
  const [sort, setSort] = useState<{ key: Key; dir: SortDir }>({ key: "median", dir: "asc" });
  const rows = useMemo(() => {
    const by = SORT[sort.key];
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...sync.moments].sort((a, b) => {
      const x = by(a);
      const y = by(b);
      return (typeof x === "string" ? x.localeCompare(String(y)) : x - (y as number)) * dir;
    });
  }, [sync.moments, sort]);

  const columns: Column<MomentSync>[] = [
    {
      id: "moment",
      header: "Moment",
      sortKey: "moment",
      mobile: "primary",
      width: "minmax(14rem, 1.5fr)",
      cell: (m) => <span className="text-sm font-medium text-ink">{momentName(m)}</span>,
    },
    { id: "type", header: "Type", sortKey: "type", mobile: "meta", cell: (m) => <span className="text-xs text-ink-tertiary">{TYPE_LABEL[m.type]}</span> },
    { id: "median", header: "Median clock", sortKey: "median", mobile: "meta", cell: (m) => <span className={NUM}>{m.median !== null ? formatClock(m.median) : "None"}</span> },
    { id: "recordings", width: "minmax(7rem, 1fr)", header: "Recordings", sortKey: "recordings", align: "right", mobile: "meta", cell: (m) => <span className={NUM}>{m.recordings}</span> },
    { id: "annotations", width: "minmax(8rem, 1fr)", header: "Annotations", sortKey: "annotations", align: "right", mobile: "hidden", cell: (m) => <span className={NUM}>{m.counted}</span> },
    { id: "spread", header: "Spread", sortKey: "spread", align: "right", mobile: "meta", cell: (m) => <span className={NUM}>{m.spread} s</span> },
    { id: "mad", header: "MAD", sortKey: "mad", align: "right", mobile: "hidden", cell: (m) => <span className={NUM}>{m.mad} s</span> },
    {
      id: "within1",
      header: "Within 1 s",
      sortKey: "within1",
      align: "right",
      mobile: "hidden",
      cell: (m) => <span className={NUM}>{m.counted ? `${Math.round((m.within1 / m.counted) * 100)}%` : "None"}</span>,
    },
    {
      id: "outliers",
      header: "Outliers",
      sortKey: "outliers",
      align: "right",
      mobile: "meta",
      cell: (m) => (
        <span className={`${NUM} ${m.outliers.length ? "text-warning-label font-semibold" : ""}`}>
          {m.outliers.length ? `${m.outliers.length} over 2 s` : "None"}
        </span>
      ),
    },
  ];

  const nyt = sync.comparisons.filter((c) => c.against === "nyt");
  const official = sync.comparisons.filter((c) => c.against === "official");

  return (
    <Modal
      onClose={onClose}
      title="Sync quality"
      subtitle={`${sync.moments.length} moments, ${sync.totals.counted} annotations`}
      size="grid"
      height="min(46rem, calc(100dvh - 4rem))"
      component="VegasSyncTable"
    >
      <div className="flex flex-col gap-6">
        <p className="max-w-[40rem] text-xs text-ink-tertiary">
          A moment's clock is the median of the times the map annotates for it across recordings. An outlier is more than 2&nbsp;s
          from that median. Annotations the map marks partial are left out ({sync.totals.partial}).
        </p>
        <DataTable
          columns={columns}
          data={rows}
          getRowId={(m) => m.momentId}
          onRowClick={(m) => onOpenMoment(m.momentId)}
          rowAriaLabel={(m) => `Open ${momentName(m)}`}
          sort={sort}
          onSort={(key) =>
            setSort((s) => ({ key: key as Key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }))
          }
          density="compact"
          minWidthRem={56}
        />
        <section aria-label="Volley intervals" className="flex flex-col gap-2" data-measure>
          <ModalSectionLabel>Volley intervals, start to start</ModalSectionLabel>
          <ol className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-secondary tabular-nums">
            {sync.intervals.map((i) => (
              <li key={i.from} className={i.seconds > 60 ? "font-semibold text-ink" : ""}>
                {i.from} to {i.to}: {i.seconds} s
              </li>
            ))}
          </ol>
        </section>
        {[
          { label: "Against the NYT analysis", rows: nyt },
          { label: "Against the official timeline", rows: official },
        ].map(
          (g) =>
            g.rows.length > 0 && (
              <section key={g.label} aria-label={g.label} className="flex flex-col gap-2">
                <ModalSectionLabel>{g.label}</ModalSectionLabel>
                <ComparisonList rows={g.rows} onOpen={onOpenMoment} />
              </section>
            ),
        )}
      </div>
    </Modal>
  );
}

/** One line per check: theirs, ours, the result. Every account here is known
 *  from press summaries, and says so. */
export function ComparisonList({ rows, onOpen }: { rows: SyncComparison[]; onOpen?: (id: string) => void }) {
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((c) => (
        <li key={c.id} className="flex flex-col gap-0.5 min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-2 text-sm">
            {c.entityId && onOpen ? (
              <button
                type="button"
                onClick={() => onOpen(c.entityId!)}
                className="font-medium text-ink underline decoration-border underline-offset-2 hover:decoration-ink cursor-pointer
                  rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
              >
                {c.check}
              </button>
            ) : (
              <span className="font-medium text-ink">{c.check}</span>
            )}
            <span className={c.result === "differs" ? "text-warning-label font-semibold" : "text-ink-secondary"}>{RESULT_LABEL[c.result]}</span>
          </span>
          <span className="text-xs text-ink-tertiary">
            Theirs: {c.theirs}{c.fromSummary ? " (from a summary)" : ""}. Annotations: {c.ours}.
          </span>
        </li>
      ))}
    </ul>
  );
}
