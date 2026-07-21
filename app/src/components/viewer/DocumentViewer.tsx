import { useState, useRef, useCallback, useEffect, useMemo, ReactNode } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { X } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { currentPageAtom, scrollToPageAtom, textSelectionAtom, documentFormatAtom } from "../../atoms/selection";
import { scrollToHighlightAtom, scopedReferencesAtom, activeRefIdAtom } from "../../atoms/references";
import { breakpointAtom } from "../../atoms/viewport";
import { languageAtom } from "../../atoms/language";
import {
  filesAtom,
  documentGroupsAtom,
  activePrimaryGroupIdAtom,
} from "../../atoms/files";
import { MOCK_DOCUMENT_PDF } from "../../data/files";
import { PageHighlights } from "./PageHighlights";
import { FloatingMenu } from "./FloatingMenu";
import { ActionBar } from "./ActionBar";
import "../../utils/pdfWorker";
import { RefMinimap } from "./RefMinimap";
import { DocumentRendition } from "./DocumentRendition";


interface DocumentViewerProps {
  /** Optional trailing slot for the action bar — used to inject the mobile
   *  sheet trigger so it sits at the right of the bar. */
  actionBarMenu?: ReactNode;
  /** Hide the right-edge ref minimap. Default: shown on non-mobile. */
  showMinimap?: boolean;
  /** When set, render this specific file instead of resolving from the
   *  active primary + language atoms. Used by the drawer's inline viewer
   *  to display any file the user "View"s without disturbing global state. */
  fileOverride?: { url?: string; language: string } | null;
  /** Drop the bottom pager action bar — for hosts that supply their own
   *  footer (the library preview's Close / View entity bar). */
  hideActionBar?: boolean;
}

export function DocumentViewer({ actionBarMenu, showMinimap = true, fileOverride, hideActionBar = false }: DocumentViewerProps = {}) {
  const [breakpoint] = useAtom(breakpointAtom);
  const isMobile = breakpoint === "mobile";
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [selection, setSelection] = useAtom(textSelectionAtom);
  const setScrollToHighlight = useSetAtom(scrollToHighlightAtom);
  const setActiveRefId = useSetAtom(activeRefIdAtom);
  const [references] = useAtom(scopedReferencesAtom);
  const [containerWidth, setContainerWidth] = useState(800);
  // Drawer previews (fileOverride) always render the PDF; the format picker
  // only governs the main Document-tab pane.
  const docFormat = useAtomValue(documentFormatAtom);
  const renditionMode = !fileOverride && docFormat !== "pdf";

  // Pick the file to render from (active primary group, current language).
  // Falls back to first primary, then first file in the active group, then
  // the bundled Velasquez-Rodriguez judgment so the viewer always has something to show.
  const language = useAtomValue(languageAtom);
  const files = useAtomValue(filesAtom);
  const groups = useAtomValue(documentGroupsAtom);
  const activeGroupId = useAtomValue(activePrimaryGroupIdAtom);
  const primaryGroups = useMemo(
    () => groups.filter((g) => g.isPrimary).sort((a, b) => a.order - b.order),
    [groups],
  );
  const resolvedActiveId = activeGroupId ?? primaryGroups[0]?.id ?? null;
  const activeFile = useMemo(() => {
    if (fileOverride) return fileOverride;
    if (!resolvedActiveId) return null;
    const exact = files.find(
      (f) => f.groupId === resolvedActiveId && f.language === language,
    );
    if (exact) return exact;
    // No translation in this language — fall back to the first file in the
    // group so the viewer still renders something.
    return files.find((f) => f.groupId === resolvedActiveId) ?? null;
  }, [files, resolvedActiveId, language, fileOverride]);
  const filePath = activeFile?.url ?? MOCK_DOCUMENT_PDF;
  // Dismissable: it's a notice, not an alert — once you know this doc is in ES,
  // you don't need telling again while you read it. It comes back when the
  // FACTS change (a different language or a different file), not on every
  // re-render, so dismissing it doesn't hide a genuinely new fallback.
  const [langNoticeDismissed, setLangNoticeDismissed] = useState(false);
  useEffect(() => setLangNoticeDismissed(false), [language, activeFile?.url]);
  const showLangFallback =
    !fileOverride &&
    activeFile !== null &&
    activeFile.language !== language &&
    !langNoticeDismissed;

  // Measure container width for responsive PDF scaling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      // Ignore the 0-width report when the PDF pane is hidden behind a
      // rendition — otherwise pages re-render at zero width and go blank.
      if (entry.contentRect.width > 0) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pageWidth = useMemo(() => Math.min(860, containerWidth - 48), [containerWidth]);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
    },
    []
  );

  const handleTextSelect = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      return;
    }

    const text = sel.toString().trim();
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Find which page this selection is in, and convert the screen rect into
    // page-relative (0-1) coords so highlights / references paint at the right
    // spot regardless of zoom or page size.
    let page = currentPage;
    let pageRelRect = { top: 0, left: 0, width: 0, height: 0 };
    let pageRelRects: { top: number; left: number; width: number; height: number }[] = [];
    const anchorNode = sel.anchorNode;
    if (anchorNode) {
      const pageEl = (anchorNode instanceof HTMLElement ? anchorNode : anchorNode.parentElement)
        ?.closest("[data-page-number]");
      if (pageEl) {
        page = parseInt(pageEl.getAttribute("data-page-number") || "1", 10);
        const pageRect = pageEl.getBoundingClientRect();
        if (pageRect.width > 0 && pageRect.height > 0) {
          const norm = (r: DOMRect) => ({
            top: (r.top - pageRect.top) / pageRect.height,
            left: (r.left - pageRect.left) / pageRect.width,
            width: r.width / pageRect.width,
            height: r.height / pageRect.height,
          });
          pageRelRect = norm(rect);
          // Exact per-line boxes the browser computed for the selection — drop
          // zero-area fragments the text layer sometimes emits.
          pageRelRects = Array.from(range.getClientRects())
            .filter((r) => r.width > 1 && r.height > 1)
            .map(norm);
        }
      }
    }

    setSelection({
      text,
      page,
      rect: pageRelRect,
      rects: pageRelRects,
      screenX: rect.left + rect.width / 2,
      screenY: rect.top,
    });
  }, [currentPage, setSelection]);

  const handleMouseDown = useCallback(() => {
    setSelection(null);
    setActiveRefId(null);
  }, [setSelection, setActiveRefId]);

  // Track current page on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container || numPages === 0) return;

    const handleScroll = () => {
      const containerTop = container.scrollTop + container.clientHeight / 3;
      let closestPage = 1;
      let closestDist = Infinity;

      pageRefs.current.forEach((el, pageNum) => {
        const dist = Math.abs(el.offsetTop - containerTop);
        if (dist < closestDist) {
          closestDist = dist;
          closestPage = pageNum;
        }
      });

      setCurrentPage(closestPage);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [numPages, setCurrentPage]);

  // Scroll to a specific page
  const scrollToPage = useCallback((page: number) => {
    const pageEl = pageRefs.current.get(page);
    if (pageEl) {
      pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Scroll-to-page signal (from ToC clicks, Search-tab / Results snippet jumps).
  //
  // Two things have to be true before this can work, and waiting for only the
  // first is why the jump silently no-op'd: the page element must EXIST, and it
  // must have been LAID OUT. A snippet jump swaps the drawer to this preview and
  // fires while the PDF is still rendering — react-pdf mounts every page div
  // immediately but they're zero-height until each canvas paints, so all of them
  // sit at the same offset and `scrollIntoView(page 5)` lands at ~0. The pages
  // then grow underneath the scroll position and nothing appears to have moved.
  //
  // So retry until the target has real height, then scroll. `pageRefs` is a ref,
  // so this effect can't re-run on mount — the frame loop is what waits.
  const [pageJump, setPageJump] = useAtom(scrollToPageAtom);
  useEffect(() => {
    if (pageJump === null) return;
    // Behind a text/HTML rendition the PDF pane is `display:none` (it stays
    // mounted so switching back repaints instantly). Inside a hidden container
    // `scrollIntoView` does nothing and every page measures 0 tall, so the loop
    // below would spin out its budget and drop the jump on the floor. HOLD the
    // signal instead — don't clear it — and let `renditionMode` re-run this
    // effect when the pane becomes visible, so the jump lands then. A page
    // number only means anything in the paginated PDF view anyway.
    if (renditionMode) return;
    let raf = 0;
    let attempts = 0;
    const MAX_ATTEMPTS = 240; // ~4s at 60fps — covers PDF mount + canvas paint
    const MIN_LAID_OUT = 40; // px: a rendered page, not a collapsed placeholder
    const tryScroll = () => {
      const cached = pageRefs.current.get(pageJump);
      // `isConnected` rejects a node left over from a previously-rendered
      // document; `offsetHeight` rejects one that's mounted but not yet painted.
      const pageEl = cached?.isConnected ? cached : undefined;
      if (pageEl && pageEl.offsetHeight > MIN_LAID_OUT) {
        pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
        setPageJump(null);
      } else if (attempts++ < MAX_ATTEMPTS) {
        raf = requestAnimationFrame(tryScroll);
      } else {
        // Give up rather than wedge the signal — but still make a best-effort
        // jump if the element is at least present.
        pageEl?.scrollIntoView({ behavior: "smooth", block: "start" });
        setPageJump(null);
      }
    };
    tryScroll();
    return () => cancelAnimationFrame(raf);
  }, [pageJump, setPageJump, renditionMode]);

  // Scroll to highlight centered in viewport
  const [scrollTarget] = useAtom(scrollToHighlightAtom);
  useEffect(() => {
    if (!scrollTarget) return;
    const ref = references.find((r) => r.id === scrollTarget);
    if (ref?.sourceSelection) {
      const pageEl = pageRefs.current.get(ref.sourceSelection.page);
      const container = containerRef.current;
      if (pageEl && container) {
        const highlightY =
          pageEl.offsetTop + pageEl.offsetHeight * ref.sourceSelection.top;
        const centered = highlightY - container.clientHeight / 2;
        container.scrollTo({ top: Math.max(0, centered), behavior: "smooth" });
      }
    }
    setScrollToHighlight(null);
  }, [scrollTarget, references, setScrollToHighlight]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-paper">
      {/* Scrollable document area + minimap */}
      <div className="flex-1 relative min-h-0">
        {showLangFallback && (
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 ps-3 pe-1.5 py-1.5 rounded-md bg-warning-light text-warning text-xs font-medium shadow-sm animate-fade-in-up"
            role="status"
          >
            No translation in {language}. Showing {activeFile?.language}.
            <button
              onClick={() => setLangNoticeDismissed(true)}
              aria-label="Dismiss"
              className="shrink-0 p-0.5 rounded hover:bg-warning/15 transition-colors cursor-pointer"
            >
              <X size={12} />
            </button>
          </div>
        )}
        {/* PDF stays mounted (just hidden) under a rendition so it never has
            to reload + repaint when the user switches back. */}
        <div
          ref={containerRef}
          className={`absolute inset-0 overflow-auto flex flex-col items-center py-4 gap-4 ${renditionMode ? "hidden" : ""}`}
          style={{
            paddingLeft: 16,
            paddingRight: isMobile ? 16 : showMinimap ? 80 : 16,
          }}
          onMouseUp={handleTextSelect}
          onMouseDown={handleMouseDown}
        >
        <Document
          file={filePath}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center h-[56.25rem] bg-paper rounded-md" style={{ width: "100%", maxWidth: "56.25rem" }}>
              <p className="text-ink-muted text-sm">Loading document...</p>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center h-[56.25rem] bg-paper rounded-md gap-3" style={{ width: "100%", maxWidth: "56.25rem" }}>
              <p className="text-ink-muted text-sm">
                PDF not found. Place a sample.pdf in app/public/
              </p>
            </div>
          }
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
            <div
              key={pageNum}
              ref={(el) => {
                // DELETE on unmount, don't just set on mount. Without this the
                // map keeps detached nodes from the previously-rendered document
                // (the drawer preview swaps documents in place), so a page-jump
                // looked up page N, got a stale node that is no longer in the
                // DOM, and "scrolled" it — a silent no-op. That was the jump bug.
                if (el) pageRefs.current.set(pageNum, el);
                else pageRefs.current.delete(pageNum);
              }}
              className="relative mb-4"
              style={{
                boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
              }}
            >
              <Page
                pageNumber={pageNum}
                width={pageWidth}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
              <PageHighlights page={pageNum} />
            </div>
          ))}
        </Document>
        </div>
        {renditionMode && <DocumentRendition format={docFormat} />}
        {!isMobile && showMinimap && !renditionMode && <RefMinimap numPages={numPages} />}
      </div>

      {/* Bottom action bar — only on the main-pane viewer (no fileOverride).
          When the viewer is mounted inside a drawer to preview a specific
          file, the host drawer carries its own footer (Back / Download). */}
      {!fileOverride && !hideActionBar && (
        <ActionBar numPages={numPages} onScrollToPage={scrollToPage} rightSlot={actionBarMenu} showPager={!renditionMode} />
      )}

      {selection && (
        <FloatingMenu
          x={selection.screenX}
          y={selection.screenY}
          text={selection.text}
        />
      )}
    </div>
  );
}
