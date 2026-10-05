import { useState } from "react";
import { useAtomValue } from "jotai";
import { Checkbox } from "../../shared/Checkbox";
import { TranslationProgress } from "../TranslationProgress";
import { progressOf, translationRowsAtom } from "../../../atoms/translations";
import { Globe, Upload } from "lucide-react";
import { SettingsListPage, useSettingsSearch } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsTable, type Column } from "../SettingsTable";
import { Select } from "../../shared/Select";
import { TranslationEditor } from "./TranslationEditor";
import { useNotify } from "../../../hooks/useNotify";
import { seedTranslationContexts, type SettingsTranslationContext } from "../../../data/settings";

const typeStyle: Record<SettingsTranslationContext["type"], string> = {
  System: "bg-carbon-tint text-carbon",
  Template: "bg-warm text-ink-secondary",
  Thesaurus: "bg-warm text-ink-secondary",
  Menu: "bg-warm text-ink-secondary",
};

export function TranslationsPage() {
  const notify = useNotify();
  const [editing, setEditing] = useState<SettingsTranslationContext | null>(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [gapsOnly, setGapsOnly] = useState(false);
  const rowsOf = useAtomValue(translationRowsAtom);
  const progress = new Map(seedTranslationContexts.map((c) => [c.id, progressOf(rowsOf(c))]));
  const hasGap = (id: string) => progress.get(id)!.some((p) => p.done < p.total);
  const search = useSettingsSearch(
    seedTranslationContexts.filter((c) => (!typeFilter || c.type === typeFilter) && (!gapsOnly || hasGap(c.id))),
    (c) => c.name,
  );

  if (editing) return <TranslationEditor context={editing} onClose={() => setEditing(null)} />;

  const columns: Column<SettingsTranslationContext>[] = [
    {
      id: "name",
      header: "Context",
      cell: (c) => <span className="font-medium text-ink truncate">{c.name}</span>,
    },
    {
      id: "type",
      header: "Type",
      width: "9rem",
      cell: (c) => (
        <span className={`text-meta font-semibold px-2 py-0.5 rounded-md w-fit ${typeStyle[c.type]}`}>
          {c.type}
        </span>
      ),
    },
    {
      id: "keys",
      header: "Keys",
      width: "6rem",
      cell: (c) => <span className="text-ink-secondary tabular-nums">{c.keyCount}</span>,
    },
    {
      id: "translated",
      header: "Translated",
      width: "16rem",
      cell: (c) => <TranslationProgress variant="compact" progress={progress.get(c.id)!} />,
    },
  ];

  const importCsv = () => notify("CSV import is not built in the prototype. No translations changed.", "info");

  return (
    <SettingsListPage
      component="TranslationsPage"
      title="Translations"
      intro="Translate the interface and your collection's content across active languages."
      search={{ value: search.query, onChange: search.setQuery, label: "Search contexts" }}
      filters={
        <>
        <label className="flex items-center gap-2 text-xs text-ink-secondary cursor-pointer whitespace-nowrap">
          <Checkbox checked={gapsOnly} onChange={() => setGapsOnly((v) => !v)} />
          Untranslated only
        </label>
        <div className="w-36">
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            ariaLabel="Filter by type"
            options={[
              { value: "", label: "All types" },
              ...(Object.keys(typeStyle) as SettingsTranslationContext["type"][]).map((t) => ({ value: t, label: t })),
            ]}
          />
        </div>
        </>
      }
      lead={{ label: "Import translations (CSV)", icon: <Upload size={14} aria-hidden />, onClick: importCsv }}
    >
      <SettingsTable
        corpusScoped
        columns={columns}
        data={search.rows}
        getRowId={(c) => c.id}
        onRowClick={(c) => setEditing(c)}
        rowAriaLabel={(c) => `Translate ${c.name}`}
        emptyState={
          <SettingsEmptyState
            icon={<Globe size={16} />}
            title={gapsOnly ? "Every context is fully translated" : "No translation contexts"}
            hint="Templates, thesauri and the menu each add a context to translate."
            query={search.query}
            onClearQuery={search.clear}
          />
        }
      />
    </SettingsListPage>
  );
}
