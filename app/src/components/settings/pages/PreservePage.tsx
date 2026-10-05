import { useState } from "react";
import { Archive } from "lucide-react";
import { SettingsListPage, useSettingsSearch } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsTable, type Column } from "../SettingsTable";
import { RowActions } from "../RowActions";
import { ConfirmDelete } from "../../shared/ConfirmDelete";
import { PreserveTokenEditor } from "./PreserveTokenEditor";
import { seedPreserveTokens, type SettingsPreserveToken } from "../../../data/settings";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";

export function PreservePage() {
  const { record } = useSettingsNotify();
  const [tokens, setTokens] = useState<SettingsPreserveToken[]>(seedPreserveTokens);
  const [confirm, setConfirm] = useState<SettingsPreserveToken | null>(null);
  const [editing, setEditing] = useState<SettingsPreserveToken | "new" | null>(null);
  const search = useSettingsSearch(tokens, (t) => t.name);

  if (editing) return <PreserveTokenEditor token={editing} onClose={() => setEditing(null)} />;

  const columns: Column<SettingsPreserveToken>[] = [
    { id: "name", header: "Source", cell: (t) => <span className="font-medium text-ink truncate">{t.name}</span> },
    {
      id: "token",
      header: "Token",
      width: "11rem",
      cell: (t) => (
        <span dir="ltr" className="text-xs text-ink-tertiary font-mono bg-vellum px-1.5 py-0.5 rounded w-fit">
          {t.token}
        </span>
      ),
    },
    { id: "captured", header: "Captured", width: "7rem", cell: (t) => <span className="text-ink-secondary tabular-nums">{t.capturedCount}</span> },
    { id: "lastRun", header: "Last run", width: "11rem", cell: (t) => <span dir="ltr" className="text-xs text-ink-tertiary tabular-nums">{t.lastRun}</span> },
    { id: "actions", header: "", width: "4rem", align: "right", cell: (t) => <RowActions label={`the token for ${t.name}`} deleteLabel="Revoke" onDelete={() => setConfirm(t)} /> },
  ];

  return (
    <SettingsListPage
      component="PreservePage"
      title="Preserve"
      intro="Capture and archive web sources on a schedule. Each&nbsp;token authenticates one capture source."
      search={{ value: search.query, onChange: search.setQuery, label: "Search sources" }}
      lead={{ label: "Add token", onClick: () => setEditing("new") }}
      overlays={
        <ConfirmDelete
          open={confirm !== null}
          impact={confirm ? { lines: [`${confirm.capturedCount.toLocaleString()} captures made with it stay in the collection.`], block: null } : null}
          title="Revoke token"
          message={`Revoke the token for “${confirm?.name}”? Scheduled captures from this source will stop.`}
          confirmLabel="Revoke"
          onConfirm={() => {
            if (confirm) {
              setTokens((prev) => prev.filter((t) => t.id !== confirm.id));
              record({ log: false,  method: "DELETE", domain: "preserve", noun: "Preserve token for", id: confirm.id, name: confirm.name, message: "Token revoked" });
            }
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      }
    >
      <SettingsTable
        columns={columns}
        data={search.rows}
        getRowId={(t) => t.id}
        onRowClick={(t) => setEditing(t)}
        rowAriaLabel={(t) => `Edit ${t.name}`}
        emptyState={
          <SettingsEmptyState
            icon={<Archive size={16} />}
            title="No capture sources yet"
            hint="Add a token to archive a web source on a schedule."
            action={{ label: "Add token", onClick: () => setEditing("new") }}
            query={search.query}
            onClearQuery={search.clear}
          />
        }
      />
    </SettingsListPage>
  );
}
