import { useState } from "react";
import { useSetAtom } from "jotai";
import { Plus } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Table, type Column } from "../Table";
import { RowActions } from "../RowActions";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { PreserveTokenEditor } from "./PreserveTokenEditor";
import { seedPreserveTokens, type SettingsPreserveToken } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

export function PreservePage() {
  const setToasts = useSetAtom(toastsAtom);
  const [tokens, setTokens] = useState<SettingsPreserveToken[]>(seedPreserveTokens);
  const [confirm, setConfirm] = useState<SettingsPreserveToken | null>(null);
  const [editing, setEditing] = useState<SettingsPreserveToken | "new" | null>(null);

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
    { id: "actions", header: "", width: "6rem", align: "right", cell: (t) => <RowActions label={t.name} onEdit={() => setEditing(t)} onDelete={() => setConfirm(t)} /> },
  ];

  return (
    <SettingsContent>
      <SettingsContent.Header title="Preserve" />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          Capture and archive web sources on a schedule. Each token authenticates one capture source.
        </p>
        <Table columns={columns} data={tokens} getRowId={(t) => t.id} onRowClick={(t) => setEditing(t)} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setEditing("new")}>
          New token
        </Button>
      </SettingsContent.Footer>

      <ConfirmDialog
        open={confirm !== null}
        title="Revoke token"
        message={`Revoke the token for “${confirm?.name}”? Scheduled captures from this source will stop.`}
        confirmLabel="Revoke"
        variant="danger"
        onConfirm={() => {
          if (confirm) {
            setTokens((prev) => prev.filter((t) => t.id !== confirm.id));
            setToasts((p) => [...p, { id: Date.now().toString(), message: `Token revoked`, type: "success" as const }]);
          }
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </SettingsContent>
  );
}
