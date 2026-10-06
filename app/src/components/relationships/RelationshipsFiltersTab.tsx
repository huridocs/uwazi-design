import { useEffect, useRef } from "react";
import { useKeepClickedInPlace } from "../../hooks/useKeepClickedInPlace";
import { useAtomValue, useSetAtom } from "jotai";
import { relFiltersDockCountAtom, relFiltersTabRequestAtom } from "../../atoms/filters";
import { breakpointAtom } from "../../atoms/viewport";
import { useActiveFilterCount, useClearRelFilters } from "../../hooks/useEntityScope";
import { RelationshipsFilterSlideOver } from "./RelationshipsFilterSlideOver";
import { FilterClearAll } from "../shared/FilterCard";

/** Dock the Relationships filters in this drawer: while mounted on a desktop
 *  or tablet, the toolbar's Filters button calls `show` (switch to the
 *  Filters tab) instead of opening the slide-over. Host scope only: a drawer
 *  is the entity view's, never a scoped preview's. */
export function useRelFiltersDock(show: () => void) {
  const mobile = useAtomValue(breakpointAtom) === "mobile";
  const setCount = useSetAtom(relFiltersDockCountAtom);
  const request = useAtomValue(relFiltersTabRequestAtom);
  const showRef = useRef(show);
  showRef.current = show;
  useEffect(() => {
    if (mobile) return;
    setCount((n) => n + 1);
    return () => setCount((n) => n - 1);
  }, [mobile, setCount]);
  // Only a request made after mount switches the tab; the value at mount is
  // an earlier view's.
  const seen = useRef(request);
  useEffect(() => {
    if (request === seen.current) return;
    seen.current = request;
    if (!mobile) showRef.current();
  }, [request, mobile]);
}

/** The drawer's Filters tab: the same facets as the slide-over, for the open
 *  entity, drawn like the Library's Filters (cards on the warm rail, Clear in
 *  a footer that is always there, disabled with nothing set). No count: the tab's dot
 *  says filters are set, and the Relationships tab count is the surface's
 *  only number. Sits directly in the
 *  drawer's gutter host. */
export function RelationshipsFiltersTab() {
  const count = useActiveFilterCount();
  const clear = useClearRelFilters();
  const bodyRef = useRef<HTMLDivElement>(null);
  useKeepClickedInPlace(bodyRef);
  return (
    <>
      <div ref={bodyRef} data-component="RelationshipsFiltersTab" data-part="body" className="bleed flex-1 min-h-0 overflow-auto bg-warm">
        <RelationshipsFilterSlideOver />
      </div>
      {/* The Library Filters footer: Clear at the end, always mounted. No
          Collapse / Expand all: no card here folds. */}
      <footer
        data-part="footer"
        className="bleed flex items-center gap-2 h-12 shrink-0 bg-paper"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <FilterClearAll onClick={() => clear()} disabled={count === 0} />
      </footer>
    </>
  );
}
