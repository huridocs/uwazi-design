import { useState, useRef, useCallback, useEffect, useMemo, ReactNode } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useAtom, useSetAtom } from "jotai";
import { currentPageAtom, textSelectionAtom } from "../../atoms/selection";
import { scrollToHighlightAtom, referencesAtom, activeRefIdAtom } from "../../atoms/references";
import { breakpointAtom } from "../../atoms/viewport";
import { PageHighlights } from "./PageHighlights";
import { FloatingMenu } from "./FloatingMenu";
import { ActionBar } from "./ActionBar";
import { RefMinimap } from "./RefMinimap";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface DocumentViewerProps {
  /** Optional left slot for the action bar — used to inject the mobile sheet trigger */
  actionBarLeft?: ReactNode;
}

export function DocumentViewer({ actionBarLeft }: DocumentViewerProps = {}) {
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

  // Scroll to highlight centered in viewport
  const [scrollTarget] = useAtom(scrollToHighlightAtom);
  useEffect(() => {
    if (!scrollTarget) return;
    const ref = references.find((r) => r.id === scrollTarget);
    if (ref) {
      const pageEl = pageRefs.current.get(ref.sourceSelection.page);
      const container = containerRef.current;
      if (pageEl && container) {
        const highlightY = pageEl.offsetTop + pageEl.offsetHeight * ref.sourceSelection.top;
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
        <div
          ref={containerRef}
          className="absolute inset-0 overflow-auto flex flex-col items-center py-4 gap-4"
          style={{ backgroundColor: "var(--bg-warm)", paddingRight: isMobile ? 16 : 80 }}
          onMouseUp={handleTextSelect}
          onMouseDown={handleMouseDown}
        >
        <Document
          file="/sample.pdf"
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
        {!isMobile && <RefMinimap numPages={numPages} />}
      </div>

      {/* Bottom action bar */}
      <ActionBar numPages={numPages} onScrollToPage={scrollToPage} leftSlot={actionBarLeft} />

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
