import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Plus, Spline } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { SettingsButton } from "../SettingsButton";
import { SettingsTable, type Column } from "../SettingsTable";
import { RowActions } from "../RowActions";
import { RelationTypeEditor } from "./RelationTypeEditor";
import {
  RelationTypeDelete,
  RelationTypeReferenceCount,
  RelationTypeTemplates,
} from "../../shared/SettingsDeletes";
import type { RelationTypeDef } from "../../../atoms/references";
import {
  restoreRelationTypeAtom,
  settingsRelationTypesAtom,
  type RelationTypeDeletion,
} from "../../../atoms/relationTypes";
import { useSettingsUndo } from "../../../hooks/useSettingsUndo";

/** Settings › Relationship types: the collection's one registry
 *  (`atoms/relationTypes.ts`), which the Relationships panel and the template
 *  editor's relationship fields read too. */
export function RelationTypesPage() {
  const types = useAtomValue(settingsRelationTypesAtom);
  const restore = useSetAtom(restoreRelationTypeAtom);
  const [confirm, setConfirm] = useState<RelationTypeDef | null>(null);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  // A delete, references moved or not, can be undone from the Beacon while
  // this page is open, like every other removal in Settings.
  const offerUndo = useSettingsUndo<RelationTypeDeletion>(restore);

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
        <span className="text-ink-secondary tabular-nums">
          <RelationTypeReferenceCount id={r.id} />
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      width: "6rem",
      align: "right",
      cell: (r) => <RowActions label={r.label} onEdit={() => setEditing(r.id)} onDelete={() => setConfirm(r)} />,
    },
  ];

  return (
    <SettingsContent component="RelationTypesPage">
      <SettingsContent.Header title="Relationship types" />
      <SettingsContent.Body>
        <SettingsTable
          columns={columns}
          data={types}
          getRowId={(r) => r.id}
          onRowClick={(r) => setEditing(r.id)}
          rowAriaLabel={(r) => `Edit ${r.label}`}
          emptyState={<span className="text-sm text-ink-tertiary">No relationship types yet. Add one to start connecting entities.</span>}
        />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <SettingsButton variant="primary" size="sm" className="me-auto" icon={<Plus size={14} />} onClick={() => setEditing("new")}>
          Add relationship type
        </SettingsButton>
      </SettingsContent.Footer>

      <RelationTypeDelete
        type={confirm}
        onCancel={() => setConfirm(null)}
        onDeleted={(d, movedTo) =>
          offerUndo(
            d,
            `${d.def.label} deleted`,
            d.moved && movedTo
              ? `${d.moved.refIds.length.toLocaleString()} references moved to ${movedTo}. Undo puts the type and its references back.`
              : "Undo puts the type back.",
          )
        }
      />
    </SettingsContent>
  );
}
