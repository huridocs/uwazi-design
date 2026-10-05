import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { CheckSquare, FileDown, FileUp, MoreHorizontal, Plus, Search, Upload, X } from "lucide-react";
import { settingsAccessAtom } from "../atoms/settings";
import { dataSourceAtom, libraryEntitiesAtom, libraryTypesAtom, cejilReadyAtom, travesiaReadyAtom } from "../atoms/dataSource";
import { discardDraftAtom, draftEntityIdAtom, recentTemplatesAtom, startDraftAtom } from "../atoms/entityChanges";
import { NewImportModal } from "../components/import-csv/NewImportModal";
import { useRegisterCsvImport } from "../hooks/useRegisterCsvImport";
import { editSessionOpenAtom } from "../atoms/dirtyGuard";
import { CreateEntityDialog } from "../components/library/CreateEntityDialog";
import { CreateEntityButton } from "../components/library/CreateEntityButton";
import { BatchEntryModal } from "../components/library/BatchEntryModal";
import { isPdf, runCsvExport, runPdfUploadBatch } from "../utils/libraryTasks";
import { defaultTemplateId, uploadTemplateId } from "../utils/createEntity";
import { UploadDocumentsModal } from "../components/library/UploadDocumentsModal";
import { loadCejilData, cejilRelsByEntity } from "../data/cejil/load";
import { cejilDefaultEntityId } from "../data/cejil/defaultEntity";
import { isCejilEntity } from "../data/cejil/profile";
import { focusCollectionDefaultAtom } from "../atoms/focusedEntity";
import { loadTravesiaData, travesiaRelsByEntity } from "../data/travesia/load";
import { referencesAtom } from "../atoms/references";
import { languageAtom, type Language } from "../atoms/language";
import { uiLanguageAtom } from "../atoms/uiLanguage";
import { t } from "../utils/i18n";
import { breakpointAtom } from "../atoms/viewport";
import { openEntityAtom, focusEntityForPreviewAtom } from "../atoms/focusedEntity";
import { scrollToPageAtom } from "../atoms/selection";
import { useNotify } from "../hooks/useNotify";
import { useDirtyGuard } from "../hooks/useDirtyGuard";
import {
  ALL_MATCH_TYPES,
  clearLibraryFacetsAtom,
  clearLibrarySearchAtom,
  clearSelectionAtom,
  collapseSelectionAtom,
  defaultSortDir,
  libraryActiveFilterCountAtom,
  libraryCardInfoAtom,
  libraryCardSideAtom,
  libraryChainFiltersAtom,
  libraryCountryFiltersAtom,
  libraryCountryModeAtom,
  libraryDateFromAtom,
  libraryDateToAtom,
  libraryDescriptorFiltersAtom,
  libraryDescriptorModeAtom,
  libraryDrawnIdsAtom,
  libraryFieldColumnsAtom,
  libraryPropertySortsAtom,
  libraryHasDocAtom,
  libraryInheritedFiltersAtom,
  libraryLanguageInMenuAtom,
  libraryListColumnsAtom,
  libraryListDensityAtom,
  libraryQueryAtom,
  libraryResultsSheetOpenAtom,
  librarySearchDraftAtom,
  librarySelectModeAtom,
  librarySelectedClusterAtom,
  libraryOpenEntityIdAtom,
  librarySelectionActiveAtom,
  librarySelectionDrawerOpenAtom,
  librarySortAtom,
  librarySortDirAtom,
  librarySortInMenuAtom,
  libraryStatusFiltersAtom,
  libraryThumbFrameAtom,
  libraryThumbSizeAtom,
  libraryCardColumnsAtom,
  libraryCardColumnsInEffectAtom,
  libraryTimeHubAtom,
  libraryTypeFiltersAtom,
  libraryViewModeAtom,
  matchTypeFiltersAtom,
  rangeSelectionAtom,
  logSearchAtom,
  requestMetadataFocusAtom,
  resultsCurrentPageAtom,
  setSelectionAnchorAtom,
  submitLibrarySearchAtom,
  toggleSelectionAtom,
} from "../atoms/library";
import {
  EntitySelectBox,
  currentSelectionOrder,
  selectionIntent,
  useSelectionOrder,
  useTouchSelection,
  lastPointerWasTouch,
} from "../components/library/EntitySelectBox";
import { ActionsSheet, LibrarySelectionBar } from "../components/library/LibrarySelectionBar";
import { LibrarySelectionDrawer } from "../components/library/LibrarySelectionDrawer";
import { getEntity, getEntityType, type Entity, type EntityImage } from "../data/entities";
import { passageFileIdAtom } from "../atoms/files";
import { libraryInheritedDefs } from "../utils/libraryFacets";
import { buildActiveChains, cejilChainGraph } from "../data/cejil/chainFacets";
import { matchesAll, matchesSearch, passesMatchTypes, buildSearchIndex, type LibraryFilterState } from "../utils/libraryFilter";
import { highlightTerms, parseSearchQuery } from "../utils/queryTokens";
import { scoreRelevance, type RelevanceBreakdown } from "../utils/relevance";
import { matchCategoriesWithTerms, passageFileId, type MatchCategories } from "../utils/librarySnippets";
import { AdaptiveSplitView } from "../components/layout/AdaptiveSplitView";
import { EntityCard } from "../components/library/EntityCard";
import { ImageLightbox } from "../components/shared/ImageLightbox";
import { entityCardFields } from "../utils/entityFields";
import { entityPropertyValues } from "../utils/propertyValues";
import { parseDateValue } from "../utils/dateValue";
import { MatchOrigin } from "../components/library/MatchOrigin";
import { listColumnSpecs, buildListColumns } from "../components/library/listColumns";
import { LIBRARY_SORTS } from "../data/libraryDisplay";
// Lazy: react-simple-maps and the world atlas are the largest static chunk and
// only the map view needs them.
const LibraryMapView = lazy(() =>
  import("../components/library/LibraryMapView").then((m) => ({ default: m.LibraryMapView })),
);
import { LibraryTimelineView } from "../components/library/LibraryTimelineView";
import { TimeBrush } from "../components/library/TimeBrush";
import { LibraryFilters } from "../components/library/LibraryFilters";
import { LibraryClusterDrawer } from "../components/library/LibraryClusterDrawer";
import { EntityDrawerPreview } from "../components/library/EntityDrawerPreview";
import { MobileBottomSheet } from "../components/layout/MobileBottomSheet";
import { DrawerTabs } from "../components/layout/DrawerTabs";
import { ResultsBody } from "../components/library/ResultsSnippets/ResultsBody";
import { ResultsMainView } from "../components/library/ResultsSnippets/ResultsMainView";
import { SearchTipsPopover } from "../components/library/SearchTipsPopover";
import { RecentSearches } from "../components/library/RecentSearches";
import { LibraryDisplayMenu } from "../components/library/LibraryDisplayMenu";
import { ActiveSearchChip } from "../components/library/ActiveSearchChip";
import { ActiveFiltersButton } from "../components/library/ActiveFiltersButton";
import { DataTable, type Column } from "../components/shared/DataTable";
import { HighlightedText } from "../components/shared/HighlightedText";
import { Select } from "../components/shared/Select";
import { MobileEntityList } from "../components/library/MobileEntityList";
import { ViewSwitcher } from "../components/library/ViewSwitcher";
import { DRAWER_MIN_WIDTH } from "../hooks/useDrawerWidth";
import { BAR_GHOST, BAR_LEAD } from "../components/shared/warmButton";
import { BarDivider } from "../components/shared/BarDivider";
import { useTapGuard } from "../hooks/useTapGuard";
import { previewEntityIdAtom } from "../atoms/entityPreview";

const LANGUAGES: Language[] = ["EN", "ES", "FR", "AR"];

/** Sort keys, shared by the toolbar Select and the Display popover (where Sort
 *  goes when the row is too narrow). */
/** Two property values in sort order: as dates where both read as dates, as
 *  numbers where both are numbers, else as text. */
function compareValues(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (a.trim() !== "" && b.trim() !== "" && Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  const da = parseDateValue(a);
  const db = parseDateValue(b);
  if (da && db) return da.getTime() - db.getTime();
  return a.localeCompare(b);
}

export const SORTS = LIBRARY_SORTS.map((c) => ({ value: c.id, label: c.label }));

/** How long the query must stay unchanged before it is recorded in recent
 *  searches: long enough to skip the partial queries typed on the way. */
const SETTLE_MS = 1200;

/** How many cards to reveal per page in the Library grid/list. */
const DISPLAY_STEP = 120;

/** Stable identities for the fields a row already marks: a fresh literal per
 *  row would re-run every `MatchOrigin` match scan on every render. */
const TITLE_ONLY = ["title"] as const;
const TITLE_AND_COUNTRY = ["title", "country"] as const;

export function LibraryView() {
  const entities = useAtomValue(libraryEntitiesAtom);
  const dataSource = useAtomValue(dataSourceAtom);
  // Chrome language (not `languageAtom`, the content language below): the
  // masthead's t() labels re-render when the navbar switcher changes it.
  useAtomValue(uiLanguageAtom);
  const [cejilReady, setCejilReady] = useAtom(cejilReadyAtom);
  // Fetch the CEJIL corpus the first time the source is selected. `cejilRetry`
  // re-runs the effect after a failed load; the loader clears its cached promise
  // on rejection, so a retry refetches.
  const [cejilError, setCejilError] = useState(false);
  const [cejilRetry, setCejilRetry] = useState(0);
  useEffect(() => {
    if (dataSource === "cejil" && !cejilReady) {
      let alive = true;
      setCejilError(false);
      loadCejilData().then(
        () => {
          if (!alive) return;
          // The loader starts the search warm-up itself (`warmSearchScan`).
          setCejilReady(true);
        },
        () => alive && setCejilError(true),
      );
      return () => {
        alive = false;
      };
    }
  }, [dataSource, cejilReady, setCejilReady, cejilRetry]);
  // The CEJIL collection's default entity (Blake), focused once the corpus is
  // here unless the reader is already on a CEJIL record.
  const focusCollectionDefault = useSetAtom(focusCollectionDefaultAtom);
  useEffect(() => {
    if (dataSource !== "cejil" || !cejilReady) return;
    const id = cejilDefaultEntityId();
    if (id) focusCollectionDefault({ entityId: id, inCollection: isCejilEntity });
  }, [dataSource, cejilReady, focusCollectionDefault]);
  // Travesía loads the same way: on first pick, sharing the error/retry state
  // (only one lazy source is ever selected at a time).
  const [travesiaReady, setTravesiaReady] = useAtom(travesiaReadyAtom);
  useEffect(() => {
    if (dataSource === "travesia" && !travesiaReady) {
      let alive = true;
      setCejilError(false);
      loadTravesiaData().then(
        () => alive && setTravesiaReady(true),
        () => alive && setCejilError(true),
      );
      return () => {
        alive = false;
      };
    }
  }, [dataSource, travesiaReady, setTravesiaReady, cejilRetry]);
  // `cejilLoading` covers every lazy source: the selected corpus is still loading.
  const cejilLoading =
    (dataSource === "cejil" && !cejilReady) || (dataSource === "travesia" && !travesiaReady);
  const lazyName = dataSource === "travesia" ? "Red Travesía" : "CEJIL";
  const references = useAtomValue(referencesAtom);
  // Filtering, ranking, match categories and highlighting read `query` (the
  // committed search). Only the input binds to the draft.
  const committedQuery = useAtomValue(libraryQueryAtom);
  // `query` is deferred: while a new query's results compute, React keeps
  // rendering the previous result set, so the pane stays interactive instead of
  // blocking the keystroke on a re-rank of the whole corpus.
  const deferredQuery = useDeferredValue(committedQuery);
  // Clearing skips the deferral. `clearLibrarySearchAtom` empties the chip
  // urgently; a deferred value would keep the cards and the "N results for"
  // readout on the old query for a render, with no query after "for".
  const query = committedQuery ? deferredQuery : "";
  // The results on screen are for `query`, not yet `committedQuery`: the
  // readout dims and sets `aria-busy` while they differ.
  const searchPending = query !== committedQuery;
  const [searchDraft, setSearchDraft] = useAtom(librarySearchDraftAtom);
  const clearSearch = useSetAtom(clearLibrarySearchAtom);
  const recordSearch = useSetAtom(logSearchAtom);
  const submitSearch = useSetAtom(submitLibrarySearchAtom);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  // Results activates when a query starts and Filters when it is cleared; in
  // between the user can switch tabs by hand.
  const [drawerTab, setDrawerTab] = useState<"filters" | "results">("filters");
  const [typeFilters, setTypeFilters] = useAtom(libraryTypeFiltersAtom);
  const [hasDocOnly, setHasDocOnly] = useAtom(libraryHasDocAtom);
  const [statusFilters, setStatusFilters] = useAtom(libraryStatusFiltersAtom);
  const [countryFilters, setCountryFilters] = useAtom(libraryCountryFiltersAtom);
  const countryMode = useAtomValue(libraryCountryModeAtom);
  const [descriptorFilters, setDescriptorFilters] = useAtom(libraryDescriptorFiltersAtom);
  const descriptorMode = useAtomValue(libraryDescriptorModeAtom);
  const [dateFrom, setDateFrom] = useAtom(libraryDateFromAtom);
  const [dateTo, setDateTo] = useAtom(libraryDateToAtom);
  const [inheritedFilters, setInheritedFilters] = useAtom(libraryInheritedFiltersAtom);
  const [chainFilters, setChainFilters] = useAtom(libraryChainFiltersAtom);
  const activeFilterCount = useAtomValue(libraryActiveFilterCountAtom);
  const [viewMode, setViewMode] = useAtom(libraryViewModeAtom);
  const cardInfo = useAtomValue(libraryCardInfoAtom);
  const listColumnOn = useAtomValue(libraryListColumnsAtom);
  const listDensity = useAtomValue(libraryListDensityAtom);
  const fieldColumns = useAtomValue(libraryFieldColumnsAtom);
  const propertySorts = useAtomValue(libraryPropertySortsAtom);
  const thumbFrame = useAtomValue(libraryThumbFrameAtom);
  const thumbSize = useAtomValue(libraryThumbSizeAtom);
  const cardSide = useAtomValue(libraryCardSideAtom);
  const cardColumns = useAtomValue(libraryCardColumnsAtom);
  const setColsInEffect = useSetAtom(libraryCardColumnsInEffectAtom);
  /* The column count follows the pane, not the viewport.
     Auto: `auto-fill` over a readable minimum card width per frame, so a pane
     narrowed by the drawer drops a column instead of shrinking cards (landscape
     21.5rem: 3 columns in a 1400px pane, as on main; portrait 13.5rem). Side
     cards keep their size-stepped minimums, because Size sets their picture
     width. Thumbnail size no longer changes the count otherwise.
     A chosen count (Display › Columns) is a ceiling: each column is the larger
     of the pane's 1/N share and a floor, so the grid draws N while cards stay
     readable and fewer when they would not. Phones stay at 1–2. The 0.5px
     keeps rounding from turning N into N−1. Static class strings for Auto
     (Tailwind reads class names); the count path is an inline style. */
  const portrait = !cardSide && thumbFrame === "portrait" && cardInfo.preview;
  const cardGridCols = cardSide
    ? {
        s: "grid-cols-[repeat(auto-fill,minmax(min(24rem,100%),1fr))]",
        m: "grid-cols-[repeat(auto-fill,minmax(min(29rem,100%),1fr))]",
        l: "grid-cols-[repeat(auto-fill,minmax(min(33rem,100%),1fr))]",
      }[thumbSize]
    : portrait
      ? "grid-cols-[repeat(auto-fill,minmax(min(13.5rem,100%),1fr))]"
      : "grid-cols-[repeat(auto-fill,minmax(min(21.5rem,100%),1fr))]";
  const phone = useAtomValue(breakpointAtom) === "mobile";
  const colCount = cardColumns === "auto" ? null : phone ? Math.min(cardColumns, 2) : cardColumns;
  const colFloor = phone ? (portrait ? "8rem" : "10.5rem") : cardSide ? "20rem" : portrait ? "9.5rem" : "15rem";
  const cardGridStyle = colCount
    ? { gridTemplateColumns: `repeat(auto-fill, minmax(max(min(${colFloor}, 100%), calc((100% - ${colCount - 1} * 0.75rem) / ${colCount} - 0.5px)), 1fr))` }
    : undefined;
  // What the grid drew, for the menu's "in effect" line. A callback ref
  // attaches the observer whenever the grid mounts (it unmounts in other views
  // and with no results); the effect re-measures when the template changes
  // without a resize. LibraryView re-renders per keystroke, so neither runs
  // per render.
  const cardGridEl = useRef<HTMLUListElement | null>(null);
  const cardGridRO = useRef<ResizeObserver | null>(null);
  const measureCols = useCallback(() => {
    const ul = cardGridEl.current;
    if (ul) setColsInEffect(getComputedStyle(ul).gridTemplateColumns.split(" ").filter(Boolean).length);
  }, [setColsInEffect]);
  const cardGridRef = useCallback(
    (ul: HTMLUListElement | null) => {
      cardGridRO.current?.disconnect();
      cardGridEl.current = ul;
      if (!ul) return;
      measureCols();
      cardGridRO.current = new ResizeObserver(measureCols);
      cardGridRO.current.observe(ul);
    },
    [measureCols],
  );
  useEffect(measureCols, [measureCols, colCount, colFloor, cardGridCols]);
  /* One lightbox for the whole grid; see `EntityCard.onOpenImage`. */
  const [lightbox, setLightbox] = useState<EntityImage | null>(null);

  const timeHub = useAtomValue(libraryTimeHubAtom);
  const [sort, setSort] = useAtom(librarySortAtom);
  const [sortDir, setSortDir] = useAtom(librarySortDirAtom);
  const setSortKey = useCallback(
    (key: typeof sort) =>
      setSort((prev) => {
        if (prev === key) {
          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
          return prev;
        }
        setSortDir(defaultSortDir(key));
        return key;
      }),
    [setSort, setSortDir],
  );
  const [language, setLanguage] = useAtom(languageAtom);
  const breakpoint = useAtomValue(breakpointAtom);
  const [selectedId, setSelectedId] = useAtom(libraryOpenEntityIdAtom);
  const selectedCluster = useAtomValue(librarySelectedClusterAtom);
  const openEntity = useSetAtom(openEntityAtom);
  const draftId = useAtomValue(draftEntityIdAtom);
  const setSelectMode = useSetAtom(librarySelectModeAtom);
  const discardDraft = useSetAtom(discardDraftAtom);
  const setOverlayEntity = useSetAtom(previewEntityIdAtom);
  const focusForPreview = useSetAtom(focusEntityForPreviewAtom);
  const setScrollToPage = useSetAtom(scrollToPageAtom);
  const setPassageFile = useSetAtom(passageFileIdAtom);
  const setResultsActivePage = useSetAtom(resultsCurrentPageAtom);
  const setFocusMetadataField = useSetAtom(requestMetadataFocusAtom);
  const clearFacets = useSetAtom(clearLibraryFacetsAtom);
  const [matchTypes, setMatchTypes] = useAtom(matchTypeFiltersAtom);
  const notify = useNotify();
  const guard = useDirtyGuard();

  /* ── Footer actions ───────────────────────────────────────────────────── */
  const store = useStore();
  const libraryTypes = useAtomValue(libraryTypesAtom);
  const startDraft = useSetAtom(startDraftAtom);
  // Import CSV opens its modal over the Library; the import then runs as a
  // Beacon task instead of taking the reader to the Import CSV screen.
  const [importOpen, setImportOpen] = useState(false);
  // Import CSV is for admins (Uwazi: adminsOnlyRoute and an admin-only link).
  const canImport = useAtomValue(settingsAccessAtom)("import-csv");
  const registerImport = useRegisterCsvImport();
  const handleImportCsv = (filename: string, templateId: string) => {
    setImportOpen(false);
    registerImport(filename, templateId);
  };
  const [createOpen, setCreateOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [phoneActionsOpen, setPhoneActionsOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  /** Create entity: the chosen template opens as a draft in the drawer, on its
   *  edit form. Guarded — the drawer may be holding another entity's edit. */
  const recentTemplates = useAtomValue(recentTemplatesAtom);
  const handleCreate = (typeId: string) => {
    setCreateOpen(false);
    guard(() => setSelectedId(startDraft({ typeId, corpus: dataSource })));
  };
  /** Upload PDF: the picked PDFs open `UploadDocumentsModal` (a title each,
   *  one template), and Upload runs the batch as one Beacon task. A single
   *  document opens in the drawer when it lands; a batch doesn't pick one. */
  const [pendingUploads, setPendingUploads] = useState<File[] | null>(null);
  function handleUpload(files: FileList | null) {
    const list = Array.from(files ?? []);
    const pdfs = list.filter(isPdf);
    const skipped = list.length - pdfs.length;
    if (skipped > 0) {
      notify(
        `${skipped} ${skipped === 1 ? "file isn't a PDF and was" : "files aren't PDFs and were"} skipped`,
        "error",
      );
    }
    if (pdfs.length) setPendingUploads(pdfs);
  }
  function startUpload(batch: { typeId: string; uploads: { file: File; title: string }[] }) {
    setPendingUploads(null);
    const corpus = dataSource;
    runPdfUploadBatch(store, { corpus, ...batch }, (ids) => {
      // Only while the library still shows that corpus: an upload that lands
      // after the user moved elsewhere shouldn't pull them back.
      if (ids.length !== 1 || store.get(dataSourceAtom) !== corpus) return;
      // Never take the drawer from an open form: the upload lands seconds later,
      // and switching then would unmount the form and lose the user's input.
      // The notification says where the document is instead.
      if (store.get(editSessionOpenAtom)) return "Not opened while a form is open; it is in the library.";
      guard(() => setSelectedId(ids[0]));
    });
  }
  /** Export CSV: the current result set with facets, query and match types
   *  applied (`filtered`, the list every view mode draws). */
  function handleExport() {
    if (filtered.length === 0) {
      notify("Nothing to export — no entity matches the current filters", "info");
      return;
    }
    void runCsvExport(
      store,
      filtered,
      language,
      `uwazi-${dataSource}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  const isMobile = breakpoint === "mobile";

  /* ── Masthead fold ──────────────────────────────────────────────────────
     The toolbar row folds on its own width, not the viewport's: the pane is
     whatever the drawer leaves of the window. Thresholds are the parts'
     measured widths with the search box held at 16rem; Sort and Language have
     a second place in the Display menu, so they give way before the box does.
     In order: Sort moves to the Display menu (`librarySortInMenuAtom`), the
     readout moves to its own line under the row, Language moves to the menu.
     A tier changes only with width (drawer drag, window resize), never with
     typing or the readout's number. */
  const [mastheadW, setMastheadW] = useState(0);
  const mastheadRO = useRef<ResizeObserver | null>(null);
  const mastheadRef = useCallback((el: HTMLDivElement | null) => {
    mastheadRO.current?.disconnect();
    mastheadRO.current = null;
    if (!el) return;
    const measure = () => {
      const cs = getComputedStyle(el);
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      setMastheadW((prev) => (Math.round(w) === prev ? prev : Math.round(w)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    mastheadRO.current = ro;
  }, []);
  useEffect(() => () => mastheadRO.current?.disconnect(), []);
  const mastheadExtra = isMobile ? 40 : 0;
  // Unmeasured (the first render) counts as wide; the observer corrects it
  // before paint.
  const fits = (w: number) => mastheadW === 0 || mastheadW >= w + mastheadExtra;
  const SEARCH_FLOOR = 256; // 16rem
  const GAP = 8, SORT = 113, VIEW = 89, DISPLAY = 32, LANG = 56, READOUT = 240;
  const rowWithout = (...gone: number[]) =>
    // +5: the hairline (1 + its 8px gap) less the two 6px gaps inside the groups.
    SEARCH_FLOOR + 5 + [READOUT, SORT, VIEW, DISPLAY, LANG]
      .filter((w) => !gone.includes(w))
      .reduce((sum, w) => sum + GAP + w, 0);
  // Sort folds first: it has a place in the Display menu, and dropping it keeps
  // the readout on the row down to a 705px pane instead of 826. A folded part
  // stays folded as the row narrows further.
  const sortInline = fits(rowWithout()); // 826
  const readoutInline = fits(rowWithout(SORT)); // 705
  const langInline = fits(rowWithout(READOUT, SORT)); // 457
  const setSortInMenu = useSetAtom(librarySortInMenuAtom);
  const setLanguageInMenu = useSetAtom(libraryLanguageInMenuAtom);
  useEffect(() => {
    setLanguageInMenu(!langInline);
  }, [langInline, setLanguageInMenu]);
  useEffect(() => {
    setSortInMenu(!sortInline);
  }, [sortInline, setSortInMenu]);

  const countByEntity = useMemo(() => {
    const m = new Map<string, number>();
    // CEJIL connection counts come from the loaded corpus index (one entry per
    // entity), not the mock references atom — so sort-by-connections is real.
    if (dataSource === "cejil") {
      if (cejilReady) for (const [sid, arr] of cejilRelsByEntity()) m.set(sid, arr.length);
      return m;
    }
    if (dataSource === "travesia") {
      if (travesiaReady) for (const [sid, arr] of travesiaRelsByEntity()) m.set(sid, arr.length);
      return m;
    }
    for (const r of references) {
      m.set(r.sourceEntityId, (m.get(r.sourceEntityId) ?? 0) + 1);
      m.set(r.targetEntityId, (m.get(r.targetEntityId) ?? 0) + 1);
    }
    return m;
  }, [references, dataSource, cejilReady, travesiaReady]);

  // Precomputed lowercase searchable text per entity (title, country, displayed
  // metadata values, descriptors), so a keystroke doesn't rebuild it per entity.
  const searchIndex = useMemo(() => buildSearchIndex(entities, language), [entities, language]);

  const activeTypeIds = Object.entries(typeFilters)
    .filter(([, on]) => on)
    .map(([id]) => id);
  /** Create entity's preset: the one template the Library is filtered to, else
   *  the last used in this corpus, else the corpus default. */
  const filteredType = activeTypeIds.length === 1 && libraryTypes.some((t) => t.id === activeTypeIds[0])
    ? activeTypeIds[0]
    : null;
  const lastType = (recentTemplates[dataSource] ?? []).find((id) => libraryTypes.some((t) => t.id === id));
  const createPreset = filteredType ?? lastType ?? defaultTemplateId(dataSource) ?? libraryTypes[0]?.id ?? "";
  const createNamed = !!filteredType;
  const activeCountries = Object.entries(countryFilters)
    .filter(([, on]) => on)
    .map(([c]) => c);
  const activeDescriptors = Object.entries(descriptorFilters)
    .filter(([, on]) => on)
    .map(([d]) => d);
  const wantPublished = !!statusFilters.published;
  const wantRestricted = !!statusFilters.restricted;
  const statusActive = wantPublished || wantRestricted;
  const q = query.trim().toLowerCase();
  const hasQuery = q.length > 0;
  // Record the search once it settles, so partial queries typed on the way
  // don't fill the history. Enter and blur record immediately.
  useEffect(() => {
    // `committedQuery`, not the deferred one: record what the user ran without
    // waiting for the render that displays it.
    const t = committedQuery.trim();
    if (!t) return;
    const id = window.setTimeout(() => recordSearch(t), SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [committedQuery, recordSearch]);

  // The drawer's Results tab is not rendered while the main pane is the Results
  // view: it would be a narrow copy of the same list. Filters sits at the
  // strip's start, so removing Results shifts nothing.
  const showResultsTab = viewMode !== "results";
  // Phones: the sheet a search opened (see `libraryResultsSheetOpenAtom`),
  // folded into the split view's own open-section state.
  const [resultsSheetOpen, setResultsSheetOpen] = useAtom(libraryResultsSheetOpenAtom);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const sheetSection = resultsSheetOpen && showResultsTab ? "results" : openSection;
  useEffect(() => {
    setDrawerTab(hasQuery && showResultsTab ? "results" : "filters");
  }, [hasQuery, showResultsTab]);
  // Query tokens for the search predicate (shared with snippets + marks). Derived
  // from the raw `query` so uppercase AND/OR/NOT are recognised before lowering.
  // Full-text body scanning needs `q.length ≥ 3`, to keep one- and two-character
  // queries from scanning every CEJIL document body.
  const searchTerms = useMemo(
    () => highlightTerms(query), // already folded
    [query],
  );
  // The boolean shape of the same query (AND groups, OR within, NOT excluded).
  const searchQuery = useMemo(() => parseSearchQuery(query), [query]);
  const fullTextSearch = q.length >= 3;
  const fromMs = dateFrom ? Date.parse(dateFrom) : null;
  // Inclusive of the whole "to" day.
  const toMs = dateTo ? Date.parse(dateTo) + 86_400_000 - 1 : null;
  // Inherited-property filters with at least one value selected, paired with the
  // facet definition (target type, source-specific value accessor).
  const inheritedDefs = libraryInheritedDefs(dataSource, language);
  const activeInherited = Object.entries(inheritedFilters)
    .map(([propId, vals]) => ({
      def: inheritedDefs.find((d) => d.propId === propId),
      values: new Set(Object.entries(vals).filter(([, on]) => on).map(([v]) => v)),
    }))
    .filter((f) => f.def && f.values.size > 0) as {
    def: (typeof inheritedDefs)[number];
    values: Set<string>;
  }[];
  const inheritedKey = activeInherited
    .map((f) => `${f.def.propId}:${[...f.values].join("|")}`)
    .join(";");
  // Relationship-chain filters (CEJIL only — needs the loaded graph).
  const activeChains = useMemo(
    () => (dataSource === "cejil" ? buildActiveChains(chainFilters, cejilChainGraph()) : []),
    [dataSource, chainFilters, cejilReady],
  );
  const chainKey = JSON.stringify(chainFilters);

  // Must stay memoised: `matchTypeBase`, `searchMatchCount` and the two brush
  // passes depend on it, and each is a full-corpus pass. A new identity per
  // render would rerun all four on the urgent render of every keystroke.
  // Keyed on content: the facet arrays are rebuilt each render, so their joined
  // keys (and `inheritedKey`) stand in for them. `activeChains`, `searchIndex`
  // and `searchTerms` are memos and are depended on directly.
  const filterState: LibraryFilterState = useMemo(
    () => ({
      source: dataSource,
      language,
      typeIds: activeTypeIds,
      hasDocOnly,
      wantPublished,
      wantRestricted,
      countries: activeCountries,
      countryMode,
      descriptors: activeDescriptors,
      descriptorMode,
      fromMs,
      toMs,
      inherited: activeInherited,
      chains: activeChains,
      q,
      searchIndex,
      searchTerms,
      searchQuery,
      fullTextSearch,
      matchTypes,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- content keys, see above
    [
      dataSource,
      language,
      activeTypeIds.join(","),
      hasDocOnly,
      wantPublished,
      wantRestricted,
      activeCountries.join(","),
      countryMode,
      activeDescriptors.join(","),
      descriptorMode,
      fromMs,
      toMs,
      inheritedKey,
      activeChains,
      q,
      searchIndex,
      searchTerms,
      searchQuery,
      fullTextSearch,
      matchTypes,
    ],
  );

  // Where each entity matched, computed at most once per entity per query and
  // shared by the relevance ranking, the match-type chip gate and the chip
  // counts. Lazy: with all chips on nothing asks, and the ranking asks only when
  // the title doesn't settle it.
  const categoriesOf = useMemo(() => {
    const cache = new Map<string, MatchCategories>();
    return (e: Entity): MatchCategories => {
      let c = cache.get(e.id);
      if (!c) {
        c = matchCategoriesWithTerms(e, searchTerms, language, dataSource);
        cache.set(e.id, c);
      }
      return c;
    };
    // `cejilReady`: blobs go empty→real when the corpus lands, so cached
    // "document: false" answers from before that must not survive it.
  }, [searchTerms, language, dataSource, cejilReady]);

  // Relevance per entity, at most once per query (same lazy cache as
  // `categoriesOf`), so toggling a chip or facet never re-scores an entity.
  // Asked for only when the sort is relevance.
  const maxConnections = useMemo(() => {
    let m = 0;
    for (const n of countByEntity.values()) if (n > m) m = n;
    return m;
  }, [countByEntity]);
  const scoreOf = useMemo(() => {
    const cache = new Map<string, RelevanceBreakdown>();
    const relevanceQuery = { terms: searchTerms, phrase: searchTerms.join(" ") };
    return (e: Entity): RelevanceBreakdown => {
      let s = cache.get(e.id);
      if (!s) {
        s = scoreRelevance(e, relevanceQuery, language, dataSource, countByEntity.get(e.id) ?? 0, maxConnections);
        cache.set(e.id, s);
      }
      return s;
    };
    // `cejilReady`: document bodies go empty→real when the corpus lands.
  }, [searchTerms, language, dataSource, cejilReady, countByEntity, maxConnections]);

  // One full-corpus pass: `matchTypeBase` passes facets and search but not the
  // chips, and the chip-narrowed list is filtered from it rather than from the
  // corpus.
  const matchTypeBase = useMemo(
    () => (q ? entities.filter((e) => matchesAll(e, filterState, "matchType")) : []),
    [entities, filterState, q],
  );

  const filtered = useMemo(() => {
    const list = q
      ? matchTypeBase.filter((e) =>
          passesMatchTypes(matchTypes, q, () => categoriesOf(e)),
        )
      : entities.filter((e) => matchesAll(e, filterState));
    const typeName = (e: Entity) => getEntityType(e.typeId)?.name ?? e.typeId;
    const cmp = (a: Entity, b: Entity) => {
      let r = 0;
      switch (sort) {
        case "title":
          r = a.title.localeCompare(b.title);
          break;
        case "type":
          r = typeName(a).localeCompare(typeName(b));
          break;
        case "country":
          r = (a.country ?? "").localeCompare(b.country ?? "");
          break;
        case "connections":
          r = (countByEntity.get(a.id) ?? 0) - (countByEntity.get(b.id) ?? 0);
          break;
        default:
          if (sort.startsWith("prop:")) {
            // A prioritySorting property: dates and numbers by value, the rest
            // by text; an entity without a value sorts last either way.
            const name = sort.slice(5);
            const va = entityPropertyValues(a, name, language)[0];
            const vb = entityPropertyValues(b, name, language)[0];
            if (!va || !vb) return va ? -1 : vb ? 1 : 0;
            r = compareValues(va, vb);
            break;
          }
          // recent / date
          r = (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
      }
      return sortDir === "asc" ? r : -r;
    };
    // With an active query the default order is relevance (`utils/relevance.ts`):
    // exact title first, then coverage, field weight, frequency and whole-word
    // hits, with connections and recency as weak tie-breakers. The reader can pick
    // another sort for the query (`librarySortAtom`), and then that sort applies
    // as it does without one. Scored once per entity per query (`scoreOf`),
    // never inside the comparator.
    if (q && sort === "relevance") {
      const scored = list.map((e) => ({ e, s: scoreOf(e).score }));
      scored.sort(
        (a, b) => b.s - a.s || typeName(a.e).localeCompare(typeName(b.e)) || a.e.title.localeCompare(b.e.title),
      );
      return scored.map((x) => x.e);
    }
    return [...list].sort(cmp);
    // `cejilReady`: once the corpus loads, full-text blobs go empty→real, so the
    // filtered set must recompute to surface document-body-only matches.
  }, [entities, matchTypeBase, categoriesOf, scoreOf, dataSource, activeTypeIds.join(","), hasDocOnly, wantPublished, wantRestricted, statusActive, activeCountries.join(","), countryMode, activeDescriptors.join(","), descriptorMode, fromMs, toMs, inheritedKey, chainKey, activeChains, language, q, sort, sortDir, countByEntity, searchIndex, cejilReady, matchTypes]);

  // How many entities the query matches with the facets widened, so the Results
  // tab can offer to reveal the ones the current facets are hiding.
  const searchMatchCount = useMemo(
    () => (q ? entities.reduce((n, e) => n + (matchesSearch(e, filterState) ? 1 : 0), 0) : 0),
    [entities, filterState, q],
  );

  // Chip counts over the pre-chip set, reading the same cached categories as the
  // ranking and the gate.
  const matchTypeCounts = useMemo(() => {
    const c = { title: 0, properties: 0, document: 0 };
    for (const e of matchTypeBase) {
      const m = categoriesOf(e);
      if (m.title) c.title++;
      if (m.properties) c.properties++;
      if (m.document) c.document++;
    }
    return c;
  }, [matchTypeBase, categoriesOf]);

  // The chips are per query: a new query resets them to all kinds so they never
  // persist as a hidden filter.
  useEffect(() => {
    setMatchTypes(ALL_MATCH_TYPES);
  }, [q, setMatchTypes]);

  // The time strip shows under every layout (Display → Time strip, on by
  // default): it filters by date and charts the whole result set.
  const showBrush = timeHub && !cejilLoading;

  // The brush histogram applies every facet except the date one, so the bars
  // outside the range (dimmed) show what widening the window would add.
  const timeChart = useMemo(
    () => (showBrush ? entities.filter((e) => matchesAll(e, filterState, "date")) : []),
    [entities, dataSource, activeTypeIds.join(","), hasDocOnly, wantPublished, wantRestricted, statusActive, activeCountries.join(","), countryMode, activeDescriptors.join(","), descriptorMode, inheritedKey, chainKey, activeChains, language, q, searchIndex, showBrush],
  );
  // …and the Lanes grid drops the template facet too, so drilling into one lane
  // doesn't shrink the grid to that single lane.
  const laneChart = useMemo(
    () =>
      viewMode === "timeline" && !cejilLoading
        ? entities.filter((e) => matchesAll(e, { ...filterState, typeIds: [] }, "date"))
        : [],
    [entities, dataSource, hasDocOnly, wantPublished, wantRestricted, statusActive, activeCountries.join(","), countryMode, activeDescriptors.join(","), descriptorMode, inheritedKey, chainKey, activeChains, language, q, searchIndex, viewMode, cejilLoading],
  );

  // The full CEJIL corpus is thousands of entities — cap the rendered cards and
  // let the user reveal more, so the card/list grid never paints them all at once.
  const [visibleCount, setVisibleCount] = useState(DISPLAY_STEP);
  useEffect(() => setVisibleCount(DISPLAY_STEP), [filtered]);
  const shown = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  /* One answer for the whole grid: does any entity on screen resolve a property?
     Every card gets it so all claim the same subgrid row tracks; a per-card test
     would give cards different track counts and the rows would stop lining up. */
  const metadataTrack = useMemo(
    () => shown.some((e) => entityCardFields(e, language).length > 0),
    [shown, language],
  );




  /* ── Multi-selection ─────────────────────────────────────────────────────
     A plain click previews. Cmd/Ctrl+click toggles the entity in the selection;
     Shift+click spans from the anchor over the order the visible view draws
     (`currentSelectionOrder`), without a preview. This component never reads
     the selection Set, so a selection change doesn't re-render it: cards,
     footer and drawer subscribe on their own. */
  const toggleSelection = useSetAtom(toggleSelectionAtom);
  const setAnchor = useSetAtom(setSelectionAnchorAtom);
  const rangeSelection = useSetAtom(rangeSelectionAtom);
  const clearSelection = useSetAtom(clearSelectionAtom);
  const collapseSelection = useSetAtom(collapseSelectionAtom);
  const selectionActive = useAtomValue(librarySelectionActiveAtom);
  /* A plain click on the empty ground of the results (lane, gaps, margin)
     clears the selection through the same guard as Escape. Ignored: clicks on
     items or controls, modifier clicks, the end of a drag or text selection,
     and the map, whose ground is the map. */
  const groundDown = useRef<{ x: number; y: number } | null>(null);
  const clearOnGround = useCallback(
    (e: React.MouseEvent) => {
      if (!selectionActive || viewMode === "map") return;
      if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.button !== 0) return;
      const t = e.target as Element;
      if (
        t.closest(
          'button, a, input, select, textarea, label, summary, [role="button"], [role="menu"], [role="dialog"], ' +
            '[role="listbox"], [role="slider"], [tabindex], [data-select-id], [data-select-host], ' +
            '[data-component="EntityCard"], [data-part="row"], [data-part="result"], [data-part="header"]',
        )
      )
        return;
      const d = groundDown.current;
      if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) return;
      if (String(window.getSelection() ?? "").length > 0) return;
      clearSelection();
    },
    [selectionActive, viewMode, clearSelection],
  );
  const selectionDrawerOpen = useAtomValue(librarySelectionDrawerOpenAtom);
  const shownIds = useMemo(() => shown.map((e) => e.id), [shown]);
  const filteredIds = useMemo(() => filtered.map((e) => e.id), [filtered]);
  // The grid's and the table's order — Timeline and Results register their own,
  // so this one stands down while they draw (see `useSelectionOrder`).
  useSelectionOrder(viewMode === "timeline" || viewMode === "results" ? null : shownIds);
  // What the visible view draws, for "select all loaded". The grid, the table
  // and the map are drawn here; Timeline and Results publish their own.
  const setDrawnIds = useSetAtom(libraryDrawnIdsAtom);
  const drawnIds = useAtomValue(libraryDrawnIdsAtom);
  const mapIds = useMemo(
    () => (viewMode === "map" ? filtered.filter((e) => e.geo).map((e) => e.id) : null),
    [viewMode, filtered],
  );
  useEffect(() => {
    if (viewMode === "cards" || viewMode === "list") setDrawnIds(shownIds);
    else if (mapIds) setDrawnIds(mapIds);
  }, [viewMode, shownIds, mapIds, setDrawnIds]);

  // Escape clears — except where Escape already means something: a text field,
  // a dialog, an open menu.
  useEffect(() => {
    if (!selectionActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input:not([type=checkbox]), textarea, select, [role=dialog], [role=menu], [role=listbox]")) return;
      // A popup open anywhere — the Display menu, a Select, the search tips —
      // takes this Escape to close itself. Those popups leave focus on their
      // trigger, so the target check above can't see them; their open
      // trigger can: an `aria-haspopup` control with `aria-expanded="true"`.
      if (document.querySelector('[aria-haspopup][aria-expanded="true"]')) return;
      clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectionActive, clearSelection]);

  /* `collapse`: a plain click in the view with 2 or more selected ends the
     multi-selection and previews that item. The selection and cluster drawers
     pass false: their rows are the selection, so a click previews without
     dropping the rest. Stable, so memoised `EntityCard`s don't re-render on
     every selection or hover. */
  const selectFrom = useCallback(
    (
      collapse: boolean,
      id: string,
      e?: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean },
      /** Phones: go to the entity view rather than a sheet (a passage jump
       *  needs the document, which a sheet doesn't carry). */
      navigate = false,
    ) => {
      const intent = e ? selectionIntent(e) : null;
      if (intent === "toggle") return toggleSelection(id);
      // Touch, with a selection going: a tap adds or removes (a long press
      // starts one — see useTouchSelection).
      if (e && selectionActive && lastPointerWasTouch()) return toggleSelection(id);
      if (intent === "range") return rangeSelection({ order: currentSelectionOrder(), id });
      const preview = () => {
        // A plain click anchors the next Shift range here (see setSelectionAnchorAtom).
        setAnchor(id);
        if (isMobile && navigate) {
          openEntity(id);
        } else if (isMobile) {
          // A phone opens the entity as a sheet on the stack (the connection
          // overlay's, see MobileOverlayStack) over the list you are reading;
          // its footer's "Open entity" is the route to the full view.
          setOverlayEntity(id);
        } else {
          focusForPreview(id);
          setSelectedId(id);
        }
      };
      if (collapse) collapseSelection(preview);
      else preview();
    },
    [
      isMobile,
      openEntity,
      setOverlayEntity,
      focusForPreview,
      setSelectedId,
      toggleSelection,
      rangeSelection,
      selectionActive,
      collapseSelection,
      setAnchor,
    ],
  );
  // A plain selection reads the entity's document in the reading language; only
  // a passage jump pins the file its text came from (`handleSnippetSelect`).
  const handleSelect = useCallback(
    (id: string, e?: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => {
      setPassageFile(null);
      selectFrom(true, id, e);
    },
    [selectFrom, setPassageFile],
  );
  const handleDrawerSelect = useCallback(
    (id: string, e?: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => {
      setPassageFile(null);
      selectFrom(false, id, e);
    },
    [selectFrom, setPassageFile],
  );
  useTouchSelection(toggleSelection);
  useTapGuard();

  // Results-tab full-text snippet: select the entity, then jump the preview's
  // document to the hit page (DocumentViewer consumes scrollToPageAtom). On
  // mobile handleSelect opens the full view; the page jump still applies.
  // The page belongs to the file the passage was cut from, so that file is
  // what opens — the reading language may pick another document entirely.
  const handleSnippetSelect = useCallback(
    (id: string, page: number) => {
      setPassageFile(null);
      selectFrom(true, id, undefined, true);
      const entity = getEntity(id);
      setPassageFile(entity ? passageFileId(entity, language, dataSource) : null);
      setScrollToPage(page);
      setResultsActivePage({ entityId: id, page });
    },
    [selectFrom, setPassageFile, language, dataSource, setScrollToPage, setResultsActivePage],
  );

  // Results-tab Properties hit: open the entity preview and deep-focus the field
  // (the drawer switches to its Metadata tab and flashes the field by key).
  const handleFocusProperty = useCallback(
    (id: string, fieldKey: string) => {
      handleSelect(id);
      setFocusMetadataField({ entityId: id, fieldKey });
    },
    [handleSelect, setFocusMetadataField],
  );

  // Retry the CEJIL load — mirrors the left pane's Retry (re-runs the effect).
  // Wrapped so the memoized drawer bodies see one identity for the life of the
  // view; both setters are `useSetAtom` results, which are already stable.
  const handleClearSearch = useCallback(() => clearSearch(), [clearSearch]);
  const handleClearFacets = useCallback(() => clearFacets(), [clearFacets]);

  const handleCejilRetry = useCallback(() => {
    setCejilError(false);
    setCejilRetry((n) => n + 1);
  }, []);

  // What the table row already marks in place; any other hit is off-row evidence
  // (see `MatchOrigin`). Country counts only when the column is on and the row
  // has a value: an empty cell shows an em-dash, and the marker would be the
  // only evidence of a profile "Country" field match.
  const countryColumn = listColumnOn("country");
  const rowMarkedFields = useCallback(
    (e: Entity) => (countryColumn && e.country ? TITLE_AND_COUNTRY : TITLE_ONLY),
    [countryColumn],
  );

  // The table's tracks come from `listColumns`, which the Display menu's toggles
  // also read, so drawable and listed columns can't drift apart. The Match cell
  // is passed in rather than imported: see `ListCellContext.renderMatch`.
  const listSpecs = useMemo(
    () => listColumnSpecs({ hasQuery, fieldColumns }),
    [hasQuery, fieldColumns],
  );
  const tableColumns = buildListColumns(listSpecs, listColumnOn, {
    query,
    language,
    connectionsOf: (e) => countByEntity.get(e.id) ?? 0,
    renderMatch: (e) => (
      <MatchOrigin
        entity={e}
        query={query}
        visibleFieldKeys={rowMarkedFields(e)}
        onSelect={handleSelect}
        relevanceOf={scoreOf}
      />
    ),
  });

  /** The masthead readout's sentence — in the row's fixed slot where the row
   *  can hold it, on its own line under the row where it can't. */
  const readoutContent =
    !cejilLoading &&
    (hasQuery ? (
        <>
          <span dir="ltr" className="shrink-0 whitespace-nowrap">
            {filtered.length.toLocaleString()}
            {filtered.length !== matchTypeBase.length && (
              <> of {matchTypeBase.length.toLocaleString()}</>
            )}{" "}
            {matchTypeBase.length === 1 ? "result" : "results"} for
          </span>
          <ActiveSearchChip className="min-w-0" />
        </>
      ) : (
        <span dir="ltr" className="truncate">
          {filtered.length.toLocaleString()}
          {filtered.length !== entities.length && (
            <> of {entities.length.toLocaleString()}</>
          )}{" "}
          {entities.length === 1 ? "entity" : "entities"}
        </span>
      ));

  const renderLeft = (menuTrigger?: ReactNode) => (
    // The narrow-tier gutter host (12px). The toolbar, the view lane, the time
    // brush and the footer are `bleed` bands: their grounds and rules reach the
    // pane edge and their content sits on the gutter.
    <div data-gutter-host className="gutter-host flex flex-col h-full min-h-0 bg-paper">
      {/* Toolbar — a row of controls, and under it (when the row can't hold
          it) the readout's own line. See "Masthead fold" above. */}
      <div
        ref={mastheadRef}
        data-part="masthead"
        className="bleed shrink-0 py-2 bg-parchment"
        style={{ borderBottom: "1px solid var(--border-primary)" }}
      >
      <div data-part="masthead-row" className="flex items-center gap-2">
        <div
          ref={searchBoxRef}
          className="relative flex-1 min-w-0 flex items-center gap-1.5 h-8 py-1 ps-2 pe-2 bg-paper border border-border rounded-md
            focus-within:ring-2 focus-within:ring-ink/25 focus-within:border-ink/30 transition-all"
        >
          <Search size={14} className="text-ink-tertiary shrink-0" />
          <input
            type="text"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            // Enter and Escape close the panel without moving focus, so a later
            // click on the already-focused box fires no focus event. The click
            // reopens the list.
            onClick={() => setSearchFocused(true)}
            onBlur={() => {
              setSearchFocused(false);
              recordSearch(searchDraft);
              submitSearch();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                // Claimed: the Results sheet can open on this key and take
                // focus, and the same Enter's keypress would then press the
                // sheet's Close button.
                e.preventDefault();
                recordSearch(searchDraft);
                setSearchFocused(false);
                submitSearch();
              }
            }}
            // A phone takes the short form: at 360–390 the long one cut mid-word
            // ("Search title & me"). The aria-label says what is searched.
            placeholder={isMobile ? "Search" : "Search title & metadata"}
            aria-label="Search entities"
            // `min-w-0`, not a pixel floor: the box yields, and an input with its
            // own minimum overflows a narrowed box under its neighbours.
            className="flex-1 min-w-0 w-0 bg-transparent text-xs font-medium placeholder:text-ink-tertiary focus:outline-none"
          />
          {searchDraft && (
            <button
              // Empties the box, not the search: the committed query stays so the
              // results remain usable while retyping. `ActiveSearchChip` or Clear
              // all ends the search.
              onClick={() => setSearchDraft("")}
              aria-label="Clear search"
              className="hit-area shrink-0 p-0.5 rounded-full hover:bg-parchment text-ink-tertiary hover:text-ink cursor-pointer transition-colors"
            >
              <X size={12} />
            </button>
          )}
          <SearchTipsPopover compact={!readoutInline} />
          {/* Follows focus; the tips popover follows a click on its chip, which
              blurs the input, so the two are never open at once without shared
              state. */}
          <RecentSearches
            anchorRef={searchBoxRef}
            open={searchFocused}
            onPick={(q) => {
              setSearchDraft(q);
              recordSearch(q);
              setSearchFocused(false);
              submitSearch();
            }}
            onClose={() => setSearchFocused(false)}
          />
        </div>
        {/* The only count on this surface: "N entities" / "N of M entities", or
            "N results for [chip]" where the chip is `ActiveSearchChip`, the one
            dismiss for a committed search.
            Fixed 15rem slot, left-aligned under the search box, so a changing
            number never moves the controls; the sentence is `shrink-0` and the
            chip yields (`min-w-0`). Always mounted, empty while a corpus loads.
            `aria-busy` and a dim mark results that are still the previous query's.
            One style for the whole sentence; `tabular-nums` keeps the figure from
            reflowing as it changes. */}
        {readoutInline && (
          <span
            data-part="readout"
            aria-busy={searchPending}
            // `pe-3` sits inside the fixed slot: a truncated chip keeps a gap
            // before Sort instead of reading as another control. The slot's outer
            // width doesn't change.
            className={`flex items-center justify-start gap-1.5 shrink-0 w-[15rem] pe-3
              text-meta tabular-nums text-ink-tertiary transition-opacity ${
                searchPending ? "opacity-60" : "opacity-100"
              }`}
          >
            {readoutContent}
          </span>
        )}
        {/* Arrange: sort and view, one group. Sort can move to the Display
            menu; the view switcher stays on the row at every width, phones
            included. */}
        <div data-part="arrange" className="flex items-center gap-1.5">
          {sortInline && (
          <div>
            <Select
              value={sort}
              onChange={(v) => {
                const key = v as typeof sort;
                setSort(key);
                setSortDir(defaultSortDir(key));
              }}
              ariaLabel={t("System", "Sort")}
              // Same rows, chrome-language labels; values stay the sort keys.
              // Relevance only exists while a query runs (`librarySortAtom`).
              options={[...SORTS, ...propertySorts.map((c) => ({ value: c.id, label: c.label }))]
                .filter((s) => q || s.value !== "relevance")
                .map((s) => ({ ...s, label: t("System", s.label) }))}
              // `steady`: a fixed trigger width, so changing the sort doesn't
              // shift View, Display and Language.
              steady
            />
          </div>
          )}
          {/* A dropdown like Sort and Language, and narrower than a five-segment
              control; its `steady` trigger keeps the width fixed across views. */}
          <ViewSwitcher value={viewMode} onChange={(v) => setViewMode(v as typeof viewMode)} />
        </div>
        {/* One hairline between what is listed (sort, view) and how it is drawn
            (Display, Language). It folds with Language, since past that point
            each side is one control. Width decides it, never state. */}
        {langInline && (
          <span aria-hidden="true" data-part="rule" className="shrink-0 w-px h-4 bg-border" />
        )}
        <div data-part="display" className="flex items-center gap-1.5">
          {/* Display is icon-only and always mounted; view-specific options live
              in its popover, so changing view never shifts this row. */}
          <LibraryDisplayMenu />
          {/* Languages: one dropdown of fixed width (codes, not names — a "Français"
              label would resize the trigger and shift the row again). */}
          {langInline && (
          <div>
            <Select
              value={language}
              onChange={(v) => setLanguage(v as Language)}
              ariaLabel="Language"
              align="end"
              options={LANGUAGES.map((l) => ({ value: l, label: l }))}
            />
          </div>
          )}
        </div>
      </div>
      {/* The readout's own line when the row can't hold it. Mounted whenever
          the row is this narrow, with or without a query, so a search never
          adds a line. `h-6` is the chip's height, so both readout forms fit the
          same line; `mt-2` and the band's `py-2` give 8px each side. */}
      {!readoutInline && (
        <p
          data-part="readout"
          aria-busy={searchPending}
          className={`mt-2 h-6 flex items-center gap-1.5 min-w-0 text-meta tabular-nums text-ink-tertiary
            transition-opacity ${searchPending ? "opacity-60" : "opacity-100"}`}
        >
          {readoutContent}
        </p>
      )}
      </div>

      {/* Results */}
      <div
        // A Shift+click is a range, not a text selection across the grid.
        onMouseDown={(e) => {
          if (e.shiftKey) e.preventDefault();
          groundDown.current = { x: e.clientX, y: e.clientY };
        }}
        onClick={clearOnGround}
        // Only a real tap opens an item here, never the end of a scroll.
        data-tap-guard
        // A `bleed` lane: warm ground and scrollbar at the pane edge, content on
        // the gutter. Every view mode sits on it, Results included — its header
        // row and card lane carry no side padding of their own.
        className={`bleed flex-1 min-h-0 py-3 bg-warm ${
          viewMode === "map" || viewMode === "timeline" || viewMode === "results"
            ? "flex flex-col overflow-hidden"
            : "overflow-auto"
        }`}
      >
        {cejilLoading ? (
          cejilError ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-sm text-ink-tertiary">
              <span>Couldn’t load the {lazyName} collection.</span>
              <button
                onClick={() => setCejilRetry((n) => n + 1)}
                className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-sm text-ink-tertiary">
              <span className="w-5 h-5 rounded-full border-2 border-border border-t-carbon animate-spin" />
              Loading the full {lazyName} collection…
            </div>
          )
        ) : viewMode === "map" ? (
          <div className="flex-1 min-h-0">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-40 text-sm text-ink-tertiary">
                  Loading map…
                </div>
              }
            >
              <LibraryMapView entities={filtered} />
            </Suspense>
          </div>
        ) : viewMode === "timeline" ? (
          <div className="flex-1 min-h-0">
            <LibraryTimelineView
              entities={filtered}
              chart={timeChart}
              laneChart={laneChart}
              query={query}
              selectedId={selectedId}
              onSelect={handleSelect}
              onView={openEntity}
              countByEntity={countByEntity}
            />
          </div>
        ) : viewMode === "results" ? (
          // Results owns its scroll, paging and blank states (including "no
          // query yet"), so it sits above the shared empty-state branch below.
          <div className="flex-1 min-h-0">
            <ResultsMainView
              query={query}
              entities={filtered}
              source={dataSource}
              language={language}
              cejilLoading={cejilLoading}
              cejilError={cejilError}
              onRetry={handleCejilRetry}
              onFocusProperty={handleFocusProperty}
              onSelectSnippet={handleSnippetSelect}
              onSelect={handleSelect}
              selectedId={selectedId}
              onClearSearch={() => clearSearch()}
              hiddenByFilters={Math.max(0, searchMatchCount - matchTypeBase.length)}
              onClearFilters={() => clearFacets()}
              matchTypeCounts={matchTypeCounts}
              totalMatches={matchTypeBase.length}
              relevanceOf={scoreOf}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-ink-tertiary">
            No entities match your filters.
          </div>
        ) : viewMode === "cards" ? (
          <ul ref={cardGridRef} className={`grid ${colCount ? "" : cardGridCols} gap-3`} style={cardGridStyle}>
            {shown.map((e) => (
              <EntityCard
                key={e.id}
                as="li"
                entity={e}
                layout="cards"
                query={query}
                selected={selectedId === e.id}
                connections={countByEntity.get(e.id) ?? 0}
                onSelect={handleSelect}
                onView={openEntity}
                onFocusProperty={handleFocusProperty}
                onOpenImage={setLightbox}
                metadataTrack={metadataTrack}
                selectable
              />
            ))}
          </ul>
        ) : breakpoint === "mobile" ? (
          // Phones: two-line rows, no table columns (M19).
          <MobileEntityList rows={shown} query={query} selectedId={selectedId} onSelect={handleSelect} />
        ) : tableColumns.length === 0 ? (
          // Every column can be switched off; with none on, show a message that
          // names the way out instead of an empty grid.
          <div className="flex items-center justify-center h-40 text-sm text-ink-tertiary">
            No columns shown — pick one in Display.
          </div>
        ) : (
          <DataTable
            columns={tableColumns}
            // No selection column: the Library selects by modifier click. The
            // row carries the visually hidden checkbox for keyboards and
            // screen readers, beside its primary action.
            rowAccessory={(e) => <EntitySelectBox id={e.id} title={e.title} />}
            data={shown}
            getRowId={(e) => e.id}
            onRowClick={(row, ev) => handleSelect(row.id, ev)}
            rowAriaLabel={(e) => `Preview ${e.title}`}
            isRowSelected={(e) => selectedId === e.id}
            selectedStyle="outline"
            sort={{ key: sort, dir: sortDir }}
            onSort={(key) => setSortKey(key as typeof sort)}
            minWidthRem={34}
            density={listDensity}
          />
        )}

        {/* Hidden while the table has no columns: there is nothing to show more of. */}
        {!cejilLoading && viewMode !== "map" && viewMode !== "timeline" && viewMode !== "results" &&
          !(viewMode === "list" && tableColumns.length === 0) && shown.length < filtered.length && (
          <div className="flex justify-center pt-4">
            <button
              onClick={() => setVisibleCount((n) => n + DISPLAY_STEP)}
              className="px-4 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
            >
              Show more — {(filtered.length - shown.length).toLocaleString()} remaining
            </button>
          </div>
        )}
      </div>

      {/* Time brush — map + timeline */}
      {showBrush && <TimeBrush entities={timeChart} />}

      {/* Footer action bar. A container, so the four actions fold to their
          icons (each keeps its name) when the pane is too narrow for their
          labels — a drawer open beside the library, a small window — instead
          of wrapping onto a second line inside a fixed-height bar. */}
      <div
        data-part="library-footer"
        className="@container bleed shrink-0 flex items-center gap-1 h-12 bg-paper"
        style={{
          borderTop: "1px solid var(--border-primary)",
          // Phones: the home indicator's inset is added below the 3rem row, so
          // the row keeps its height and nothing above it moves.
          ...(menuTrigger
            ? { boxSizing: "content-box", paddingBottom: "env(safe-area-inset-bottom, 0px)" }
            : null),
        }}
      >
        {/* The bar swaps in place between the baseline actions and the
            selection's, at the same height. The selection's readout, Clear and
            select-all sit at the bar's end in `LibrarySelectionBar`. */}
        {selectionActive && (
          <LibrarySelectionBar
            filteredIds={filteredIds}
            loadedIds={drawnIds}
            corpus={dataSource}
            filtersSlot={<ActiveFiltersButton className="ms-2 shrink-0" />}
          />
        )}
        {!selectionActive && (
          <CreateEntityButton
            preset={createPreset}
            named={createNamed}
            recent={recentTemplates[dataSource] ?? []}
            types={libraryTypes}
            onCreate={handleCreate}
            onAll={() => setCreateOpen(true)}
            extra={[{ label: "Batch entry…", onSelect: () => setBatchOpen(true) }]}
          />
        )}
        {pendingUploads && (
          <UploadDocumentsModal
            files={pendingUploads}
            types={libraryTypes}
            defaultTypeId={uploadTemplateId(dataSource)}
            onUpload={startUpload}
            onClose={() => setPendingUploads(null)}
          />
        )}
        <NewImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImportCsv} />
        {batchOpen && (
          <BatchEntryModal
            corpus={dataSource}
            types={libraryTypes}
            initialTypeId={createPreset}
            language={language}
            onClose={() => setBatchOpen(false)}
          />
        )}
        {createOpen && (
          <CreateEntityDialog
            types={libraryTypes}
            defaultTypeId={defaultTemplateId(dataSource)}
            onChoose={handleCreate}
            onClose={() => setCreateOpen(false)}
          />
        )}
        {!selectionActive && (
          <FooterButton
            icon={<Upload size={13} className="text-ink-tertiary" />}
            label="Upload PDF"
            onClick={() => uploadInputRef.current?.click()}
          />
        )}
        {/* Not rendered: the file input the button above opens. */}
        <input
          ref={uploadInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          onChange={(e) => {
            handleUpload(e.target.files);
            // Cleared so choosing the same file again still fires a change.
            e.target.value = "";
          }}
        />
        {!selectionActive && (
          <>
            {canImport && (
              <FooterButton
                icon={<FileUp size={13} className="text-ink-tertiary" />}
                label="Import CSV"
                onClick={() =>
                  guard(() => setImportOpen(true))
                }
              />
            )}
            {/* With a selection, the bar's own Export CSV exports the
                selection; without one, this exports the current results. */}
            <FooterButton
              icon={<FileDown size={13} className="text-ink-tertiary" />}
              label="Export CSV"
              onClick={handleExport}
            />
          </>
        )}
        {/* No result count here: the masthead readout is the only one. The
            active-filters button below is not a duplicate; it is the only way to
            reach the filters while the drawer shows an entity. `ms-2` separates
            it from the footer actions. */}
        {/* Phones: the four actions above are `hidden sm:flex`; this button
            opens them in a sheet. */}
        {!selectionActive && (
          <button
            type="button"
            onClick={() => setPhoneActionsOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={phoneActionsOpen}
            className={`sm:hidden shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium ${BAR_LEAD} rounded-md cursor-pointer`}
          >
            <MoreHorizontal size={13} className="text-ink-tertiary" aria-hidden /> Actions
          </button>
        )}
        {phoneActionsOpen && (
          <ActionsSheet
            heading="Library"
            onClose={() => setPhoneActionsOpen(false)}
            actions={[
              // The visible way into bulk selection on a touch screen (a long
              // press on an item still works): the selection bar shows and a
              // tap toggles, until Clear.
              { label: "Select", icon: <CheckSquare size={14} />, onClick: () => setSelectMode(true) },
              { label: "Create entity", icon: <Plus size={14} />, onClick: () => handleCreate(createPreset) },
              { label: "Upload PDF", icon: <Upload size={14} />, onClick: () => uploadInputRef.current?.click() },
              ...(canImport
                ? [
                    {
                      label: "Import CSV",
                      icon: <FileUp size={14} />,
                      onClick: () => guard(() => setImportOpen(true)),
                    },
                  ]
                : []),
              { label: "Export CSV", icon: <FileDown size={14} />, onClick: handleExport },
            ]}
          />
        )}
        {/* With a selection the bar places it, before its end group. */}
        {!selectionActive && <ActiveFiltersButton className="ms-2 shrink-0" />}
        {/* Phones: the drawer's navigation (Filters / Results sheets) sits at
            the bar's END, where the entity view's bar keeps it: in thumb reach,
            and a menu at the bottom opens upward. Only the drawer nav moved;
            search, view mode, Display and the readout stay on top. */}
        {menuTrigger && (
          <div data-part="sheets" className="ms-auto shrink-0">
            {menuTrigger}
          </div>
        )}
      </div>
    </div>
  );

  // Results tab body — the per-entity evidence view (where each term hit).
  const resultsBody = (
    <ResultsBody
      query={query}
      entities={filtered}
      source={dataSource}
      language={language}
      cejilLoading={cejilLoading}
      cejilError={cejilError}
      onRetry={handleCejilRetry}
      onFocusProperty={handleFocusProperty}
      onSelectSnippet={handleSnippetSelect}
      // Stable identities, or the memo on ResultsBody is decorative: a fresh
      // arrow per render is a changed prop, and this list re-snippets its whole
      // visible page when it re-renders.
      onClearSearch={handleClearSearch}
      hiddenByFilters={Math.max(0, searchMatchCount - matchTypeBase.length)}
      onClearFilters={handleClearFacets}
      matchTypeCounts={matchTypeCounts}
      totalMatches={matchTypeBase.length}
      relevanceOf={scoreOf}
    />
  );

  const filtersDrawer = (
    // The narrow-tier gutter host (12px): the same edge as the entity preview
    // that replaces this panel when an entity is selected, so selecting one
    // does not move the tab strip.
    <div data-gutter-host className="gutter-host flex flex-col h-full min-h-0 bg-warm">
      <DrawerTabs
        tabs={[
          // Dots, not counts: both mark user-set state still in effect behind
          // the other tab. A count mounts on first use and widens its tab,
          // shifting the strip; the dot takes no width. See `DrawerTabs`.
          { id: "filters", label: t("System", "Filters"), dot: activeFilterCount > 0 },
          // A query that found nothing gets no dot: the tab would be pointing at
          // an empty panel. Dot means "there is something here", not "you typed".
          ...(showResultsTab
            ? [{ id: "results", label: t("System", "Results"), dot: hasQuery && filtered.length > 0 }]
            : []),
        ]}
        activeId={drawerTab}
        onChange={(id) => setDrawerTab(id as "filters" | "results")}
      />
      {/* `bleed`: it clips, so it spans the panel for the lanes inside to reach
          the edge. `pt-stack`: the one step below the strip, which pads only its top. */}
      <div className="bleed flex-1 min-h-0 overflow-hidden pt-stack">
        {drawerTab === "results" && showResultsTab ? resultsBody : <LibraryFilters />}
      </div>
    </div>
  );

  // Preview, else the selection (1 or more, unless its list was closed), else
  // a map cluster, else Filters. The threshold is 1, not 2, so unticking down
  // to one doesn't swap the drawer under the pointer.
  const drawer = selectedId ? (
    <EntityDrawerPreview entityId={selectedId} />
  ) : selectionActive && selectionDrawerOpen ? (
    <LibrarySelectionDrawer onSelect={handleDrawerSelect} query={query} />
  ) : selectedCluster && viewMode === "map" ? (
    <LibraryClusterDrawer onSelect={handleDrawerSelect} query={query} />
  ) : (
    filtersDrawer
  );

  return (
    <>
    {/* One lightbox for the whole grid rather than one per card; it portals to
        `document.body`, so only state ownership depends on where it mounts. */}
    <ImageLightbox image={lightbox} onClose={() => setLightbox(null)} />
    {/* Phones have no drawer, so what the Library opens into it (a new draft,
        a single uploaded PDF) opens as a full-height sheet. Dismissing goes
        through the dirty guard and discards an untouched draft, so no empty
        entity is left behind. */}
    {isMobile && (
      <MobileBottomSheet
        open={!!selectedId}
        bare
        defaultSnap="full"
        ariaLabel="Entity"
        onClose={() =>
          guard(() => {
            if (selectedId && selectedId === draftId) discardDraft(selectedId);
            setSelectedId(null);
          })
        }
      >
        {selectedId && <EntityDrawerPreview entityId={selectedId} />}
      </MobileBottomSheet>
    )}
    <AdaptiveSplitView
      left={renderLeft()}
      mobileLeft={(menuTrigger) => renderLeft(menuTrigger)}
      right={drawer}
      defaultRightWidth={460}
      minRightWidth={DRAWER_MIN_WIDTH}
      openSectionId={sheetSection}
      onOpenSectionChange={(id) => {
        // Closing (or swapping away from) the search's sheet keeps the query.
        if (id !== "results") setResultsSheetOpen(false);
        setOpenSection(id);
      }}
      mobileSections={[
        {
          id: "filters",
          label: "Filters",
          count: activeFilterCount || undefined,
          // Both bodies are written for a gutter host (the drawer); the sheet
          // gives them one.
          content: (
            <div data-gutter-host className="gutter-host h-full min-h-0 flex flex-col">
              <LibraryFilters />
            </div>
          ),
        },
        // Same rule on a phone: the Results section is a second copy of the
        // main pane when that pane is already the Results view.
        ...(showResultsTab
          ? [
              {
                id: "results",
                label: "Results",
                count: hasQuery ? filtered.length : undefined,
                content: (
                  <div data-gutter-host className="gutter-host h-full min-h-0 flex flex-col">
                    {resultsBody}
                  </div>
                ),
              },
            ]
          : []),
      ]}
    />
    </>
  );
}


function FooterButton({
  icon,
  label,
  onClick,
  lead = false,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  /** The bar's one filled button; the rest are ghosts (`warmButton.ts`). */
  lead?: boolean;
}) {
  // The label hides below a 44rem bar (the bar is the container), and the
  // button keeps its name through `aria-label`.
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`hidden sm:flex shrink-0 items-center gap-1.5 px-2.5 @[44rem]:px-3 py-1.5 text-xs font-medium ${lead ? BAR_LEAD : BAR_GHOST} rounded-md transition-colors cursor-pointer`}
    >
      {icon}
      <span className="hidden @[44rem]:inline">{label}</span>
    </button>
  );
}
