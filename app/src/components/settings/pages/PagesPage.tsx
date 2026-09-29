import { useCallback, useState } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { Plus } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { SettingsButton } from "../SettingsButton";
import { SettingsTable, type Column } from "../SettingsTable";
import { RowActions } from "../RowActions";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { CodePageEditor } from "./site/CodePageEditor";
import { TemplatePickerModal } from "./site/shared";
import { codeDocFrom, seedDataFrom } from "./site/seeds";
import { useSiteData } from "../../site/useSiteData";
import { codeDocsAtom } from "../../../atoms/sitePages";
import { templateDoc, textPageDoc, type CodeDoc, type SiteTemplateId } from "../../../data/sitePages";
import { seedPages, type SettingsPage } from "../../../data/settings";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { cejilSettingsPages } from "../../../data/cejil/settingsAdapt";
import { toastsAtom } from "../../../atoms/notifications";

export function PagesPage() {
  const setToasts = useSetAtom(toastsAtom);
  const dataSource = useAtomValue(dataSourceAtom);
  const [pages, setPages] = useState<SettingsPage[]>(
    dataSource === "cejil" ? cejilSettingsPages : seedPages,
  );
  const [confirm, setConfirm] = useState<SettingsPage | null>(null);
  const [editing, setEditing] = useState<SettingsPage | null>(null);
  const [picking, setPicking] = useState(false);
  const [newSeeds, setNewSeeds] = useState<Record<string, CodeDoc>>({});
  const docs = useAtomValue(codeDocsAtom);
  const site = useSiteData();

  // Existing pages open with their text in English and Spanish only, so French
  // and Arabic show what "Copy from language" is for.
  const seed = useCallback(
    () =>
      editing && newSeeds[editing.id]
        ? newSeeds[editing.id]
        : codeDocFrom(textPageDoc(editing?.title ?? "", site.mainTemplate), site.entities, {
            langs: ["en", "es"],
            published: !!editing?.published,
          }),
    [editing, newSeeds, site.entities, site.mainTemplate],
  );

  const create = (id: SiteTemplateId) => {
    const doc = templateDoc(id, seedDataFrom(site.entities, site.mainTemplate));
    const page: SettingsPage = { id: `p${Date.now().toString(36)}`, title: doc.title.en, slug: id, published: false };
    setNewSeeds((s) => ({ ...s, [page.id]: codeDocFrom(doc, site.entities) }));
    setPages((prev) => [...prev, page]);
    setPicking(false);
    setEditing(page);
  };

  if (editing)
    return <CodePageEditor key={editing.id} pageId={editing.id} slug={editing.slug} seed={seed} onClose={() => setEditing(null)} />;

  // The row reads the session's saved state once a page has been edited.
  const statusOf = (p: SettingsPage): "published" | "draft" | "changed" => {
    const d = docs[p.id];
    if (!d) return p.published ? "published" : "draft";
    if (!d.published) return "draft";
    return JSON.stringify(d.draft) === JSON.stringify(d.published) ? "published" : "changed";
  };

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
      width: "10rem",
      cell: (p) => {
        const st = statusOf(p);
        return st === "draft" ? (
          <span className="text-meta font-semibold text-ink-secondary bg-warm px-2 py-0.5 rounded-md w-fit">Draft</span>
        ) : (
          <span className="text-meta font-semibold text-success bg-success-light px-2 py-0.5 rounded-md w-fit whitespace-nowrap">
            {st === "changed" ? "Published · edited" : "Published"}
          </span>
        );
      },
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
    <SettingsContent component="PagesPage">
      <SettingsContent.Header title="Pages" />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          Custom pages for your collection. Each page is HTML, CSS and JavaScript per language, previewed as you type. A draft
          stays private until you publish it.
        </p>
        <SettingsTable columns={columns} data={pages} getRowId={(p) => p.id} onRowClick={(p) => setEditing(p)} rowAriaLabel={(p) => `Edit ${p.title}`} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <SettingsButton variant="primary" size="sm" className="me-auto" icon={<Plus size={14} />} onClick={() => setPicking(true)}>
          Add page
        </SettingsButton>
      </SettingsContent.Footer>

      {picking && <TemplatePickerModal onPick={create} onClose={() => setPicking(false)} />}

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
