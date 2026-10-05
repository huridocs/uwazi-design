import { useEffect, useState } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { Check, Filter, RotateCcw, Scissors } from "lucide-react";
import { SettingsContent } from "../../SettingsContent";
import { SettingsButton } from "../../SettingsButton";
import { SettingsToolbar } from "../../SettingsListPage";
import { SettingsTable, type Column } from "../../SettingsTable";
import { SettingsEmptyState } from "../../SettingsEmptyState";
import { SettingsSelectionBar } from "../../SettingsSelectionBar";
import { FiltersSlideOver } from "../../../shared/FiltersSlideOver";
import { ConfirmDialog } from "../../../shared/ConfirmDialog";
import { Checkbox } from "../../../shared/Checkbox";
import { dataSourceAtom } from "../../../../atoms/dataSource";
import { templatesAtom } from "../../../../atoms/templates";
import { extractParagraphs, pxRowsAtom, resumeExtraction, type PxRow } from "../../../../atoms/paragraphExtraction";
import { PX_STATUSES, PX_STATUS_LABEL, type PxExtractor, type PxStatus } from "../../../../data/paragraphs";
import { useSettingsNotify } from "../../../../hooks/useSettingsNotify";
import { TemplatePill } from "./TemplatePill";

const STARTED = "The process of extracting the paragraphs has successfully started. Check the Status column for updates on the process.";

const PILL: Record<PxStatus, string> = {
  new: "bg-carbon-tint text-carbon-label",
  processing: "bg-warm text-ink-secondary",
  obsolete: "bg-warning-light text-warning-label",
  error: "bg-seal-tint text-seal-label",
  processed: "",
};

export function PxStatusPill({ status }: { status: PxStatus }) {
  if (status === "processed")
    return (
      <span className="inline-flex items-center gap-1 text-success-label text-meta font-medium">
        <Check size={14} aria-hidden />
        <span className="sr-only">Processed</span>
      </span>
    );
  return (
    <span className={`w-fit px-2 py-0.5 rounded-md text-meta font-semibold whitespace-nowrap ${PILL[status]}`}>
      {status === "processing" ? "Processing..." : PX_STATUS_LABEL[status]}
    </span>
  );
}

/** One extractor's source entities (Uwazi's `PXEntities`): status per
 *  entity, "Extract new paragraphs" for every New one, or "Extract
 *  paragraphs" for the ticked ones. */
export function PxEntitiesView({ extractor: x, onBack, onView }: { extractor: PxExtractor; onBack: () => void; onView: (entityId: string) => void }) {
  const store = useStore();
  const corpus = useAtomValue(dataSourceAtom);
  const templates = useAtomValue(templatesAtom(corpus));
  const rows = useAtomValue(pxRowsAtom(`${corpus}|${x.id}`));
  const { record } = useSettingsNotify();
  const source = templates.find((t) => t.id === x.sourceTemplateId);
  const sourceName = source?.name ?? x.sourceTemplateId;
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Set<PxStatus>>(new Set());
  const [draft, setDraft] = useState<Set<PxStatus>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState(false);

  useEffect(() => resumeExtraction(store, corpus, x, sourceName), [store, corpus, x, sourceName]);

  const q = query.trim().toLowerCase();
  const shown = rows.filter((r) => (!q || r.title.toLowerCase().includes(q)) && (filters.size === 0 || filters.has(r.status)));
  const counts = Object.fromEntries(PX_STATUSES.map((s) => [s, rows.filter((r) => r.status === s).length])) as Record<PxStatus, number>;
  const paragraphs = rows.reduce((n, r) => n + r.paragraphs, 0);
  const newRows = rows.filter((r) => r.status === "new");

  const run = (list: PxRow[]) => {
    const n = extractParagraphs(store, corpus, x, list, sourceName);
    if (n) record({ method: "UPDATE", domain: "paragraph-extractor", noun: "paragraph extractor for", id: x.id, name: sourceName, message: STARTED, log: false });
  };

  const columns: Column<PxRow>[] = [
    { id: "entity", header: "Entity", mobile: "primary", cell: (r) => <span className="font-medium text-ink truncate">{r.title}</span> },
    {
      id: "languages",
      header: "Language(s)",
      width: "7rem",
      mobile: "meta",
      cell: (r) => (
        <span className="flex gap-1">
          {r.languages.length ? r.languages.map((l) => (
            <span key={l} className="w-fit px-1.5 py-0.5 rounded-md bg-vellum text-meta font-medium uppercase text-ink-secondary">
              {l}
            </span>
          )) : <span className="text-ink-secondary">-</span>}
        </span>
      ),
    },
    { id: "paragraphs", header: "Paragraphs", width: "6rem", align: "right", mobile: "meta", cell: (r) => <span className="tabular-nums text-ink-secondary">{r.paragraphs || "-"}</span> },
    {
      id: "status",
      header: "Status",
      width: "8rem",
      mobile: "meta",
      cell: (r) => (
        <span className="flex items-center gap-2 min-w-0" title={r.reason}>
          <PxStatusPill status={r.status} />
        </span>
      ),
    },
    {
      id: "actions",
      header: <span className="sr-only">Action</span>,
      width: "5rem",
      align: "right",
      mobile: "actions",
      cell: (r) =>
        r.status === "error" ? (
          <SettingsButton variant="secondary" size="sm" icon={<RotateCcw size={13} aria-hidden />} aria-label={`Retry ${r.title}`} onClick={() => run([r])}>
            Retry
          </SettingsButton>
        ) : (
          <SettingsButton variant="secondary" size="sm" disabled={!r.paragraphs} aria-label={`View ${r.title}`} onClick={() => onView(r.entityId)}>
            View
          </SettingsButton>
        ),
    },
  ];

  const picked = rows.filter((r) => selected.has(r.id));

  return (
    <div className="relative h-full">
      <SettingsContent component="PxEntities">
        <SettingsContent.Header path={["Paragraph extraction"]} title={sourceName} onBack={onBack} />
        <SettingsContent.Body>
          <div className="flex flex-col gap-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-ink">Paragraphs for</h3>
              <TemplatePill template={source} id={x.sourceTemplateId} />
              <span className="ms-auto">
                <SettingsButton
                  variant="ghost"
                  size="sm"
                  icon={<Filter size={14} aria-hidden />}
                  aria-label={`Filters${filters.size ? `, ${filters.size} active` : ""}`}
                  onClick={() => {
                    setDraft(new Set(filters));
                    setFiltersOpen(true);
                  }}
                >
                  Filters
                  <span aria-hidden className={`ms-1 min-w-4 h-4 px-1 inline-flex items-center justify-center rounded-full text-meta tabular-nums ${filters.size ? "bg-ink text-paper" : "invisible"}`}>
                    {filters.size || 0}
                  </span>
                </SettingsButton>
              </span>
            </div>
            <dl data-part="stats" className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-secondary">
              <Stat label="Entities" value={rows.length} />
              <Stat label="Paragraphs" value={paragraphs} />
              <Stat label="New" value={counts.new} />
            </dl>
            <SettingsToolbar search={{ value: query, onChange: setQuery, label: "Search by title", placeholder: "Search by title…" }} />
            <SettingsTable
              corpusScoped
              columns={columns}
              data={shown}
              getRowId={(r) => r.id}
              selection={{ selected, onChange: setSelected, label: (r) => r.title }}
              emptyState={
                <SettingsEmptyState
                  title={`No ${sourceName} entities`}
                  hint="Entities of the source template appear here as they are added."
                  query={query || (filters.size ? "filters" : "")}
                  noMatchTitle={() => "No entities match"}
                  onClearQuery={() => {
                    setQuery("");
                    setFilters(new Set());
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
              actions={[{ id: "extract", label: "Extract paragraphs", icon: <Scissors size={14} />, onClick: () => setConfirm(true) }]}
            />
          ) : (
            <>
              <SettingsButton variant="lead" size="sm" icon={<Scissors size={14} aria-hidden />} disabled={newRows.length === 0} onClick={() => run(newRows)}>
                Extract new paragraphs
              </SettingsButton>
              <span className={`me-auto w-fit px-2 py-0.5 rounded-md text-meta font-semibold tabular-nums bg-carbon-tint text-carbon-label ${newRows.length ? "" : "invisible"}`}>
                {newRows.length.toLocaleString()} New
              </span>
            </>
          )}
        </SettingsContent.Footer>
      </SettingsContent>

      <FiltersSlideOver
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        footer={
          <div className="flex items-center justify-between gap-2">
            <SettingsButton variant="ghost" size="sm" onClick={() => setDraft(new Set())}>
              Clear All
            </SettingsButton>
            <SettingsButton
              variant="commit"
              size="sm"
              onClick={() => {
                setFilters(new Set(draft));
                setFiltersOpen(false);
              }}
            >
              Apply
            </SettingsButton>
          </div>
        }
      >
        <fieldset className="flex flex-col gap-2 py-3">
          <legend className="mb-1.5 text-meta font-semibold uppercase tracking-wider text-ink-tertiary">Status</legend>
          {PX_STATUSES.map((s) => (
            <label key={s} className="flex items-center gap-2 text-xs text-ink cursor-pointer">
              <Checkbox
                checked={draft.has(s)}
                onChange={() =>
                  setDraft((d) => {
                    const n = new Set(d);
                    if (n.has(s)) n.delete(s);
                    else n.add(s);
                    return n;
                  })
                }
                ariaLabel={PX_STATUS_LABEL[s]}
              />
              <span className="flex-1">{PX_STATUS_LABEL[s]}</span>
              <span className="tabular-nums text-ink-secondary">{counts[s].toLocaleString()}</span>
            </label>
          ))}
        </fieldset>
      </FiltersSlideOver>

      <ConfirmDialog
        open={confirm}
        title="Are you sure?"
        message="All of the previously created paragraphs will be deleted and recreated after the process."
        confirmLabel="Continue"
        cancelLabel="No, cancel"
        onConfirm={() => {
          setConfirm(false);
          run(picked);
          setSelected(new Set());
        }}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt>{label}</dt>
      <dd className="order-first text-sm font-semibold text-ink tabular-nums">{value.toLocaleString()}</dd>
    </div>
  );
}
