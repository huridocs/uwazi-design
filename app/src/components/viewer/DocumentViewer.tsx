import { useState, useRef, useCallback, useEffect, useMemo, ReactNode } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { currentPageAtom, scrollToPageAtom, textSelectionAtom, documentFormatAtom } from "../../atoms/selection";
import { scrollToHighlightAtom, referencesAtom, activeRefIdAtom } from "../../atoms/references";
import { breakpointAtom } from "../../atoms/viewport";
import { languageAtom } from "../../atoms/language";
import {
  filesAtom,
  documentGroupsAtom,
  activePrimaryGroupIdAtom,
} from "../../atoms/files";
import { PageHighlights } from "./PageHighlights";
import { FloatingMenu } from "./FloatingMenu";
import { ActionBar } from "./ActionBar";
import { RefMinimap } from "./RefMinimap";
import { DocumentRendition } from "./DocumentRendition";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
}

export function DocumentViewer({ actionBarMenu, showMinimap = true, fileOverride }: DocumentViewerProps = {}) {
  const [breakpoint] = useAtom(breakpointAtom);
  const isMobile = breakpoint === "mobile";
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [selection, setSelection] = useAtom(textSelectionAtom);
  const setScrollToHighlight = useSetAtom(scrollToHighlightAtom);
  const setActiveRefId = useSetAtom(activeRefIdAtom);
  const [references] = useAtom(referencesAtom);
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
  const filePath =
    activeFile?.url ??
    "/docs/Velasquez-Rodriguez_v_Honduras_Judgment_1988_EN.pdf";
  const showLangFallback =
    !fileOverride && activeFile !== null && activeFile.language !== language;

  // Measure container width for responsive PDF scaling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerWidth(entry.contentRect.width);
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

    // Find which page this selection is in
    let page = currentPage;
    const anchorNode = sel.anchorNode;
    if (anchorNode) {
      const pageEl = (anchorNode instanceof HTMLElement ? anchorNode : anchorNode.parentElement)
        ?.closest("[data-page-number]");
      if (pageEl) {
        page = parseInt(pageEl.getAttribute("data-page-number") || "1", 10);
      }
    }

    setSelection({
      text,
      page,
      rect: { top: 0, left: 0, width: 0, height: 0 },
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

  // Scroll-to-page signal (from ToC clicks etc.)
  const [pageJump, setPageJump] = useAtom(scrollToPageAtom);
  useEffect(() => {
    if (pageJump === null) return;
    const pageEl = pageRefs.current.get(pageJump);
    if (pageEl) pageEl.scrollIntoView({ behavior: "smooth", block: "start" });
    setPageJump(null);
  }, [pageJump, setPageJump]);

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
            className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-md bg-warning-light text-warning text-xs font-medium shadow-sm animate-fade-in-up"
            role="status"
          >
            No translation in {language}. Showing {activeFile?.language}.
          </div>
        )}
        {renditionMode ? (
          <DocumentRendition format={docFormat} />
        ) : (
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-auto flex flex-col items-center py-4 gap-4"
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
            <div className="flex items-center justify-center h-[900px] bg-paper rounded-md" style={{ width: "100%", maxWidth: 900 }}>
              <p className="text-ink-muted text-sm">Loading document...</p>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center h-[900px] bg-paper rounded-md gap-3" style={{ width: "100%", maxWidth: 900 }}>
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
                if (el) pageRefs.current.set(pageNum, el);
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
        )}
        {!isMobile && showMinimap && !renditionMode && <RefMinimap numPages={numPages} />}
      </div>

      {/* Bottom action bar — only on the main-pane viewer (no fileOverride).
          When the viewer is mounted inside a drawer to preview a specific
          file, the host drawer carries its own footer (Back / Download). */}
      {!fileOverride && (
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
