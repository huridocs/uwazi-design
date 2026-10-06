import { useEffect, useMemo, useState } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { Check, Cog, Filter, GraduationCap, Play, RotateCcw, X } from "lucide-react";
import { SettingsContent } from "../../SettingsContent";
import { SettingsButton } from "../../SettingsButton";
import { SettingsToolbar } from "../../SettingsListPage";
import { SettingsTable, type Column } from "../../SettingsTable";
import { SettingsEmptyState } from "../../SettingsEmptyState";
import { SettingsSelectionBar } from "../../SettingsSelectionBar";
import { TYPE_ICONS } from "../../propertyTypeIcons";
import { SegmentedControl } from "../../../shared/SegmentedControl";
import { FiltersDrawer } from "../../../shared/FiltersDrawer";
import { ConfirmDialog } from "../../../shared/ConfirmDialog";
import { Checkbox } from "../../../shared/Checkbox";
import { Hint } from "../../../shared/Hint";
import { Modal, MODAL_BUTTON, MODAL_COMMIT } from "../../../shared/Modal";
import { BAR_GHOST } from "../../../shared/warmButton";
import { UwaziLoader } from "../../../shared/UwaziLoader";
import type { SortDir } from "../../../shared/DataTable";
import { dataSourceAtom } from "../../../../atoms/dataSource";
import { breakpointAtom } from "../../../../atoms/viewport";
import { templatesAtom } from "../../../../atoms/templates";
import { toastsAtom } from "../../../../atoms/references";
import {
  acceptable,
  acceptSuggestions,
  cancelRun,
  isRunning,
  ixStats,
  ixSuggestionsAtom,
  propertyOf,
  setUseForTraining,
  startRun,
  type IxSuggestion,
} from "../../../../atoms/extraction";
import { IX_RUN_TEXT, type IxExtractor, type IxRun } from "../../../../data/extraction";
import type { PropertyType } from "../../../../data/templates/types";
import { useSettingsNotify } from "../../../../hooks/useSettingsNotify";
import { TrainModelModal, ProcessExtractorModal } from "./RunModals";

type Quick = "all" | "pending" | "mismatch" | "empty" | "accepted";
const QUICK: { id: Quick; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "mismatch", label: "Mismatch" },
  { id: "empty", label: "Empty" },
  { id: "accepted", label: "Accepted" },
];

/** Stats & Filters flags (Uwazi's `FiltersSidepanel`); ticked ones combine
 *  with OR. */
const FLAGS = [
  { section: "All data", items: [["labeled", "Labeled"], ["nonLabeled", "Non-labeled"], ["training", "Use for training"]] },
  { section: "Status", items: [["nonProcessed", "Non processed"], ["obsolete", "Obsolete"], ["error", "Error"]] },
  { section: "Processed", items: [["match", "Match"], ["mismatch", "Mismatch"], ["noContext", "No context"]] },
] as const;
type Flag = (typeof FLAGS)[number]["items"][number][0];

function flagHolds(f: Flag, r: IxSuggestion) {
  const live = r.processed && !r.error && !r.obsolete;
  switch (f) {
    case "labeled": return r.labeled;
    case "nonLabeled": return !r.labeled;
    case "training": return r.useForTraining;
    case "nonProcessed": return !r.processed;
    case "obsolete": return r.obsolete;
    case "error": return r.error;
    case "match": return live && !!r.current && r.current === r.suggested;
    case "mismatch": return live && !!r.current && !!r.suggested && r.current !== r.suggested;
    case "noContext": return live && !r.context;
  }
}

function quickHolds(q: Quick, r: IxSuggestion) {
  if (q === "all") return true;
  if (q === "accepted") return r.accepted;
  if (q === "pending") return acceptable(r) && !r.accepted && r.current !== r.suggested;
  return r.state === q;
}

const STATE_PILL: Record<IxSuggestion["state"], { label: string; cls: string }> = {
  match: { label: "Matches", cls: "bg-success-light text-success-label" },
  empty: { label: "Empty", cls: "bg-carbon-tint text-carbon-label" },
  mismatch: { label: "Mismatch", cls: "bg-warning-light text-warning-label" },
  accepted: { label: "Accepted", cls: "bg-success-light text-success-label" },
  unprocessed: { label: "Non processed", cls: "bg-warm text-ink-secondary" },
  obsolete: { label: "Obsolete", cls: "bg-warm text-ink-secondary" },
  error: { label: "Error", cls: "bg-seal-tint text-seal-label" },
};

/** One extractor's suggestions (Uwazi's `IXSuggestions`): review, accept,
 *  mark for training, and run the model. Accept writes the entity (G12);
 *  there is no Reject and no "Accept all". */
export function SuggestionsView({ extractor: x, onBack }: { extractor: IxExtractor; onBack: () => void }) {
  const store = useStore();
  const corpus = useAtomValue(dataSourceAtom);
  const templates = useAtomValue(templatesAtom(corpus));
  const rows = useAtomValue(ixSuggestionsAtom(`${corpus}|${x.id}`));
  const setToasts = useSetAtom(toastsAtom);
  const { record } = useSettingsNotify();
  const stats = ixStats(rows);

  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState<Quick>("all");
  const [flags, setFlags] = useState<Set<Flag>>(new Set());
  const [flagsDraft, setFlagsDraft] = useState<Set<Flag>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: "name", dir: "asc" });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmAccept, setConfirmAccept] = useState(false);
  const [modal, setModal] = useState<"train" | "process" | null>(null);
  const [open, setOpen] = useState<IxSuggestion | null>(null);

  const running = isRunning(x.status);
  const prop = propertyOf(templates.find((t) => t.id === x.templates[0]), x.property);
  const Icon = TYPE_ICONS[(prop?.type ?? "text") as PropertyType] ?? TYPE_ICONS.text;

  const q = query.trim().toLowerCase();
  const shown = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return rows
      .filter((r) => (!q || r.title.toLowerCase().includes(q)) && quickHolds(quick, r) && (flags.size === 0 || [...flags].some((f) => flagHolds(f, r))))
      .sort((a, b) =>
        sort.key === "score" ? (a.score - b.score) * dir : sort.key === "value" ? a.suggested.localeCompare(b.suggested) * dir : a.title.localeCompare(b.title) * dir,
      );
  }, [rows, q, quick, flags, sort]);

  // A ticked row that leaves the list (a filter) is no longer ticked.
  useEffect(() => {
    const ids = new Set(shown.map((r) => r.id));
    setSelected((s) => (([...s].every((id) => ids.has(id))) ? s : new Set([...s].filter((id) => ids.has(id)))));
  }, [shown]);

  const accept = (list: IxSuggestion[]) => {
    const ok = list.filter((r) => acceptable(r) && !r.accepted);
    if (!ok.length) return;
    setToasts((p) => [...p, { id: `ix-sent-${Date.now()}`, type: "info", message: "Suggestions sent" }]);
    setTimeout(() => {
      acceptSuggestions(store, corpus, ok, x.property);
      record({
        method: "UPDATE",
        domain: "extractor",
        noun: "extractor",
        id: x.id,
        name: x.name,
        summary: `Accepted ${ok.length === 1 ? `the suggestion for “${ok[0].title}”` : `${ok.length} suggestions`} from extractor “${x.name}”`,
        message: "Suggestions updated",
      });
    }, 500);
  };

  const pickedRows = shown.filter((r) => selected.has(r.id));
  const retry = () => startRun(store, corpus, x.id, x.lastRun ?? { kind: "train", find: 0 });

  const columns: Column<IxSuggestion>[] = [
    {
      id: "name",
      header: "Name",
      sortKey: "name",
      mobile: "primary",
      cell: (r) => (
        <span className="min-w-0 truncate">
          <span className="font-medium text-ink">{r.title}</span> <span className="text-ink-secondary">({r.language.toLowerCase()})</span>
        </span>
      ),
    },
    {
      id: "context",
      header: "Context",
      mobile: "hidden",
      cell: (r) =>
        r.context ? (
          <span className="text-xs text-ink-secondary line-clamp-2">
            {r.context.before}
            <mark className="bg-warning-light text-ink rounded-sm px-0.5">{r.context.match}</mark>
            {r.context.after}
          </span>
        ) : r.processed && !r.error ? (
          <span className="text-xs text-warning-label">No context</span>
        ) : (
          <span className="text-xs text-ink-tertiary">-</span>
        ),
    },
    {
      id: "value",
      header: "Current Value/Suggestion",
      sortKey: "value",
      width: "13rem",
      mobile: "meta",
      cell: (r) => <ValueCell r={r} />,
    },
    {
      id: "score",
      header: "Score",
      sortKey: "score",
      width: "4.5rem",
      align: "right",
      mobile: "hidden",
      cell: (r) => <span className="text-xs text-ink-tertiary tabular-nums">{r.score ? `${r.score}%` : "-"}</span>,
    },
    {
      id: "state",
      header: "State",
      width: "7.5rem",
      mobile: "meta",
      cell: (r) => (
        <span className={`w-fit px-2 py-0.5 rounded-md text-meta font-semibold whitespace-nowrap ${STATE_PILL[r.state].cls}`}>
          {STATE_PILL[r.state].label}
        </span>
      ),
    },
    {
      id: "training",
      header: "Use for training",
      width: "5.5rem",
      align: "center",
      mobile: "hidden",
      cell: (r) => (
        <Hint text={r.useForTraining ? "Remove from training set" : "Add to training set"} describe={false}>
          {(hint) => (
            <button
              {...hint}
              type="button"
              aria-pressed={r.useForTraining}
              aria-label={`${r.useForTraining ? "Remove from training set" : "Add to training set"}: ${r.title}`}
              onClick={() => setUseForTraining(store, corpus, r.id, !r.useForTraining)}
              className={`relative h-7 w-7 inline-flex items-center justify-center rounded-md cursor-pointer ${
                r.useForTraining ? "bg-carbon-tint text-carbon-label" : "text-ink-muted hover:bg-warm hover:text-ink"
              }`}
            >
              <GraduationCap size={15} aria-hidden />
            </button>
          )}
        </Hint>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Action</span>,
      width: "9rem",
      align: "right",
      mobile: "actions",
      cell: (r) => (
        <span className="relative flex items-center gap-1.5">
          <SettingsButton
            variant="secondary"
            size="sm"
            disabled={!acceptable(r) || r.accepted}
            aria-label={`Accept ${r.title}`}
            onClick={() => accept([r])}
          >
            Accept
          </SettingsButton>
          <SettingsButton variant="ghost" size="sm" aria-label={`Open ${r.title}`} onClick={() => setOpen(r)}>
            Open
          </SettingsButton>
        </span>
      ),
    },
  ];

  const footerStatus =
    x.status === "error" ? (
      <span role="status" className="min-w-0 truncate text-xs font-medium text-seal-label" title={x.error}>
        Error{x.error ? ` : ${x.error}` : ""}
      </span>
    ) : running ? (
      <span role="status" className="min-w-0 truncate inline-flex items-center gap-2 text-xs text-ink-secondary tabular-nums">
        <UwaziLoader size="xs" color="muted" />
        {IX_RUN_TEXT[x.status]}
        {x.status === "processing_suggestions" && x.progress ? ` ${x.progress.processed} / ${x.progress.total}` : ""}
      </span>
    ) : (
      <span role="status" className="sr-only" />
    );

  return (
    <div className="relative h-full">
      <SettingsContent component="IxSuggestions">
        <SettingsContent.Header path={["Metadata extraction"]} title={x.name} onBack={onBack} />
        <SettingsContent.Body>
          <div className="flex flex-col gap-3 min-w-0">
            <div data-part="title" className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-vellum text-ink-secondary" aria-hidden>
                <Icon size={14} />
              </span>
              <h3 className="text-sm font-semibold text-ink">{prop?.label ?? x.property}</h3>
              <span className="text-sm italic text-ink-secondary">for</span>
              {x.templates.map((t) => (
                <span key={t} className="w-fit px-2 py-0.5 rounded-md bg-vellum text-meta font-medium text-ink-secondary">
                  {templates.find((tt) => tt.id === t)?.name ?? t}
                </span>
              ))}
              <span className="ms-auto">
                <SettingsButton
                  variant="ghost"
                  size="sm"
                  icon={<Filter size={14} aria-hidden />}
                  aria-label={`Stats & Filters${flags.size ? `, ${flags.size} active` : ""}`}
                  onClick={() => {
                    setFlagsDraft(new Set(flags));
                    setFiltersOpen(true);
                  }}
                >
                  Stats & Filters
                  <span
                    aria-hidden
                    className={`ms-1 min-w-4 h-4 px-1 inline-flex items-center justify-center rounded-full text-meta tabular-nums ${flags.size ? "bg-ink text-paper" : "invisible"}`}
                  >
                    {flags.size || 0}
                  </span>
                </SettingsButton>
              </span>
            </div>

            <dl data-part="stats" className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-secondary">
              <Stat label="Documents" value={stats.documents.toLocaleString()} />
              <Stat label="Reviewed" value={stats.reviewed.toLocaleString()} />
              <Stat label="Pending" value={stats.pending.toLocaleString()} />
              <Stat label="Accuracy" value={stats.accuracy === null ? "-" : `${stats.accuracy}%`} />
            </dl>
            <p className="text-xs text-ink-tertiary text-pretty max-w-[44rem]">
              Score is the model's confidence in one suggestion. Accuracy is defined by the amount of matches vs mismatches for labeled samples that have been processed.
            </p>

            <SettingsToolbar
              search={{ value: query, onChange: setQuery, label: "Search by entity name", placeholder: "Search by entity name…" }}
              filters={<SegmentedControl value={quick} options={QUICK} onChange={(v) => setQuick(v as Quick)} size="sm" ariaLabel="Show suggestions" />}
            />

            <SettingsTable
              columns={columns}
              data={shown}
              getRowId={(r) => r.id}
              sort={sort}
              onSort={(key) => setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }))}
              selection={{ selected, onChange: setSelected, label: (r) => r.title }}
              emptyState={
                <SettingsEmptyState
                  title="No suggestions yet"
                  hint="Train the model and find suggestions to fill this list."
                  query={query || (quick !== "all" || flags.size ? "filters" : "")}
                  noMatchTitle={() => "No suggestions match these filters"}
                  onClearQuery={() => {
                    setQuery("");
                    setQuick("all");
                    setFlags(new Set());
                  }}
                />
              }
            />
          </div>
        </SettingsContent.Body>
        <SettingsContent.Footer>
          {selected.size > 0 ? (
            <SettingsSelectionBar
              count={selected.size}
              total={shown.length}
              onClear={() => setSelected(new Set())}
              actions={[
                {
                  id: "accept",
                  label: "Accept selected",
                  icon: <Check size={14} />,
                  onClick: () => setConfirmAccept(true),
                  disabledReason: pickedRows.some((r) => acceptable(r) && !r.accepted) ? undefined : "None of the selected suggestions can be accepted",
                },
                {
                  id: "process",
                  label: "Process selected",
                  icon: <Cog size={14} />,
                  onClick: () => setModal("process"),
                  disabledReason: x.status === "ready" ? undefined : "The model is busy or in error",
                },
              ]}
            />
          ) : (
            <div className="me-auto flex items-center gap-2 min-w-0">{footerStatus}</div>
          )}
          {selected.size === 0 && x.status === "error" && (
            <SettingsButton variant="secondary" size="sm" icon={<RotateCcw size={14} aria-hidden />} onClick={retry}>
              Retry
            </SettingsButton>
          )}
          {running || x.status === "error" ? (
            <SettingsButton
              variant="secondary"
              size="sm"
              icon={<X size={14} aria-hidden />}
              disabled={x.status === "cancel"}
              onClick={() => cancelRun(store, corpus, x.id)}
            >
              Cancel
            </SettingsButton>
          ) : (
            <SettingsButton
              variant="lead"
              size="sm"
              icon={<GraduationCap size={14} aria-hidden />}
              disabled={selected.size > 0}
              title={selected.size > 0 ? "Clear the selection to train the model" : undefined}
              onClick={() => setModal("train")}
            >
              Train model
            </SettingsButton>
          )}
          {selected.size === 0 && (
            <SettingsButton
              variant="lead"
              size="sm"
              icon={<Play size={14} aria-hidden />}
              disabled={x.status !== "ready"}
              onClick={() => setModal("process")}
            >
              Process extractor
            </SettingsButton>
          )}
        </SettingsContent.Footer>
      </SettingsContent>

      <FiltersDrawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Stats & Filters"
        footer={
          <div className="flex items-center justify-between gap-2">
            <SettingsButton
              variant="ghost"
              size="sm"
              onClick={() => {
                setFlagsDraft(new Set());
                setFlags(new Set());
                setFiltersOpen(false);
              }}
            >
              Clear all
            </SettingsButton>
            <SettingsButton
              variant="commit"
              size="sm"
              onClick={() => {
                setFlags(new Set(flagsDraft));
                setFiltersOpen(false);
              }}
            >
              Apply
            </SettingsButton>
          </div>
        }
      >
        <div className="flex flex-col gap-5 py-3">
          {FLAGS.map((g) => (
            <fieldset key={g.section} className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-meta font-semibold uppercase tracking-wider text-ink-tertiary">{g.section}</legend>
              {g.items.map(([id, label]) => (
                <label key={id} className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                  <Checkbox
                    checked={flagsDraft.has(id)}
                    onChange={() =>
                      setFlagsDraft((s) => {
                        const n = new Set(s);
                        if (n.has(id)) n.delete(id);
                        else n.add(id);
                        return n;
                      })
                    }
                    ariaLabel={label}
                  />
                  <span className="flex-1">{label}</span>
                  <span className="text-ink-secondary tabular-nums">{stats[id].toLocaleString()}</span>
                </label>
              ))}
            </fieldset>
          ))}
          <section aria-labelledby="ix-stats-heading" className="flex flex-col gap-1.5">
            <h4 id="ix-stats-heading" className="text-meta font-semibold uppercase tracking-wider text-ink-tertiary">
              Statistics
            </h4>
            <p className="flex items-center gap-2 text-xs text-ink">
              <Hint text="Accuracy is defined by the amount of matches vs mismatches for labeled samples that have been processed.">
                {(hint) => (
                  <span {...hint} tabIndex={0} className="flex-1 underline decoration-dotted underline-offset-2 cursor-help">
                    Accuracy
                  </span>
                )}
              </Hint>
              <span className="tabular-nums">{stats.accuracy === null ? "-" : `${stats.accuracy}%`}</span>
            </p>
          </section>
        </div>
      </FiltersDrawer>

      <ConfirmDialog
        open={confirmAccept}
        title="Accept selected"
        message={`Accept ${pickedRows.filter((r) => acceptable(r) && !r.accepted).length} suggestions? Each value is written to its entity.`}
        confirmLabel="Accept"
        onConfirm={() => {
          setConfirmAccept(false);
          accept(pickedRows);
          setSelected(new Set());
        }}
        onCancel={() => setConfirmAccept(false)}
      />
      {modal === "train" && (
        <TrainModelModal
          onClose={() => setModal(null)}
          onTrain={(run: IxRun) => {
            setModal(null);
            startRun(store, corpus, x.id, run);
          }}
        />
      )}
      {modal === "process" && (
        <ProcessExtractorModal
          selected={selected.size > 0 ? pickedRows.map((r) => r.entityId) : null}
          onClose={() => setModal(null)}
          onProcess={(run: IxRun) => {
            setModal(null);
            setSelected(new Set());
            startRun(store, corpus, x.id, run);
          }}
        />
      )}
      {open && (
        <SuggestionPanel
          row={rows.find((r) => r.id === open.id) ?? open}
          label={prop?.label ?? x.property}
          onClose={() => setOpen(null)}
          onAccept={(r) => accept([r])}
          onTraining={(r) => setUseForTraining(store, corpus, r.id, !r.useForTraining)}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt>{label}</dt>
      <dd className="order-first text-sm font-semibold text-ink tabular-nums">{value}</dd>
    </div>
  );
}

/** Current value over the suggestion: green when they agree, amber when
 *  they differ, "Error" in seal, "(obsolete)" in italics. */
function ValueCell({ r }: { r: IxSuggestion }) {
  // Phones: one line, current → suggested, wrapping rather than cut.
  const phone = useAtomValue(breakpointAtom) === "mobile";
  const fit = phone ? "break-words" : "truncate";
  return (
    <span className={`flex min-w-0 text-xs ${phone ? "flex-wrap items-baseline gap-x-1.5" : "flex-col"}`}>
      <span className={`text-ink-secondary ${fit}`}>{r.current || "-"}</span>
      {phone && <span aria-hidden className="text-ink-muted">→</span>}
      {r.error ? (
        <span className="font-medium text-seal-label">Error</span>
      ) : r.obsolete ? (
        <span className={`italic text-ink-secondary ${fit}`}>(obsolete) {r.suggested}</span>
      ) : r.suggested ? (
        <span className={`font-medium ${fit} ${r.suggested === r.current ? "text-success-label" : "text-warning-label"}`}>{r.suggested}</span>
      ) : (
        <span className="text-ink-secondary">No suggestion</span>
      )}
    </span>
  );
}

/** "Open": the suggestion in context, with Accept and the training flag. */
function SuggestionPanel({
  row: r,
  label,
  onClose,
  onAccept,
  onTraining,
}: {
  row: IxSuggestion;
  label: string;
  onClose: () => void;
  onAccept: (r: IxSuggestion) => void;
  onTraining: (r: IxSuggestion) => void;
}) {
  return (
    <Modal
      component="IxSuggestionPanel"
      size="md"
      onClose={onClose}
      title={r.title}
      subtitle={label}
      footer={
        <>
          <label className="me-auto flex items-center gap-2 text-xs text-ink cursor-pointer">
            <Checkbox checked={r.useForTraining} onChange={() => onTraining(r)} ariaLabel="Use for training" />
            Use for training
          </label>
          <button type="button" onClick={onClose} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!acceptable(r) || r.accepted}
            onClick={() => {
              onAccept(r);
              onClose();
            }}
            className={`${MODAL_COMMIT} disabled:bg-ink/40 disabled:cursor-not-allowed`}
          >
            Accept
          </button>
        </>
      }
      bodyClassName="py-4 flex flex-col gap-4"
    >
      <section className="flex flex-col gap-1">
        <h4 className="text-xs font-medium text-ink-secondary">Context</h4>
        {r.context ? (
          <p className="text-sm text-ink text-pretty">
            {r.context.before}
            <mark className="bg-warning-light text-ink rounded-sm px-0.5">{r.context.match}</mark>
            {r.context.after}
          </p>
        ) : (
          <p className="text-sm text-ink-secondary">No context</p>
        )}
      </section>
      <dl className="grid grid-cols-2 gap-3 text-xs">
        <div className="flex flex-col gap-0.5">
          <dt className="text-ink-secondary">Current value</dt>
          <dd className="text-sm text-ink">{r.current || "-"}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-ink-secondary">Suggestion</dt>
          <dd className="text-sm text-ink">{r.error ? "Error" : r.suggested || "-"}</dd>
        </div>
      </dl>
    </Modal>
  );
}
