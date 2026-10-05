import { useState } from "react";
import { useAtomValue } from "jotai";
import { Spline } from "lucide-react";
import { SettingsListPage, useSettingsSearch } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsTable, type Column } from "../SettingsTable";
import { RowActions } from "../RowActions";
import { RelationTypeEditor } from "./RelationTypeEditor";
import {
  RelationTypeDelete,
  RelationTypeReferenceCount,
  RelationTypeTemplates,
} from "../../shared/SettingsDeletes";
import type { RelationTypeDef } from "../../../atoms/references";
import { settingsRelationTypesAtom } from "../../../atoms/relationTypes";

/** Settings › Relationship types: the collection's one registry
 *  (`atoms/relationTypes.ts`), which the Relationships panel and the template
 *  editor's relationship fields read too. */
export function RelationTypesPage() {
  const types = useAtomValue(settingsRelationTypesAtom);
  const [confirm, setConfirm] = useState<RelationTypeDef | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const search = useSettingsSearch(types, (r) => r.label);

  if (editing) return <RelationTypeEditor typeId={editing} onClose={() => setEditing(null)} />;

  const columns: Column<RelationTypeDef>[] = [
    {
      id: "name",
      header: "Label",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Spline size={14} className="text-ink-muted shrink-0" />
          <span className="font-medium text-ink truncate">{r.label}</span>
        </div>
      ),
    },
    {
      id: "templates",
      header: "Templates",
      cell: (r) => <RelationTypeTemplates id={r.id} />,
    },
    {
      id: "usage",
      header: "References",
      width: "9rem",
      cell: (r) => (
        <span className="text-xs text-ink-tertiary tabular-nums">
          <RelationTypeReferenceCount id={r.id} />
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      width: "4rem",
      align: "right",
      cell: (r) => <RowActions label={r.label} onDelete={() => setConfirm(r)} />,
    },
  ];

  return (
    <SettingsListPage
      component="RelationTypesPage"
      title="Relationship types"
      intro="The labels available when connecting entities."
      search={{ value: search.query, onChange: search.setQuery, label: "Search relationship types" }}
      lead={{ label: "Add relationship type", onClick: () => setEditing("new") }}
      overlays={
        <RelationTypeDelete type={confirm} onCancel={() => setConfirm(null)} />
      }
    >
      <SettingsTable
        corpusScoped
        columns={columns}
        data={search.rows}
        getRowId={(r) => r.id}
        onRowClick={(r) => setEditing(r.id)}
        rowAriaLabel={(r) => `Edit ${r.label}`}
        emptyState={
          <SettingsEmptyState
            icon={<Spline size={16} />}
            title="No relationship types yet"
            hint="A relationship type is the label on a connection between two entities."
            action={{ label: "Add relationship type", onClick: () => setEditing("new") }}
            query={search.query}
            onClearQuery={search.clear}
          />
        }
      />
    </SettingsListPage>
  );
}
