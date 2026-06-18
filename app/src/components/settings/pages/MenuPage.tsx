import { useState } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { Plus, Link2, Folder } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Table, type Column } from "../Table";
import { RowActions } from "../RowActions";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { MenuLinkEditor } from "./MenuLinkEditor";
import { seedMenuLinks, type SettingsMenuLink } from "../../../data/settings";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { cejilSettingsMenu } from "../../../data/cejil/settingsAdapt";
import { toastsAtom } from "../../../atoms/references";

export function MenuPage() {
  const setToasts = useSetAtom(toastsAtom);
  const dataSource = useAtomValue(dataSourceAtom);
  const [links, setLinks] = useState<SettingsMenuLink[]>(
    dataSource === "cejil" ? cejilSettingsMenu : seedMenuLinks,
  );
  const [confirm, setConfirm] = useState<SettingsMenuLink | null>(null);
  const [editing, setEditing] = useState<SettingsMenuLink | "new" | null>(null);

  if (editing) return <MenuLinkEditor link={editing} onClose={() => setEditing(null)} />;

  const columns: Column<SettingsMenuLink>[] = [
    {
      id: "title",
      header: "Label",
      cell: (m) => (
        <div className="flex items-center gap-2">
          {m.type === "group" ? (
            <Folder size={14} className="text-ink-muted shrink-0" />
          ) : (
            <Link2 size={14} className="text-ink-muted shrink-0" />
          )}
          <span className="font-medium text-ink truncate">{m.title}</span>
        </div>
      ),
    },
    {
      id: "url",
      header: "URL",
      cell: (m) =>
        m.url ? (
          <span dir="ltr" className="text-xs text-ink-tertiary truncate">{m.url}</span>
        ) : (
          <span className="text-[11px] font-semibold text-ink-secondary bg-warm px-2 py-0.5 rounded-md w-fit">Group</span>
        ),
    },
    {
      id: "actions",
      header: "",
      width: "6rem",
      align: "right",
      cell: (m) => <RowActions label={m.title} onEdit={() => setEditing(m)} onDelete={() => setConfirm(m)} />,
    },
  ];

  return (
    <SettingsContent>
      <SettingsContent.Header title="Menu" />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          Links shown in the top navigation. Groups nest links into a dropdown.
        </p>
        <Table columns={columns} data={links} getRowId={(m) => m.id} onRowClick={(m) => setEditing(m)} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="primary" size="sm" className="me-auto" icon={<Plus size={14} />} onClick={() => setEditing("new")}>
          Add link
        </Button>
      </SettingsContent.Footer>

      <ConfirmDialog
        open={confirm !== null}
        title="Delete menu link"
        message={`Remove “${confirm?.title}” from the navigation menu?`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirm) {
            setLinks((prev) => prev.filter((m) => m.id !== confirm.id));
            setToasts((p) => [...p, { id: Date.now().toString(), message: `${confirm.title} removed`, type: "success" as const }]);
          }
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </SettingsContent>
  );
}
