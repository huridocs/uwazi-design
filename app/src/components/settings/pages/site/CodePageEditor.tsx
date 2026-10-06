/* Settings › Pages editor, 1:1 with Uwazi's page editor (Configuration, HTML,
 * Javascript and CSS tabs; one Save for every language; Publish release and
 * Restore previous version), with what the prototype adds:
 *  - the page renders beside the code, draft or published (no Save & Preview
 *    tab), with the collection's Global CSS and the page's CSS inside the
 *    preview frame only; JavaScript is stored and never run;
 *  - a component palette inserts each component in the syntax it takes;
 *  - new pages start from a site type;
 *  - a language can start as a copy of another. */
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Blocks, Check, Copy, ExternalLink, Info, AlertTriangle } from "lucide-react";
import { SettingsContent } from "../../SettingsContent";
import { SettingsButton } from "../../SettingsButton";
import { SettingsField, TextInput } from "../../SettingsField";
import { SegmentedControl } from "../../../shared/SegmentedControl";
import { Select } from "../../../shared/Select";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_COMMIT_DISABLED } from "../../../shared/Modal";
import { ModalField, MODAL_TEXTAREA } from "../../../shared/ModalParts";
import { ConfirmDialog } from "../../../shared/ConfirmDialog";
import { LastSavedLine } from "../../../shared/LastSavedLine";
import { DrawerTabs } from "../../../layout/DrawerTabs";
import { breakpointAtom } from "../../../../atoms/viewport";
import { languagesAtom, defaultLanguageAtom } from "../../../../atoms/languages";
import {
  localesFor,
  pagesStore,
  pageStatus,
  pageTitle,
  sitePagesAtom,
  slugify,
  type PageRelease,
} from "../../../../atoms/sitePages";
import { newSettingsId } from "../../../../atoms/settingsCollection";
import { consumeFailureAtom } from "../../../../atoms/devSwitches";
import { useSettingsNotify } from "../../../../hooks/useSettingsNotify";
import { useSettingsDraft } from "../../../../hooks/useSettingsDraft";
import { useDirtyGuard } from "../../../../hooks/useDirtyGuard";
import { PALETTE, emptyLocale, type CodeLocale, type CodeLocales, type PaletteEntry } from "../../../../data/sitePages";
import { CopyFromLanguageModal, StatusLine } from "./shared";
import { PagePreview } from "./PagePreview";
import { PageViewModal } from "./PageViewModal";

type Tab = "config" | "html" | "js" | "css";
type Code = Exclude<Tab, "config">;
const TAB_LABEL: Record<Tab, string> = { config: "Configuration", html: "HTML", js: "Javascript", css: "CSS" };
const REQUIRED = "This field is required";
const RTL = new Set(["ar", "he", "fa", "ur"]);

/** The editor for one page. `pageId` null is a new page: nothing exists in
 *  the store until its first Save, which calls `onCreated` with the new id. */
export function CodePageEditor({
  pageId,
  starter,
  onClose,
  onCreated,
}: {
  pageId: string | null;
  /** A new page's first documents, from the picked site type. */
  starter?: CodeLocales;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const page = useAtomValue(sitePagesAtom).find((p) => p.id === pageId) ?? null;
  const languages = useAtomValue(languagesAtom);
  const defaultKey = useAtomValue(defaultLanguageAtom)?.key ?? "en";
  const keys = useMemo(() => languages.map((l) => l.key), [languages]);
  const create = useSetAtom(pagesStore.createAtom);
  const patch = useSetAtom(pagesStore.patchAtom);
  const { record, fail } = useSettingsNotify();
  const consumeFailure = useSetAtom(consumeFailureAtom);
  /** A store write that throws (storage full, or the Dev panel's "Fail next
   *  request") is reported once and leaves the editor as it was: still dirty,
   *  nothing marked saved. */
  const attempt = (write: () => void): boolean => {
    try {
      const injected = consumeFailure("save");
      if (injected) throw new Error(injected);
      write();
      return true;
    } catch (e) {
      fail("An error occurred", e instanceof Error ? e.message : String(e));
      return false;
    }
  };
  const guard = useDirtyGuard();
  const mobile = useAtomValue(breakpointAtom) === "mobile";

  const stored = localesFor(page?.doc.draft ?? starter ?? {}, keys, defaultKey);
  const { draft, setDraft, dirty, markSaved } = useSettingsDraft<CodeLocales>({
    id: `page:${pageId ?? "new"}`,
    label: "Page edits",
    saved: stored,
  });
  // Languages installed or removed while the editor is open.
  const locales = localesFor(draft, keys, defaultKey);
  const isNew = !page;

  const [lang, setLang] = useState(defaultKey);
  const active = keys.includes(lang) ? lang : defaultKey;
  const loc = locales[active] ?? emptyLocale();
  const [tab, setTab] = useState<Tab>("config");
  const [pane, setPane] = useState<"code" | "preview">("code");
  const [showing, setShowing] = useState<"draft" | "published">("draft");
  const [titleError, setTitleError] = useState(false);
  const [palette, setPalette] = useState(false);
  const [copying, setCopying] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [copied, setCopied] = useState(false);
  const code = useRef<HTMLTextAreaElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const escaped = useRef(false);

  const languageLabel = (k: string) => languages.find((l) => l.key === k)?.localizedLabel ?? k.toUpperCase();
  const filled = (k: string) => !!(locales[k]?.html.trim() || locales[k]?.title.trim());
  const setField = (field: keyof CodeLocale, value: string) => {
    if (field === "title" && value.trim()) setTitleError(false);
    setDraft((d) => {
      const all = localesFor(d, keys, defaultKey);
      return { ...all, [active]: { ...all[active], [field]: value } };
    });
  };

  const savedTitle = page ? pageTitle(page, defaultKey) : "New page";
  const status = page ? pageStatus(page.doc) : "draft";
  const slug = slugify(loc.title);
  const url = page ? `/${active}/page/${page.id}/${slug}` : "";

  /** Write every language's draft. Returns the page id, or null when a title
   *  is missing (the first empty language is opened and its field marked). */
  const save = ({ notify = true }: { notify?: boolean } = {}): string | null => {
    const value = localesFor(draft, keys, defaultKey);
    const empty = keys.find((k) => !value[k]?.title.trim());
    if (empty) {
      setLang(empty);
      setTab("config");
      setTitleError(true);
      requestAnimationFrame(() => document.getElementById("page-title")?.focus());
      return null;
    }
    const title = value[defaultKey]?.title.trim() || "Untitled page";
    const nextSlug = slugify(title);
    let id = page?.id ?? null;
    if (!page) {
      if (!attempt(() => (id = create({ value: { slug: nextSlug, doc: { draft: value, published: null }, releases: [] } }))) || !id)
        return null;
      record({ method: "CREATE", domain: "page", noun: "page", id, name: title, message: "Saved successfully." });
      onCreated(id);
    } else {
      if (!attempt(() => patch({ id: page.id, patch: { slug: nextSlug, doc: { ...page.doc, draft: value } } }))) return null;
      if (notify) record({ method: "UPDATE", domain: "page", noun: "page", id: page.id, name: title, message: "Saved successfully." });
    }
    markSaved(value);
    return id;
  };

  const publish = (message: string) => {
    if (!page) return;
    const value = localesFor(draft, keys, defaultKey);
    // Unsaved edits in every language are saved first, as in Uwazi.
    if (dirty && save({ notify: false }) === null) return;
    const release: PageRelease = { id: newSettingsId("rel"), message: message.trim(), at: Date.now(), locales: value };
    const ok = attempt(() =>
      patch({
        id: page.id,
        patch: { doc: { draft: value, published: value }, releases: [...page.releases, release], slug: slugify(value[defaultKey]?.title ?? "") },
      }),
    );
    if (!ok) return;
    const title = value[defaultKey]?.title.trim() || savedTitle;
    record({
      method: "UPDATE",
      domain: "page",
      noun: "page",
      id: page.id,
      name: title,
      summary: `Published page release “${title}”`,
      message: "Page published successfully.",
      detail: release.message,
    });
    setPublishing(false);
  };

  const restore = (release: PageRelease) => {
    if (!page) return;
    const value = localesFor(release.locales, keys, defaultKey);
    if (!attempt(() => patch({ id: page.id, patch: { doc: { ...page.doc, draft: value } } }))) return;
    markSaved(value);
    const title = value[defaultKey]?.title.trim() || savedTitle;
    record({
      method: "UPDATE",
      domain: "page",
      noun: "page",
      id: page.id,
      name: title,
      summary: `Restored page draft from release “${title}”`,
      message: "Draft restored from release.",
    });
    setRestoring(false);
  };

  const insert = (entry: PaletteEntry) => {
    setPalette(false);
    setTab("html");
    const el = code.current;
    const text = loc.html;
    const at = el ? el.selectionStart : text.length;
    const before = text.slice(0, at);
    const pad = before && !before.endsWith("\n") ? "\n" : "";
    setField("html", `${before}${pad}${entry.snippet}\n${text.slice(at)}`);
    requestAnimationFrame(() => {
      const t = code.current;
      if (!t) return;
      const caret = at + pad.length + entry.snippet.length;
      t.focus();
      t.setSelectionRange(caret, caret);
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>, field: Code) => {
    // Tab indents two spaces; Escape, then Tab, leaves the editor.
    if (e.key === "Escape") {
      escaped.current = true;
      return;
    }
    if (e.key !== "Tab" || e.shiftKey || escaped.current) {
      escaped.current = false;
      return;
    }
    e.preventDefault();
    const t = e.currentTarget;
    const { selectionStart: s, selectionEnd: en, value } = t;
    setField(field, `${value.slice(0, s)}  ${value.slice(en)}`);
    requestAnimationFrame(() => t.setSelectionRange(s + 2, s + 2));
  };

  const copyUrl = () => {
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  };

  const codeArea = (field: Code) => {
    const value = loc[field];
    const lines = value.split("\n").length;
    return (
      <div className="relative flex flex-1 min-h-[16rem] rounded-md border border-border bg-warm overflow-hidden focus-within:ring-2 focus-within:ring-carbon/20">
        <div
          ref={gutter}
          aria-hidden
          className="shrink-0 py-3 ps-3 pe-2 text-end font-mono text-sm leading-6 text-ink-tertiary select-none overflow-hidden border-e border-border bg-paper tabular-nums"
        >
          {Array.from({ length: lines }, (_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={code}
          aria-label={`${TAB_LABEL[field]} · ${languageLabel(active)}`}
          value={value}
          onChange={(e) => setField(field, e.target.value)}
          onKeyDown={(e) => onKeyDown(e, field)}
          onScroll={(e) => {
            if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
          }}
          spellCheck={false}
          wrap="off"
          dir="ltr"
          className="flex-1 min-w-0 py-3 px-3 font-mono text-sm leading-6 text-ink bg-transparent resize-none outline-none whitespace-pre"
        />
      </div>
    );
  };

  const configTab = (
    <div className="flex flex-col gap-4 max-w-[40rem]">
      <SettingsField label="Title" issue={titleError && !loc.title.trim() ? { severity: "error", message: REQUIRED } : null}>
        <TextInput
          id="page-title"
          value={loc.title}
          dir="auto"
          issue={titleError && !loc.title.trim() ? { severity: "error", message: REQUIRED } : null}
          onChange={(e) => setField("title", e.target.value)}
        />
      </SettingsField>
      {page && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="page-url" className="text-xs font-medium text-ink-secondary">
            URL
          </label>
          <div className="flex items-center gap-2">
            <TextInput id="page-url" value={url} readOnly dir="ltr" className="font-mono text-xs" />
            <SettingsButton
              size="sm"
              variant="secondary"
              aria-label="Copy URL"
              icon={copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
              onClick={copyUrl}
            >
              <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
            </SettingsButton>
          </div>
          <button
            type="button"
            onClick={() => setViewing(true)}
            className="inline-flex items-center gap-1 w-fit text-xs text-ink-secondary underline underline-offset-2 hover:text-ink cursor-pointer"
          >
            View page <ExternalLink size={12} aria-hidden />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <SettingsButton size="sm" variant="secondary" disabled={isNew} onClick={() => setRestoring(true)}>
          Restore
        </SettingsButton>
        <SettingsButton size="sm" variant="commit" disabled={isNew} onClick={() => setPublishing(true)}>
          Publish
        </SettingsButton>
        {isNew && <span className="text-xs text-ink-tertiary">Save the page first to publish or restore it.</span>}
      </div>
    </div>
  );

  const codeTab = (field: Code) => (
    <div className="flex flex-col gap-2 min-h-0 flex-1">
      {field === "html" && (
        <>
          <Band tone="info">
            This page uses HTML only (Markdown is not processed). You can embed maps, charts, entity lists, and other
            components.{" "}
            <button type="button" onClick={() => setPalette(true)} className="underline underline-offset-2 cursor-pointer">
              Learn more about the components.
            </button>
          </Band>
          <div className="flex items-center gap-2">
            <SettingsButton size="sm" variant="secondary" icon={<Blocks size={13} aria-hidden />} onClick={() => setPalette(true)}>
              Insert component
            </SettingsButton>
            {keys.length > 1 && (
              <SettingsButton size="sm" variant="ghost" icon={<Copy size={13} aria-hidden />} onClick={() => setCopying(true)}>
                Copy from…
              </SettingsButton>
            )}
          </div>
        </>
      )}
      {field === "js" && (
        <Band tone="warning">
          <span className="block font-semibold">With great power comes great responsibility!</span>
          <span className="block">
            This area allows you to append custom Javascript to the page. This opens up a new universe of possibilities.
          </span>
          <span className="block">
            It could also very easily break the app. Only write code here if you know exactly what you are doing.
          </span>
        </Band>
      )}
      {codeArea(field)}
    </div>
  );

  const shownLocale = showing === "published" ? (page?.doc.published ? localesFor(page.doc.published, keys, defaultKey)[active] : null) : loc;
  const previewPane = (
    <div className="flex flex-col min-h-[24rem] h-full">
      <div className="flex items-center gap-2 h-7 shrink-0">
        <SegmentedControl
          size="sm"
          ariaLabel="Version"
          value={showing}
          onChange={(v) => setShowing(v as "draft" | "published")}
          options={[
            { id: "draft", label: "Draft" },
            { id: "published", label: "Published" },
          ]}
        />
      </div>
      <PagePreview
        className="flex-1"
        locale={shownLocale}
        empty={
          showing === "published" && !page?.doc.published
            ? "Not published yet. Publish the page to make it public."
            : `No ${languageLabel(active)} content yet.`
        }
        lang={active}
        rtl={RTL.has(active)}
        path={page ? `/${active}/page/${page.id}/${slug}` : `/${active}/page/…`}
        banner={showing === "published" ? "Published version — what visitors see now" : "Draft — only you see this"}
      />
    </div>
  );

  const body = tab === "config" ? configTab : codeTab(tab);

  return (
    <SettingsContent component="CodePageEditor">
      <SettingsContent.Header path={["Pages"]} title={savedTitle} onBack={onClose} />
      <SettingsContent.Body className="flex flex-col gap-3 min-h-0">
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex-1 min-w-0">
            <DrawerTabs
              className=""
              activeId={tab}
              onChange={(v) => setTab(v as Tab)}
              tabs={(Object.keys(TAB_LABEL) as Tab[]).map((id) => ({ id, label: TAB_LABEL[id] }))}
            />
          </div>
          {keys.length > 1 && (
            <div className="ms-auto shrink-0">
              <Select
                ariaLabel="Page language"
                value={active}
                onChange={setLang}
                align="end"
                options={[...languages]
                  .sort((a, b) => a.localizedLabel.localeCompare(b.localizedLabel))
                  .map((l) => ({ value: l.key, label: l.localizedLabel, hint: filled(l.key) ? undefined : "empty" }))}
              />
            </div>
          )}
        </div>
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
        <div className={`flex-1 min-h-0 ${mobile ? "flex flex-col" : "grid grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4"}`}>
          {(!mobile || pane === "code") && <div className="flex flex-col min-h-0 min-w-0">{body}</div>}
          {(!mobile || pane === "preview") && previewPane}
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <div className="me-auto min-w-0 flex items-center gap-2">
          <StatusLine state={status} unsaved={dirty} />
          <LastSavedLine domain="page" id={page?.id} className="hidden sm:inline" />
        </div>
        <SettingsButton variant="ghost" size="sm" onClick={() => guard(onClose)}>
          Cancel
        </SettingsButton>
        <SettingsButton variant="commit" size="sm" disabled={!dirty && !isNew} onClick={() => save()}>
          Save
        </SettingsButton>
      </SettingsContent.Footer>

      {palette && <PaletteModal onInsert={insert} onClose={() => setPalette(false)} />}
      {copying && (
        <CopyFromLanguageModal
          target={active}
          languages={languages.map((l) => ({ key: l.key, label: l.localizedLabel }))}
          filled={filled}
          onClose={() => setCopying(false)}
          onCopy={(from) => {
            setDraft((d) => {
              const all = localesFor(d, keys, defaultKey);
              return { ...all, [active]: { ...all[from] } };
            });
            setCopying(false);
          }}
        />
      )}
      {publishing && <PublishModal onPublish={publish} onClose={() => setPublishing(false)} />}
      {restoring && page && <RestoreModal releases={page.releases} onRestore={restore} onClose={() => setRestoring(false)} />}
      {viewing && page && <PageViewModal page={page} onClose={() => setViewing(false)} />}
    </SettingsContent>
  );
}

function Band({ tone, children }: { tone: "info" | "warning"; children: React.ReactNode }) {
  const Icon = tone === "info" ? Info : AlertTriangle;
  return (
    <div
      data-part="banner"
      className={`flex items-start gap-2.5 px-3 py-2.5 rounded-md text-xs ${tone === "info" ? "bg-carbon-tint text-ink-secondary" : "bg-warning-light text-ink"}`}
    >
      <Icon size={14} aria-hidden className={`shrink-0 mt-0.5 ${tone === "info" ? "text-ink-tertiary" : "text-warning"}`} />
      <div className="min-w-0 flex flex-col gap-1">{children}</div>
    </div>
  );
}

/** Uwazi's "Publish release": a message, then Publish saves every language's
 *  edits and freezes them as a release. */
function PublishModal({ onPublish, onClose }: { onPublish: (message: string) => void; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const ready = !!message.trim();
  return (
    <Modal
      onClose={onClose}
      title="Publish release"
      size="md"
      component="PublishReleaseModal"
      footer={
        <>
          <button type="button" className={`${MODAL_BUTTON} text-ink-secondary hover:bg-warm cursor-pointer`} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!ready}
            className={ready ? MODAL_COMMIT : MODAL_COMMIT_DISABLED}
            onClick={() => ready && onPublish(message)}
          >
            Publish
          </button>
        </>
      }
    >
      <ModalField label="Release message" htmlFor="release-message">
        <textarea
          id="release-message"
          autoFocus
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${MODAL_TEXTAREA} w-full`}
        />
      </ModalField>
    </Modal>
  );
}

const shortMessage = (m: string) => (m.trim() ? (m.length > 48 ? `${m.slice(0, 48)}…` : m) : "-");

/** Uwazi's "Restore previous version": pick one release, then confirm, since
 *  restoring overwrites the draft of every language, not only the one shown. */
function RestoreModal({
  releases,
  onRestore,
  onClose,
}: {
  releases: PageRelease[];
  onRestore: (r: PageRelease) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const newestFirst = [...releases].sort((a, b) => b.at - a.at);
  const release = releases.find((r) => r.id === picked) ?? null;
  return (
    <>
      <Modal
        onClose={onClose}
        title="Restore previous version"
        size="md"
        component="RestoreReleaseModal"
        footer={
          <>
            <button type="button" className={`${MODAL_BUTTON} text-ink-secondary hover:bg-warm cursor-pointer`} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              disabled={!release}
              className={release ? MODAL_COMMIT : MODAL_COMMIT_DISABLED}
              onClick={() => release && setConfirming(true)}
            >
              Restore
            </button>
          </>
        }
      >
        {newestFirst.length === 0 ? (
          <p className="py-6 text-center text-xs text-ink-tertiary">No releases yet</p>
        ) : (
          <div role="radiogroup" aria-label="Releases" className="flex flex-col gap-1">
            {newestFirst.map((r) => (
              <label
                key={r.id}
                className={`flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer ${picked === r.id ? "bg-parchment" : "hover:bg-warm"}`}
              >
                <input type="radio" name="release" checked={picked === r.id} onChange={() => setPicked(r.id)} className="accent-ink" />
                <span className="flex-1 min-w-0 text-sm text-ink truncate">{shortMessage(r.message)}</span>
                <span className="shrink-0 text-xs text-ink-tertiary tabular-nums">{new Date(r.at).toLocaleDateString()}</span>
              </label>
            ))}
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={confirming && !!release}
        title="Restore this release?"
        message="The draft of every language (title, HTML, Javascript and CSS) is overwritten with this release, including edits not saved yet. The published page does not change."
        confirmLabel="Restore"
        onConfirm={() => release && onRestore(release)}
        onCancel={() => setConfirming(false)}
      />
    </>
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
          <h3 className="text-meta font-semibold uppercase tracking-wider text-ink-tertiary mb-1">{group}</h3>
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
