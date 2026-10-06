import { useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { Globe } from "lucide-react";
import { Checkbox } from "../../shared/Checkbox";
import { TranslationProgress } from "../TranslationProgress";
import { SettingsListPage, useSettingsSearch } from "../SettingsListPage";
import { SettingsSection } from "../SettingsSection";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsTable, type Column } from "../SettingsTable";
import { TranslationEditor } from "./TranslationEditor";
import type { SortDir } from "../../shared/DataTable";
import { dataSourceAtom } from "../../../atoms/dataSource";
import {
  installedLanguagesAtom,
  progressOf,
  translationContextsAtom,
  translationRowsAtom,
  type LanguageProgress,
  type TranslationContext,
} from "../../../atoms/translations";

interface Row {
  context: TranslationContext;
  progress: LanguageProgress[];
}

/** Settings › Translations: the collection's translation contexts, in Uwazi's
 *  two groups. System holds the User Interface, the Menu and the Filters
 *  groups; Content holds one context per template, thesaurus and relationship
 *  type, so a template added in Settings › Templates is here at once. */
export function TranslationsPage() {
  const corpus = useAtomValue(dataSourceAtom);
  const contexts = useAtomValue(translationContextsAtom(corpus));
  const rowsOf = useAtomValue(translationRowsAtom(corpus));
  const languages = useAtomValue(installedLanguagesAtom(corpus));
  const [editing, setEditing] = useState<string | null>(null);
  const [gapsOnly, setGapsOnly] = useState(false);
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: "name", dir: "asc" });

  const rows = useMemo<Row[]>(
    () => contexts.map((context) => ({ context, progress: progressOf(rowsOf(context), languages) })),
    [contexts, rowsOf, languages],
  );
  const hasGap = (r: Row) => r.progress.some((p) => p.done < p.total);
  const search = useSettingsSearch(
    rows.filter((r) => !gapsOnly || hasGap(r)),
    (r) => r.context.name,
  );
  const sorted = useMemo(() => {
    const by = (a: Row, b: Row) =>
      sort.key === "type"
        ? a.context.type.localeCompare(b.context.type) || a.context.name.localeCompare(b.context.name)
        : a.context.name.localeCompare(b.context.name);
    return [...search.rows].sort((a, b) => (sort.dir === "asc" ? by(a, b) : by(b, a)));
  }, [search.rows, sort]);
  const onSort = (key: string) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const open = editing ? contexts.find((c) => c.id === editing) : undefined;
  if (open) return <TranslationEditor context={open} onClose={() => setEditing(null)} />;

  const columns: Column<Row>[] = [
    {
      id: "name",
      header: "Name",
      sortKey: "name",
      cell: (r) => <span className="font-medium text-ink truncate">{r.context.name}</span>,
    },
    {
      id: "type",
      header: "Type",
      sortKey: "type",
      width: "10rem",
      cell: (r) => (
        <span className="text-meta font-semibold px-2 py-0.5 rounded-md w-fit whitespace-nowrap bg-warm text-ink-secondary">
          {r.context.type}
        </span>
      ),
    },
    {
      id: "keys",
      header: "Keys",
      width: "5rem",
      cell: (r) => <span className="text-ink-secondary tabular-nums">{r.context.keys.length}</span>,
    },
    {
      id: "translated",
      header: "Translated",
      width: "16rem",
      cell: (r) => <TranslationProgress variant="compact" progress={r.progress} />,
    },
  ];

  const table = (list: Row[], empty: string) => (
    <SettingsTable
      corpusScoped
      columns={columns}
      data={list}
      getRowId={(r) => r.context.id}
      onRowClick={(r) => setEditing(r.context.id)}
      rowAriaLabel={(r) => `Translate ${r.context.name}`}
      sort={sort}
      onSort={onSort}
      emptyState={<SettingsEmptyState icon={<Globe size={16} />} title={empty} query={search.query} onClearQuery={search.clear} />}
    />
  );

  return (
    <SettingsListPage
      component="TranslationsPage"
      title="Translations"
      intro="Translate the interface and your collection's content into its installed languages."
      search={{ value: search.query, onChange: search.setQuery, label: "Search contexts" }}
      filters={
        <label className="flex items-center gap-2 text-xs text-ink-secondary cursor-pointer whitespace-nowrap">
          <Checkbox checked={gapsOnly} onChange={() => setGapsOnly((v) => !v)} />
          Untranslated only
        </label>
      }
    >
      <div className="flex flex-col gap-6">
        <SettingsSection title="System translations">
          {table(sorted.filter((r) => r.context.system), gapsOnly ? "Every system context is translated" : "No system contexts")}
        </SettingsSection>
        <SettingsSection title="Content translations">
          {table(sorted.filter((r) => !r.context.system), gapsOnly ? "Every content context is translated" : "No content contexts")}
        </SettingsSection>
      </div>
    </SettingsListPage>
  );
}
