import { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo, ReactNode } from "react";
import { Document, Page } from "react-pdf";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { X } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { currentPageAtom, scrollToPageAtom, textSelectionAtom, documentFormatAtom } from "../../atoms/selection";
import {
  scrollToHighlightAtom,
  scopedReferencesAtom,
  activeRefIdAtom,
} from "../../atoms/references";
import { resultsCurrentPageAtom } from "../../atoms/library";
import { highlightRanges, highlightTerms } from "../../utils/queryTokens";
import { markSearchHits } from "../../utils/pdfTextHighlight";
import { breakpointAtom } from "../../atoms/viewport";
import { languageAtom } from "../../atoms/language";
import {
  filesAtom,
  documentGroupsAtom,
  activePrimaryGroupIdAtom,
  passageFileIdAtom,
} from "../../atoms/files";
import { MOCK_DOCUMENT_PDF } from "../../data/files";
import { PageHighlights } from "./PageHighlights";
import { FloatingMenu } from "./FloatingMenu";
import { ActionBar } from "./ActionBar";
import "../../utils/pdfWorker";
import { RefMinimap } from "./RefMinimap";
import { DocumentRendition } from "./DocumentRendition";
import { docHighlightQueryAtom } from "../../atoms/docSearch";
import { afterCameraMove, cameraMoving } from "../../utils/cameraMotion";


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

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_PHONE_DEFAULT = 2;
const ZOOM_STEPS = [1, 1.25, 1.5, 2, 2.5, 3, 4];
/** How far past the viewport pages are rendered, above and below: one and a
 *  half viewport heights, one or two pages each side. */
const RENDER_MARGIN = "150% 0px";
/** Rendered pages kept after they leave that range, most recent first. */
const PAGE_CACHE = 6;
/** A jump further than this many viewport heights lands at once. A smooth
 *  scroll across 80 pages would render pages it only passes. */
const SMOOTH_JUMP_SCREENS = 3;

export function DocumentViewer({ actionBarMenu, showMinimap = true, fileOverride, hideActionBar = false }: DocumentViewerProps = {}) {
  const [breakpoint] = useAtom(breakpointAtom);
  const isMobile = breakpoint === "mobile";
  // Every page's size at scale 1, read from pdf.js without rendering. Empty
  // until the document and its sizes have loaded.
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const [pageSizes, setPageSizes] = useState<{ w: number; h: number }[]>([]);
  const numPages = pageSizes.length;
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
  // Opened while the Library's camera eases to its record: the pages wait for
  // the ease to end (see `utils/cameraMotion.ts`).
  const [pdfReady, setPdfReady] = useState(() => !cameraMoving());
  useEffect(() => {
    if (!pdfReady) return afterCameraMove(() => setPdfReady(true));
  }, [pdfReady]);
  const docLoading = (
    <div data-part="loading" className="flex items-center justify-center h-[56.25rem] bg-paper rounded-md" style={{ width: "100%", maxWidth: "56.25rem" }}>
      <p className="text-ink-tertiary text-sm">Loading document…</p>
    </div>
  );
  const renditionMode = !fileOverride && docFormat !== "pdf";

  // Search-term marking over the PDF. `customTextRenderer` is react-pdf's
  // documented hook for this: it wraps matches inside the already-rendered text
  // layer, so marks align with the glyphs and survive zoom without us computing
  // a single rect. Terms come from the shared tokenizer, so what's marked here
  // is exactly what the snippet rows marked.
  const highlightQuery = useAtomValue(docHighlightQueryAtom);
  const activeJump = useAtomValue(resultsCurrentPageAtom);
  const searchTerms = useMemo(() => highlightTerms(highlightQuery), [highlightQuery]);
  const termsKey = searchTerms.join("\u0000");
  const activeJumpPage = activeJump?.page ?? null;
  // NOTE: this must depend ONLY on the terms. Folding the active page in here
  // changed the renderer's identity on every jump, which re-rendered every text
  // layer and reset the scroll container to 0 — the jump landed and was then
  // immediately undone. The emphasis is applied by CSS via `data-search-active`
  // on the page wrapper instead, so jumping never re-renders the text layer.
  const customTextRenderer = useMemo(
    () =>
      searchTerms.length === 0
        ? undefined
        : ({ str }: { str: string }) => markSearchHits(str, searchTerms),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [termsKey],
  );

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
  // A search passage's page refers to the file its text came from, which the
  // language pick below may not choose (a CEJIL entity's EN file can be another
  // judgment entirely). Honoured only while this entity has that file.
  const [passageFileId, setPassageFileId] = useAtom(passageFileIdAtom);
  const passageFile = useMemo(
    () => (passageFileId ? files.find((f) => f.id === passageFileId) ?? null : null),
    [files, passageFileId],
  );
  // Choosing a reading language is choosing the file again.
  const langRef = useRef(language);
  useEffect(() => {
    if (langRef.current === language) return;
    langRef.current = language;
    setPassageFileId(null);
  }, [language, setPassageFileId]);
  const activeFile = useMemo(() => {
    if (fileOverride) return fileOverride;
    if (passageFile) return passageFile;
    if (!resolvedActiveId) return null;
    const exact = files.find(
      (f) => f.groupId === resolvedActiveId && f.language === language,
    );
    if (exact) return exact;
    // No translation in this language — fall back to the first file in the
    // group so the viewer still renders something.
    return files.find((f) => f.groupId === resolvedActiveId) ?? null;
  }, [files, resolvedActiveId, language, fileOverride, passageFile]);
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

  /* Zoom, phones only (M21). Fit width on a 390px phone draws body text at
     about 5px, so a phone opens at 200% of fit (about 11px) and the action bar
     carries −, the % readout, + and Fit. Pinch zooms the pages only: the pages
     take `touch-action: pan-x pan-y`, a two-finger gesture scales them live
     with a CSS transform and re-renders at the new width on release; the
     viewport's own pinch is stopped by the viewport meta (M05). Desktop keeps
     its fit width. */
  const [zoom, setZoom] = useState(ZOOM_PHONE_DEFAULT);
  const fitWidth = isMobile ? containerWidth - 32 : Math.min(860, containerWidth - 48);
  const pageWidth = useMemo(() => Math.round(isMobile ? fitWidth * zoom : fitWidth), [isMobile, fitWidth, zoom]);

  // Keep the reading position through a zoom: remember where the view was as
  // a fraction of the content, restore it once the pages have the new size.
  const zoomAnchor = useRef<{ y: number; x: number } | null>(null);
  const applyZoom = useCallback((next: number) => {
    const el = containerRef.current;
    const z = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(next * 100) / 100));
    if (el) zoomAnchor.current = { y: (el.scrollTop + el.clientHeight / 2) / Math.max(1, el.scrollHeight), x: (el.scrollLeft + el.clientWidth / 2) / Math.max(1, el.scrollWidth) };
    setZoom(z);
  }, []);
  useLayoutEffect(() => {
    const el = containerRef.current;
    const a = zoomAnchor.current;
    if (!el || !a) return;
    zoomAnchor.current = null;
    const restore = () => {
      el.scrollTop = a.y * el.scrollHeight - el.clientHeight / 2;
      el.scrollLeft = a.x * el.scrollWidth - el.clientWidth / 2;
    };
    restore();
    requestAnimationFrame(() => requestAnimationFrame(restore));
  }, [pageWidth]);

  // Two-finger pinch on the pages: live transform, commit on release.
  const pinch = useRef<{ ids: Map<number, { x: number; y: number }>; start?: number; scale: number }>({ ids: new Map(), scale: 1 });
  const zoomLayer = useRef<HTMLDivElement>(null);
  const dist = (m: Map<number, { x: number; y: number }>) => {
    const [a, b] = [...m.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };
  const onPinchDown = (e: React.PointerEvent) => {
    if (!isMobile || e.pointerType !== "touch") return;
    pinch.current.ids.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.ids.size === 2) {
      pinch.current.start = dist(pinch.current.ids);
      const layer = zoomLayer.current, el = containerRef.current;
      if (layer && el) {
        const [a, b] = [...pinch.current.ids.values()];
        const r = layer.getBoundingClientRect();
        layer.style.transformOrigin = `${(a.x + b.x) / 2 - r.left}px ${(a.y + b.y) / 2 - r.top}px`;
      }
    }
  };
  const onPinchMove = (e: React.PointerEvent) => {
    const p = pinch.current;
    if (!p.ids.has(e.pointerId)) return;
    p.ids.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (p.ids.size !== 2 || !p.start) return;
    p.scale = Math.min(ZOOM_MAX / zoom, Math.max(ZOOM_MIN / zoom, dist(p.ids) / p.start));
    if (zoomLayer.current) zoomLayer.current.style.transform = `scale(${p.scale})`;
  };
  const onPinchUp = (e: React.PointerEvent) => {
    const p = pinch.current;
    if (!p.ids.delete(e.pointerId)) return;
    if (p.start && p.ids.size < 2) {
      if (zoomLayer.current) zoomLayer.current.style.transform = "";
      if (Math.abs(p.scale - 1) > 0.02) applyZoom(zoom * p.scale);
      p.start = undefined;
      p.scale = 1;
    }
  };

  // Pages are laid out before any of them renders: each gets a box of its exact
  // size, so the scroll height, the scrollbar and every page's offset are right
  // from the start, and a jump can land on a page nobody has rendered yet.
  const onDocumentLoadSuccess = useCallback((pdf: PDFDocumentProxy) => {
    pdfRef.current = pdf;
    setPdfDoc(pdf);
    Promise.all(
      Array.from({ length: pdf.numPages }, (_, i) =>
        pdf.getPage(i + 1).then((page) => {
          const v = page.getViewport({ scale: 1 });
          return { w: v.width, h: v.height };
        }),
      ),
    )
      .then((sizes) => {
        if (pdfRef.current === pdf) setPageSizes(sizes);
      })
      .catch(() => {});
  }, []);
  // A new file starts empty: the old sizes would lay out the wrong pages.
  useEffect(() => {
    pdfRef.current = null;
    setPdfDoc(null);
    setPageSizes([]);
  }, [filePath]);

  // ── Pages render on demand ───────────────────────────────────────────────
  // pdf.js draws a page's canvas and text layer in main-thread tasks of 100 ms
  // and more, and a 235-page judgment drawn at once held about 900 MB of
  // canvas. Only pages in or near the viewport mount a `Page`; the rest are
  // placeholders of the same size. Pages that leave the range stay mounted for
  // a while (`PAGE_CACHE`), so scrolling back a little does not redraw them.
  const [mountedPages, setMountedPages] = useState<number[]>([]);
  const mountedRef = useRef<number[]>([]);
  // Pages whose canvas has been drawn. Until then the placeholder shows and
  // reference highlights wait.
  const [paintedPages, setPaintedPages] = useState<ReadonlySet<number>>(() => new Set());
  const renditionRef = useRef(renditionMode);
  renditionRef.current = renditionMode;
  useEffect(() => {
    mountedRef.current = [];
    setMountedPages([]);
    setPaintedPages(new Set());
    const root = containerRef.current;
    if (!root || pageSizes.length === 0) return;
    const near = new Set<number>();
    let timer = 0;
    const commit = () => {
      timer = 0;
      // Behind a rendition the pane is `display:none` and every page reports
      // out of range. Keep what is rendered so switching back shows it at once.
      if (renditionRef.current || root.clientHeight === 0) return;
      const prev = mountedRef.current;
      const next = [
        ...[...near].sort((a, b) => a - b),
        ...prev.filter((p) => !near.has(p)).slice(0, PAGE_CACHE),
      ];
      if (next.length === prev.length && next.every((p, i) => p === prev[i])) return;
      mountedRef.current = next;
      setMountedPages(next);
      const keep = new Set(next);
      setPaintedPages((painted) => {
        const kept = new Set([...painted].filter((p) => keep.has(p)));
        return kept.size === painted.size ? painted : kept;
      });
    };
    // The root is the scroller itself, as in `PdfPageThumb`: `rootMargin` only
    // grows the root, so with the viewport as root the margin would do nothing.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const page = Number((e.target as HTMLElement).dataset.page);
          if (e.isIntersecting) near.add(page);
          else near.delete(page);
        }
        // At most one commit per 80 ms: a fast scroll passes pages that are in
        // range for a frame or two, and starting their render is wasted work.
        // The first one goes at once, so opening a document waits for nothing.
        if (mountedRef.current.length === 0) commit();
        else if (!timer) timer = window.setTimeout(commit, 80);
      },
      { root, rootMargin: RENDER_MARGIN },
    );
    pageRefs.current.forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, [pageSizes]);
  const mountedSet = useMemo(() => new Set(mountedPages), [mountedPages]);
  const markPainted = useCallback((page: number) => {
    setPaintedPages((painted) => (painted.has(page) ? painted : new Set(painted).add(page)));
  }, []);

  /** Smooth for a short move; at once for a long one (see `SMOOTH_JUMP_SCREENS`). */
  const jumpBehavior = useCallback((top: number): ScrollBehavior => {
    const el = containerRef.current;
    return el && Math.abs(top - el.scrollTop) > el.clientHeight * SMOOTH_JUMP_SCREENS ? "auto" : "smooth";
  }, []);

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
      screenBottom: rect.bottom,
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
      pageEl.scrollIntoView({ behavior: jumpBehavior(pageEl.offsetTop), block: "start" });
    }
  }, [jumpBehavior]);

  // ── Search matches ───────────────────────────────────────────────────────
  // The marks are innerHTML injected by `customTextRenderer`, so they exist only
  // on rendered pages. The count and the stepper work from the document's text
  // instead: read from pdf.js once per document, each text item run through the
  // same `highlightRanges` that `markSearchHits` uses, item by item as react-pdf
  // calls it. The k-th match counted on a page is the k-th mark its text layer
  // draws.
  const pageTexts = useRef<{ pdf: PDFDocumentProxy; texts: Promise<string[][]> } | null>(null);
  const [pageHitCounts, setPageHitCounts] = useState<number[]>([]);
  useEffect(() => {
    if (!pdfDoc || searchTerms.length === 0) {
      setPageHitCounts([]);
      return;
    }
    if (pageTexts.current?.pdf !== pdfDoc) {
      const pdf = pdfDoc;
      pageTexts.current = {
        pdf,
        texts: Promise.all(
          Array.from({ length: pdf.numPages }, (_, i) =>
            pdf
              .getPage(i + 1)
              .then((page) => page.getTextContent())
              .then((tc) => tc.items.map((item) => ("str" in item ? item.str : ""))),
          ),
        ),
      };
    }
    let live = true;
    pageTexts.current.texts
      .then((pages) => {
        if (!live) return;
        setPageHitCounts(
          pages.map((items) => items.reduce((n, str) => n + highlightRanges(str, searchTerms).length, 0)),
        );
      })
      .catch(() => {});
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, termsKey]);
  const hitCount = useMemo(() => pageHitCounts.reduce((n, c) => n + c, 0), [pageHitCounts]);

  // The match the stepper stands on, as its page and its place among that
  // page's marks. A position, not an element: the page may not be rendered yet,
  // and its marks are replaced each time it renders again.
  const [activeHit, setActiveHit] = useState<{ page: number; k: number } | null>(null);
  const activeHitPos = useRef(activeHit);
  activeHitPos.current = activeHit;
  // The mark currently carrying `data-search-active`.
  const activeHitRef = useRef<HTMLElement | null>(null);
  // Set by a step; cleared once its mark has been scrolled to.
  const hitScrollPending = useRef(false);
  const hitIndex = useMemo(() => {
    if (!activeHit) return -1;
    let i = activeHit.k;
    for (let p = 1; p < activeHit.page; p++) i += pageHitCounts[p - 1] ?? 0;
    return i;
  }, [activeHit, pageHitCounts]);

  /** Put the emphasis on the active match's mark, and scroll to it if a step
   *  is waiting. False when its page has not drawn its marks. */
  const showActiveHit = useCallback(() => {
    const hit = activeHitPos.current;
    if (!hit) return false;
    const el = pageRefs.current.get(hit.page)?.querySelectorAll<HTMLElement>(".pdf-search-hit")[hit.k];
    if (!el) return false;
    if (activeHitRef.current !== el) activeHitRef.current?.removeAttribute("data-search-active");
    el.setAttribute("data-search-active", "");
    activeHitRef.current = el;
    if (hitScrollPending.current) {
      hitScrollPending.current = false;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return true;
  }, []);

  // A page's text layer has drawn (on first render and every render after):
  // if the active match is on it, its new mark takes the emphasis.
  const onTextLayer = useCallback(
    (page: number) => {
      if (activeHitPos.current?.page === page) showActiveHit();
    },
    [showActiveHit],
  );

  // New terms ⇒ the text layers re-render and every mark is replaced.
  useEffect(() => {
    activeHitRef.current?.removeAttribute("data-search-active");
    activeHitRef.current = null;
    hitScrollPending.current = false;
    setActiveHit(null);
  }, [termsKey, pdfDoc]);

  // Scroll-to-page signal (from ToC clicks, Search-tab / Results snippet jumps).
  //
  // Every page has its final height from the start, so the target's offset is
  // known before it renders. What can still be missing is the page element: a
  // snippet jump swaps the drawer to this preview and fires while the document
  // and its sizes are still loading. So retry until the target exists and has
  // its height, then scroll. `pageRefs` is a ref, so this effect can't re-run
  // on mount — the frame loop is what waits.
  const [pageJump, setPageJump] = useAtom(scrollToPageAtom);
  useEffect(() => {
    if (!pageJump) return;
    // Behind a text/HTML rendition the PDF pane is `display:none` (it stays
    // mounted so switching back repaints instantly). Inside a hidden container
    // `scrollIntoView` does nothing and every page measures 0 tall. HOLD the
    // signal — don't consume it — and let `renditionMode` re-run this effect
    // when the pane is visible, so the jump lands then.
    if (renditionMode) return;
    const target = pageJump.page;
    let raf = 0;
    let attempts = 0;
    const MAX_ATTEMPTS = 240; // ~4s at 60fps — covers document load + page sizes
    const MIN_LAID_OUT = 40; // px: a laid-out page, not a collapsed one
    const tryScroll = () => {
      const cached = pageRefs.current.get(target);
      // `isConnected` rejects a node left over from a previously-rendered
      // document; `offsetHeight` rejects one that's mounted but not laid out.
      const pageEl = cached?.isConnected ? cached : undefined;
      if (pageEl && pageEl.offsetHeight > MIN_LAID_OUT) {
        // A match step aims at the MARK, not the top of its page — a hit near
        // the bottom would otherwise land off-screen and look like a miss. If
        // the page has not drawn its marks yet, it scrolls to the page and the
        // text layer's callback (`onTextLayer`) finishes on the mark.
        if (!(hitScrollPending.current && activeHitPos.current?.page === target && showActiveHit())) {
          pageEl.scrollIntoView({ behavior: jumpBehavior(pageEl.offsetTop), block: "start" });
        }
        setCurrentPage(target); // pager reflects the jump immediately
        setPageJump(null); // serviced — now it's safe to consume
      } else if (attempts++ < MAX_ATTEMPTS) {
        raf = requestAnimationFrame(tryScroll);
      }
      // NOTE: no give-up clear. This viewer is one of EIGHT mount sites and the
      // signal is global, so an instance that isn't rendering this document (a
      // hidden drawer preview, another tab's pane) also receives it — its
      // `pageRefs` are empty or detached and it can never service the jump. If
      // it cleared on give-up it would swallow the signal before the visible
      // viewer could act, which is exactly why clicking a hit did nothing. Only
      // the instance that actually scrolls consumes it; the rest leave it be.
    };
    tryScroll();
    return () => cancelAnimationFrame(raf);
  }, [pageJump, setPageJump, renditionMode, setCurrentPage, showActiveHit, jumpBehavior]);

  /** Move to the next (`1`) / previous (`-1`) match, wrapping at the ends. */
  const stepMatch = useCallback(
    (delta: 1 | -1) => {
      if (hitCount === 0) return;
      // First step from nowhere enters at the top going forward, at the bottom
      // going back; after that it wraps.
      const next =
        hitIndex < 0
          ? delta > 0
            ? 0
            : hitCount - 1
          : (hitIndex + delta + hitCount) % hitCount;
      let page = 1;
      let k = next;
      while (k >= (pageHitCounts[page - 1] ?? 0)) k -= pageHitCounts[page++ - 1] ?? 0;
      const hit = { page, k };
      setActiveHit(hit);
      activeHitPos.current = hit;
      hitScrollPending.current = true;

      // Emphasis moves with the step. Page-level `data-search-active` (set from
      // a Results jump) lights every hit on a page; the same attribute ON the
      // mark singles out the one you're standing on — see index.css. The scroll
      // goes through the page-jump signal: it waits out a document still
      // loading, and its NONCE is what makes stepping between two hits on the
      // same page fire at all (a bare page number wouldn't change the atom).
      setPageJump(page);
    },
    [hitCount, hitIndex, pageHitCounts, setPageJump],
  );

  // Find-next / find-previous keys (⌘G · Ctrl G · F3, shifted to go back).
  // ONLY the instance that owns the action bar listens: this viewer is mounted
  // in eight places and a document-level listener fires in all of them, so
  // every hidden pane would step its own hits into the one global page-jump
  // signal. `hitCount` narrows it further — an instance showing a document
  // without matches has nothing to step.
  const ownsChrome = !fileOverride && !hideActionBar && !renditionMode;
  useEffect(() => {
    if (!ownsChrome || hitCount === 0) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const findKey =
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "g") || e.key === "F3";
      if (!findKey) return;
      e.preventDefault();
      stepMatch(e.shiftKey ? -1 : 1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [ownsChrome, hitCount, stepMatch]);

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
        const top = Math.max(0, centered);
        container.scrollTo({ top, behavior: jumpBehavior(top) });
      }
    }
    setScrollToHighlight(null);
  }, [scrollTarget, references, setScrollToHighlight, jumpBehavior]);

  return (
    // `bleed-flush`: the viewer runs to the pane edge wherever it is hosted, so
    // hosts place it without a wrapper. Its page area is a stage (unasserted by
    // `__gutter`); its action bar puts the buttons back on the pane's gutter.
    <div data-component="DocumentViewer" className="bleed-flush flex flex-col h-full min-h-0 bg-paper">
      {/* A row of its own above the pages, not over them: laid over the stage
          it covered the top of the page a reference had just jumped to. */}
        {showLangFallback && (
          <div
            data-part="language-notice"
            className="self-center shrink-0 mt-2 flex items-center gap-1.5 ps-3 pe-1.5 py-1.5 rounded-md bg-warning-light text-warning-label text-xs font-medium shadow-sm animate-fade-in-up"
            role="status"
          >
            {/* `dir="auto"`: an English sentence inside the Arabic (RTL) layout
                otherwise reorders its full stops ("…AR. / .Showing EN"). */}
            <span dir="auto">
              {passageFile
                ? `Showing the ${activeFile?.language} file this passage was found in.`
                : `No translation in ${language}. Showing ${activeFile?.language}.`}
            </span>
            <button
              type="button"
              data-part="dismiss"
              onClick={() => setLangNoticeDismissed(true)}
              aria-label="Dismiss language notice"
              className="shrink-0 p-0.5 rounded hover:bg-warning/15 transition-colors cursor-pointer"
            >
              <X size={12} aria-hidden />
            </button>
          </div>
        )}
      {/* Scrollable document area + minimap */}
      <div data-gutter-bleed data-part="stage" className="flex-1 relative min-h-0">
        {/* PDF stays mounted (just hidden) under a rendition so it never has
            to reload + repaint when the user switches back. */}
        <div
          ref={containerRef}
          data-part="pages"
          data-state={renditionMode ? "hidden" : undefined}
          className={`absolute inset-0 overflow-auto flex flex-col body-top pb-4 gap-4 ${renditionMode ? "hidden" : ""}`}
          style={{
            paddingLeft: 16,
            paddingRight: isMobile ? 16 : showMinimap ? 80 : 16,
            // `safe`: a page wider than the pane (zoomed on a phone) starts at
            // the left edge and scrolls, instead of centring off-screen.
            alignItems: "safe center",
            touchAction: isMobile ? "pan-x pan-y" : undefined,
          }}
          onMouseUp={handleTextSelect}
          onMouseDown={handleMouseDown}
          onPointerDown={onPinchDown}
          onPointerMove={onPinchMove}
          onPointerUp={onPinchUp}
          onPointerCancel={onPinchUp}
        >
        <div ref={zoomLayer} data-part="zoom-layer" className="flex flex-col gap-4" style={{ alignItems: "safe center" }}>
        {!pdfReady ? (
          docLoading
        ) : (
        <Document
          file={filePath}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={docLoading}
          error={
            <div data-part="error" className="flex flex-col items-center justify-center h-[56.25rem] bg-paper rounded-md gap-3" style={{ width: "100%", maxWidth: "56.25rem" }}>
              <p className="text-ink-tertiary text-sm">
                PDF not found. Place a sample.pdf in app/public/
              </p>
            </div>
          }
        >
          {numPages === 0 && docLoading}
          {pageSizes.map(({ w, h }, i) => {
            const pageNum = i + 1;
            const mounted = mountedSet.has(pageNum);
            const painted = mounted && paintedPages.has(pageNum);
            return (
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
                data-part="page"
                data-page={pageNum}
                data-state={painted ? "rendered" : mounted ? "loading" : "placeholder"}
                // `scroll-mt-8`: a jump lands with the gap above the page in
                // view, where a page-level reference's name is drawn.
                className="relative mb-4 scroll-mt-8"
                data-search-active={activeJumpPage === pageNum ? "" : undefined}
                style={{
                  // react-pdf floors the canvas to whole pixels; so does the box,
                  // so nothing moves when the page renders into it.
                  width: pageWidth,
                  height: Math.floor((pageWidth * h) / w),
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
                }}
              >
                {!painted && <PagePlaceholder page={pageNum} loading={mounted} />}
                {mounted && (
                  <ViewerPage
                    pageNumber={pageNum}
                    width={pageWidth}
                    customTextRenderer={customTextRenderer}
                    onPainted={markPainted}
                    onTextLayer={onTextLayer}
                  />
                )}
                <PageHighlights page={pageNum} rendered={painted} />
              </div>
            );
          })}
        </Document>
        )}
        </div>
        </div>
        {renditionMode && <DocumentRendition format={docFormat} />}
        {!isMobile && showMinimap && !renditionMode && <RefMinimap numPages={numPages} />}
      </div>

      {/* Bottom action bar — only on the main-pane viewer (no fileOverride).
          When the viewer is mounted inside a drawer to preview a specific
          file, the host drawer carries its own footer (Back / Download). */}
      {!fileOverride && !hideActionBar && (
        <ActionBar
          numPages={numPages}
          onScrollToPage={scrollToPage}
          rightSlot={actionBarMenu}
          zoom={
            isMobile && !renditionMode
              ? {
                  percent: Math.round(zoom * 100),
                  onOut: () => applyZoom([...ZOOM_STEPS].reverse().find((s) => s < zoom - 0.01) ?? ZOOM_MIN),
                  onIn: () => applyZoom(ZOOM_STEPS.find((s) => s > zoom + 0.01) ?? ZOOM_MAX),
                  onFit: () => applyZoom(1),
                  canOut: zoom > ZOOM_MIN,
                  canIn: zoom < ZOOM_MAX,
                }
              : undefined
          }
          showPager={!renditionMode}
          // Mounted on the QUERY, like the pager is on the format — a deliberate
          // user action, not a count that pops in mid-read. Hits arrive as pages
          // paint, so it can read `0 / 0` for a beat on a cold document.
          matchNav={
            searchTerms.length > 0 && !renditionMode
              ? {
                  index: hitIndex + 1,
                  count: hitCount,
                  onPrev: () => stepMatch(-1),
                  onNext: () => stepMatch(1),
                }
              : undefined
          }
        />
      )}

      {selection && (
        <FloatingMenu
          x={selection.screenX}
          y={selection.screenY}
          yBelow={selection.screenBottom}
          text={selection.text}
        />
      )}
    </div>
  );
}

/** A page that is not rendered: its number on a blank sheet of the page's size.
 *  `loading` while its `Page` is mounted and drawing. */
function PagePlaceholder({ page, loading }: { page: number; loading: boolean }) {
  return (
    <div
      data-part="page-placeholder"
      data-state={loading ? "loading" : undefined}
      aria-hidden
      className="absolute inset-0 grid place-items-center bg-paper"
    >
      <span className={`text-xs tabular-nums text-ink-tertiary ${loading ? "motion-safe:animate-pulse" : ""}`}>
        {page}
      </span>
    </div>
  );
}

/** One rendered page. Its callbacks are bound to the page number here because
 *  react-pdf redraws the text layer whenever `onRenderTextLayerSuccess`
 *  changes identity; an inline arrow at the call site would redraw every
 *  mounted page on each render of the viewer. */
function ViewerPage({
  pageNumber,
  width,
  customTextRenderer,
  onPainted,
  onTextLayer,
}: {
  pageNumber: number;
  width: number;
  customTextRenderer?: (item: { str: string }) => string;
  onPainted: (page: number) => void;
  onTextLayer: (page: number) => void;
}) {
  const painted = useCallback(() => onPainted(pageNumber), [onPainted, pageNumber]);
  const textLayer = useCallback(() => onTextLayer(pageNumber), [onTextLayer, pageNumber]);
  return (
    <Page
      pageNumber={pageNumber}
      width={width}
      // The placeholder under the page is the loading state.
      loading={null}
      renderTextLayer={true}
      customTextRenderer={customTextRenderer}
      onRenderSuccess={painted}
      // The marks only exist once this layer paints, so this is when the
      // active match's mark can take its emphasis.
      onRenderTextLayerSuccess={textLayer}
      renderAnnotationLayer={true}
    />
  );
}
