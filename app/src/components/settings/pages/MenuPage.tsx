import { useState } from "react";
import { useAtomValue } from "jotai";
import { Plus, Link2, Folder } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { SettingsButton } from "../SettingsButton";
import { SettingsTable, type Column } from "../SettingsTable";
import { RowActions } from "../RowActions";
import { ConfirmDelete } from "../../shared/ConfirmDelete";
import { MenuLinkEditor } from "./MenuLinkEditor";
import { seedMenuLinks, type SettingsMenuLink } from "../../../data/settings";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { cejilSettingsMenu } from "../../../data/cejil/settingsAdapt";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { newSettingsId } from "../../../atoms/settingsCollection";

export function MenuPage() {
  const { record } = useSettingsNotify();
  const dataSource = useAtomValue(dataSourceAtom);
  const [links, setLinks] = useState<SettingsMenuLink[]>(
    dataSource === "cejil" ? cejilSettingsMenu : seedMenuLinks,
  );
  const [confirm, setConfirm] = useState<SettingsMenuLink | null>(null);
  const [editing, setEditing] = useState<SettingsMenuLink | "new" | null>(null);

  const saveLink = (value: Omit<SettingsMenuLink, "id">): string => {
    if (editing === "new") {
      const id = newSettingsId("m");
      setLinks((prev) => [...prev, { ...value, id }]);
      return id;
    }
    const id = (editing as SettingsMenuLink).id;
    setLinks((prev) => prev.map((m) => (m.id === id ? { ...m, ...value } : m)));
    return id;
  };

  if (editing) return <MenuLinkEditor link={editing} onClose={() => setEditing(null)} onSave={saveLink} />;

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
          <span className="text-meta font-semibold text-ink-secondary bg-warm px-2 py-0.5 rounded-md w-fit">Group</span>
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
    <SettingsContent component="MenuPage">
      <SettingsContent.Header title="Menu" />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          Links shown in the top navigation. Groups nest links into a dropdown.
        </p>
        <SettingsTable columns={columns} data={links} getRowId={(m) => m.id} onRowClick={(m) => setEditing(m)} rowAriaLabel={(m) => `Edit ${m.title}`} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <SettingsButton variant="primary" size="sm" className="me-auto" icon={<Plus size={14} />} onClick={() => setEditing("new")}>
          Add link
        </SettingsButton>
      </SettingsContent.Footer>

      <ConfirmDelete
        open={confirm !== null}
        impact={confirm ? { lines: [confirm.type === "group" ? "Its sub-links are removed with it." : `It links to ${confirm.url}.`], block: null } : null}
        title="Delete menu link"
        message={`Remove “${confirm?.title}” from the navigation menu?`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (confirm) {
            setLinks((prev) => prev.filter((m) => m.id !== confirm.id));
            record({ log: false,  method: "DELETE", domain: "menu", noun: "menu item", id: confirm.id, name: confirm.title, message: `${confirm.title} removed` });
          }
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </SettingsContent>
  );
}
