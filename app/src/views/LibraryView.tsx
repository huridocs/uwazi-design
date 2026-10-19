import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FULL_TEXT_MIN } from "../utils/searchScope";
import { dateBoundMs } from "../utils/timeline";
import { contentSelectionOf } from "../utils/entityContent";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { CheckSquare, ChevronDown, Clock, FileDown, FileUp, Filter, MessageSquare, MoreHorizontal, Plus, Search, TextSearch, Upload, X } from "lucide-react";
import { settingsAccessAtom } from "../atoms/settings";
import { appViewAtom } from "../atoms/navigation";
import { dataSourceAtom, libraryEntitiesAtom, libraryTypesAtom, cejilReadyAtom, nepalReadyAtom, travesiaReadyAtom, vegasReadyAtom } from "../atoms/dataSource";
import { discardDraftAtom, draftEntityIdAtom, recentTemplatesAtom, startDraftAtom } from "../atoms/entityChanges";
import { NewImportModal } from "../components/import-csv/NewImportModal";
import { useRegisterCsvImport } from "../hooks/useRegisterCsvImport";
import { editSessionOpenAtom } from "../atoms/dirtyGuard";
import { CreateEntityDialog } from "../components/library/CreateEntityDialog";
import { CreateEntityButton } from "../components/library/CreateEntityButton";
import { BatchEntryModal } from "../components/library/BatchEntryModal";
import { runCsvExport, runPanesCsvExport } from "../utils/libraryTasks";
import { uploadFilesAtom } from "../atoms/fileUploads";
import { pickFiles } from "../utils/pickFiles";
import { useLibraryDrop } from "../components/library/LibraryDropTarget";
import { MobileActionMenu } from "../components/layout/MobileActionMenu";
import { defaultTemplateId } from "../utils/createEntity";
import { loadCejilData, cejilRelsByEntity } from "../data/cejil/load";
import { cejilDefaultEntityId } from "../data/cejil/defaultEntity";
import { isCejilEntity } from "../data/cejil/profile";
import { focusCollectionDefaultAtom } from "../atoms/focusedEntity";
import { loadTravesiaData, travesiaRelsByEntity } from "../data/travesia/load";
import { loadNepalData, nepalRefsByEntity } from "../data/nepal/load";
import { loadVegasData, vegasRefsByEntity } from "../data/vegas/load";
import { preloadMediaItemCard } from "../components/metadata/lazyMediaItemCard";
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
  libraryMapBoundsAtom,
  libraryCardInfoAtom,
  libraryResultsPreviewCountAtom,
  previewCount,
  thumbSlotsPerRow,
  libraryCardSideAtom,
  libraryChainFiltersAtom,
  libraryCountryFiltersAtom,
  libraryDateFromAtom,
  libraryDateToAtom,
  libraryDescriptorFiltersAtom,
  libraryFacetMatchAtom,
  libraryRangeFiltersAtom,
  libraryFilterGroupsAtom,
  libraryDrawnIdsAtom,
  libraryPageSizeAtom,
  libraryPageStateAtom,
  type LibraryPageSize,
  libraryFieldColumnsAtom,
  libraryPropertySortsAtom,
  libraryHasDocAtom,
  libraryContentFiltersAtom,
  libraryContentModeAtom,
  libraryInheritedFiltersAtom,
  libraryLanguageInMenuAtom,
  libraryListColumnsAtom,
  libraryListDensityAtom,
  libraryQueryAtom,
  libraryResultsSheetOpenAtom,
  librarySearchDraftAtom,
  librarySelectModeAtom,
  librarySelectedClusterAtom,
  SEARCH_SETTLE_MS,
  libraryOpenEntityIdAtom,
  libraryRailPanelAtom,
  librarySelectionActiveAtom,
  librarySelectionDrawerOpenAtom,
  librarySelectionListAskedAtom,
  librarySortAtom,
  librarySortDirAtom,
  librarySortInMenuAtom,
  libraryViewInMenuAtom,
  libraryStatusFiltersAtom,
  libraryThumbFrameAtom,
  libraryThumbSizeAtom,
  libraryCardColumnsAtom,
  libraryCardColumnsInEffectAtom,
  libraryTimeHubAtom,
  libraryTypeFiltersAtom,
  libraryViewModeAtom,
  libraryOverviewOfferedAtom,
  libraryOverviewOriginAtom,
  libraryHasClaimEvidenceAtom,
  libraryHasSyncAtom,
  matchTypeFiltersAtom,
  librarySearchScopeAtom,
  librarySearchMatchAtom,
  rangeSelectionAtom,
  requestMetadataFocusAtom,
  resultsCurrentPageAtom,
  setSelectionAnchorAtom,
  submitLibrarySearchAtom,
  toggleSelectionAtom,
} from "../atoms/library";
import {
  EntitySelectBox,
  selectionIntent,
  useCurrentSelectionOrder,
  useSelectionOrder,
  useTouchSelection,
  lastPointerWasTouch,
} from "../components/library/EntitySelectBox";
import { ActionsSheet, LibrarySelectionBar } from "../components/library/LibrarySelectionBar";
import { LibraryPageEnd, LibraryPagination } from "../components/library/LibraryPagination";
import { Hint } from "../components/shared/Hint";
import { FooterFoldProvider, useFooterFold, useFooterFoldMeasure } from "../components/library/footerFold";
import { LibrarySelectionDrawer } from "../components/library/LibrarySelectionDrawer";
import { getEntity, getEntityType, type Entity, type EntityImage } from "../data/entities";
import { LibraryNetworkView } from "../components/library/LibraryNetworkView";
import { networkFindStepAtom } from "../atoms/network";
import { LibraryEvidenceView } from "../components/library/LibraryEvidenceView";
import { passageFileIdAtom } from "../atoms/files";
import { libraryInheritedDefs, libraryRangeDefs } from "../utils/libraryFacets";
import { buildActiveChains, chainFacetDefsFor, chainGraphFor } from "../data/chainFacets";
import { templatesAtom } from "../atoms/templates";
import { entityInMapBounds, matchesAll, matchesSearch, passesMatchTypes, buildSearchIndex, activeInheritedOf, activeRangesOf, countryCarriersOf, descriptorCarriersOf, type LibraryFilterState } from "../utils/libraryFilter";
import { highlightTerms, parseSearchQuery, quotedQuery } from "../utils/queryTokens";
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
// Lazy: Leaflet and markercluster load with the map view, not with the Library.
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
import { logSearchAtom } from "../atoms/savedViews";
import { LibraryDisplayMenu } from "../components/library/LibraryDisplayMenu";
import { SavedViewsMenu } from "../components/library/SavedViewsMenu";
import { ActiveSearchChip } from "../components/library/ActiveSearchChip";
import { ActiveFiltersButton } from "../components/library/ActiveFiltersButton";
import { DataTable, type Column } from "../components/shared/DataTable";
import { HighlightedText, SearchMarkProvider } from "../components/shared/HighlightedText";
import { Select } from "../components/shared/Select";
import { MobileEntityList } from "../components/library/MobileEntityList";
import { ViewSwitcher } from "../components/library/ViewSwitcher";
import { LibrarySyncView } from "../components/library/LibrarySyncView";
import { LibraryOverview } from "../components/library/LibraryOverview";
import { DRAWER_MIN_WIDTH } from "../hooks/useDrawerWidth";
import { BAR_GHOST, BAR_LEAD } from "../components/shared/warmButton";
import { BarDivider } from "../components/shared/BarDivider";
import { useTapGuard } from "../hooks/useTapGuard";
import { previewEntityIdAtom } from "../atoms/entityPreview";
import { libraryLayoutAtom } from "../atoms/session";
import { notebookPinCountAtom } from "../atoms/notebook";
import { LibraryFullWidthLayer, LibraryRail, RAIL_RESERVE, SPLIT_RAIL_RESERVE, type RailItem, type RailPane, type RailShare } from "../components/library/LibraryRail";
import { NotebookBody } from "../components/notebook/NotebookPanel";
import { SavedViewsPanel } from "../components/library/SavedViewsMenu";
import { createPortal } from "react-dom";
import { identityOf, sharedPass } from "../utils/sharedPass";
import { paneHoldsEvent, useLibraryPane, useMastheadFold, usePaneResultCount, useSplitFooter, useSplitShared, type LibraryPaneSide, type PaneResults } from "../components/library/libraryPane";
import { zeroResultSuggestions, type ZeroResultSuggestion } from "../utils/zeroResultSuggestions";

const NO_ZERO_SUGGESTIONS: readonly ZeroResultSuggestion[] = [];

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
  const [nepalReady, setNepalReady] = useAtom(nepalReadyAtom);
  useEffect(() => {
    if (dataSource === "nepal" && !nepalReady) {
      let alive = true;
      setCejilError(false);
      // Its media items' record card is a chunk of its own; fetch it now.
      preloadMediaItemCard();
      loadNepalData().then(
        () => alive && setNepalReady(true),
        () => alive && setCejilError(true),
      );
      return () => {
        alive = false;
      };
    }
  }, [dataSource, nepalReady, setNepalReady, cejilRetry]);
  const [vegasReady, setVegasReady] = useAtom(vegasReadyAtom);
  useEffect(() => {
    if (dataSource === "vegas" && !vegasReady) {
      let alive = true;
      setCejilError(false);
      // Its recordings' record card is the same chunk as Nepal's media items.
      preloadMediaItemCard();
      loadVegasData().then(
        () => alive && setVegasReady(true),
        () => alive && setCejilError(true),
      );
      return () => {
        alive = false;
      };
    }
  }, [dataSource, vegasReady, setVegasReady, cejilRetry]);
  // `cejilLoading` covers every lazy source: the selected corpus is still loading.
  const cejilLoading =
    (dataSource === "cejil" && !cejilReady) ||
    (dataSource === "travesia" && !travesiaReady) ||
    (dataSource === "nepal" && !nepalReady) ||
    (dataSource === "vegas" && !vegasReady);
  const lazyName =
    dataSource === "travesia"
      ? "Red Travesía"
      : dataSource === "nepal"
        ? "Nepal protests"
        : dataSource === "vegas"
          ? "Las Vegas, 1 October 2017"
          : "CEJIL";
  const references = useAtomValue(referencesAtom);
  // Filtering, ranking, match categories and highlighting read `query` (the
  // committed search). Only the input binds to the draft.
  const committedQuery = useAtomValue(libraryQueryAtom);
  const setNetworkFindStep = useSetAtom(networkFindStepAtom);
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
  const [descriptorFilters, setDescriptorFilters] = useAtom(libraryDescriptorFiltersAtom);
  const facetMatch = useAtomValue(libraryFacetMatchAtom);
  const rangeFilters = useAtomValue(libraryRangeFiltersAtom);
  const groups = useAtomValue(libraryFilterGroupsAtom);
  const countryMode = facetMatch.country ?? "any";
  const descriptorMode = facetMatch.descriptor ?? "any";
  const [dateFrom, setDateFrom] = useAtom(libraryDateFromAtom);
  const [dateTo, setDateTo] = useAtom(libraryDateToAtom);
  const [inheritedFilters, setInheritedFilters] = useAtom(libraryInheritedFiltersAtom);
  const [chainFilters, setChainFilters] = useAtom(libraryChainFiltersAtom);
  const activeFilterCount = useAtomValue(libraryActiveFilterCountAtom);
  const [viewMode, setViewMode] = useAtom(libraryViewModeAtom);
  const hasClaimEvidence = useAtomValue(libraryHasClaimEvidenceAtom);
  const hasSync = useAtomValue(libraryHasSyncAtom);
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
     21.5rem: 3 columns in a 1400px pane, as on main). Portrait and side cards
     keep size-stepped minimums, because there Size sets the picture's width:
     a portrait slot is the column's width at 3:4, so the minimum is the only
     thing Size can change (11 / 14 / 18rem, all narrower than landscape's
     21.5). Portrait never drops below two columns: one column in a 650px
     Split pane drew a 1,200px card.
     Landscape Size sets the band's height and leaves the count alone.
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
      ? {
          s: "grid-cols-[repeat(auto-fill,minmax(min(11rem,calc(50%-0.375rem)),1fr))]",
          m: "grid-cols-[repeat(auto-fill,minmax(min(14rem,calc(50%-0.375rem)),1fr))]",
          l: "grid-cols-[repeat(auto-fill,minmax(min(18rem,calc(50%-0.375rem)),1fr))]",
        }[thumbSize]
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
  const [selectedCluster, setSelectedCluster] = useAtom(librarySelectedClusterAtom);
  const openEntity = useSetAtom(openEntityAtom);
  const draftId = useAtomValue(draftEntityIdAtom);
  const [selectMode, setSelectMode] = useAtom(librarySelectModeAtom);
  const discardDraft = useSetAtom(discardDraftAtom);
  const [previewEntityId, setOverlayEntity] = useAtom(previewEntityIdAtom);
  const focusForPreview = useSetAtom(focusEntityForPreviewAtom);
  const setScrollToPage = useSetAtom(scrollToPageAtom);
  const setPassageFile = useSetAtom(passageFileIdAtom);
  const setResultsActivePage = useSetAtom(resultsCurrentPageAtom);
  const setFocusMetadataField = useSetAtom(requestMetadataFocusAtom);
  const clearFacets = useSetAtom(clearLibraryFacetsAtom);
  const [matchTypes, setMatchTypes] = useAtom(matchTypeFiltersAtom);
  // Adv. Search's modifiers, passed to every matcher call below.
  const searchScope = useAtomValue(librarySearchScopeAtom);
  const searchMatch = useAtomValue(librarySearchMatchAtom);
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
  /** Create entity: the chosen template opens as a draft in the drawer, on its
   *  edit form. Guarded — the drawer may be holding another entity's edit. */
  const recentTemplates = useAtomValue(recentTemplatesAtom);
  const handleCreate = (typeId: string) => {
    setCreateOpen(false);
    guard(() => setSelectedId(startDraft({ typeId, corpus: dataSource })));
  };
  /** Upload: any files, as many as are picked, queued at once and sent in the
   *  background (`atoms/fileUploads.ts`). Each becomes an entity in the
   *  collection's upload template; the Beacon shows the queue. */
  const uploadFiles = useSetAtom(uploadFilesAtom);
  const drop = useLibraryDrop();
  async function handleUpload() {
    const picked = await pickFiles();
    if (picked?.length) uploadFiles(picked);
  }
  const exportName = (part?: string) =>
    `uwazi-${dataSource}${part ? `-${part}` : ""}-${new Date().toISOString().slice(0, 10)}.csv`;
  /** Export CSV: the current result set with facets, query and match types
   *  applied (`filtered`, the list every view mode draws). */
  function handleExport() {
    if (filtered.length === 0) {
      notify("Nothing to export — no entity matches the current filters", "info");
      return;
    }
    void runCsvExport(store, filtered, language, exportName());
  }
  /** Split's Export CSV menu: one pane's result set, or both as one file led
   *  by a "Pane" column. Each list is the pane's own `filtered`, reported to
   *  the shared results. */
  function handleSplitExport(which: LibraryPaneSide | "both") {
    const results = splitFooter!.results;
    const nothing = () => notify("Nothing to export — no entity matches the current filters", "info");
    if (which !== "both") {
      const list = results.get(which);
      if (list.length === 0) return nothing();
      void runCsvExport(store, list, language, exportName(which));
      return;
    }
    const panes = [
      { label: "Left", entities: results.get("left") },
      { label: "Right", entities: results.get("right") },
    ];
    if (panes.every((p) => p.entities.length === 0)) return nothing();
    void runPanesCsvExport(store, panes, language, exportName("both"));
  }

  const isMobile = breakpoint === "mobile";
  /* Library layout (navbar Settings › Library layout). Full width is desktop only:
     below 1024px the drawer, sheets and Filters button stay as they are. Each
     of Split's panes is a Full width Library (`LibrarySplitView`). */
  const splitPane = useLibraryPane();
  const splitFooter = useSplitFooter();
  // Synced Split: one time strip and one rail for both panes.
  const splitShared = useSplitShared();
  const shared = splitPane ? splitShared : null;
  const layout = useAtomValue(libraryLayoutAtom);
  const fullWidth = !!splitPane || (layout === "full" && breakpoint === "desktop");
  const [railPanel, setRailPanel] = useAtom(libraryRailPanelAtom);
  const notebookPins = useAtomValue(notebookPinCountAtom);

  /* ── Overview ───────────────────────────────────────────────────────────
     The collection's landing page, always the pane's whole width: no drawer,
     no rail while it shows. It has nothing applied, so a search, a filter or
     an open record (a saved view, a link, Create) leaves it for Cards; after
     one of its entry points, clearing what it applied comes back to it.
     Layout effects, so neither move paints a frame of the wrong view. */
  const overview = viewMode === "overview";
  const overviewOffered = useAtomValue(libraryOverviewOfferedAtom);
  const [overviewOrigin, setOverviewOrigin] = useAtom(libraryOverviewOriginAtom);
  const somethingApplied = activeFilterCount > 0 || committedQuery.trim() !== "";
  useLayoutEffect(() => {
    if (overview && (somethingApplied || selectedId)) {
      if (somethingApplied) setOverviewOrigin(true);
      setViewMode("cards");
    } else if (!overview && overviewOrigin && !somethingApplied && !selectedId) {
      setViewMode("overview");
    }
  }, [overview, somethingApplied, selectedId, overviewOrigin, setOverviewOrigin, setViewMode]);

  /* ── Masthead fold ──────────────────────────────────────────────────────
     The toolbar row folds on its own width, not the viewport's: the pane is
     whatever the drawer, or Split's divider, leaves of the window. As the row
     narrows:
       tier 0  everything on one row; the search box gives way down to 12rem;
       tier 1  the readout moves to its own line under the row;
       tier 2  Sort folds into the Display menu, which then carries it
               (`library*InMenuAtom`);
       tier 3  Language folds into it too, and the rule before Display goes;
       tier 4  View folds into it too.
     A phone always has Sort in the menu, the readout on its own line and View
     on the row. The parts' widths are measured while they are on the row
     (Sort's trigger is as wide as its longest label, which depends on the
     collection), so the thresholds follow the parts. A tier changes only with
     width, never with typing or the readout's number. In Split both panes draw
     the more folded tier of the two (`useMastheadFold`), so the two mastheads
     have the same parts and the same height. */
  const [mastheadW, setMastheadW] = useState(0);
  // As last measured on the row; `display` is Views, Display and Language.
  const [partW, setPartW] = useState({ sort: 137, view: 89, lang: 56, display: 132 });
  type FoldPart = "masthead" | "sort" | "view" | "lang" | "display";
  const foldEls = useRef<Partial<Record<FoldPart, HTMLElement>>>({});
  const foldRO = useRef<ResizeObserver | null>(null);
  const foldRefs = useMemo(() => {
    const measure = () => {
      const { masthead, sort, view, lang, display } = foldEls.current;
      if (masthead) {
        const cs = getComputedStyle(masthead);
        const w = Math.round(masthead.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
        setMastheadW((prev) => (prev === w ? prev : w));
      }
      const width = (el: HTMLElement | undefined, prev: number) => (el ? Math.ceil(el.getBoundingClientRect().width) : prev);
      setPartW((prev) => {
        const next = {
          sort: width(sort, prev.sort),
          view: width(view, prev.view),
          lang: width(lang, prev.lang),
          // The whole group only while Language is in it.
          display: lang ? width(display, prev.display) : prev.display,
        };
        return next.sort === prev.sort && next.view === prev.view && next.lang === prev.lang && next.display === prev.display
          ? prev
          : next;
      });
    };
    const ro = () => (foldRO.current ??= new ResizeObserver(measure));
    const track = (key: FoldPart) => (el: HTMLDivElement | null) => {
      const prev = foldEls.current[key];
      if (prev) ro().unobserve(prev);
      foldEls.current[key] = el ?? undefined;
      if (el) ro().observe(el);
    };
    return {
      masthead: track("masthead"),
      sort: track("sort"),
      view: track("view"),
      lang: track("lang"),
      display: track("display"),
      ro,
    };
  }, []);
  useEffect(() => {
    // Observe again after a remount of effects (StrictMode) disconnected it.
    for (const el of Object.values(foldEls.current)) if (el) foldRefs.ro().observe(el);
    return () => {
      foldRO.current?.disconnect();
      foldRO.current = null;
    };
  }, [foldRefs]);
  const mastheadExtra = isMobile ? 40 : 0;
  const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  // `gap-2` between the row's parts, `gap-1.5` inside a group, the 1px rule.
  const gap = 0.5 * remPx, inner = 0.375 * remPx;
  const search = 12 * remPx, readout = 15 * remPx;
  const arrange = (isMobile ? 0 : partW.sort + inner) + partW.view;
  const needs = [
    search + gap + readout + gap + arrange + gap + 1 + gap + partW.display,
    search + gap + arrange + gap + 1 + gap + partW.display,
    search + gap + partW.view + gap + 1 + gap + partW.display,
    search + gap + partW.view + gap + (partW.display - inner - partW.lang),
  ].map((n) => n + mastheadExtra);
  // Unmeasured (the first render) counts as wide; the observer corrects it
  // before paint.
  const fitting = needs.findIndex((n) => mastheadW >= n);
  const ownTier = mastheadW === 0 ? 0 : Math.max(isMobile ? 1 : 0, fitting === -1 ? needs.length : fitting);
  const mastheadFold = useMastheadFold();
  const reportFold = mastheadFold?.report;
  const paneSide = splitPane?.side;
  useEffect(() => {
    if (reportFold && paneSide) reportFold(paneSide, ownTier);
  }, [reportFold, paneSide, ownTier]);
  // Never less folded than this pane needs, even before Split has the report.
  const foldTier = Math.max(mastheadFold?.tier ?? 0, ownTier);
  const readoutInline = foldTier === 0;
  const sortInline = foldTier < 2 && !isMobile;
  const langInline = foldTier < 3;
  const viewInline = foldTier < 4 || isMobile;
  const setSortInMenu = useSetAtom(librarySortInMenuAtom);
  const setLanguageInMenu = useSetAtom(libraryLanguageInMenuAtom);
  const setViewInMenu = useSetAtom(libraryViewInMenuAtom);
  useEffect(() => {
    setLanguageInMenu(!langInline);
  }, [langInline, setLanguageInMenu]);
  useEffect(() => {
    setSortInMenu(!sortInline);
  }, [sortInline, setSortInMenu]);
  useEffect(() => {
    setViewInMenu(!viewInline);
  }, [viewInline, setViewInMenu]);

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
    if (dataSource === "nepal") {
      if (nepalReady) for (const [sid, arr] of nepalRefsByEntity()) m.set(sid, arr.length);
      return m;
    }
    if (dataSource === "vegas") {
      if (vegasReady) for (const [sid, arr] of vegasRefsByEntity()) m.set(sid, arr.length);
      return m;
    }
    for (const r of references) {
      m.set(r.sourceEntityId, (m.get(r.sourceEntityId) ?? 0) + 1);
      m.set(r.targetEntityId, (m.get(r.targetEntityId) ?? 0) + 1);
    }
    return m;
  }, [references, dataSource, cejilReady, travesiaReady, nepalReady, vegasReady]);

  // Precomputed lowercase searchable text per entity (title, country, displayed
  // metadata values, descriptors), so a keystroke doesn't rebuild it per entity.
  const searchIndex = useMemo(
    () => sharedPass(entities, `index:${language}`, () => buildSearchIndex(entities, language)),
    [entities, language],
  );

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
    const id = window.setTimeout(() => recordSearch(t), SEARCH_SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [committedQuery, recordSearch]);

  // A box emptied by hand ends the search once it stays empty for the settle
  // time; retyping before then keeps the results on screen. In synced Split the
  // draft is mirrored, so both panes end it.
  useEffect(() => {
    if (searchDraft !== "" || !committedQuery.trim()) return;
    const id = window.setTimeout(() => clearSearch(), SEARCH_SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [searchDraft, committedQuery, clearSearch]);

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
  const searchTerms = useMemo(() => highlightTerms(query), [query]); // already folded
  // The boolean shape of the same query (AND groups, OR within, NOT excluded),
  // carrying the match mode the filter tests its terms with.
  const searchQuery = useMemo(() => parseSearchQuery(query, { match: searchMatch }), [query, searchMatch]);
  // The same two rules for the marks in the Library's own panes (the entity
  // preview is left out: its Search tab and panels always match partially).
  const searchMarks = useMemo(() => ({ match: searchMatch, scope: searchScope }), [searchMatch, searchScope]);
  const fullTextSearch = q.length >= FULL_TEXT_MIN;
  const fromMs = dateBoundMs(dateFrom, "from");
  // Inclusive of the whole "to" day, or of the "to" minute when it is timed.
  const toMs = dateBoundMs(dateTo, "to");
  // Inherited-property filters with at least one value selected, paired with the
  // facet definition (target type, source-specific value accessor).
  const inheritedDefs = libraryInheritedDefs(dataSource, language);
  const activeInherited = activeInheritedOf(inheritedFilters, facetMatch, inheritedDefs, entities, language, dataSource);
  const inheritedKey = activeInherited
    .map((f) => `${f.def.propId}:${f.mode}:${[...f.values].join("|")}`)
    .join(";");
  const activeRanges = activeRangesOf(rangeFilters, facetMatch, libraryRangeDefs(dataSource));
  const rangesKey = activeRanges.map((r) => `${r.def.name}:${r.mode}:${r.lo}:${r.hi}`).join(";");
  // Relationship-chain filters: the chains the templates declare, over the
  // collection's graph (null until its corpus has loaded).
  const chainTemplates = useAtomValue(templatesAtom(dataSource));
  const activeChains = useMemo(
    () => buildActiveChains(chainFilters, chainFacetDefsFor(dataSource, chainTemplates), chainGraphFor(dataSource)),
    [dataSource, chainFilters, chainTemplates, cejilReady, nepalReady, vegasReady],
  );
  const chainKey = JSON.stringify(chainFilters);
  // The Content card, keyed on content like the facets above.
  const contentFilters = useAtomValue(libraryContentFiltersAtom);
  const contentMode = useAtomValue(libraryContentModeAtom);
  const contentKey = `${JSON.stringify(contentFilters)}:${contentMode}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- content key
  const contentSelection = useMemo(() => contentSelectionOf(contentFilters), [contentKey]);

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
      countryCarriers: countryCarriersOf(entities, dataSource, language),
      descriptors: activeDescriptors,
      descriptorMode,
      descriptorCarriers: descriptorCarriersOf(entities, dataSource),
      fromMs,
      toMs,
      inherited: activeInherited,
      ranges: activeRanges,
      groups,
      chains: activeChains,
      q,
      searchIndex,
      searchTerms,
      searchQuery,
      fullTextSearch,
      searchScope,
      matchTypes,
      content: contentSelection,
      contentMode,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- content keys, see above
    [
      dataSource,
      language,
      activeTypeIds.join(","),
      hasDocOnly,
      wantPublished,
      wantRestricted,
      entities,
      activeCountries.join(","),
      countryMode,
      activeDescriptors.join(","),
      descriptorMode,
      fromMs,
      toMs,
      inheritedKey,
      rangesKey,
      groups,
      activeChains,
      q,
      searchIndex,
      searchTerms,
      searchQuery,
      fullTextSearch,
      searchScope,
      matchTypes,
      contentKey,
    ],
  );

  // Everything `filterState` reads, as a string: the key under which the two
  // Split panes share their full-corpus passes (`sharedPass`).
  const chainIdentity = identityOf(chainTemplates);
  const passKeyParts = [
    dataSource,
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
    rangesKey,
    JSON.stringify(groups),
    chainKey,
    cejilReady,
    nepalReady,
    vegasReady,
    q,
    searchMatch,
    searchScope,
    JSON.stringify(matchTypes),
    contentKey,
  ];
  const passKey = [...passKeyParts, language, chainIdentity].join("\u0001");

  // Where each entity matched, computed at most once per entity per query and
  // shared by the relevance ranking, the match-type chip gate and the chip
  // counts. Lazy: with all chips on nothing asks, and the ranking asks only when
  // the title doesn't settle it.
  const categoriesOf = useMemo(() => {
    const cache = new Map<string, MatchCategories>();
    return (e: Entity): MatchCategories => {
      let c = cache.get(e.id);
      if (!c) {
        c = matchCategoriesWithTerms(e, searchTerms, language, dataSource, searchScope, searchMatch);
        cache.set(e.id, c);
      }
      return c;
    };
    // `cejilReady`: blobs go empty→real when the corpus lands, so cached
    // "document: false" answers from before that must not survive it.
  }, [searchTerms, language, dataSource, cejilReady, searchScope, searchMatch]);

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
    const relevanceQuery = { terms: searchTerms, phrase: searchTerms.join(" "), match: searchMatch };
    return (e: Entity): RelevanceBreakdown => {
      let s = cache.get(e.id);
      if (!s) {
        s = scoreRelevance(e, relevanceQuery, language, dataSource, countByEntity.get(e.id) ?? 0, maxConnections, searchScope);
        cache.set(e.id, s);
      }
      return s;
    };
    // `cejilReady`: document bodies go empty→real when the corpus lands.
  }, [searchTerms, language, dataSource, cejilReady, countByEntity, maxConnections, searchScope, searchMatch]);

  // One full-corpus pass: `matchTypeBase` passes facets and search but not the
  // chips, and the chip-narrowed list is filtered from it rather than from the
  // corpus.
  const matchTypeBase = useMemo(
    () => (q ? sharedPass(entities, `matchType:${passKey}`, () => entities.filter((e) => matchesAll(e, filterState, "matchType"))) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `passKey` follows `filterState`
    [entities, filterState, q],
  );

  // With no result, the switches that would bring some back (the Results
  // bodies' zero state). Counted only while the result is empty.
  const zeroSuggestions = useMemo(
    () =>
      q && matchTypeBase.length === 0
        ? zeroResultSuggestions(entities, filterState, { query, match: searchMatch })
        : NO_ZERO_SUGGESTIONS,
    [q, matchTypeBase.length, entities, filterState, query, searchMatch],
  );

  // Everything but the map's area: what the map draws, so panning brings pins
  // in and out of the area without rebuilding the map. `filtered` narrows it
  // by the area with the same test the `map` node compiles to.
  const unbounded = useMemo(() => {
    const list = q
      ? matchTypeBase.filter((e) =>
          passesMatchTypes(matchTypes, q, () => categoriesOf(e)),
        )
      : sharedPass(entities, `all:${passKey}`, () => entities.filter((e) => matchesAll(e, filterState)));
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
        case "modified":
          r = (a.updatedAt ?? a.createdAt ?? "").localeCompare(b.updatedAt ?? b.createdAt ?? "");
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
  }, [entities, matchTypeBase, categoriesOf, scoreOf, dataSource, activeTypeIds.join(","), hasDocOnly, wantPublished, wantRestricted, statusActive, activeCountries.join(","), countryMode, activeDescriptors.join(","), descriptorMode, fromMs, toMs, inheritedKey, rangesKey, groups, chainKey, contentKey, activeChains, language, q, sort, sortDir, countByEntity, searchIndex, cejilReady, matchTypes, searchScope, searchMatch]);
  const mapBounds = useAtomValue(libraryMapBoundsAtom);
  const filtered = useMemo(
    () => (mapBounds ? unbounded.filter((e) => entityInMapBounds(e, mapBounds)) : unbounded),
    [unbounded, mapBounds],
  );
  // Split's Export CSV reads both panes' sets.
  const paneResults = splitFooter?.results;
  useEffect(() => {
    if (paneSide && paneResults) paneResults.set(paneSide, filtered);
  }, [paneSide, paneResults, filtered]);
  // The filter with the map's area, for the passes that go through `compile`.
  const boundedState = useMemo(
    () => (mapBounds ? { ...filterState, mapBounds } : filterState),
    [filterState, mapBounds],
  );

  // How many entities the query matches with the facets widened, so the Results
  // tab can offer to reveal the ones the current facets are hiding.
  const searchMatchCount = useMemo(
    () =>
      q
        ? sharedPass(entities, `searchCount:${passKey}`, () =>
            entities.reduce((n, e) => n + (matchesSearch(e, filterState) ? 1 : 0), 0),
          )
        : 0,
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
  // default): it filters by date and charts the whole result set. Not under
  // Sync, whose own clock is the time axis there; a date filter set elsewhere
  // still applies, and the Sync toolbar names it.
  const showBrush = timeHub && !cejilLoading && viewMode !== "overview" && viewMode !== "sync";
  // Synced Split draws one strip under both panes: the left pane's when it
  // wants one, else the right pane's. Both write the one synced date range.
  const reportBrush = shared?.reportBrush;
  useEffect(() => {
    if (!reportBrush || !paneSide) return;
    reportBrush(paneSide, showBrush);
    return () => reportBrush(paneSide, false);
  }, [reportBrush, paneSide, showBrush]);
  const drawsSharedBrush =
    !!shared?.brushSlot && showBrush && (paneSide === "left" || !shared.brushWanted.left);

  // The brush histogram applies every facet except the date one, so the bars
  // outside the range (dimmed) show what widening the window would add.
  const timeChart = useMemo(
    () =>
      showBrush
        ? sharedPass(entities, `date:${JSON.stringify(mapBounds)}:${passKey}`, () =>
            entities.filter((e) => matchesAll(e, boundedState, "date")),
          )
        : [],
    [entities, mapBounds, dataSource, activeTypeIds.join(","), hasDocOnly, wantPublished, wantRestricted, statusActive, activeCountries.join(","), countryMode, activeDescriptors.join(","), descriptorMode, inheritedKey, rangesKey, groups, chainKey, contentKey, activeChains, language, q, searchIndex, showBrush, searchScope, searchMatch],
  );
  // …and the Lanes grid drops the template facet too, so drilling into one lane
  // doesn't shrink the grid to that single lane.
  const laneChart = useMemo(
    () =>
      viewMode === "timeline" && !cejilLoading
        ? sharedPass(entities, `lanes:${passKey}`, () =>
            entities.filter((e) => matchesAll(e, { ...filterState, typeIds: [] }, "date")),
          )
        : [],
    [entities, dataSource, hasDocOnly, wantPublished, wantRestricted, statusActive, activeCountries.join(","), countryMode, activeDescriptors.join(","), descriptorMode, inheritedKey, rangesKey, groups, chainKey, contentKey, activeChains, language, q, searchIndex, viewMode, cejilLoading, searchScope, searchMatch],
  );

  /* Thumbnail Auto reads how many of these results can draw a preview. A layout
     effect, so a change of results repaints before the browser paints. */
  const setPreviewCount = useSetAtom(libraryResultsPreviewCountAtom);
  const resultsPreviewCount = useMemo(() => previewCount(filtered, dataSource), [filtered, dataSource]);
  const withPreview = resultsPreviewCount?.withPreview ?? -1;
  const total = resultsPreviewCount?.total ?? 0;
  // Keyed on the two numbers, so a new list with the same counts stores nothing.
  // Cleared on unmount, so the next mount answers from its own corpus until it measures.
  useLayoutEffect(() => {
    setPreviewCount(withPreview < 0 ? null : { withPreview, total });
    return () => setPreviewCount(null);
  }, [withPreview, total, setPreviewCount]);

  // Cards, List and Adv. Search show one page of the results
  // (`LibraryPagination` in the footer), and the drawer's Results tab pages on
  // the same state. The page belongs to the results it was chosen for: a new
  // key (collection, filters, query, sort, map area) reads as page 1, and coming
  // Back from a record rebuilds the same key, so the page and its scroll hold.
  // Adv. Search scrolls inside its own body, which registers itself as the lane.
  const paged = viewMode === "cards" || viewMode === "list" || viewMode === "results";
  /** Views whose records a click can pick (the bar's Select). */
  const canSelect = paged || viewMode === "timeline" || viewMode === "map";
  // `passKey` without the chain templates' identity, which is new on every
  // mount and would turn Back into a new key, and without the language, so a
  // language switch keeps the page.
  const pageKey = [...passKeyParts, JSON.stringify(mapBounds), sort, sortDir].join("\u0001");
  const pageSize = useAtomValue(libraryPageSizeAtom);
  const [pageState, setPageState] = useAtom(libraryPageStateAtom);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const ownPage = pageState.key === pageKey;
  const page = ownPage ? Math.min(pageState.page, pageCount) : 1;
  const shown = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );
  const laneRef = useRef<HTMLDivElement | null>(null);
  const goToPage = useCallback(
    (n: number) => {
      setPageState({ key: pageKey, page: n, scroll: 0 });
    },
    [pageKey, setPageState],
  );
  // Thumbnail Per row: which cards keep the slot, from the columns the grid
  // drew. Rows reform with the column count (resize, Size, Frame, the drawer,
  // Split) and with the page.
  const colsDrawn = useAtomValue(libraryCardColumnsInEffectAtom);
  const rowSlots = useMemo(
    () =>
      viewMode === "cards" && cardInfo.thumbMode === "row" && colsDrawn > 0
        ? thumbSlotsPerRow(shown, colsDrawn, dataSource)
        : null,
    [viewMode, cardInfo.thumbMode, colsDrawn, shown, dataSource],
  );
  // When rows reform, the cards above change height: keep the first card in
  // view where it was, as a new page size keeps the page's first result.
  const rowAnchor = useRef<{ id: string; top: number } | null>(null);
  const noteRowAnchor = useCallback(() => {
    const lane = laneRef.current;
    if (!lane) return;
    const laneTop = lane.getBoundingClientRect().top;
    for (const box of lane.querySelectorAll<HTMLElement>('[data-component="EntityCard"] [data-select-id]')) {
      const card = box.closest<HTMLElement>('[data-component="EntityCard"]');
      const r = card?.getBoundingClientRect();
      if (r && r.bottom > laneTop) {
        rowAnchor.current = { id: box.dataset.selectId!, top: r.top - laneTop };
        return;
      }
    }
  }, []);
  const rowShape = rowSlots ? `${colsDrawn}:${rowSlots.map((on) => (on ? 1 : 0)).join("")}` : "";
  useLayoutEffect(() => {
    const lane = laneRef.current;
    const a = rowAnchor.current;
    if (rowShape && lane && a && lane.scrollTop > 0) {
      const card = lane
        .querySelector(`[data-select-id="${CSS.escape(a.id)}"]`)
        ?.closest<HTMLElement>('[data-component="EntityCard"]');
      if (card) lane.scrollTop += card.getBoundingClientRect().top - lane.getBoundingClientRect().top - a.top;
    }
    noteRowAnchor();
  }, [rowShape, noteRowAnchor]);

  // A new size keeps the first result of the page in view.
  const setPageSize = useSetAtom(libraryPageSizeAtom);
  const changePageSize = useCallback(
    (size: LibraryPageSize) => {
      setPageSize(size);
      goToPage(Math.floor(((page - 1) * pageSize) / size) + 1);
    },
    [setPageSize, goToPage, page, pageSize],
  );
  // The lane's scroll, kept with the page so Back restores it: saved when the
  // Library unmounts (a record opened over it), put back when the lane mounts
  // again. The lane can mount after this component does (the drawer's split
  // lays it out first), so the restore is in its ref, not in a mount effect.
  const pageScroll = useRef({ key: pageKey, page, top: ownPage ? pageState.scroll : 0 });
  pageScroll.current.key = pageKey;
  pageScroll.current.page = page;
  // Another page, or the same page of other results, starts at the top.
  const shownFirst = shown[0]?.id;
  const lastShown = useRef(shownFirst);
  useEffect(() => {
    if (lastShown.current === shownFirst) return;
    lastShown.current = shownFirst;
    if (paged) laneRef.current?.scrollTo({ top: 0 });
  }, [shownFirst, paged]);
  const pendingScroll = useRef(pageScroll.current.top);
  const setLane = useCallback((el: HTMLDivElement | null) => {
    laneRef.current = el;
    if (el && pendingScroll.current > 0) {
      el.scrollTop = pendingScroll.current;
      pendingScroll.current = 0;
    }
  }, []);
  const setResultsLane = useCallback((el: HTMLDivElement | null) => {
    laneRef.current = el;
    // `ResultsMainView` restores the scroll itself, once its page is built.
    if (el) pendingScroll.current = 0;
  }, []);
  const keepPageScroll = useCallback((top: number) => {
    pageScroll.current.top = top;
  }, []);
  // The scroll is kept only for Back from a record: leaving for Settings,
  // Import CSV or Pages, the Library opens at the top when it comes back. The
  // view switched to is already in `appViewAtom` when this unmounts.
  useEffect(
    () => () => {
      const { key, page: p, top } = pageScroll.current;
      setPageState({ key, page: p, scroll: store.get(appViewAtom) === "entity" ? top : 0 });
    },
    [setPageState, store],
  );
  // Another view mode opens at its top: the lane is one element for every
  // mode, so it would carry the last one's offset. Before paint, and only on a
  // change, so Back's restore (on mount) and a language switch are untouched.
  const laneView = useRef(viewMode);
  useLayoutEffect(() => {
    if (laneView.current === viewMode) return;
    laneView.current = viewMode;
    if (laneRef.current) laneRef.current.scrollTop = 0;
    pageScroll.current.top = 0;
  }, [viewMode]);

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
  const currentSelectionOrder = useCurrentSelectionOrder();
  /* A plain click on the empty ground of the results (lane, gaps, margin)
     clears the selection through the same guard as Escape. Ignored: clicks on
     items or controls, modifier clicks, the end of a drag or text selection,
     and the map, whose ground is the map. */
  const groundDown = useRef<{ x: number; y: number } | null>(null);
  const clearOnGround = useCallback(
    (e: React.MouseEvent) => {
      // Select mode keeps going until Clear or Escape: a click that misses a
      // record while picking them is not a request to stop.
      if (!selectionActive || selectMode || viewMode === "map") return;
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
    [selectionActive, selectMode, viewMode, clearSelection],
  );
  const [selectionDrawerOpen, setSelectionDrawerOpen] = useAtom(librarySelectionDrawerOpenAtom);
  const [selectionListAsked, setSelectionListAsked] = useAtom(librarySelectionListAskedAtom);
  useEffect(() => {
    if (selectionListAsked && (!selectionActive || !selectionDrawerOpen)) setSelectionListAsked(false);
  }, [selectionListAsked, selectionActive, selectionDrawerOpen, setSelectionListAsked]);
  const shownIds = useMemo(() => shown.map((e) => e.id), [shown]);
  const filteredIds = useMemo(() => filtered.map((e) => e.id), [filtered]);
  // The grid's and the table's order — Timeline and Results register their own,
  // so this one stands down while they draw (see `useSelectionOrder`).
  // The whole result order, not the page: a Shift+click on another page of
  // Cards or List spans every result between.
  useSelectionOrder(viewMode === "timeline" || viewMode === "results" ? null : filteredIds);
  // What the visible view draws, for the select-all box. The grid's page, the table
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
  // a dialog, an open menu. In Split, only in the pane that holds the focus or
  // the pointer.
  useEffect(() => {
    if (!selectionActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (!paneHoldsEvent(splitPane, e)) return;
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
  }, [selectionActive, clearSelection, splitPane]);

  // A map cluster's list in the drawer closes on Escape too. In Full width
  // and Split it is a rail panel, whose own Escape closes it.
  const clusterListOpen = !!selectedCluster && !selectedId && viewMode === "map" && !fullWidth;
  useEffect(() => {
    if (!clusterListOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input:not([type=checkbox]), textarea, select, [role=dialog], [role=menu], [role=listbox]")) return;
      if (document.querySelector('[aria-haspopup][aria-expanded="true"]')) return;
      setSelectedCluster(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clusterListOpen, setSelectedCluster]);

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
      /** Phones and Split: go to the entity view (in Split, the pane's own)
       *  rather than a sheet or the pane's preview (a passage jump needs the
       *  document, which neither carries). */
      navigate = false,
    ) => {
      const intent = e ? selectionIntent(e) : null;
      if (intent === "toggle") return toggleSelection(id);
      // Touch, with a selection going: a tap adds or removes (a long press
      // starts one — see useTouchSelection).
      if (e && selectionActive && lastPointerWasTouch()) return toggleSelection(id);
      // The bar's Select mode: a plain click adds or removes, on any pointer.
      if (e && selectMode && intent !== "range") return toggleSelection(id);
      if (intent === "range") return rangeSelection({ order: currentSelectionOrder(), id });
      const preview = () => {
        // A plain click anchors the next Shift range here (see setSelectionAnchorAtom).
        setAnchor(id);
        if ((isMobile || splitPane) && navigate) {
          openEntity(id);
        } else if (isMobile) {
          // A phone opens the entity as a sheet on the stack (the connection
          // overlay's, see MobileOverlayStack) over the list you are reading;
          // its footer's "Open entity" is the route to the full view.
          setOverlayEntity(id);
        } else {
          // A Split pane's preview leaves the pane's focus alone: it is what
          // the pane's entity view opens on.
          if (!splitPane) focusForPreview(id);
          setSelectedId(id);
        }
      };
      // A record open on its form (a draft, an edit) asks before another
      // takes the drawer: leaving drops the form.
      guard(() => (collapse ? collapseSelection(preview) : preview()));
    },
    [
      guard,
      isMobile,
      openEntity,
      setOverlayEntity,
      focusForPreview,
      setSelectedId,
      toggleSelection,
      rangeSelection,
      selectionActive,
      selectMode,
      collapseSelection,
      setAnchor,
      currentSelectionOrder,
      splitPane,
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
  const clearNetworkSelection = useCallback(() => {
    if (isMobile) setOverlayEntity(null);
    else guard(() => setSelectedId(null));
  }, [isMobile, setOverlayEntity, setSelectedId, guard]);
  useTouchSelection(toggleSelection, splitPane?.root);
  useTapGuard();

  // Results-tab full-text snippet: select the entity, then jump the preview's
  // document to the hit page (DocumentViewer consumes scrollToPageAtom). On
  // mobile handleSelect opens the full view; the page jump still applies.
  // The page belongs to the file the passage was cut from, so that file is
  // what opens — the reading language may pick another document entirely.
  const handleSnippetSelect = useCallback(
    (id: string, page: number) => {
      // Select mode: a passage is part of its record, so the click picks it.
      if (selectMode) return toggleSelection(id);
      setPassageFile(null);
      selectFrom(true, id, undefined, true);
      const entity = getEntity(id);
      setPassageFile(entity ? passageFileId(entity, language, dataSource) : null);
      setScrollToPage(page);
      setResultsActivePage({ entityId: id, page });
    },
    [selectMode, toggleSelection, selectFrom, setPassageFile, language, dataSource, setScrollToPage, setResultsActivePage],
  );

  // Results-tab Properties hit: open the entity preview and deep-focus the field
  // (the drawer switches to its Metadata tab and flashes the field by key).
  const handleFocusProperty = useCallback(
    (id: string, fieldKey: string) => {
      // Select mode: a matched property is part of its record, so the click picks it.
      if (selectMode) return toggleSelection(id);
      handleSelect(id);
      setFocusMetadataField({ entityId: id, fieldKey });
    },
    [selectMode, toggleSelection, handleSelect, setFocusMetadataField],
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
    () => listColumnSpecs({ hasQuery, fieldColumns, source: dataSource }),
    [hasQuery, fieldColumns, dataSource],
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
            {matchTypeBase.length === 1 ? "result" : "results"}
            {viewMode !== "results" && " for"}
          </span>
          {/* Adv. Search shows the query in the field and its bar's term
              chips; a third copy here would only repeat it. */}
          {viewMode !== "results" && <ActiveSearchChip className="min-w-0" />}
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

  /** What a screen reader hears: the count once a search settles, not on each
   *  keystroke. Empty while results compute and when no search runs. */
  const settledReadout =
    hasQuery && !searchPending && !cejilLoading
      ? `${filtered.length.toLocaleString()} ${filtered.length === 1 ? "result" : "results"} for ${quotedQuery(query.trim())}`
      : "";
  const [announcedReadout, setAnnouncedReadout] = useState("");
  useEffect(() => {
    if (!settledReadout) {
      setAnnouncedReadout("");
      return;
    }
    const id = window.setTimeout(() => setAnnouncedReadout(settledReadout), SEARCH_SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [settledReadout]);

  // The bottom bar folds on its own width (`footerFold.tsx`): first the
  // actions' words, then the page group in steps. Phones have their own bar.
  const footerFold = useFooterFoldMeasure(
    [
      selectionActive ? "sel" : "idle",
      activeFilterCount > 0 ? "f" : "",
      canImport ? "imp" : "",
      paged && !cejilLoading ? `p${filtered.length}` : "",
      splitFooter && !splitFooter.synced ? "split" : "",
    ].join("|"),
    isMobile,
  );
  const renderLeft = (menuTrigger?: ReactNode) => {
  // Cards and List page their results; the other views draw the whole set.
  const pagination =
    paged && !cejilLoading ? (
      <LibraryPagination
        total={filtered.length}
        page={page}
        pageSize={pageSize}
        onPage={goToPage}
        onPageSize={changePageSize}
        compact={isMobile}
        label={paneSide ? `Pages, ${paneSide} pane` : "Pages"}
      />
    ) : null;
  const footerActions = (
    <FooterFoldProvider value={footerFold.fold}>
    <div ref={footerFold.ref} data-part="footer-row" data-fold={footerFold.fold} className="flex-1 min-w-0 self-stretch flex items-center gap-1">
        {/* The bar swaps in place between the baseline actions and the
            selection's, at the same height. The selection's readout, Clear and
            select-all sit at the bar's end in `LibrarySelectionBar`. */}
        {selectionActive && (
          <LibrarySelectionBar
            filteredIds={filteredIds}
            loadedIds={drawnIds}
            paged={paged}
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
        {!selectionActive && (
          <FooterButton
            icon={<Upload size={13} className="text-ink-tertiary" />}
            label="Upload"
            onClick={() => void handleUpload()}
          />
        )}
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
            {/* Split: a menu of left, right and both. Synced, the two panes
                hold one set and the button exports it at once. */}
            {splitFooter && !splitFooter.synced ? (
              <SplitExportButton results={splitFooter.results} onExport={handleSplitExport} />
            ) : (
              <FooterButton
                icon={<FileDown size={13} className="text-ink-tertiary" />}
                label="Export CSV"
                onClick={handleExport}
              />
            )}
          </>
        )}
        {/* No result count here: the masthead readout holds it, and the page
            group at the bar's end says which part of it is shown. The
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
        {/* With a selection the bar places it, before its end group. */}
        {/* Phones carry Filters as a button of their own (below), with the count. */}
        {!selectionActive && !menuTrigger && <ActiveFiltersButton className="ms-2 shrink-0" />}
        {/* The page group at the bar's end, where the PDF viewer keeps its
            pager. With a selection it follows the selection's end group. */}
        {pagination && !menuTrigger &&
          (selectionActive ? (
            <>
              <BarDivider className="hidden sm:block" />
              {pagination}
            </>
          ) : null)}
        {/* The way into picking several records, at the bar's end where the
            selection's own end group (this page, every result, the count)
            takes its place once it is on. Cmd/Ctrl and Shift + click still
            start one from the view. */}
        {!selectionActive && !menuTrigger && (canSelect || pagination) && (
          <div data-fold-push className="ms-auto shrink-0 flex items-center gap-1">
            {canSelect && (
              <FooterButton
                icon={<CheckSquare size={13} className="text-ink-tertiary" />}
                label="Select"
                hint={`Pick several records: click one to add or remove it.\u00a0${MOD_KEY} + click works without this; Shift + click adds a range.`}
                onClick={() => setSelectMode(true)}
              />
            )}
            {canSelect && pagination && <BarDivider className="hidden sm:block" />}
            {pagination}
          </div>
        )}
        {/* Phones: the drawer's navigation (Filters / Results sheets) sits at
            the bar's END, where the entity view's bar keeps it: in thumb reach,
            and a menu at the bottom opens upward. Only the drawer nav moved;
            search, view mode, Display and the readout stay on top. */}
        {menuTrigger && (
          <div data-part="sheets" data-fold-push className="ms-auto shrink-0 flex items-center gap-1">
            {pagination && <div className="me-1 flex">{pagination}</div>}
            {/* Filters one tap away, not behind the menu. */}
            <button
              type="button"
              data-part="filters"
              onClick={() => setOpenSection("filters")}
              aria-haspopup="dialog"
              aria-label={activeFilterCount ? `Filters, ${activeFilterCount} active` : "Filters"}
              className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium ${BAR_GHOST} rounded-md cursor-pointer`}
            >
              <Filter size={13} className="text-ink-tertiary" aria-hidden />
              Filters
              {activeFilterCount > 0 && (
                <span className="min-w-4 px-1 rounded-md bg-warm text-ink text-meta font-semibold tabular-nums">{activeFilterCount}</span>
              )}
            </button>
            {menuTrigger}
          </div>
        )}
    </div>
    </FooterFoldProvider>
  );
  return (
    // The narrow-tier gutter host (12px). The toolbar, the view lane, the time
    // brush and the footer are `bleed` bands: their grounds and rules reach the
    // pane edge and their content sits on the gutter.
    <SearchMarkProvider value={searchMarks}>
    <div data-gutter-host className="gutter-host relative flex flex-col h-full min-h-0 bg-paper" {...drop.handlers}>
      {drop.overlay}
      {/* Toolbar — a row of controls, and under it (when the row can't hold
          it) the readout's own line. See "Masthead fold" above. */}
      <div
        ref={foldRefs.masthead}
        data-part="masthead"
        data-fold-tier={foldTier}
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
              if (e.key === "Enter" && viewMode === "network" && searchDraft.trim() && searchDraft.trim() === committedQuery.trim()) {
                // The Network view's find: the query is searched, so Enter
                // and Shift+Enter step through its matches.
                e.preventDefault();
                setSearchFocused(false);
                setNetworkFindStep((s) => ({ dir: e.shiftKey ? -1 : 1, n: s.n + 1 }));
                return;
              }
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
              // Ends the search: an empty box means no query.
              onClick={() => clearSearch()}
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
        {/* The result count: "N entities" / "N of M entities", or
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
        {(sortInline || viewInline) && (
        <div data-part="arrange" className="shrink-0 flex items-center gap-1.5">
          {sortInline && (
          // The Overview lists nothing, so Sort has nothing to order: hidden
          // there, its slot kept so View and Display stay put between views.
          <div ref={foldRefs.sort} className={overview ? "invisible" : undefined} aria-hidden={overview || undefined}>
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
          {viewInline && (
            <div ref={foldRefs.view}>
              <ViewSwitcher
                value={viewMode}
                onChange={(v) => {
                  // A view picked by hand is the reader's own: clearing no longer
                  // goes back to the Overview.
                  setOverviewOrigin(false);
                  setViewMode(v as typeof viewMode);
                }}
                evidence={hasClaimEvidence}
                sync={hasSync}
                overview={overviewOffered}
              />
            </div>
          )}
        </div>
        )}
        {/* One hairline between what is listed (sort, view) and how it is drawn
            (Display, Language). It folds with Language, since past that point
            each side is one control. Width decides it, never state. */}
        {langInline && (
          <span aria-hidden="true" data-part="rule" className="shrink-0 w-px h-4 bg-border" />
        )}
        <div ref={foldRefs.display} data-part="display" className="shrink-0 flex items-center gap-1.5">
          {/* Display is icon-only and always mounted; view-specific options live
              in its popover, so changing view never shifts this row. */}
          <SavedViewsMenu />
          <LibraryDisplayMenu />
          {/* Languages: one dropdown of fixed width (codes, not names — a "Français"
              label would resize the trigger and shift the row again). */}
          {langInline && (
          <div ref={foldRefs.lang}>
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
      <span role="status" aria-live="polite" className="sr-only">{announcedReadout}</span>
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

      {/* Results. In Full width the lane and the brush share a positioned
          host: the rail, its panels and the pane slide-over cover them. */}
      {wrapLane(<>
      <div
        // A Shift+click is a range, not a text selection across the grid.
        onMouseDown={(e) => {
          if (e.shiftKey) e.preventDefault();
          groundDown.current = { x: e.clientX, y: e.clientY };
        }}
        onClick={clearOnGround}
        ref={viewMode === "results" ? undefined : setLane}
        onScroll={
          (paged && viewMode !== "results") || rowSlots
            ? (e) => {
                if (paged && viewMode !== "results") pageScroll.current.top = e.currentTarget.scrollTop;
                // Per row: the card a reform keeps in place.
                if (rowSlots) noteRowAnchor();
              }
            : undefined
        }
        // Only a real tap opens an item here, never the end of a scroll.
        data-tap-guard
        // A canvas lane spans the pane on purpose: `__gutter()` lists it and
        // does not assert it.
        data-gutter-bleed={viewMode === "map" || viewMode === "network" ? "" : undefined}
        // A `bleed` lane: warm ground and scrollbar at the pane edge, content on
        // the gutter. Every view mode sits on it, Results included — its header
        // row and card lane carry no side padding of their own.
        // The map and the network are canvases: they fill the lane to the pane
        // edges, no gutter and no inset; their overlays sit on the gutter.
        className={`flex-1 min-h-0 bg-warm ${viewMode === "map" || viewMode === "network" ? "bleed-flush" : "bleed py-3"} ${
          viewMode === "map" || viewMode === "timeline" || viewMode === "results" || viewMode === "network" || viewMode === "sync"
            ? "flex flex-col overflow-hidden"
            : "overflow-auto"
        }`}
        // Full width: the scrolling views keep their end clear of the rail;
        // the canvases run under it and move their top-end controls aside.
        // The Overview has no rail.
        style={fullWidth && !overview ? railReserve : undefined}
      >
        {overview && !cejilError ? (
          // Draws its own fixed-height sections while a corpus loads.
          <LibraryOverview loading={cejilLoading} />
        ) : cejilLoading ? (
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
              <LibraryMapView entities={unbounded} />
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
              totalMatches={matchTypeBase.length}
              relevanceOf={scoreOf}
              zeroSuggestions={zeroSuggestions}
              page={page}
              pageSize={pageSize}
              onPage={goToPage}
              pageLabel={paneSide ? `Pages, ${paneSide} pane` : "Pages"}
              laneRef={setResultsLane}
              restoreScroll={pendingScroll.current}
              onScrollTop={keepPageScroll}
            />
          </div>
        ) : viewMode === "network" ? (
          // Draws the collection with the matches brought forward; an empty
          // result set says so on the canvas rather than replacing it.
          <div className="flex-1 min-h-0">
            <LibraryNetworkView
              matches={filtered}
              filtering={filtered.length !== entities.length}
              // A phone's tap opens the sheet, not the drawer: its entity is
              // the canvas's selection, drawn over the sheet's top.
              selectedId={isMobile ? previewEntityId : selectedId}
              onSelect={handleSelect}
              onClear={clearNetworkSelection}
              query={query}
              relevanceOf={scoreOf}
            />
          </div>
        ) : viewMode === "sync" ? (
          // Owns its scroll and its empty state: the clock and the readout
          // stay while the filters leave no recording.
          <div className="flex-1 min-h-0">
            <LibrarySyncView entities={filtered} selectedId={isMobile ? previewEntityId : selectedId} onSelect={handleSelect} />
          </div>
        ) : viewMode === "evidence" ? (
          // Owns its empty state: an empty set and a set without claims say
          // the same thing here.
          <LibraryEvidenceView entities={filtered} selectedId={selectedId} onSelect={handleSelect} />
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-ink-tertiary">
            No entities match your filters.
          </div>
        ) : viewMode === "cards" ? (
          <ul ref={cardGridRef} className={`grid ${colCount ? "" : cardGridCols} gap-3`} style={cardGridStyle}>
            {shown.map((e, i) => (
              <EntityCard
                key={e.id}
                as="li"
                preview={rowSlots ? rowSlots[i] : undefined}
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
          <MobileEntityList rows={shown} query={query} selectedId={selectedId} onSelect={handleSelect} columnOn={listColumnOn} />
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
            // Many columns scroll the lane sideways, header and Title held.
            overflow="host"
            // The lane's `py-3`.
            stickyTop="-0.75rem"
            density={listDensity}
          />
        )}
        {/* The pager again under the last card or row (`LibraryPageEnd`). */}
        {paged && viewMode !== "results" && !overview && !cejilLoading && filtered.length > 0 && pageCount > 1 && (
          <LibraryPageEnd
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPage={goToPage}
            compact={isMobile}
            label={paneSide ? `Pages, ${paneSide} pane` : "Pages"}
          />
        )}
      </div>

      {/* Time brush — map + timeline. Synced Split draws one under both panes. */}
      {showBrush && !shared && <TimeBrush entities={timeChart} />}
      {drawsSharedBrush &&
        createPortal(
          <div data-library-pane-owner={paneSide} className="contents">
            <TimeBrush entities={timeChart} />
          </div>,
          shared!.brushSlot!,
        )}
      </>)}

      {/* The footer's dialogs and file input, mounted whichever bar shows the
        actions (in Split the bar is shared and follows the active pane). */}
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
            { label: "Upload", icon: <Upload size={14} />, onClick: () => void handleUpload() },
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
      {/* Footer action bar. A container, so the four actions fold to their
          icons (each keeps its name) when the pane is too narrow for their
          labels — a drawer open beside the library, a small window — instead
          of wrapping onto a second line inside a fixed-height bar. */}
      {splitPane ? (
        // Split: one bar for both panes (`LibrarySplitView`); the active pane
        // renders its actions into it.
        splitFooter?.slot && splitFooter.active === splitPane.side && createPortal(footerActions, splitFooter.slot)
      ) : (
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
          {footerActions}
        </div>
      )}
    </div>
    </SearchMarkProvider>
  );
  };

  // Results tab body — the per-entity evidence view (where each term hit).
  const resultsBody = (
    <SearchMarkProvider value={searchMarks}>
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
      onSelect={handleSelect}
      selectedId={selectedId}
      // Stable identities, or the memo on ResultsBody is decorative: a fresh
      // arrow per render is a changed prop, and this list re-snippets its whole
      // visible page when it re-renders.
      onClearSearch={handleClearSearch}
      hiddenByFilters={Math.max(0, searchMatchCount - matchTypeBase.length)}
      onClearFilters={handleClearFacets}
      matchTypeCounts={matchTypeCounts}
      totalMatches={matchTypeBase.length}
      relevanceOf={scoreOf}
      zeroSuggestions={zeroSuggestions}
      page={page}
      pageSize={pageSize}
      onPage={goToPage}
      pageLabel={paneSide ? `Results pages, ${paneSide} pane` : "Results pages"}
    />
    </SearchMarkProvider>
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
    <SearchMarkProvider value={searchMarks}>
      <LibrarySelectionDrawer onSelect={handleDrawerSelect} query={query} />
    </SearchMarkProvider>
  ) : selectedCluster && viewMode === "map" ? (
    <SearchMarkProvider value={searchMarks}>
      <LibraryClusterDrawer onSelect={handleDrawerSelect} query={query} />
    </SearchMarkProvider>
  ) : (
    filtersDrawer
  );

  /* ── Full width ─────────────────────────────────────────────────────────
     The drawer's Filters and Results tabs, the Notebook and the Views menu's
     body become the rail's panels; what else the drawer would show (the
     preview, the selection list, a map cluster) opens in the same panel. */
  /* Synced Split: the rail sits over the divider, so each pane keeps its
     facing edge clear instead: the left pane its end, the right pane its start
     (logical sides, so RTL mirrors). */
  const canvasLane = viewMode === "map" || viewMode === "network";
  const railReserve = (
    shared
      ? paneSide === "left"
        ? canvasLane
          ? { "--rail-reserve": SPLIT_RAIL_RESERVE }
          : { paddingInlineEnd: `calc(var(--gutter, 0px) + ${SPLIT_RAIL_RESERVE})` }
        : canvasLane
          ? { "--rail-reserve-start": SPLIT_RAIL_RESERVE }
          : { paddingInlineStart: `calc(var(--gutter, 0px) + ${SPLIT_RAIL_RESERVE})` }
      : canvasLane
        ? { "--rail-reserve": RAIL_RESERVE }
        : { paddingInlineEnd: `calc(var(--gutter, 0px) + ${RAIL_RESERVE})` }
  ) as React.CSSProperties;
  const railItems: RailItem[] = [
    {
      id: "filters",
      label: t("System", "Filters"),
      icon: <Filter size={15} aria-hidden />,
      dot: activeFilterCount > 0,
      body: <LibraryFilters />,
    },
    {
      // Where Results goes in this layout is open; it is a rail item for now.
      id: "results",
      label: t("System", "Results"),
      icon: <TextSearch size={15} aria-hidden />,
      dot: hasQuery && filtered.length > 0,
      disabledReason: showResultsTab ? undefined : "Adv. Search shows them in the main pane",
      body: resultsBody,
    },
    {
      id: "notebook",
      label: t("System", "Notebook"),
      icon: <MessageSquare size={15} aria-hidden />,
      // The navbar's Notebook button is hidden in this layout; its count is here.
      count: notebookPins,
      countNoun: "pinned",
      ownHeader: true,
      body: (
        <div data-gutter-host className="gutter-host flex flex-col h-full min-h-0">
          <NotebookBody onClose={() => setRailPanel(null)} />
        </div>
      ),
    },
    {
      id: "views",
      label: "Views and history",
      icon: <Clock size={15} aria-hidden />,
      fit: true,
      // The Views menu's popover body, with the popover's own inset.
      body: (
        <div className="bleed-flush min-h-0 overflow-y-auto p-1">
          <SavedViewsPanel onDone={() => setRailPanel(null)} />
        </div>
      ),
    },
  ];
  const closePreview = (next?: () => void) =>
    guard(() => {
      if (selectedId === draftId) discardDraft(selectedId!);
      setSelectedId(null);
      next?.();
    });
  const pane: (RailPane & { focusKey: string }) | null = !fullWidth
    ? null
    : selectedId
      ? {
          key: "preview",
          // A new record moves focus into the panel again.
          focusKey: `preview:${selectedId}`,
          label: getEntity(selectedId)?.title ?? "Entity",
          onEscape: () => closePreview(),
          close: closePreview,
          body: drawer,
        }
      : selectionActive && selectionDrawerOpen && selectionListAsked
        ? {
            key: "selection",
            focusKey: "selection",
            label: "Selection",
            // No Escape of its own: the Library's Escape clears the selection, as in Drawer.
            onEscape: null,
            // A rail item closes the list and keeps the selection, as its Close does.
            close: (next) => {
              setSelectionDrawerOpen(false);
              next();
            },
            body: drawer,
          }
        : selectedCluster && viewMode === "map"
          ? {
              key: "cluster",
              focusKey: `cluster:${selectedCluster.label}`,
              label: "Map cluster",
              onEscape: () => setSelectedCluster(null),
              close: (next) => {
                setSelectedCluster(null);
                next();
              },
              body: drawer,
            }
          : null;
  // Opening any of those closes the rail's panel: one surface over the pane.
  const paneKey = pane?.key ?? null;
  useEffect(() => {
    if (paneKey) setRailPanel(null);
  }, [paneKey, setRailPanel]);
  // Outside Full width no panel stays set, so none opens when it is chosen.
  useEffect(() => {
    if ((!fullWidth || overview) && railPanel) setRailPanel(null);
  }, [fullWidth, overview, railPanel, setRailPanel]);
  const panelOwner = shared?.panelOwner ?? null;
  const claimPanel = shared?.claimPanel;
  const releasePanel = shared?.releasePanel;
  const registerPanelClose = shared?.registerPanelClose;
  const handOverPanel = shared?.handOverPanel;
  const shareFor = useCallback(
    (slot: RailShare["slot"]): RailShare | undefined =>
      paneSide && claimPanel && releasePanel && registerPanelClose && handOverPanel
        ? {
            slot,
            side: paneSide,
            owner: panelOwner,
            claim: claimPanel,
            release: releasePanel,
            register: registerPanelClose,
            handOver: handOverPanel,
          }
        : undefined,
    [paneSide, panelOwner, claimPanel, releasePanel, registerPanelClose, handOverPanel],
  );
  const paneShare = useMemo(() => (paneSide ? shareFor(paneSide) : undefined), [paneSide, shareFor]);
  const railShare = useMemo(() => (paneSide === "left" ? shareFor("rail") : undefined), [paneSide, shareFor]);
  function wrapLane(node: ReactNode) {
    if (!fullWidth || overview) return node;
    const synced = !!shared?.railLayer && !!paneShare;
    return (
      // `isolate`: the rail's layer stacks inside the lane, so the masthead's
      // popovers (Sort, Language, Display, Views) open over it.
      <div data-part="lane-host" className="relative isolate flex-1 min-h-0 flex flex-col">
        {node}
        <LibraryFullWidthLayer>
          {/* Split's panes keep panels at the lane's height and the views
              unaware of them. Synced Split: the rail moves over the divider,
              and the pane's preview, selection or cluster stays here. */}
          <LibraryRail
            items={synced ? [] : railItems}
            pane={pane && { ...pane, key: pane.focusKey }}
            fitContent={!splitPane}
            share={synced ? paneShare : undefined}
          />
        </LibraryFullWidthLayer>
        {/* Synced Split: the left pane draws the one rail, centred on the
            divider in Split's layer; its panels read this pane's store. */}
        {synced &&
          railShare &&
          createPortal(<LibraryRail items={railItems} pane={null} share={railShare} />, shared!.railLayer!)}
      </div>
    );
  }

  return (
    <>
    {/* One lightbox for the whole grid rather than one per card; it portals to
        `document.body`, so only state ownership depends on where it mounts. */}
    <ImageLightbox image={lightbox} onClose={() => setLightbox(null)} />
    {/* Phones have no drawer, so what the Library opens into it (a new draft,
        a record opened from a card) opens as a full-height sheet. Dismissing goes
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
    {/* The Overview draws through the same host as the view it leaves for,
        with the drawer hidden: a host swap remounted the masthead, and the
        search box lost focus on the first character typed. */}
    {fullWidth ? (
      <div data-component="LibraryFullWidth" className="flex flex-1 overflow-hidden">
        <div data-part="content" className="flex-1 overflow-hidden">{renderLeft()}</div>
      </div>
    ) : (
    <AdaptiveSplitView
      left={renderLeft()}
      mobileLeft={(menuTrigger) => renderLeft(menuTrigger)}
      drawerHidden={overview}
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
                label: t("System", "Results"),
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
    )}
    </>
  );
}


/** Split's Export CSV: a bar button on the menu contract, each entry with
 *  its pane's current count. */
function SplitExportButton({
  results,
  onExport,
}: {
  results: PaneResults;
  onExport: (which: LibraryPaneSide | "both") => void;
}) {
  const left = usePaneResultCount(results, "left");
  const right = usePaneResultCount(results, "right");
  const records = (n: number) => `${n.toLocaleString()} ${n === 1 ? "record" : "records"}`;
  const iconOnly = useFooterFold() >= 1;
  return (
    <Hint text="Export CSV" describe={false} muted={!iconOnly}>
    {(hint) => (
    <div {...hint} className="hidden sm:flex shrink-0">
      <MobileActionMenu
        label="Export CSV"
        trigger={{
          className: `flex items-center gap-1.5 ${iconOnly ? "px-2.5" : "px-3"} py-1.5 text-xs font-medium ${BAR_GHOST} rounded-md transition-colors cursor-pointer`,
          content: (
            <>
              <FileDown size={13} className="text-ink-tertiary" aria-hidden />
              {!iconOnly && <span>Export CSV</span>}
              <ChevronDown size={12} className="text-ink-tertiary" aria-hidden />
            </>
          ),
        }}
        items={[
          { id: "left", label: `Left pane (${records(left)})`, onSelect: () => onExport("left") },
          { id: "right", label: `Right pane (${records(right)})`, onSelect: () => onExport("right") },
          { id: "both", label: `Both (${records(left + right)})`, onSelect: () => onExport("both") },
        ]}
      />
    </div>
    )}
    </Hint>
  );
}

/** The modifier this platform calls Cmd — Ctrl everywhere but Apple's. */
const MOD_KEY =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "Cmd" : "Ctrl";

function FooterButton({
  icon,
  label,
  hint: hintText,
  onClick,
  lead = false,
}: {
  icon: ReactNode;
  label: string;
  /** The tooltip, when it says more than the label. */
  hint?: string;
  onClick?: () => void;
  /** The bar's one filled button; the rest are ghosts (`warmButton.ts`). */
  lead?: boolean;
}) {
  // From the bar's first fold the label goes and a tooltip says it; the
  // button keeps its name through `aria-label`.
  const iconOnly = useFooterFold() >= 1;
  return (
    <Hint text={hintText ?? label} describe={false} muted={!iconOnly && !hintText}>
      {(hint) => (
        <button
          {...hint}
          type="button"
          onClick={onClick}
          aria-label={label}
          className={`hidden sm:flex shrink-0 items-center gap-1.5 ${iconOnly ? "px-2.5" : "px-3"} py-1.5 text-xs font-medium ${lead ? BAR_LEAD : BAR_GHOST} rounded-md transition-colors cursor-pointer`}
        >
          {icon}
          {!iconOnly && <span>{label}</span>}
        </button>
      )}
    </Hint>
  );
}
