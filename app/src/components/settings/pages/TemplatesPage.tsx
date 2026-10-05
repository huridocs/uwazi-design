import { useMemo, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { LayoutTemplate, Star, Trash2 } from "lucide-react";
import { SettingsListPage, useSettingsSearch } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsTable, type Column } from "../SettingsTable";
import { Hint } from "../../shared/Hint";
import { ConfirmDelete } from "../../shared/ConfirmDelete";
import { TemplateEditor } from "./TemplateEditor";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { templatesAtom } from "../../../atoms/templates";
import {
  deleteTemplatesAtom,
  templateEntityCountsAtom,
  setDefaultTemplateAtom,
  templateDeleteCascade,
} from "../../../atoms/templateActions";
import { filterSettings } from "../../../atoms/settingsSingletons";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { count as countOf } from "../../../utils/settingsUsage";
import type { TemplateDef } from "../../../data/templates/types";
import type { SortDir } from "../../shared/DataTable";

/** A template row: the template, and how many entities use it. */
interface Row {
  template: TemplateDef;
  /** null while the collection's records load and no count is recorded. */
  entities: number | null;
  /** The count is the live one (the records are in). */
  known: boolean;
}

/** Uwazi's entity count: "1.2k" from a thousand, "3M" from a million, no
 *  trailing ".0" (TemplatesTableComponents.tsx). */
export function compactCount(n: number): string {
  const short = (v: number, unit: string) => `${Number(v.toFixed(1))}${unit}`;
  if (n >= 1_000_000) return short(n / 1_000_000, "M");
  if (n >= 1000) return short(n / 1000, "k");
  return String(n);
}

/** Why a template cannot be deleted, in Uwazi's words, each with the way
 *  forward (createTemplatesLoader.ts). */
function deleteBlock(r: Row): string | undefined {
  const reasons: string[] = [];
  if (r.template.isDefault)
    reasons.push("A default template cannot be deleted. Set another template as the default first.");
  // Until the records are in, an unused template cannot be told from one in
  // use: no delete.
  if (!r.known)
    reasons.push("The collection's records are still loading, so whether entities use this template is not known yet.");
  else if (r.entities)
    reasons.push(
      `This template is in use by existing entities and cannot be deleted. ${countOf(r.entities, "entity uses", "entities use")} it: change their template first.`,
    );
  return reasons.length ? reasons.join(" ") : undefined;
}

/** Settings › Templates: the collection's templates, from the template store
 *  (`atoms/templates.ts`), which the Library, the entity form and the record
 *  read too. Sorted by name, searchable; the star sets the default; ticked
 *  rows are deleted together, all or nothing. */
export function TemplatesPage() {
  const dataSource = useAtomValue(dataSourceAtom);
  const templates = useAtomValue(templatesAtom(dataSource));
  const counts = useAtomValue(templateEntityCountsAtom);
  const filters = useAtomValue(filterSettings.valueAtom);
  const setDefault = useSetAtom(setDefaultTemplateAtom);
  const deleteTemplates = useSetAtom(deleteTemplatesAtom);
  const { record } = useSettingsNotify();

  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: "name", dir: "asc" });
  // The row the editor last saved, highlighted on return to the list.
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const rows = useMemo<Row[]>(
    () => templates.map((template) => ({ template, entities: counts.count(template.id), known: counts.known })),
    [templates, counts],
  );
  const search = useSettingsSearch(rows, (r) => r.template.name);
  const sorted = useMemo(() => {
    const out = [...search.rows];
    const by =
      sort.key === "entities"
        ? (a: Row, b: Row) => (a.entities ?? -1) - (b.entities ?? -1) || a.template.name.localeCompare(b.template.name)
        : (a: Row, b: Row) => a.template.name.localeCompare(b.template.name);
    out.sort((a, b) => (sort.dir === "asc" ? by(a, b) : by(b, a)));
    return out;
  }, [search.rows, sort]);
  // Numbers read largest first on their first click, names A to Z.
  const onSort = (key: string) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "entities" ? "desc" : "asc" }));

  const ticked = rows.filter((r) => selected.has(r.template.id));
  const cascade = templateDeleteCascade(
    templates,
    filters.rows,
    ticked.map((r) => r.template.id),
  );

  if (editing)
    return (
      <TemplateEditor
        templateId={editing}
        onClose={(savedId) => {
          if (savedId) setLastSaved(savedId);
          setEditing(null);
        }}
      />
    );

  const confirmDelete = () => {
    const ids = ticked.map((r) => r.template.id);
    deleteTemplates({ corpus: dataSource, ids });
    for (const r of ticked)
      record({ method: "DELETE", domain: "template", noun: "template", id: r.template.id, name: r.template.name, notify: false });
    record({
      method: "DELETE",
      domain: "template",
      noun: "template",
      name: ticked[0]?.template.name ?? "",
      log: false,
      message: ids.length === 1 ? "Template deleted." : `${ids.length} templates deleted.`,
    });
    setSelected(new Set());
    setConfirm(false);
  };

  const makeDefault = (t: TemplateDef) => {
    setDefault({ corpus: dataSource, id: t.id });
    record({
      method: "UPDATE",
      domain: "template",
      noun: "template",
      id: t.id,
      name: t.name,
      summary: `Set default template “${t.name}”`,
      message: "Default template set successfully.",
    });
  };

  const columns: Column<Row>[] = [
    {
      id: "name",
      header: "Name",
      sortKey: "name",
      cell: ({ template: t }) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-[2px] border border-ink/20 shrink-0" style={{ backgroundColor: t.color }} />
          <span className="font-medium text-ink truncate">{t.name}</span>
          {t.isDefault && (
            <span className="shrink-0 text-meta font-semibold text-ink-secondary bg-vellum px-1.5 py-px rounded-md w-fit">
              Default
            </span>
          )}
        </div>
      ),
    },
    {
      id: "entities",
      header: "Entities",
      sortKey: "entities",
      width: "7rem",
      // While the records load: CEJIL's recorded count, marked as such, or
      // "Counting…"; never a zero that only means "not here yet".
      cell: (r) =>
        r.entities === null ? (
          <span className="text-ink-tertiary">Counting…</span>
        ) : (
          <span
            className="text-ink-secondary tabular-nums"
            title={r.known ? (r.entities >= 1000 ? r.entities.toLocaleString() : undefined) : "Recorded count; live count pending"}
          >
            {compactCount(r.entities)}
            {!r.known && <span className="text-ink-tertiary"> …</span>}
          </span>
        ),
    },
    {
      id: "actions",
      header: "Set as default",
      width: "7rem",
      align: "center",
      cell: ({ template: t }) => (
        <Hint text={t.isDefault ? "This is the default template" : "Set as default"} describe={false}>
          {(hint) => (
            <button
              {...hint}
              type="button"
              aria-label="Set as default"
              aria-pressed={t.isDefault}
              disabled={t.isDefault}
              onClick={(e) => {
                e.stopPropagation();
                makeDefault(t);
              }}
              className={`relative inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                t.isDefault ? "text-ink cursor-default" : "text-ink-muted hover:bg-warm hover:text-ink cursor-pointer"
              }`}
            >
              <Star size={14} fill={t.isDefault ? "currentColor" : "none"} aria-hidden />
            </button>
          )}
        </Hint>
      ),
    },
  ];

  const total = rows.length;
  return (
    <SettingsListPage
      component="TemplatesPage"
      title="Templates"
      intro="Templates define the metadata properties an entity of each type can carry."
      search={{ value: search.query, onChange: search.setQuery, label: "Search templates" }}
      lead={{ label: "Add template", onClick: () => setEditing("new") }}
      selection={{
        count: ticked.length,
        total,
        onClear: () => setSelected(new Set()),
        actions: [{ id: "delete", label: "Delete", icon: <Trash2 size={13} />, danger: true, onClick: () => setConfirm(true) }],
      }}
      overlays={
        <ConfirmDelete
          open={confirm}
          title="Delete"
          message={
            <>
              Do you want to delete the following items?
              <ul className="mt-1.5 list-disc list-inside">
                {ticked.map((r) => (
                  <li key={r.template.id}>{r.template.name}</li>
                ))}
              </ul>
            </>
          }
          impact={{
            lines: [
              ...cascade.properties.map(
                (p) => `${p.templateName} loses its relationship property “${p.label}”, which points to a deleted template.`,
              ),
              ...(cascade.filters.length ? [`Removed from Filters: ${cascade.filters.join(", ")}.`] : []),
              ...(cascade.properties.length || cascade.filters.length ? [] : ["Nothing else changes."]),
            ],
            block: null,
          }}
          onConfirm={confirmDelete}
          onCancel={() => setConfirm(false)}
        />
      }
    >
      <SettingsTable
        corpusScoped
        columns={columns}
        data={sorted}
        getRowId={(r) => r.template.id}
        onRowClick={(r) => setEditing(r.template.id)}
        rowAriaLabel={(r) => `Edit ${r.template.name}`}
        selectedId={lastSaved}
        sort={sort}
        onSort={onSort}
        selection={{
          selected,
          onChange: (next) => {
            // A row that cannot be deleted is never part of the selection.
            const ok = new Set([...next].filter((id) => {
              const r = rows.find((x) => x.template.id === id);
              return r && !deleteBlock(r);
            }));
            setSelected(ok);
          },
          label: (r) => r.template.name,
          disabledReason: deleteBlock,
        }}
        emptyState={
          <SettingsEmptyState
            icon={<LayoutTemplate size={16} />}
            title="No templates yet"
            hint="A template lists the properties an entity of one type carries."
            action={{ label: "Add template", onClick: () => setEditing("new") }}
            query={search.query}
            onClearQuery={search.clear}
          />
        }
      />
    </SettingsListPage>
  );
}
