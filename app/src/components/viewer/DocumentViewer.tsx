import { useState, useRef, useCallback, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useAtom, useSetAtom } from "jotai";
import { currentPageAtom, textSelectionAtom } from "../../atoms/selection";
import { scrollToHighlightAtom, referencesAtom } from "../../atoms/references";
import { PageHighlights } from "./PageHighlights";
import { FloatingMenu } from "./FloatingMenu";
import { ActionBar } from "./ActionBar";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function DocumentViewer() {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useAtom(currentPageAtom);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [selection, setSelection] = useAtom(textSelectionAtom);
  const setScrollToHighlight = useSetAtom(scrollToHighlightAtom);
  const [references] = useAtom(referencesAtom);

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
  }, [setSelection]);

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

  // Scroll to page when clicking ref in panel
  const [scrollTarget] = useAtom(scrollToHighlightAtom);
  useEffect(() => {
    if (scrollTarget) {
      const ref = references.find((r) => r.id === scrollTarget);
      if (ref) {
        scrollToPage(ref.sourceSelection.page);
      }
      setScrollToHighlight(null);
    }
  }, [scrollTarget, references, setScrollToHighlight, scrollToPage]);

  return (
    <div className="flex flex-col h-full min-h-0 bg-paper">
      {/* Scrollable document area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex flex-col items-center py-4 gap-4"
        style={{ backgroundColor: "#FCFAF8" }}
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
                width={Math.min(860, window.innerWidth - 520)}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
              <PageHighlights page={pageNum} />
            </div>
          ))}
        </Document>
      </div>

      {/* Bottom action bar */}
      <ActionBar numPages={numPages} onScrollToPage={scrollToPage} />

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
