import { useState } from "react";
import { useAtomValue } from "jotai";
import { Eye, FileText, Pencil, Trash2 } from "lucide-react";
import { SettingsListPage, useSettingsSearch } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsTable, type Column } from "../SettingsTable";
import { RowActionButton } from "../RowActions";
import { PagesDelete } from "../../shared/SettingsDeletes";
import { CodePageEditor } from "./site/CodePageEditor";
import { PageStatusPill, TemplatePickerModal } from "./site/shared";
import { PageViewModal } from "./site/PageViewModal";
import { codeDocFrom, seedDataFrom } from "./site/seeds";
import { useSiteData } from "../../site/useSiteData";
import { localesFor, pageStatus, pageTitle, pageUrl, sitePagesAtom, type SitePage } from "../../../atoms/sitePages";
import { defaultLanguageAtom, languagesAtom } from "../../../atoms/languages";
import { templateDoc, type CodeLocales, type SiteTemplateId } from "../../../data/sitePages";

/** Which editor is open: an existing page, or a new one that exists only in
 *  the editor until its first Save. `session` keeps the editor mounted when a
 *  new page's first Save gives it an id. */
type Editing = { session: number; id: string | null; starter?: CodeLocales };
let session = 0;

export function PagesPage() {
  const pages = useAtomValue(sitePagesAtom);
  const lang = useAtomValue(defaultLanguageAtom)?.key ?? "en";
  const keys = useAtomValue(languagesAtom).map((l) => l.key);
  const site = useSiteData();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [picking, setPicking] = useState(false);
  const [viewing, setViewing] = useState<SitePage | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<SitePage[]>([]);
  const search = useSettingsSearch(pages, (p) => `${pageTitle(p, lang)} ${pageUrl(p, lang)}`);

  // A new page starts from the picked site type's code, titled "New page" in
  // every language (Uwazi's default title).
  const create = (id: SiteTemplateId) => {
    const doc = templateDoc(id, seedDataFrom(site.entities, site.mainTemplate));
    const base = localesFor(codeDocFrom(doc, site.entities).draft, keys, lang);
    const starter = Object.fromEntries(Object.entries(base).map(([k, l]) => [k, { ...l, title: "New page" }]));
    setPicking(false);
    setEditing({ session: ++session, id: null, starter });
  };

  if (editing)
    return (
      <CodePageEditor
        key={editing.session}
        pageId={editing.id}
        starter={editing.starter}
        onClose={() => setEditing(null)}
        onCreated={(id) => setEditing((e) => (e ? { ...e, id } : e))}
      />
    );

  const open = (p: SitePage) => setEditing({ session: ++session, id: p.id });

  const columns: Column<SitePage>[] = [
    {
      id: "title",
      header: "Title",
      cell: (p) => <span className="font-medium text-ink truncate">{pageTitle(p, lang)}</span>,
    },
    {
      id: "url",
      header: "URL",
      cell: (p) => (
        <span dir="ltr" className="text-xs text-ink-tertiary truncate">
          {pageUrl(p, lang)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      width: "10rem",
      cell: (p) => <PageStatusPill status={pageStatus(p.doc)} />,
    },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      width: "5rem",
      align: "right",
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <RowActionButton part="view" label={`View ${pageTitle(p, lang)}`} icon={<Eye size={14} aria-hidden />} onClick={() => setViewing(p)} />
          <RowActionButton part="edit" label={`Edit ${pageTitle(p, lang)}`} icon={<Pencil size={14} aria-hidden />} onClick={() => open(p)} />
        </div>
      ),
    },
  ];

  const ticked = pages.filter((p) => selected.has(p.id));

  return (
    <SettingsListPage
      component="PagesPage"
      title="Pages"
      intro={"Custom pages for your collection: HTML, CSS and JavaScript per language, previewed as you edit. A draft stays private until you publish it."}
      search={{ value: search.query, onChange: search.setQuery, label: "Search pages" }}
      lead={{ label: "Add page", onClick: () => setPicking(true) }}
      selection={{
        count: ticked.length,
        total: pages.length,
        onClear: () => setSelected(new Set()),
        actions: [{ id: "delete", label: "Delete", icon: <Trash2 size={13} />, danger: true, onClick: () => setDeleting(ticked) }],
      }}
      overlays={
        <>
          {picking && <TemplatePickerModal onPick={create} onClose={() => setPicking(false)} />}
          {viewing && <PageViewModal page={viewing} onClose={() => setViewing(null)} />}
          <PagesDelete
            pages={deleting}
            onCancel={() => setDeleting([])}
            onDone={() => {
              setDeleting([]);
              setSelected(new Set());
            }}
          />
        </>
      }
    >
      <SettingsTable
        corpusScoped
        columns={columns}
        data={search.rows}
        getRowId={(p) => p.id}
        selection={{ selected, onChange: setSelected, label: (p) => pageTitle(p, lang) }}
        emptyState={
          <SettingsEmptyState
            icon={<FileText size={16} />}
            title="No pages yet"
            hint="A page holds your own content, such as an About page or a methodology."
            action={{ label: "Add page", onClick: () => setPicking(true) }}
            query={search.query}
            onClearQuery={search.clear}
            noMatch="No pages match"
          />
        }
      />
    </SettingsListPage>
  );
}
