import { useEffect, useMemo, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { BookMarked, Check, ExternalLink, Pin, Trash2, X } from "lucide-react";
import {
  notebookAtom,
  notebookOpenAtom,
  clearNotebookAtom,
  renameNotebookAtom,
  setNotebookNotesAtom,
  unpinAtom,
  UNNAMED_NOTEBOOK,
} from "../../atoms/notebook";
import { dataSourceAtom } from "../../atoms/dataSource";
import { collectionSettings } from "../../atoms/settingsSingletons";
import { referencesAtom, referencesFor } from "../../atoms/references";
import { openEntityAtom } from "../../atoms/focusedEntity";
import { getEntity } from "../../data/entities";
import type { Stance } from "../../data/nepal/claimEvidence";
import {
  buildNotebookEntries,
  notebookCsv,
  citationsMarkdown,
  citationsText,
  stanceText,
  type NotebookEntry,
} from "../../utils/notebookCitations";
import { downloadCsv } from "../../utils/exportCsv";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { EntityTypeTag } from "../shared/EntityTypeTag";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { SegmentedControl } from "../shared/SegmentedControl";
import { BarDivider } from "../shared/BarDivider";
import { BAR_DANGER, BAR_GHOST, BAR_LEAD } from "../shared/warmButton";
import { MobileBottomSheet } from "../layout/MobileBottomSheet";
import { breakpointAtom } from "../../atoms/viewport";
import { MODAL_TEXTAREA } from "../shared/ModalParts";
import { Markdown } from "../../views/catalog/Markdown";

type Tab = "pinned" | "notes" | "citations";

/** The notebook: the records pinned in this collection, free notes, and the
 *  citation list they make. A slide-over from the navbar, over any view, so a
 *  record can be pinned in the entity view and read in the Library. */
export function NotebookPanel({ rtl = false }: { rtl?: boolean }) {
  const [open, setOpen] = useAtom(notebookOpenAtom);
  const trapRef = useFocusTrap<HTMLElement>(open);
  useEffect(() => {
    trapRef.current?.toggleAttribute("inert", !open);
  }, [open, trapRef]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !e.defaultPrevented && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const phone = useAtomValue(breakpointAtom) === "mobile";
  if (phone)
    // Phones: a sheet on the shared stack, as every nested view is there.
    return (
      <MobileBottomSheet open={open} onClose={() => setOpen(false)} bare ariaLabel="Notebook" defaultSnap="full">
        {(chrome) => (
          <div data-component="NotebookPanel" data-gutter-host className="gutter-host-main flex flex-col h-full min-h-0 bg-paper">
            {open && <NotebookBody onClose={chrome.close} />}
          </div>
        )}
      </MobileBottomSheet>
    );

  const side = rtl ? "left-0 border-r" : "right-0 border-l";
  const closedTransform = rtl ? "-translate-x-full" : "translate-x-full";

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        data-component="NotebookPanel"
        data-part="scrim"
        className={`fixed inset-0 z-[60] bg-ink/20 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        aria-hidden
      />
      <aside
        ref={trapRef as React.Ref<HTMLElement>}
        dir={rtl ? "rtl" : "ltr"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notebook-panel-title"
        data-component="NotebookPanel"
        data-part="panel"
        data-state={open ? "open" : "closed"}
        data-gutter-host
        className={`fixed top-0 bottom-0 ${side} z-[61] w-[26rem] max-w-[calc(100vw-2.5rem)]
          gutter-host-main bg-paper border-border flex flex-col
          transition-transform duration-250 ease-out motion-reduce:transition-none ${open ? "translate-x-0 shadow-xl" : closedTransform}`}
      >
        {/* Mounted only while open: the entries read every pinned record's
            references, which a closed panel has no reason to do. */}
        {open && <NotebookBody onClose={() => setOpen(false)} />}
      </aside>
    </>
  );
}

/** The panel's contents, apart from its chrome, so the catalog can show them
 *  in a frame. */
export function NotebookBody({ onClose }: { onClose?: () => void }) {
  const file = useAtomValue(notebookAtom);
  const corpus = useAtomValue(dataSourceAtom);
  const collection = useAtomValue(collectionSettings.valueOfAtom(corpus)).name;
  const refs = useAtomValue(referencesAtom);
  const rename = useSetAtom(renameNotebookAtom);
  const setNotes = useSetAtom(setNotebookNotesAtom);
  const unpin = useSetAtom(unpinAtom);
  const clear = useSetAtom(clearNotebookAtom);
  const openEntity = useSetAtom(openEntityAtom);
  const [tab, setTab] = useState<Tab>("pinned");
  const [notesMode, setNotesMode] = useState<"write" | "preview">("write");
  const [confirmClear, setConfirmClear] = useState(false);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");

  const ids = useMemo(() => file.pins.map((p) => p.id), [file.pins]);
  const entries = useMemo(() => buildNotebookEntries(ids, (id) => referencesFor(id, refs)), [ids, refs]);
  const citationCount = entries.reduce((n, e) => n + e.citations.length, 0);
  const name = file.name.trim() || UNNAMED_NOTEBOOK;
  const slug = `notebook-${collection.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "collection"}`;
  const day = new Date().toISOString().slice(0, 10);
  const empty = ids.length === 0;

  const download = (text: string, filename: string, type: string) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const pinnedAt = (id: string) => file.pins.find((p) => p.id === id)?.at;

  const exportCsv = () => {
    downloadCsv(notebookCsv(entries, pinnedAt), `${slug}-${day}.csv`);
    setStatus(`${entries.length} ${entries.length === 1 ? "record" : "records"} exported as CSV.`);
  };
  const exportMarkdown = () => {
    download(citationsMarkdown(name, collection, entries, file.notes), `${slug}-${day}.md`, "text/markdown;charset=utf-8");
    setStatus("Citation list downloaded as Markdown.");
  };
  const copyText = () => {
    navigator.clipboard?.writeText(citationsText(name, collection, entries)).then(
      () => {
        setCopied(true);
        setStatus("Citation list copied as text.");
        window.setTimeout(() => setCopied(false), 2000);
      },
      () => setStatus("The browser did not allow copying."),
    );
  };

  return (
    <>
      <header data-part="header" className="shrink-0 bleed border-b border-border">
        <div className="flex items-center gap-2 h-14">
          <h2 id="notebook-panel-title" data-part="title" className="text-sm font-semibold text-ink">
            Notebook
          </h2>
          <span className="text-xs text-ink-tertiary truncate">{collection}</span>
          <div className="ms-auto flex items-center gap-0.5">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                data-part="close"
                aria-label="Close notebook"
                data-gutter-align="box"
                className="flex items-center justify-center w-7 h-7 rounded-md text-ink-muted hover:bg-warm hover:text-ink-secondary transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
        <input
          type="text"
          value={file.name}
          onChange={(e) => rename(e.target.value)}
          placeholder={UNNAMED_NOTEBOOK}
          aria-label="Notebook name"
          data-part="name"
          data-gutter-align="text"
          className="w-full h-8 -mt-1 mb-2 bg-transparent text-sm font-medium text-ink placeholder:text-ink-tertiary rounded-md
            focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/20"
        />
        <div className="pb-2.5">
          <SegmentedControl
            fill
            size="sm"
            ariaLabel="Notebook section"
            value={tab}
            onChange={(id) => setTab(id as Tab)}
            options={[
              { id: "pinned", label: `Pinned ${ids.length}` },
              { id: "notes", label: "Notes" },
              { id: "citations", label: `Citations ${citationCount}` },
            ]}
          />
        </div>
      </header>

      {/* A `bleed` scroll lane, as in the notifications drawer: warm ground
          and scrollbar at the panel edge, content on the gutter. */}
      <div data-part="body" data-tab={tab} className="flex-1 min-h-0 overflow-y-auto bleed bg-warm">
          {tab === "pinned" && (empty ? <NotebookEmpty /> : (
              <ul data-part="pins" className="flex flex-col gap-2 py-3">
                {entries.map((e) => (
                  <PinnedRow
                    key={e.id}
                    entry={e}
                    onOpen={() => {
                      openEntity(e.id);
                      onClose?.();
                    }}
                    onUnpin={() => unpin(e.id)}
                  />
                ))}
              </ul>
            ))}
          {/* Under the list, not in the header: the first control a reader
              reaches in the panel is not the one that empties it. */}
          {tab === "pinned" && (!empty || file.notes || file.name) && (
            <div className="pb-3">
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                data-part="clear"
                className={`inline-flex items-center gap-1.5 px-2 h-7 -ms-2 rounded-md text-xs font-medium ${BAR_DANGER} transition-colors cursor-pointer`}
                data-gutter-align="text"
              >
                <Trash2 size={12} aria-hidden />
                Clear notebook
              </button>
            </div>
          )}

          {tab === "notes" && (
            <div data-part="notes" className="flex flex-col gap-2 py-3 h-full">
              <div className="flex items-center justify-between gap-2">
                <SegmentedControl
                  size="sm"
                  ariaLabel="Notes mode"
                  value={notesMode}
                  onChange={(id) => setNotesMode(id as "write" | "preview")}
                  options={[
                    { id: "write", label: "Write" },
                    { id: "preview", label: "Preview" },
                  ]}
                />
                <span className="text-meta text-ink-tertiary">Markdown</span>
              </div>
              {notesMode === "write" ? (
                <textarea
                  value={file.notes}
                  onChange={(e) => setNotes(e.target.value)}
                  aria-label="Notebook notes"
                  placeholder={"What the records show, what is still open.\n\n**Bold**, _italic_, - lists and [links](https://…) work."}
                  className={`${MODAL_TEXTAREA} min-h-[18rem] flex-1 font-mono text-xs leading-relaxed`}
                />
              ) : (
                <div data-part="notes-preview" className="min-h-[18rem] rounded-md border border-border-soft bg-paper px-3 py-1 text-sm">
                  {file.notes.trim() ? (
                    <Markdown source={file.notes} resolveLink={() => null} onNavigate={() => {}} />
                  ) : (
                    <p className="py-2 text-xs text-ink-tertiary">No notes yet.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "citations" &&
            (empty ? (
              <NotebookEmpty />
            ) : (
              <ol data-part="citations" className="flex flex-col gap-3 py-3">
                {entries.map((e, i) => (
                  <CitationEntry key={e.id} n={i + 1} entry={e} />
                ))}
              </ol>
            ))}
      </div>

      <footer data-part="footer" className="shrink-0 bleed border-t border-border">
        <div className="flex items-center gap-1 h-12">
          <button
            type="button"
            onClick={copyText}
            disabled={empty}
            data-part="copy"
            className={`inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md text-xs ${BAR_LEAD} transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none`}
          >
            {copied ? <Check size={13} className="text-carbon" aria-hidden /> : <BookMarked size={13} className="text-ink-tertiary" aria-hidden />}
            {/* Both labels in one slot: the button keeps its width. */}
            <span className="grid">
              <span className={`col-start-1 row-start-1 ${copied ? "" : "invisible"}`}>Copied</span>
              <span className={`col-start-1 row-start-1 ${copied ? "invisible" : ""}`}>Copy citations</span>
            </span>
          </button>
          <BarDivider />
          <button
            type="button"
            onClick={exportMarkdown}
            disabled={empty}
            data-part="markdown"
            className={`px-2.5 h-8 rounded-md text-xs font-medium ${BAR_GHOST} transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none`}
          >
            Markdown
          </button>
          <button
            type="button"
            onClick={exportCsv}
            disabled={empty}
            data-part="csv"
            className={`px-2.5 h-8 rounded-md text-xs font-medium ${BAR_GHOST} transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none`}
          >
            CSV
          </button>
          <p role="status" className="sr-only">
            {status}
          </p>
        </div>
      </footer>

      <ConfirmDialog
        open={confirmClear}
        title={`Clear “${name}”?`}
        message={`Unpins ${ids.length} ${ids.length === 1 ? "record" : "records"} and deletes the notes. The records stay in the collection.`}
        confirmLabel="Clear notebook"
        variant="danger"
        onConfirm={() => {
          clear();
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  );
}

function NotebookEmpty() {
  return (
    <div data-part="empty" className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
      <Pin size={24} className="text-ink-muted" strokeWidth={1.5} aria-hidden />
      <p className="text-sm font-medium text-ink-secondary">Nothing pinned yet</p>
      <p className="text-xs text-ink-tertiary text-pretty">
        Pin a record from its card in the Library, from its header, or from a relationship.
      </p>
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  confirmed: "bg-success-light text-success-label",
  disputed: "bg-warning-light text-warning-label",
  misattributed: "bg-seal-tint text-seal-label",
};

export function NotebookStatus({ entry }: { entry: Pick<NotebookEntry, "status" | "statusKey"> }) {
  if (!entry.status) return null;
  return (
    <span
      data-part="status"
      data-status={entry.statusKey}
      className={`inline-flex w-fit px-1.5 py-px rounded-md text-meta font-medium whitespace-nowrap ${
        STATUS_TONE[entry.statusKey ?? ""] ?? "bg-vellum text-ink-secondary"
      }`}
    >
      {entry.status}
    </span>
  );
}

function PinnedRow({ entry, onOpen, onUnpin }: { entry: NotebookEntry; onOpen: () => void; onUnpin: () => void }) {
  const e = getEntity(entry.id);
  const n = entry.citations.length;
  return (
    <li data-part="pin" className="group relative rounded-lg border border-border-soft bg-paper px-3 py-2.5">
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onOpen}
          disabled={!entry.found}
          className="flex-1 min-w-0 text-start text-sm font-medium text-ink line-clamp-2 rounded-sm cursor-pointer hover:underline underline-offset-2
            decoration-ink/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40 disabled:no-underline disabled:cursor-default"
        >
          {entry.title}
        </button>
        <button
          type="button"
          onClick={onUnpin}
          aria-label={`Unpin “${entry.title}”`}
          title="Unpin"
          className="hit-area shrink-0 w-6 h-6 -me-1 flex items-center justify-center rounded text-ink-muted opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
            hover:bg-warm hover:text-ink transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-ink/20"
        >
          <X size={13} />
        </button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
        {e ? <EntityTypeTag typeId={e.typeId} /> : <span className="text-meta text-ink-tertiary">No longer in the collection</span>}
        <NotebookStatus entry={entry} />
        {entry.source.date && <span className="text-meta text-ink-tertiary tabular-nums">{entry.source.date}</span>}
        <span className="ms-auto text-meta text-ink-tertiary tabular-nums">
          {n === 0 ? "No quotes" : `${n} ${n === 1 ? "quote" : "quotes"}`}
        </span>
      </div>
    </li>
  );
}

/** A quote's stance on the claim, in the claim matrix's tones: support
 *  green, dispute amber, a report without a side neutral. */
const STANCE_TONE: Record<Stance, string> = {
  supports: "text-success-label",
  disputes: "text-warning-label",
  reports_on: "text-ink-secondary",
};

function CitationEntry({ n, entry }: { n: number; entry: NotebookEntry }) {
  const head = [entry.template, entry.source.publisher, entry.source.date].filter(Boolean).join(" · ");
  return (
    <li data-part="citation-entry" className="rounded-lg border border-border-soft bg-paper px-3 py-2.5">
      <p className="text-sm font-semibold text-ink">
        <span className="text-ink-tertiary tabular-nums me-1.5">{n}.</span>
        {entry.title}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-tertiary">
        {head && <span>{head}</span>}
        <NotebookStatus entry={entry} />
      </div>
      {entry.source.url && <SourceLink url={entry.source.url} />}
      {entry.citations.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2" data-part="quotes">
          {entry.citations.map((c, i) => (
            <li key={i} className="text-xs leading-relaxed">
              <p className="text-ink-secondary text-pretty">“{c.quote}”</p>
              {/* One run of text, each separator bound to the part before it
                  (a no-break space), so a wrapped line never starts with "·". */}
              <p className="mt-0.5 text-meta text-ink-tertiary text-pretty">
                {c.stance && (
                  <>
                    <span data-part="stance" data-stance={c.stance} className={`font-medium ${STANCE_TONE[c.stance]}`}>
                      {stanceText(c)}
                    </span>
                    {"\u00a0· "}
                  </>
                )}
                {[
                  [c.sourceId === entry.id ? null : c.sourceTitle, c.publisher].filter(Boolean).join(", ") || "This record",
                  c.status?.replace(/ /g, "\u00a0"),
                  c.page?.replace(/ /g, "\u00a0"),
                ]
                  .filter(Boolean)
                  .join("\u00a0· ")}
                {c.url && c.url !== entry.source.url && (
                  <>
                    {"\u00a0· "}
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 hover:text-ink underline-offset-2 hover:underline rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
                    >
                      {hostOf(c.url)}
                      <ExternalLink size={9} aria-hidden />
                    </a>
                  </>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

function SourceLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      className="mt-1 inline-flex items-center gap-1 max-w-full text-meta text-ink-tertiary hover:text-ink underline-offset-2 hover:underline rounded-sm
        focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
    >
      <span className="truncate">{url.replace(/^https?:\/\/(www\.)?/, "")}</span>
      <ExternalLink size={10} aria-hidden className="shrink-0" />
    </a>
  );
}
