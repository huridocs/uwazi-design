import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Tag } from "lucide-react";
import { useAtomValue, useSetAtom } from "jotai";
import type { Entity } from "../../data/entities";
import { languageAtom } from "../../atoms/language";
import { dataSourceAtom } from "../../atoms/dataSource";
import {
  libraryQueryAtom,
  focusMetadataFieldAtom,
  resultsActivePageAtom,
} from "../../atoms/library";
import { scrollToPageAtom } from "../../atoms/selection";
import { buildSnippetsFor, hiddenMatchOrigin } from "../../utils/librarySnippets";
import { HighlightedText } from "../shared/HighlightedText";

/** The row's answer to "why is this here?" in the two layouts that have no room
 *  for a snippet — the Library table and the timeline Spine.
 *
 *  Both render a title and (in the table) a country, marked. When the query hit
 *  one of those, the mark IS the evidence and this renders NOTHING: a marker on
 *  every row would mean nothing on any row. It appears only where the evidence is
 *  off-row — an unshown property, or the document body — as at most two 1rem
 *  glyphs in carbon, the app's data/attention accent:
 *
 *    • `Tag`      — a property matched (hover/focus names the field + excerpt;
 *                   click opens the entity's Metadata tab focused on it)
 *    • `FileText` — the document body matched (hover/focus shows the passage;
 *                   click jumps the preview to that page — but only where the
 *                   page is real, §4.2)
 *
 *  **No layout shift.** The slot that holds these is reserved by the SURFACE (a
 *  fixed-width table column / a fixed-width span in the spine row), mounted for
 *  as long as a query is active. Per-row contents come and go inside that fixed
 *  box, so refining a query never moves a title, a column, or a row underneath
 *  the cursor. The one boundary where the slot itself appears is empty query →
 *  query, the same transition that replaces every row anyway.
 *
 *  Excerpts are built lazily, for ONE entity, on hover/focus — a windowing pass
 *  over a whole corpus per keystroke is exactly what the Results tab avoids by
 *  capping, and this surface renders far more rows than that tab does cards. */

interface Props {
  entity: Entity;
  /** Field keys this row already renders with marks — a hit there is its own
   *  evidence and gets no marker. */
  visibleFieldKeys: readonly string[];
  /** Select/preview the entity. Owned by the surface because it's viewport-aware
   *  (mobile opens the full view instead of the drawer). */
  onSelect: (id: string) => void;
}

type Kind = "property" | "document";

/** Popover width, and the gap it keeps from the anchor and the viewport edge. */
const POPOVER_W = 320;
const GAP = 8;
const EDGE = 12;
/** Hover dwell before the excerpt is built — scanning a column of rows shouldn't
 *  build a snippet for every row the pointer crosses. */
const HOVER_DELAY = 140;

export function MatchOrigin({ entity, visibleFieldKeys, onSelect }: Props) {
  const query = useAtomValue(libraryQueryAtom);
  const language = useAtomValue(languageAtom);
  const source = useAtomValue(dataSourceAtom);
  const setFocusField = useSetAtom(focusMetadataFieldAtom);
  const setScrollToPage = useSetAtom(scrollToPageAtom);
  const setResultsActivePage = useSetAtom(resultsActivePageAtom);
  const q = query.trim();

  const visibleKey = visibleFieldKeys.join(",");
  const origin = useMemo(
    () => hiddenMatchOrigin(entity, q, language, source, visibleFieldKeys),
    // `visibleKey` stands in for the array so a fresh literal doesn't re-scan.
    [entity, q, language, source, visibleKey],
  );

  const [open, setOpen] = useState<Kind | null>(null);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const anchor = useRef<HTMLElement | null>(null);
  const timer = useRef<number | undefined>(undefined);

  // One entity, one excerpt each — built only while the popover is open.
  const snippets = useMemo(
    () => (open ? buildSnippetsFor(entity, q, language, source, { maxFullText: 1 }) : null),
    [open, entity, q, language, source],
  );

  const show = (kind: Kind, el: HTMLElement, immediate = false) => {
    window.clearTimeout(timer.current);
    anchor.current = el;
    if (immediate) setOpen(kind);
    else timer.current = window.setTimeout(() => setOpen(kind), HOVER_DELAY);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setOpen(null);
  };

  // Positioned from the anchor's rect as a portalled overlay, never as a child of
  // the row: both surfaces scroll inside `overflow-auto` panes that would clip it.
  useLayoutEffect(() => {
    if (!open || !anchor.current) return setPos(null);
    const r = anchor.current.getBoundingClientRect();
    const w = Math.min(POPOVER_W, window.innerWidth - EDGE * 2);
    const left = Math.max(
      EDGE,
      Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - EDGE),
    );
    // Flip above when the lower half can't hold it — anchoring by `bottom` means
    // we never need to measure the popover to place it.
    const below = window.innerHeight - r.bottom;
    setPos(
      below < 180
        ? { left, bottom: window.innerHeight - r.top + GAP }
        : { left, top: r.bottom + GAP },
    );
  }, [open]);

  // A fixed overlay goes stale the moment anything scrolls or resizes; Escape
  // dismisses it like every other transient surface in the app.
  useEffect(() => {
    if (!open) return;
    const close = () => hide();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!origin.property && !origin.document) return null;

  const openProperty = () => {
    hide();
    onSelect(entity.id);
    if (origin.property) setFocusField({ entityId: entity.id, fieldKey: origin.property.fieldKey });
  };

  const openDocument = () => {
    hide();
    onSelect(entity.id);
    // Jump only where the page is real (mock renditions carry `page: null`).
    // Reuse the popover's build when there is one — a tap on touch (no hover, no
    // focus) is the only path that has to pay for it here.
    const page = (
      snippets ?? buildSnippetsFor(entity, q, language, source, { maxFullText: 1 })
    ).fullText[0]?.page;
    if (page != null) {
      setScrollToPage(page);
      setResultsActivePage({ entityId: entity.id, page });
    }
  };

  const propertyLabel = origin.property
    ? `Matched in ${origin.property.field}${
        origin.moreProperties > 0 ? ` and ${origin.moreProperties} more` : ""
      } — open the field`
    : "";

  const tipId = `match-origin-${entity.id}`;

  return (
    <span className="inline-flex items-center gap-0.5">
      {origin.property && (
        <Mark
          icon={<Tag size={11} />}
          label={propertyLabel}
          describedBy={open === "property" ? tipId : undefined}
          onOpen={(el, immediate) => show("property", el, immediate)}
          onClose={hide}
          onActivate={openProperty}
        />
      )}
      {origin.document && (
        <Mark
          icon={<FileText size={11} />}
          label="Matched in the document text — open the document"
          describedBy={open === "document" ? tipId : undefined}
          onOpen={(el, immediate) => show("document", el, immediate)}
          onClose={hide}
          onActivate={openDocument}
        />
      )}

      {open &&
        pos &&
        snippets &&
        createPortal(
          <div
            id={tipId}
            role="tooltip"
            className="fixed z-50 rounded-md bg-paper px-2.5 py-2 shadow-lg"
            style={{
              left: pos.left,
              top: pos.top,
              bottom: pos.bottom,
              width: Math.min(POPOVER_W, window.innerWidth - EDGE * 2),
              border: "1px solid var(--border-primary)",
            }}
          >
            {open === "property" ? (
              <PropertyTip origin={origin} snippets={snippets} query={q} />
            ) : (
              <DocumentTip snippets={snippets} query={q} />
            )}
          </div>,
          document.body,
        )}
    </span>
  );
}

/** One glyph. Focus opens the excerpt immediately (a keyboard user gets what a
 *  hover gives); Enter/Space come free from the native button. */
function Mark({
  icon,
  label,
  describedBy,
  onOpen,
  onClose,
  onActivate,
}: {
  icon: React.ReactNode;
  label: string;
  describedBy?: string;
  onOpen: (el: HTMLElement, immediate?: boolean) => void;
  onClose: () => void;
  onActivate: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-describedby={describedBy}
      onClick={(e) => {
        e.stopPropagation();
        onActivate();
      }}
      onMouseEnter={(e) => onOpen(e.currentTarget)}
      onMouseLeave={onClose}
      onFocus={(e) => onOpen(e.currentTarget, true)}
      onBlur={onClose}
      // Full carbon, not a tinted-down variant: an 11px stroke glyph at 70% reads
      // as a smudge rather than a mark, and this is the row's only evidence.
      className="inline-flex items-center justify-center w-4 h-4 rounded-[3px] text-carbon
        hover:bg-carbon-tint transition-colors cursor-pointer
        focus:outline-none focus-visible:ring-1 focus-visible:ring-carbon/40"
    >
      {icon}
    </button>
  );
}

function TipLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
      {children}
    </span>
  );
}

function TipHint({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 block text-[10px] text-ink-muted">{children}</span>;
}

function PropertyTip({
  origin,
  snippets,
  query,
}: {
  origin: { property: { field: string; fieldKey: string } | null; moreProperties: number };
  snippets: { metadata: { fieldKey: string; texts: string[] }[] };
  query: string;
}) {
  const group = snippets.metadata.find((m) => m.fieldKey === origin.property?.fieldKey);
  return (
    <>
      <TipLabel>{origin.property?.field}</TipLabel>
      {group?.texts[0] && (
        <span className="mt-0.5 block text-xs leading-relaxed text-ink">
          <HighlightedText text={group.texts[0]} query={query} />
        </span>
      )}
      <TipHint>
        {origin.moreProperties > 0
          ? `+${origin.moreProperties} more ${
              origin.moreProperties === 1 ? "property" : "properties"
            } · click to open`
          : "Click to open this property"}
      </TipHint>
    </>
  );
}

function DocumentTip({
  snippets,
  query,
}: {
  snippets: { fullText: { page: number | null; text: string }[]; fullTextTotal: number };
  query: string;
}) {
  const first = snippets.fullText[0];
  const total = snippets.fullTextTotal;
  // "pages" only where the corpus really is page-mapped; the mock rendition is
  // chunked text, so it counts PASSAGES and offers no jump (§4.2).
  const paged = first?.page != null;
  const unit = paged ? (total === 1 ? "page" : "pages") : total === 1 ? "passage" : "passages";
  return (
    <>
      <TipLabel>
        <span dir="ltr">
          Document<span className="mx-1 text-ink-muted">·</span>
          <span className="tabular-nums">{total.toLocaleString()}</span> {unit}
        </span>
      </TipLabel>
      {first && (
        <span className="mt-0.5 block text-xs leading-relaxed text-ink">
          <HighlightedText text={first.text} query={query} />
        </span>
      )}
      <TipHint>{paged ? `Click to jump to p.${first!.page}` : "Click to open the document"}</TipHint>
    </>
  );
}
