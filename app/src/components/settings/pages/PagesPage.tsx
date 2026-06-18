import { useState } from "react";
import { useSetAtom } from "jotai";
import { Plus } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Table, type Column } from "../Table";
import { RowActions } from "../RowActions";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { PageEditor } from "./PageEditor";
import { seedPages, type SettingsPage } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

export function PagesPage() {
  const setToasts = useSetAtom(toastsAtom);
  const [pages, setPages] = useState<SettingsPage[]>(seedPages);
  const [confirm, setConfirm] = useState<SettingsPage | null>(null);
  const [editing, setEditing] = useState<SettingsPage | "new" | null>(null);

  if (editing) return <PageEditor page={editing} onClose={() => setEditing(null)} />;

  const columns: Column<SettingsPage>[] = [
    {
      id: "title",
      header: "Title",
      cell: (p) => <span className="font-medium text-ink truncate">{p.title}</span>,
    },
    {
      id: "slug",
      header: "URL",
      cell: (p) => <span dir="ltr" className="text-xs text-ink-tertiary truncate">/page/{p.slug}</span>,
    },
    {
      id: "published",
      header: "Status",
      width: "8rem",
      cell: (p) =>
        p.published ? (
          <span className="text-[11px] font-semibold text-success bg-success-light px-2 py-0.5 rounded-md w-fit">
            Published
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-ink-secondary bg-warm px-2 py-0.5 rounded-md w-fit">
            Draft
          </span>
        ),
    },
    {
      id: "actions",
      header: "",
      width: "6rem",
      align: "right",
      cell: (p) => <RowActions label={p.title} onEdit={() => setEditing(p)} onDelete={() => setConfirm(p)} />,
    },
  ];

  return (
    <SettingsContent>
      <SettingsContent.Header title="Pages" />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          Custom pages for your collection — about pages, methodology, landing content.
        </p>
        <Table columns={columns} data={pages} getRowId={(p) => p.id} onRowClick={(p) => setEditing(p)} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="primary" size="sm" className="me-auto" icon={<Plus size={14} />} onClick={() => setEditing("new")}>
          Add page
        </Button>
      </SettingsContent.Footer>

      <ConfirmDialog
        open={confirm !== null}
        title="Delete page"
        message={`Delete “${confirm?.title}”? Any menu links pointing to it will break.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirm) {
            setPages((prev) => prev.filter((p) => p.id !== confirm.id));
            setToasts((p) => [...p, { id: Date.now().toString(), message: `${confirm.title} deleted`, type: "success" as const }]);
          }
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </SettingsContent>
  );
}
