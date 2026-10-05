/* Direction A — "Quick wins": today's per-language HTML / CSS / JS editor, made
 * fast. What changes against Uwazi now (dev/results/uwazi-pages-research.md):
 *  - the public page renders live beside the code (no Save & Preview tab dance);
 *  - a component palette inserts each component in the syntax it takes;
 *  - new pages start from a template;
 *  - a language can start as a copy of another;
 *  - Save keeps a draft; only Publish changes the public site. */
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Blocks, Copy } from "lucide-react";
import { SettingsContent } from "../../SettingsContent";
import { SettingsButton } from "../../SettingsButton";
import { SettingsField, TextInput } from "../../SettingsField";
import { SegmentedControl } from "../../../shared/SegmentedControl";
import { Modal } from "../../../shared/Modal";
import { PublicPreview } from "../../../site/PublicPreview";
import { useSiteData } from "../../../site/useSiteData";
import { codeDocsAtom } from "../../../../atoms/sitePages";
import { useSettingsNotify } from "../../../../hooks/useSettingsNotify";
import { ConfirmDialog } from "../../../shared/ConfirmDialog";
import { breakpointAtom } from "../../../../atoms/viewport";
import {
  PALETTE,
  SITE_LANGS,
  emptyLocale,
  isRtl,
  type CodeDoc,
  type CodeLocales,
  type PaletteEntry,
  type SiteLang,
} from "../../../../data/sitePages";
import { CopyFromLanguageModal, LangSwitch, StatusLine, publishState } from "./shared";
import { useRegisterDirtyForm } from "../../../../hooks/useDirtyGuard";

type Tab = "html" | "css" | "js";
const LANG_NAME: Record<SiteLang, string> = { en: "English", es: "Spanish", fr: "French", ar: "Arabic" };
const TAB_LABEL: Record<Tab, string> = { html: "HTML", css: "CSS", js: "JavaScript" };

const sameLocales = (a: CodeLocales | null, b: CodeLocales | null) => JSON.stringify(a) === JSON.stringify(b);

export function CodePageEditor({
  pageId,
  slug: initialSlug,
  seed,
  onClose,
}: {
  pageId: string;
  slug: string;
  /** Builds the page's first documents when the session has none yet. */
  seed: () => CodeDoc;
  onClose: () => void;
}) {
  const [docs, setDocs] = useAtom(codeDocsAtom);
  const doc = useMemo(() => docs[pageId] ?? seed(), [docs, pageId, seed]);
  const { record } = useSettingsNotify();
  const [askDiscard, setAskDiscard] = useState(false);
  const mobile = useAtomValue(breakpointAtom) === "mobile";
  const site = useSiteData();

  const [draft, setDraft] = useState<CodeLocales>(doc.draft);
  const [slug, setSlug] = useState(initialSlug);
  const [lang, setLang] = useState<SiteLang>("en");
  const [tab, setTab] = useState<Tab>("html");
  const [pane, setPane] = useState<"code" | "preview">("code");
  const [showing, setShowing] = useState<"draft" | "published">("draft");
  const [palette, setPalette] = useState(false);
  const [copying, setCopying] = useState(false);
  const code = useRef<HTMLTextAreaElement>(null);
  const gutter = useRef<HTMLDivElement>(null);

  const saved = docs[pageId]?.draft ?? doc.draft;
  const unsaved = !sameLocales(draft, saved);
  // The saved draft lives in `codeDocsAtom`, so this clears on Save; the guard
  // asks before the back arrow, the rail or a reload drops an unsaved draft.
  useRegisterDirtyForm(`settings:code-page:${pageId}`, "Page edits", unsaved);
  const state = publishState(!!doc.published, !sameLocales(draft, doc.published));
  const filled = (l: SiteLang) => !!(draft[l].html.trim() || draft[l].title.trim());
  const loc = draft[lang];

  const setField = (field: keyof typeof loc, value: string) =>
    setDraft((d) => ({ ...d, [lang]: { ...d[lang], [field]: value } }));

  const commit = (publish: boolean) => {
    setDocs((all) => ({ ...all, [pageId]: { draft, published: publish ? draft : (all[pageId] ?? doc).published } }));
    record({
      method: "UPDATE",
      domain: "page",
      noun: "page",
      id: pageId,
      name: draft.en.title || "Page",
      message: publish ? `${draft.en.title || "Page"} published` : "Draft saved — the public page is unchanged",
    });
  };

  const insert = (entry: PaletteEntry) => {
    setPalette(false);
    const el = code.current;
    const text = draft[lang].html;
    const at = tab === "html" && el ? el.selectionStart : text.length;
    const before = text.slice(0, at);
    const pad = before && !before.endsWith("\n") ? "\n" : "";
    setDraft((d) => ({ ...d, [lang]: { ...d[lang], html: `${before}${pad}${entry.snippet}\n${text.slice(at)}` } }));
    setTab("html");
    setPane("code");
    requestAnimationFrame(() => {
      const t = code.current;
      if (!t) return;
      const caret = at + pad.length + entry.snippet.length;
      t.focus();
      t.setSelectionRange(caret, caret);
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Tab indents instead of leaving the editor; Escape still leaves it.
    if (e.key !== "Tab" || e.shiftKey) return;
    e.preventDefault();
    const t = e.currentTarget;
    const { selectionStart: s, selectionEnd: en, value } = t;
    const next = `${value.slice(0, s)}  ${value.slice(en)}`;
    setField(tab, next);
    requestAnimationFrame(() => t.setSelectionRange(s + 2, s + 2));
  };

  const previewCtx = useMemo(
    () => ({ entities: site.entities, viewEntity: site.entities.find((e) => e.typeId === site.mainTemplate) }),
    [site.entities, site.mainTemplate],
  );
  const value = loc[tab];
  const lines = value.split("\n").length;
  const shownLocale = showing === "published" && doc.published ? doc.published[lang] : loc;
  const chrome = {
    name: site.siteName,
    logoText: "",
    accent: "#1A1A1A",
    headingFont: "serif" as const,
    nav: ["Home", "Library", shownLocale.title || "This page"],
    lang,
    rtl: isRtl(lang),
    banner: showing === "published" ? "Published version — what visitors see now" : "Draft — only you see this",
  };

  const codePane = (
    <div data-part="code" className="flex flex-col min-h-0 min-w-0 h-full">
      <div className="flex items-center gap-2 h-10 shrink-0">
        <div role="tablist" aria-label="Code" className="inline-flex rounded-md border border-border overflow-hidden">
          {(Object.keys(TAB_LABEL) as Tab[]).map((t, i) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`h-7 px-3 text-xs font-medium transition-colors cursor-pointer ${i ? "border-s border-border" : ""} ${
                tab === t ? "bg-vellum text-ink" : "bg-paper text-ink-tertiary hover:text-ink-secondary"
              }`}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
        <span className="flex-1" />
        <SettingsButton size="sm" variant="secondary" icon={<Blocks size={13} />} onClick={() => setPalette(true)}>
          Insert component
        </SettingsButton>
      </div>
      <p className={`text-meta text-ink-tertiary h-5 shrink-0 ${tab === "js" ? "" : "invisible"}`}>
        Runs on the public page. The preview runs it sandboxed, so an error shows here first.
      </p>
      <div className="relative flex flex-1 min-h-0 rounded-md border border-border bg-warm overflow-hidden focus-within:ring-2 focus-within:ring-carbon/20">
        <div
          ref={gutter}
          aria-hidden
          className="shrink-0 w-10 py-3 pe-2 text-end font-mono text-[12px] leading-5 text-ink-muted select-none overflow-hidden border-e border-border bg-paper"
        >
          {Array.from({ length: lines }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={code}
          aria-label={`${TAB_LABEL[tab]} · ${SITE_LANGS.find((l) => l.key === lang)!.label}`}
          value={value}
          onChange={(e) => setField(tab, e.target.value)}
          onKeyDown={onKeyDown}
          onScroll={(e) => {
            if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
          }}
          spellCheck={false}
          wrap="off"
          dir="ltr"
          className="flex-1 min-w-0 py-3 px-3 font-mono text-[12px] leading-5 text-ink bg-transparent resize-none outline-none whitespace-pre"
          placeholder={tab === "html" ? "Page HTML — insert a component to start" : tab === "css" ? "CSS for this page" : "JavaScript for this page"}
        />
      </div>
    </div>
  );

  const previewPane = (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex items-center gap-2 h-6 mb-1 shrink-0">
        <SegmentedControl
          size="sm"
          ariaLabel="Version"
          value={showing}
          onChange={(v) => setShowing(v as "draft" | "published")}
          options={[
            { id: "draft", label: "Draft" },
            { id: "published", label: doc.published ? "Published" : "Published · none" },
          ]}
        />
      </div>
      <PublicPreview
        className="flex-1"
        html={
          showing === "published" && !doc.published
            ? `<p class="u-empty">This page has never been published.</p>`
            : shownLocale.html.trim()
              ? shownLocale.html
              : `<p class="u-empty">No ${LANG_NAME[lang]} version yet. Copy one from another language, or insert a component to start.</p>`
        }
        css={shownLocale.css}
        js={shownLocale.js}
        chrome={chrome}
        ctx={previewCtx}
        path={`/${lang}/page/${slug || "…"}`}
        loading={site.loading}
      />
    </div>
  );

  return (
    <SettingsContent component="CodePageEditor">
      <SettingsContent.Header path={["Pages"]} title={draft.en.title || "Untitled page"} onBack={onClose} />
      <SettingsContent.Body className="flex flex-col gap-3 min-h-0 overflow-hidden">
        <section className="flex flex-wrap items-end gap-3 shrink-0">
          <div className="w-full sm:w-auto sm:flex-1 sm:min-w-[14rem]">
            <SettingsField label={`Title · ${lang.toUpperCase()}`}>
              <TextInput value={loc.title} onChange={(e) => setField("title", e.target.value)} dir="auto" placeholder="Page title" />
            </SettingsField>
          </div>
          <div className="w-full sm:w-[12rem]">
            <SettingsField label="URL">
              <TextInput value={slug} onChange={(e) => setSlug(e.target.value)} dir="ltr" placeholder="about" />
            </SettingsField>
          </div>
          <div className="flex items-center gap-2 pb-0.5">
            <LangSwitch value={lang} onChange={setLang} filled={filled} />
            <SettingsButton size="sm" variant="ghost" icon={<Copy size={13} />} onClick={() => setCopying(true)}>
              Copy from…
            </SettingsButton>
          </div>
        </section>

        {mobile && (
          <div className="shrink-0">
            <SegmentedControl
              ariaLabel="Show"
              value={pane}
              onChange={(v) => setPane(v as "code" | "preview")}
              options={[
                { id: "code", label: "Code" },
                { id: "preview", label: "Preview" },
              ]}
            />
          </div>
        )}
        <div className={`flex-1 min-h-0 ${mobile ? "" : "grid grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-4"}`}>
          {(!mobile || pane === "code") && codePane}
          {(!mobile || pane === "preview") && previewPane}
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <div className="me-auto min-w-0">
          <StatusLine state={state} unsaved={unsaved} />
        </div>
        <SettingsButton variant="ghost" size="sm" disabled={!unsaved} onClick={() => setAskDiscard(true)}>
          Discard
        </SettingsButton>
        <SettingsButton variant="secondary" size="sm" className="whitespace-nowrap" disabled={!unsaved} onClick={() => commit(false)}>
          Save draft
        </SettingsButton>
        <SettingsButton variant="commit" size="sm" disabled={state === "published" && !unsaved} onClick={() => commit(true)}>
          Publish
        </SettingsButton>
      </SettingsContent.Footer>
      <ConfirmDialog
        open={askDiscard}
        title="Discard changes"
        message="Discard your unsaved changes to this page? The last saved draft comes back."
        confirmLabel="Discard"
        variant="danger"
        onConfirm={() => {
          setDraft(saved);
          setAskDiscard(false);
        }}
        onCancel={() => setAskDiscard(false)}
      />

      {palette && <PaletteModal onInsert={insert} onClose={() => setPalette(false)} />}
      {copying && (
        <CopyFromLanguageModal
          target={lang}
          filled={filled}
          onClose={() => setCopying(false)}
          onCopy={(from) => {
            setDraft((d) => ({ ...d, [lang]: { ...d[from] } }));
            setCopying(false);
          }}
        />
      )}
    </SettingsContent>
  );
}

/** Every page component, grouped, each marked with the syntax it takes. */
function PaletteModal({ onInsert, onClose }: { onInsert: (e: PaletteEntry) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const hit = PALETTE.filter((p) => !needle || p.name.toLowerCase().includes(needle) || p.hint.toLowerCase().includes(needle));
    const by = new Map<string, PaletteEntry[]>();
    for (const p of hit) by.set(p.group, [...(by.get(p.group) ?? []), p]);
    return [...by.entries()];
  }, [q]);
  return (
    <Modal
      onClose={onClose}
      title="Insert component"
      subtitle="Inserted at the cursor, in the syntax the component takes."
      size="lg"
      height="md:h-[min(36rem,100%)]"
      component="ComponentPaletteModal"
    >
      <input
        autoFocus
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Find a component"
        aria-label="Find a component"
        className="w-full mb-3 px-3 py-2 text-sm text-ink bg-warm border border-border rounded-md placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20"
      />
      <div className="flex items-center gap-3 mb-3 text-meta text-ink-tertiary">
        <span className="inline-flex items-center gap-1.5"><SyntaxBadge syntax="jsx" /> HTML-style tag</span>
        <span className="inline-flex items-center gap-1.5"><SyntaxBadge syntax="ext" /> {"{name}(options)"} extension</span>
      </div>
      {groups.map(([group, items]) => (
        <section key={group} className="mb-3">
          <h3 className="text-meta font-semibold uppercase tracking-wide text-ink-tertiary mb-1">{group}</h3>
          <ul className="flex flex-col">
            {items.map((p) => (
              <li key={p.name}>
                <button
                  type="button"
                  onClick={() => onInsert(p)}
                  className="w-full flex items-center gap-3 px-2 py-1.5 rounded-md text-start hover:bg-parchment transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
                >
                  <span className="w-28 shrink-0 text-sm font-medium text-ink">{p.name}</span>
                  <SyntaxBadge syntax={p.syntax} />
                  <span className="min-w-0 flex-1 truncate text-xs text-ink-tertiary">
                    {p.hint}
                    {p.entityPage ? " · entity pages only" : ""}
                  </span>
                  <code dir="ltr" className="hidden lg:block max-w-[14rem] truncate text-meta font-mono text-ink-secondary">{p.snippet.split("\n")[0]}</code>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!groups.length && <p className="text-sm text-ink-tertiary">No component matches “{q}”.</p>}
    </Modal>
  );
}

export function SyntaxBadge({ syntax }: { syntax: "jsx" | "ext" }) {
  return (
    <span
      className={`shrink-0 text-meta font-mono px-1.5 py-px rounded w-fit ${syntax === "jsx" ? "bg-carbon-tint text-ink" : "bg-warning-light text-ink"}`}
      title={syntax === "jsx" ? "HTML-style tag: <Name … />" : "Markdown extension: {name}(options)"}
    >
      {syntax === "jsx" ? "<Tag/>" : "{x}()"}
    </span>
  );
}

export { emptyLocale };
