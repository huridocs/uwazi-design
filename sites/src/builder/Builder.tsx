/* The builder: one form column, one live preview, one primary action. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, History, Monitor, Redo2, Smartphone, Tablet, Undo2 } from "lucide-react";
import type { Template, Thesaurus } from "../data/types";
import type { ImageRef, Page, SiteConfig } from "../model/config";
import { LANG_NAMES, tr } from "../model/config";
import { sourceFor } from "../lib/sources";
import type { Route } from "../render/context";
import { BuilderProvider } from "./fields";
import { PagePanel, type BlockPane } from "./PagePanel";
import { Preview, type Device } from "./Preview";
import { SitePanel } from "./SitePanel";
import { SiteSections } from "./SiteSections";
import { ExportPanel } from "./ExportPanel";
import { diff, type Editor } from "./state";
import { Mark } from "./FirstRun";
import { Button, Disclosure, IconButton, Modal, Segmented, Select } from "./ui";
import { SiteTypePicker } from "./SiteTypePicker";
import { profile, siteType, type CollectionProfile } from "../model/templates";
import { switchSiteType, type Removed } from "../model/switchType";
import type { TemplateId } from "../model/config";

export function Builder({ editor, onStartOver }: { editor: Editor; onStartOver: () => void }) {
  const doc = editor.doc!;
  const config = doc.draft;
  const ds = sourceFor(config.collection);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [thesauri, setThesauri] = useState<Thesaurus[]>([]);
  const [lang, setLang] = useState(config.defaultLanguage);
  const [pageId, setPageId] = useState(() => config.pages.find((p) => p.kind === "home")?.id ?? config.pages[0].id);
  const [entityId, setEntityId] = useState<string>();
  const [selected, setSelected] = useState<string>();
  const [blockPane, setBlockPane] = useState<BlockPane>("content");
  const [device, setDevice] = useState<Device>("desktop");
  const [tab, setTab] = useState<"page" | "site">("page");
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [confirmReset, setConfirmReset] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [siteOpen, setSiteOpen] = useState<string | null>("theme");
  // Site type preview: the site as it would be with another type. Nothing is
  // saved until Apply; the main preview shows `trial.config` meanwhile.
  const [prof, setProf] = useState<CollectionProfile>();
  const [trial, setTrial] = useState<{ type: TemplateId; config: SiteConfig; removed: Removed[] } | null>(null);
  const [trialRoute, setTrialRoute] = useState<Route>();
  const narrow = useNarrow();

  useEffect(() => {
    ds.templates().then(setTemplates, () => {});
    ds.thesauri().then(setThesauri, () => {});
    profile(ds).then(setProf, () => {});
  }, [ds]);
  useEffect(() => {
    if (!config.languages.includes(lang)) setLang(config.defaultLanguage);
  }, [config.languages, config.defaultLanguage, lang]);

  const page: Page = config.pages.find((p) => p.id === pageId) ?? config.pages[0];
  const route: Route = page.kind === "entity" ? { lang, slug: "entity", entity: entityId } : { lang, slug: page.slug };
  const previewType = (type: TemplateId) => {
    if (!prof || type === config.template) {
      setTrial(null);
      setTrialRoute(undefined);
      return;
    }
    if (trial?.type === type) return;
    setTrial({ type, ...switchSiteType(config, type, prof) });
    setTrialRoute(undefined);
  };
  const cancelTrial = () => {
    setTrial(null);
    setTrialRoute(undefined);
  };
  const applyTrial = () => {
    if (!trial || !prof) return;
    const from = siteType(config.template).label;
    const next = switchSiteType(config, trial.type, prof).config;
    editor.edit(() => next);
    setNotice(`Site type changed from ${from} to ${siteType(trial.type).label}. Undo puts it back.`);
    cancelTrial();
  };
  useEffect(() => {
    if (!trial) return;
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented && !document.querySelector("[aria-modal=true]")) cancelTrial();
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [trial]);
  // In the preview, the page that corresponds to the one being edited.
  const trialPage = trial ? trial.config.pages.find((p) => p.id === page.id) ?? trial.config.pages.find((p) => p.kind === page.kind) ?? trial.config.pages[0] : undefined;
  const previewRoute: Route = trial ? trialRoute ?? (trialPage!.kind === "entity" ? { lang, slug: "entity", entity: entityId } : { lang, slug: trialPage!.slug }) : route;

  const changes = useMemo(() => diff(doc.published, config), [doc.published, config]);
  const unpublished = doc.published ? changes.length : 1;

  // ⌘Z / ⇧⌘Z, except while typing (the field's own undo wins there).
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      e.preventDefault();
      editor.dispatch({ type: e.shiftKey ? "redo" : "undo" });
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [editor]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(undefined), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const onNavigate = useCallback(
    (r: Route) => {
      if (r.lang !== lang && config.languages.includes(r.lang)) setLang(r.lang);
      if (r.entity || r.slug === "entity") {
        const ep = config.pages.find((p) => p.kind === "entity");
        if (ep) {
          setPageId(ep.id);
          setEntityId(r.entity);
        }
      } else {
        const p = config.pages.find((x) => x.kind !== "entity" && x.slug === r.slug);
        if (p) setPageId(p.id);
      }
      setSelected(undefined);
    },
    [config.pages, config.languages, lang],
  );

  const t = (x: Parameters<typeof tr>[0]) => tr(x, lang, config.defaultLanguage);
  const pageLabel = (p: Page) => `${t(p.title)}${p.kind === "entity" ? " (every record)" : ""}`;

  return (
    <BuilderProvider value={{ config, lang, templates, thesauri, ds }}>
      <div className="h-screen flex flex-col bg-parchment text-ink">
        <header className="shrink-0 h-12 flex items-center gap-2 px-3 sm:px-4 border-b border-border bg-paper">
          <Mark />
          <span className="hidden lg:block text-sm font-semibold text-ink truncate max-w-[12rem]">{tr(config.name, config.defaultLanguage, config.defaultLanguage)}</span>
          <span aria-hidden className="hidden lg:block w-px h-5 bg-border mx-1" />
          <label className="flex items-center gap-2 min-w-0">
            <span className="sr-only">Page</span>
            <Select value={page.id} onChange={(id) => { setPageId(id); setSelected(undefined); setTab("page"); }} options={config.pages.map((p) => ({ value: p.id, label: pageLabel(p) }))} className="w-auto max-w-[13rem] h-8" />
          </label>
          {config.languages.length > 1 ? (
            <label className="flex items-center">
              <span className="sr-only">Editing language</span>
              <Select value={lang} onChange={setLang} options={config.languages.map((l) => ({ value: l, label: narrow ? l.toUpperCase() : `${l.toUpperCase()} · ${LANG_NAMES[l]?.name ?? l}` }))} className="w-auto h-8" />
            </label>
          ) : null}
          <span className="flex-1" />
          <span className="hidden md:inline-flex">
            <Segmented<Device>
              label="Preview size"
              value={device}
              onChange={setDevice}
              options={[
                { value: "desktop", label: <Monitor size={14} aria-label="Desktop" />, title: "Desktop" },
                { value: "tablet", label: <Tablet size={14} aria-label="Tablet" />, title: "Tablet" },
                { value: "phone", label: <Smartphone size={14} aria-label="Phone" />, title: "Phone" },
              ]}
            />
          </span>
          <span className="hidden sm:flex items-center">
            <IconButton label="Undo (⌘Z)" disabled={!editor.canUndo} onClick={() => editor.dispatch({ type: "undo" })}>
              <Undo2 size={15} />
            </IconButton>
            <IconButton label="Redo (⇧⌘Z)" disabled={!editor.canRedo} onClick={() => editor.dispatch({ type: "redo" })}>
              <Redo2 size={15} />
            </IconButton>
          </span>
          <a href={`${import.meta.env.BASE_URL}site.html`} target="_blank" rel="noreferrer" className={`hidden sm:inline-flex items-center gap-1 h-8 px-2 text-xs text-ink-secondary hover:text-ink rounded-md hover:bg-warm ${doc.published ? "" : "pointer-events-none opacity-40"}`} aria-disabled={!doc.published}>
            View site <ExternalLink size={12} aria-hidden />
          </a>
          <Button variant="primary" onClick={() => setPublishing(true)} disabled={!!doc.published && !changes.length}>
            Publish
            {doc.published && changes.length ? <span className="ms-0.5 rounded bg-paper/20 px-1 text-[0.6875rem] tabular-nums">{changes.length}</span> : null}
          </Button>
        </header>

        {/* Phones: one pane at a time. */}
        <div className="md:hidden shrink-0 flex items-center gap-2 px-3 py-2 border-b border-border bg-paper">
          <Segmented<"edit" | "preview"> label="View" value={mobileView} onChange={setMobileView} options={[{ value: "edit", label: "Edit" }, { value: "preview", label: "Preview" }]} />
          <span className="ms-auto text-[0.6875rem] text-ink-tertiary" aria-live="polite">
            {doc.published ? (changes.length ? `${changes.length} unpublished` : "Published") : "Not published"}
          </span>
        </div>

        <div className="flex-1 min-h-0 flex">
          <aside aria-label="Editor" className={`${mobileView === "edit" ? "flex" : "hidden"} md:flex w-full md:w-[22rem] lg:w-[24rem] shrink-0 flex-col bg-paper border-e border-border min-h-0`}>
            <div className="shrink-0 px-4 pt-3 pb-2 flex items-center gap-2">
              <Segmented<"page" | "site"> label="Edit" value={tab} onChange={setTab} options={[{ value: "page", label: "This page" }, { value: "site", label: "Whole site" }]} />
              <span className="ms-auto hidden md:block text-[0.6875rem] text-ink-tertiary" aria-live="polite">
                {doc.published ? (changes.length ? `${changes.length} unpublished change${changes.length === 1 ? "" : "s"}` : "All published") : "Not published yet"}
              </span>
            </div>
            <div className={`flex-1 min-h-0 overflow-y-auto px-4 ${trial ? "pb-48 md:pb-8" : "pb-8"}`}>
              {tab === "page" ? (
                <PagePanel page={page} editor={editor} selected={selected} onSelect={setSelected} pane={blockPane} onPane={setBlockPane} />
              ) : (
                <SitePanel
                  editor={editor}
                  before={
                    <Disclosure title="Site type" open={siteOpen === "type"} onToggle={() => setSiteOpen((o) => (o === "type" ? null : "type"))} aside={siteType(config.template).label}>
                      <SiteTypePicker current={config.template} previewing={trial?.type} prof={prof} onPreview={previewType} onApply={applyTrial} onCancel={cancelTrial} />
                    </Disclosure>
                  }
                  open={siteOpen}
                  onOpen={setSiteOpen}
                  extra={
                    <>
                      <SiteSections editor={editor} open={siteOpen} onOpen={setSiteOpen} onExport={() => setExporting(true)} />
                      <HistorySection editor={editor} open={siteOpen === "history"} onToggle={() => setSiteOpen((o) => (o === "history" ? null : "history"))} onReset={() => setConfirmReset(true)} onRestored={(n) => setNotice(n)} />
                    </>
                  }
                />
              )}
            </div>
          </aside>
          <section aria-label="Preview" className={`${mobileView === "preview" ? "flex" : "hidden"} md:flex flex-col flex-1 min-w-0 min-h-0 bg-parchment`}>
            {/* Over the preview, not above both panes: the picker must not
                move under a pointer that is resting on it. */}
            {trial ? <TrialBar type={trial.type} removed={trial.removed} onCancel={cancelTrial} onApply={applyTrial} className="hidden md:flex" /> : null}
            <div className="flex-1 min-h-0 flex">
            <Preview
              config={trial?.config ?? config}
              route={previewRoute}
              selected={tab === "page" ? selected : siteOpen === "menu" ? "__header" : siteOpen === "footer" ? "__footer" : undefined}
              device={device}
              onSelect={(id) => {
                if (trial) return;
                setTab("page");
                setSelected(id);
                setMobileView("edit");
              }}
              onNavigate={trial ? setTrialRoute : onNavigate}
            />
            </div>
          </section>
        </div>
        {/* Phones: pinned to the bottom, over whichever pane is showing. */}
        {trial ? <TrialBar type={trial.type} removed={trial.removed} onCancel={cancelTrial} onApply={applyTrial} className="flex md:hidden fixed inset-x-0 bottom-0 z-30 border-t shadow-[var(--shadow-lg)]" /> : null}

        {notice ? (
          <div role="status" className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 rounded-md bg-ink text-paper text-sm px-3 py-2 shadow-[var(--shadow-lg)]">
            {notice}
          </div>
        ) : null}

        {publishing ? (
          <PublishDialog
            config={config}
            changes={doc.published ? changes : ["First publish: the whole site"]}
            lang={lang}
            onClose={() => setPublishing(false)}
            onGoTo={(pid, bid) => {
              setPublishing(false);
              setTab("page");
              setPageId(pid);
              setSelected(bid);
            }}
            onPublish={() => {
              editor.dispatch({ type: "publish" });
              setPublishing(false);
              setNotice("Published. The public site now shows this version.");
            }}
          />
        ) : null}
        {exporting ? <ExportPanel onClose={() => setExporting(false)} /> : null}
        {confirmReset ? (
          <Modal
            title="Start a new site?"
            subtitle="This site, its draft and every published version are removed from this browser."
            size="sm"
            onClose={() => setConfirmReset(false)}
            footer={
              <>
                <Button variant="ghost" onClick={() => setConfirmReset(false)}>
                  Keep this site
                </Button>
                <Button variant="danger" onClick={onStartOver} className="bg-seal-fill text-white hover:opacity-90 hover:bg-seal-fill">
                  Remove and start over
                </Button>
              </>
            }
          >
            <p className="text-sm text-ink-secondary">If you want a copy first, download it from Whole site › History.</p>
          </Modal>
        ) : null}
        <span className="sr-only" aria-live="polite">
          {unpublished ? "" : "All changes published"}
        </span>
      </div>
    </BuilderProvider>
  );
}

/** Pictures without alt text, by page and block — publishing waits for them. */
function missingAlt(c: SiteConfig): { pageId: string; blockId?: string; where: string }[] {
  const out: { pageId: string; blockId?: string; where: string }[] = [];
  const has = (img: ImageRef) => Object.values(img.alt).some((v) => (v ?? "").trim());
  if (c.theme.logo && !has(c.theme.logo)) out.push({ pageId: c.pages[0].id, where: "Logo (Whole site › Theme)" });
  for (const p of c.pages)
    for (const b of p.blocks) {
      const img = (b.props as { image?: ImageRef }).image;
      if (img && !has(img)) out.push({ pageId: p.id, blockId: b.id, where: `${tr(p.title, "en", c.defaultLanguage)} · ${b.type}` });
    }
  return out;
}

function PublishDialog({ config, changes, lang, onClose, onPublish, onGoTo }: { config: SiteConfig; changes: string[]; lang: string; onClose: () => void; onPublish: () => void; onGoTo: (pageId: string, blockId?: string) => void }) {
  const alt = missingAlt(config);
  void lang;
  return (
    <Modal
      title="Publish these changes?"
      subtitle="Readers see them as soon as you publish. You can go back to any earlier version."
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Not yet
          </Button>
          <Button variant="primary" onClick={onPublish} disabled={alt.length > 0} data-autofocus>
            Publish now
          </Button>
        </>
      }
    >
      {alt.length ? (
        <div role="alert" className="mb-4 rounded-md bg-warning-light px-3 py-2.5 text-sm text-ink flex flex-col gap-1.5">
          <span className="font-medium">
            {alt.length} picture{alt.length === 1 ? "" : "s"} still need{alt.length === 1 ? "s" : ""} alt text.
          </span>
          <ul className="flex flex-col gap-1">
            {alt.map((a, i) => (
              <li key={i}>
                <button type="button" onClick={() => onGoTo(a.pageId, a.blockId)} className="underline underline-offset-2 text-ink-secondary hover:text-ink">
                  {a.where}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <h3 className="text-xs font-medium uppercase tracking-wider text-ink-tertiary mb-2">
        {changes.length} change{changes.length === 1 ? "" : "s"}
      </h3>
      <ul className="flex flex-col divide-y divide-border rounded-md border border-border-soft">
        {changes.map((c, i) => (
          <li key={i} className="px-3 py-2 text-sm text-ink">
            {c}
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function HistorySection({ editor, open, onToggle, onReset, onRestored }: { editor: Editor; open: boolean; onToggle: () => void; onReset: () => void; onRestored: (msg: string) => void }) {
  const doc = editor.doc!;
  const download = () => {
    const blob = new Blob([JSON.stringify(doc.draft, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `site-${doc.draft.collection}-${doc.draft.template}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <Disclosure title="History" open={open} onToggle={onToggle} aside={doc.versions.length ? `${doc.versions.length} published` : undefined}>
      {doc.versions.length ? (
        <ol className="flex flex-col divide-y divide-border rounded-md border border-border-soft">
          {doc.versions.map((v, i) => (
            <li key={v.id} className="px-2.5 py-2 flex flex-col gap-1">
              <span className="flex items-center gap-2 text-sm">
                <History size={13} aria-hidden className="text-ink-muted" />
                <time className="text-ink tabular-nums" dateTime={new Date(v.at).toISOString()}>
                  {new Date(v.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </time>
                {i === 0 ? <span className="text-[0.6875rem] text-success">live</span> : null}
                {i > 0 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ms-auto"
                    onClick={() => {
                      editor.dispatch({ type: "restore", versionId: v.id });
                      onRestored("That version is now your draft. Publish to make it live.");
                    }}
                  >
                    Restore
                  </Button>
                ) : null}
              </span>
              <span className="text-[0.6875rem] text-ink-tertiary line-clamp-2">{v.changes.join(" · ")}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-xs text-ink-tertiary">Each publish is kept here, and any of them can be restored.</p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        {doc.published && diff(doc.published, doc.draft).length ? (
          <Button size="sm" variant="ghost" onClick={() => editor.dispatch({ type: "discard" })}>
            Discard unpublished changes
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" onClick={download}>
          Download site file
        </Button>
        <Button size="sm" variant="danger" onClick={onReset}>
          Start a new site…
        </Button>
      </div>
    </Disclosure>
  );
}

/** Phones get the short labels. */
function useNarrow() {
  const q = "(max-width: 639px)";
  const [n, setN] = useState(() => matchMedia(q).matches);
  useEffect(() => {
    const m = matchMedia(q);
    const on = () => setN(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return n;
}

/** Above both panes while another site type is previewed: what it is, what
 * would be lost, and the only two ways out. */
function TrialBar({ type, removed, onCancel, onApply, className = "" }: { type: TemplateId; removed: Removed[]; onCancel: () => void; onApply: () => void; className?: string }) {
  const n = removed.length;
  // "Inicio: Search box, List of records ×2; Registro: How to cite"
  const byPage = new Map<string, Map<string, number>>();
  for (const r of removed) {
    const m = byPage.get(r.page) ?? new Map<string, number>();
    m.set(r.block, (m.get(r.block) ?? 0) + 1);
    byPage.set(r.page, m);
  }
  const list = [...byPage].map(([page, m]) => `${page}: ${[...m].map(([b, k]) => (k > 1 ? `${b} ×${k}` : b)).join(", ")}`).join("; ");
  return (
    <div role="region" aria-label="Site type preview" className={`shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 px-3 sm:px-4 py-2 bg-selected border-b border-border ${className}`}>
      <p className="min-w-0 flex-1 basis-64 text-sm text-ink" aria-live="polite">
        Previewing <b className="font-medium">{siteType(type).label}</b>
        <span className="text-ink-secondary">
          {" · "}
          {n ? `${n === 1 ? "1 block" : `${n} blocks`} will be removed. ${list}.` : "Nothing you made is removed."}
        </span>
      </p>
      <span className="ms-auto flex items-center gap-1.5">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onApply}>
          Use {siteType(type).label}
        </Button>
      </span>
    </div>
  );
}
