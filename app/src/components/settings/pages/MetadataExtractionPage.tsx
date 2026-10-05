import { useEffect, useState } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { Pencil, ScanText, Trash2 } from "lucide-react";
import { SettingsListPage, useSettingsSearch } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsTable, type Column } from "../SettingsTable";
import { SettingsButton } from "../SettingsButton";
import { StatusPill } from "../StatusPill";
import { TYPE_ICONS } from "../propertyTypeIcons";
import { ConfirmDelete } from "../../shared/ConfirmDelete";
import type { SortDir } from "../../shared/DataTable";
import { ExtractorModal } from "./extraction/ExtractorModal";
import { SuggestionsView } from "./extraction/SuggestionsView";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { templatesAtom } from "../../../atoms/templates";
import { consumeFailureAtom } from "../../../atoms/devSwitches";
import { ixExtractors, ixStats, ixSuggestionsAtom, propertyOf, resumeRuns } from "../../../atoms/extraction";
import { statusOfRun, type IxExtractor } from "../../../data/extraction";
import type { PropertyType } from "../../../data/templates/types";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";

/** Settings › Metadata extraction (Uwazi's `IXDashboard`): the extractors,
 *  each with a "Review" into its suggestions. Create and edit are a two-step
 *  modal; selection drives Edit and Delete. */
export function MetadataExtractionPage() {
  const store = useStore();
  const corpus = useAtomValue(dataSourceAtom);
  const extractors = useAtomValue(ixExtractors.listAtom);
  const templates = useAtomValue(templatesAtom(corpus));
  const remove = useSetAtom(ixExtractors.deleteAtom);
  const consumeFailure = useSetAtom(consumeFailureAtom);
  const { record, fail } = useSettingsNotify();
  const [modal, setModal] = useState<IxExtractor | "new" | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: "name", dir: "asc" });
  const search = useSettingsSearch(extractors, (x) => `${x.name} ${x.property}`);

  // A run interrupted by a reload starts again.
  useEffect(() => resumeRuns(store, corpus), [store, corpus]);

  const open = extractors.find((x) => x.id === reviewing);
  if (open) return <SuggestionsView extractor={open} onBack={() => setReviewing(null)} />;

  const templateName = (id: string) => templates.find((t) => t.id === id)?.name ?? id;
  const rows = [...search.rows].sort((a, b) => a.name.localeCompare(b.name) * (sort.dir === "asc" ? 1 : -1));
  const picked = extractors.filter((x) => selected.has(x.id));
  const suggestionsOf = (x: IxExtractor) => store.get(ixSuggestionsAtom(`${corpus}|${x.id}`));

  const columns: Column<IxExtractor>[] = [
    {
      id: "name",
      header: "Extractor Name",
      sortKey: "name",
      mobile: "primary",
      cell: (x) => <span className="font-medium text-ink truncate">{x.name}</span>,
    },
    {
      id: "property",
      header: "Property",
      width: "9rem",
      mobile: "meta",
      cell: (x) => {
        const p = propertyOf(templates.find((t) => t.id === x.templates[0]), x.property);
        const Icon = TYPE_ICONS[(p?.type ?? "text") as PropertyType] ?? TYPE_ICONS.text;
        return (
          <span className="inline-flex items-center gap-1.5 min-w-0 text-ink-secondary">
            <Icon size={13} aria-hidden className="shrink-0 text-ink-tertiary" />
            <span className="truncate">{p?.label ?? x.property}</span>
          </span>
        );
      },
    },
    {
      id: "source",
      header: "Source",
      width: "6rem",
      mobile: "hidden",
      cell: (x) => (
        <span className="text-ink-secondary truncate">
          {x.source === "pdf" ? "PDF" : x.source === "title" ? "Title" : propertyOf(templates.find((t) => t.id === x.templates[0]), x.source)?.label ?? x.source}
        </span>
      ),
    },
    {
      id: "templates",
      header: "Template(s)",
      width: "11rem",
      mobile: "meta",
      cell: (x) => (
        <span className="flex flex-wrap gap-1 min-w-0">
          {x.templates.map((t) => (
            <span key={t} className="w-fit px-1.5 py-0.5 rounded-md bg-vellum text-meta font-medium text-ink-secondary truncate">
              {templateName(t)}
            </span>
          ))}
        </span>
      ),
    },
    { id: "status", header: "Status", width: "6.5rem", mobile: "meta", cell: (x) => <StatusPill status={statusOfRun(x.status)} /> },
    { id: "documents", header: "Documents", width: "5.5rem", align: "right", mobile: "hidden", cell: (x) => <Documents x={x} /> },
    { id: "accuracy", header: "Accuracy", width: "5rem", align: "right", mobile: "hidden", cell: (x) => <Accuracy x={x} /> },
    {
      id: "actions",
      header: <span className="sr-only">Action</span>,
      width: "5rem",
      align: "right",
      mobile: "actions",
      cell: (x) => (
        <SettingsButton variant="secondary" size="sm" aria-label={`Review ${x.name}`} onClick={() => setReviewing(x.id)}>
          Review
        </SettingsButton>
      ),
    },
  ];

  const deleteSelected = () => {
    setConfirm(false);
    const failure = consumeFailure("delete");
    if (failure) return fail(undefined, failure);
    for (const x of picked) {
      remove({ id: x.id });
      record({ method: "DELETE", domain: "extractor", noun: "extractor", id: x.id, name: x.name, notify: false });
    }
    record({
      method: "DELETE",
      domain: "extractor",
      noun: "extractor",
      name: picked.map((x) => x.name).join(", "),
      message: "Extractor/s deleted",
      log: false,
    });
    setSelected(new Set());
  };

  const suggestionCount = picked.reduce((n, x) => n + suggestionsOf(x).filter((r) => r.processed).length, 0);

  return (
    <SettingsListPage
      component="MetadataExtractionPage"
      title="Metadata extraction"
      intro="Extractors learn to suggest a property's value from each entity's document or another of its fields."
      search={{ value: search.query, onChange: search.setQuery, label: "Search extractors" }}
      lead={{ label: "Create Extractor", onClick: () => setModal("new") }}
      selection={{
        count: selected.size,
        total: rows.length,
        onClear: () => setSelected(new Set()),
        // Edit is offered only for exactly one extractor, as in Uwazi.
        actions: [
          ...(selected.size === 1
            ? [{ id: "edit", label: "Edit Extractor", icon: <Pencil size={14} />, onClick: () => picked[0] && setModal(picked[0]) }]
            : []),
          { id: "delete", label: "Delete", icon: <Trash2 size={14} />, danger: true, onClick: () => setConfirm(true) },
        ],
      }}
      overlays={
        <>
          {modal && <ExtractorModal extractor={modal === "new" ? null : modal} onClose={() => { setModal(null); setSelected(new Set()); }} />}
          <ConfirmDelete
            open={confirm}
            title="Delete extractors"
            message="Do you want to delete the following items?"
            impact={{
              lines: [
                ...picked.map((x) => x.name),
                `${suggestionCount.toLocaleString()} suggestions are deleted with ${picked.length === 1 ? "it" : "them"}. Values already accepted stay on the entities.`,
              ],
              block: null,
            }}
            confirmLabel="Accept"
            onConfirm={deleteSelected}
            onCancel={() => setConfirm(false)}
          />
        </>
      }
    >
      <h3 className="text-sm font-semibold text-ink mb-2">Extractors</h3>
      <SettingsTable
        corpusScoped
        columns={columns}
        data={rows}
        getRowId={(x) => x.id}
        sort={sort}
        onSort={() => setSort((s) => ({ key: "name", dir: s.dir === "asc" ? "desc" : "asc" }))}
        selection={{ selected, onChange: setSelected, label: (x) => x.name }}
        emptyState={
          <SettingsEmptyState
            icon={<ScanText size={16} />}
            title="No extractors yet"
            hint="An extractor learns to suggest one property's value from document text."
            action={{ label: "Create Extractor", onClick: () => setModal("new") }}
            query={search.query}
            onClearQuery={search.clear}
          />
        }
      />
    </SettingsListPage>
  );
}

/** Rows and accuracy come from the same suggestions the review page shows,
 *  so the two always agree. */
function Documents({ x }: { x: IxExtractor }) {
  const corpus = useAtomValue(dataSourceAtom);
  const rows = useAtomValue(ixSuggestionsAtom(`${corpus}|${x.id}`));
  return <span className="text-ink-secondary tabular-nums">{rows.length.toLocaleString()}</span>;
}

function Accuracy({ x }: { x: IxExtractor }) {
  const corpus = useAtomValue(dataSourceAtom);
  const { accuracy } = ixStats(useAtomValue(ixSuggestionsAtom(`${corpus}|${x.id}`)));
  return <span className="text-ink-secondary tabular-nums">{accuracy === null ? "-" : `${accuracy}%`}</span>;
}
