import { useEffect, useRef, useState, type ReactNode } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Bookmark, Check, Clock, Link2, Pencil, Plus, Trash2, X } from "lucide-react";
import { SectionLabel } from "../shared/SectionLabel";
import { quotedQuery } from "../../utils/queryTokens";
import { MobileBottomSheet } from "../layout/MobileBottomSheet";
import { SheetDone } from "../layout/SheetDone";
import { breakpointAtom } from "../../atoms/viewport";
import {
  applyLibrarySnapshotAtom,
  clearSearchHistoryAtom,
  currentSavedViewIdAtom,
  deleteSavedViewAtom,
  forgetHistoryEntryAtom,
  renameSavedViewAtom,
  saveCurrentViewAtom,
  savedViewsAtom,
  searchHistoryAtom,
  snapshotFilterCount,
  viewLink,
  type LibrarySnapshot,
  type SavedView,
  type SearchHistoryEntry,
} from "../../atoms/savedViews";

const VIEW_LABEL: Record<string, string> = {
  cards: "Cards",
  list: "List",
  map: "Map",
  timeline: "Timeline",
  results: "Results",
  evidence: "Evidence",
};

/** One line saying what a snapshot holds: its view, its filter count and its
 *  search. No count when nothing is ticked, so a plain view reads as one word. */
export function snapshotSummary(s: LibrarySnapshot, { withQuery = true } = {}): string {
  const n = snapshotFilterCount(s);
  return [
    s.viewMode ? VIEW_LABEL[s.viewMode] : "Default view",
    n ? `${n} ${n === 1 ? "filter" : "filters"}` : null,
    withQuery && s.query ? quotedQuery(s.query) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function ago(t: number, now: number): string {
  const m = Math.round(Math.max(0, now - t) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(t).toISOString().slice(0, 10);
}

/** The Library's Views menu: save the filters, view and display as a named
 *  view, open, rename, delete or share one as a link, and re-run a past search
 *  with the filters it ran under. Icon-only beside Display, so the masthead
 *  row keeps its width whatever is saved. */
export function SavedViewsMenu() {
  const [open, setOpen] = useState(false);
  const mobile = useAtomValue(breakpointAtom) === "mobile";
  const current = useAtomValue(currentSavedViewIdAtom);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div data-component="SavedViewsMenu" className="relative">
      <button
        type="button"
        data-part="trigger"
        onClick={() => setOpen((o) => !o)}
        aria-label="Views"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Views"
        className={`relative inline-flex items-center justify-center w-8 h-8 rounded-md border transition-colors cursor-pointer ${
          open || current
            ? "bg-paper text-ink border-ink/40 shadow-sm"
            : "bg-paper text-ink-secondary border-border hover:bg-parchment hover:text-ink"
        }`}
      >
        <Bookmark size={14} aria-hidden fill={current ? "currentColor" : "none"} />
      </button>
      {mobile ? (
        <MobileBottomSheet
          open={open}
          onClose={() => setOpen(false)}
          title="Views"
          defaultSnap="full"
          footer={<SheetDone onClick={() => setOpen(false)} />}
        >
          <div className="px-2 py-2">
            <SavedViewsPanel onDone={() => setOpen(false)} touch />
          </div>
        </MobileBottomSheet>
      ) : (
        open && (
          <>
            <div data-part="scrim" className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
            <div
              role="dialog"
              aria-label="Views"
              data-part="menu"
              className="absolute end-0 mt-1 z-40 w-80 max-h-[70vh] overflow-y-auto bg-paper border border-border rounded-md shadow-lg p-1"
            >
              <SavedViewsPanel onDone={() => setOpen(false)} />
            </div>
          </>
        )
      )}
    </div>
  );
}

/** The menu's body, apart from its trigger, so the catalog and the phone sheet
 *  draw the same rows. `onDone` closes the host after a view or search opens. */
export function SavedViewsPanel({ onDone, touch = false }: { onDone?: () => void; touch?: boolean }) {
  const views = useAtomValue(savedViewsAtom);
  const history = useAtomValue(searchHistoryAtom);
  const current = useAtomValue(currentSavedViewIdAtom);
  const apply = useSetAtom(applyLibrarySnapshotAtom);
  const save = useSetAtom(saveCurrentViewAtom);
  const rename = useSetAtom(renameSavedViewAtom);
  const remove = useSetAtom(deleteSavedViewAtom);
  const forget = useSetAtom(forgetHistoryEntryAtom);
  const clearHistory = useSetAtom(clearSearchHistoryAtom);
  const [naming, setNaming] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const now = Date.now();

  const copyLink = (v: SavedView) => {
    const url = viewLink(v.snapshot, v.name);
    const done = () => setStatus(`Link to “${v.name}” copied.`);
    navigator.clipboard?.writeText(url).then(done, () => setStatus("The browser did not allow copying."));
  };

  const rowText = touch ? "text-sm" : "text-xs";

  return (
    <div data-component="SavedViewsPanel" className="flex flex-col">
      <div className="px-1 pt-1 pb-1.5">
        {naming ? (
          <NameField
            initial=""
            placeholder="Name this view"
            submitLabel="Save"
            onSubmit={(name) => {
              save(name);
              setNaming(false);
              setStatus(`Saved “${name.trim() || "Untitled view"}”.`);
            }}
            onCancel={() => setNaming(false)}
          />
        ) : (
          <button
            type="button"
            data-part="save"
            onClick={() => setNaming(true)}
            className={`w-full flex items-center gap-2 px-2 ${touch ? "min-h-11" : "h-8"} rounded ${rowText} font-medium text-ink hover:bg-warm transition-colors cursor-pointer`}
          >
            <Plus size={13} aria-hidden className="text-ink-tertiary" />
            Save current view
          </button>
        )}
      </div>

      <SectionLabel as="p" className="px-2 pt-1 pb-1">
        Saved views
      </SectionLabel>
      {views.length === 0 ? (
        <p className="px-2 pb-2 text-xs text-ink-tertiary text-pretty">
          None yet. A view keeps the filters, the search, the sort and how the results are drawn.
        </p>
      ) : (
        <ul data-part="views" className="flex flex-col pb-1">
          {views.map((v) =>
            editing === v.id ? (
              <li key={v.id} className="px-1 py-0.5">
                <NameField
                  initial={v.name}
                  placeholder="View name"
                  submitLabel="Rename"
                  onSubmit={(name) => {
                    rename({ id: v.id, name });
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <Row
                key={v.id}
                touch={touch}
                active={current === v.id}
                title={v.name}
                detail={snapshotSummary(v.snapshot)}
                onOpen={() => {
                  apply(v.snapshot);
                  onDone?.();
                }}
                openLabel={`Open view ${v.name}`}
                actions={
                  <>
                    <RowAction label={`Copy link to ${v.name}`} onClick={() => copyLink(v)}>
                      <Link2 size={12} />
                    </RowAction>
                    <RowAction label={`Rename ${v.name}`} onClick={() => setEditing(v.id)}>
                      <Pencil size={12} />
                    </RowAction>
                    <RowAction label={`Delete ${v.name}`} danger onClick={() => {
                      remove(v.id);
                      setStatus(`Deleted “${v.name}”.`);
                    }}>
                      <Trash2 size={12} />
                    </RowAction>
                  </>
                }
              />
            ),
          )}
        </ul>
      )}

      <div role="separator" className="my-1 h-px" style={{ backgroundColor: "var(--border-soft)" }} />
      <SectionLabel as="p" className="px-2 pt-1 pb-1" icon={<Clock size={11} />}>
        Search history
      </SectionLabel>
      {history.length === 0 ? (
        <p className="px-2 pb-2 text-xs text-ink-tertiary text-pretty">
          Searches you run here are listed with the filters they ran under.
        </p>
      ) : (
        <ul data-part="history" className="flex flex-col pb-1">
          {history.map((h: SearchHistoryEntry) => (
            <Row
              key={h.id}
              touch={touch}
              title={quotedQuery(h.query)}
              detail={`${snapshotSummary(h.snapshot, { withQuery: false })} · ${ago(h.at, now)}`}
              onOpen={() => {
                apply(h.snapshot);
                onDone?.();
              }}
              openLabel={`Run search ${h.query} again with its filters`}
              actions={
                <RowAction label={`Forget search ${h.query}`} onClick={() => forget(h.id)}>
                  <X size={12} />
                </RowAction>
              }
            />
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between gap-2 px-2 pt-1 pb-1" style={{ borderTop: "1px solid var(--border-soft)" }}>
        {/* Always mounted: the line that says what just happened, so a copy
            or a delete is announced and the panel does not grow when it is. */}
        <p role="status" aria-live="polite" className="min-w-0 truncate min-h-6 flex items-center text-meta text-ink-tertiary">
          {status}
        </p>
        <button
          type="button"
          data-part="clear-history"
          onClick={() => clearHistory()}
          disabled={history.length === 0}
          className="shrink-0 h-6 text-meta font-medium text-ink-tertiary hover:text-ink transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default rounded-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ink/20"
        >
          Clear history
        </button>
      </div>
    </div>
  );
}

function Row({
  title,
  detail,
  active = false,
  touch,
  onOpen,
  openLabel,
  actions,
}: {
  title: string;
  detail: string;
  active?: boolean;
  touch: boolean;
  onOpen: () => void;
  openLabel: string;
  actions: ReactNode;
}) {
  return (
    <li data-part="row" data-active={active || undefined} className="group relative flex items-stretch">
      <button
        type="button"
        onClick={onOpen}
        aria-label={openLabel}
        aria-current={active || undefined}
        className={`flex-1 min-w-0 flex items-start gap-2 text-start ps-2 pe-20 ${touch ? "py-2.5" : "py-1.5"} rounded transition-colors cursor-pointer
          ${active ? "bg-parchment" : "hover:bg-warm"} focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20`}
      >
        <span className="w-3.5 shrink-0 pt-0.5 flex justify-center text-carbon">{active && <Check size={12} aria-hidden />}</span>
        <span className="min-w-0">
          <span className={`block truncate ${touch ? "text-sm" : "text-xs"} font-medium text-ink`}>{title}</span>
          <span className="block truncate text-meta text-ink-tertiary">{detail}</span>
        </span>
      </button>
      <span
        data-part="actions"
        className={`absolute inset-y-0 end-1 flex items-center gap-0.5 ${
          touch ? "" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        } transition-opacity`}
      >
        {actions}
      </span>
    </li>
  );
}

function RowAction({ label, onClick, danger = false, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`hit-area w-6 h-6 flex items-center justify-center rounded text-ink-muted transition-colors cursor-pointer
        focus:outline-none focus-visible:ring-1 focus-visible:ring-ink/20 ${
          danger ? "hover:bg-seal-tint hover:text-seal-label" : "hover:bg-parchment hover:text-ink"
        }`}
    >
      {children}
    </button>
  );
}

/** A one-line name form. Enter submits, Escape cancels without closing the
 *  menu (it claims the key). */
function NameField({
  initial,
  placeholder,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: string;
  placeholder: string;
  submitLabel: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <form
      data-part="name-form"
      className="flex items-center gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
    >
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
          }
        }}
        aria-label={placeholder}
        placeholder={placeholder}
        className="flex-1 min-w-0 h-8 px-2 text-xs text-ink bg-paper rounded-md border border-border placeholder:text-ink-muted
          focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40"
      />
      <button type="submit" className="shrink-0 h-8 px-2.5 text-xs font-medium rounded-md bg-ink text-paper cursor-pointer">
        {submitLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel"
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-ink-tertiary hover:bg-warm hover:text-ink cursor-pointer"
      >
        <X size={13} />
      </button>
    </form>
  );
}
