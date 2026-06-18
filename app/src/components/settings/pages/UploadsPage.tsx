import { useState } from "react";
import { useSetAtom } from "jotai";
import { Upload, Image, FileText, Type, File } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Table, type Column } from "../Table";
import { RowActions } from "../RowActions";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { seedUploads, type SettingsUpload } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

const typeIcon = { image: Image, pdf: FileText, font: Type, other: File };

export function UploadsPage() {
  const setToasts = useSetAtom(toastsAtom);
  const [uploads, setUploads] = useState<SettingsUpload[]>(seedUploads);
  const [confirm, setConfirm] = useState<SettingsUpload | null>(null);

  const columns: Column<SettingsUpload>[] = [
    {
      id: "name",
      header: "File",
      cell: (u) => {
        const Icon = typeIcon[u.type];
        return (
          <div className="flex items-center gap-2 min-w-0">
            <Icon size={14} className="text-ink-muted shrink-0" />
            <span className="font-medium text-ink truncate">{u.name}</span>
          </div>
        );
      },
    },
    { id: "url", header: "URL", cell: (u) => <span dir="ltr" className="text-xs text-ink-tertiary truncate">{u.url}</span> },
    { id: "size", header: "Size", width: "7rem", cell: (u) => <span dir="ltr" className="text-xs text-ink-tertiary">{u.size}</span> },
    { id: "actions", header: "", width: "6rem", align: "right", cell: (u) => <RowActions label={u.name} onDelete={() => setConfirm(u)} /> },
  ];

  return (
    <SettingsContent>
      <SettingsContent.Header title="Uploads" />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          Assets you can reference from pages, custom CSS, or templates.
        </p>
        <Table columns={columns} data={uploads} getRowId={(u) => u.id} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="primary" size="sm" className="me-auto" icon={<Upload size={14} />}>
          Upload file
        </Button>
      </SettingsContent.Footer>

      <ConfirmDialog
        open={confirm !== null}
        title="Delete upload"
        message={`Delete “${confirm?.name}”? References to its URL will break.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirm) {
            setUploads((prev) => prev.filter((u) => u.id !== confirm.id));
            setToasts((p) => [...p, { id: Date.now().toString(), message: `${confirm.name} deleted`, type: "success" as const }]);
          }
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </SettingsContent>
  );
}
