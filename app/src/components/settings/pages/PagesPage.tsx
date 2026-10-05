import { useCallback, useState } from "react";
import { useAtomValue } from "jotai";
import { FileText } from "lucide-react";
import { SettingsListPage, useSettingsSearch } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsTable, type Column } from "../SettingsTable";
import { RowActions } from "../RowActions";
import { PageDelete } from "../../shared/SettingsDeletes";
import { CodePageEditor } from "./site/CodePageEditor";
import { TemplatePickerModal } from "./site/shared";
import { codeDocFrom, seedDataFrom } from "./site/seeds";
import { useSiteData } from "../../site/useSiteData";
import { codeDocsAtom } from "../../../atoms/sitePages";
import { templateDoc, textPageDoc, type CodeDoc, type SiteTemplateId } from "../../../data/sitePages";
import { seedMenuLinks, seedPages, type SettingsPage } from "../../../data/settings";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { cejilSettingsMenu, cejilSettingsPages } from "../../../data/cejil/settingsAdapt";

export function PagesPage() {
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
  const search = useSettingsSearch(pages, (p) => `${p.title} ${p.slug}`);

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
      width: "4rem",
      align: "right",
      cell: (p) => <RowActions label={p.title} onDelete={() => setConfirm(p)} />,
    },
  ];

  return (
    <SettingsListPage
      component="PagesPage"
      title="Pages"
      intro={"Custom pages for your collection. Each page is HTML, CSS and JavaScript per language, previewed as you type. A\u00a0draft stays private until you publish it."}
      search={{ value: search.query, onChange: search.setQuery, label: "Search pages" }}
      lead={{ label: "Add page", onClick: () => setPicking(true) }}
      overlays={
        <>
          {picking && <TemplatePickerModal onPick={create} onClose={() => setPicking(false)} />}
          <PageDelete
            page={confirm}
            menu={dataSource === "cejil" ? cejilSettingsMenu : seedMenuLinks}
            onCancel={() => setConfirm(null)}
            onDelete={(page) => setPages((prev) => prev.filter((p) => p.id !== page.id))}
          />
        </>
      }
    >
      <SettingsTable
        corpusScoped
        columns={columns}
        data={search.rows}
        getRowId={(p) => p.id}
        onRowClick={(p) => setEditing(p)}
        rowAriaLabel={(p) => `Edit ${p.title}`}
        emptyState={
          <SettingsEmptyState
            icon={<FileText size={16} />}
            title="No pages yet"
            hint="A page holds your own content, such as an About page or a methodology."
            action={{ label: "Add page", onClick: () => setPicking(true) }}
            query={search.query}
            onClearQuery={search.clear}
          />
        }
      />
    </SettingsListPage>
  );
}
