import { useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { SlidersHorizontal, Check } from "lucide-react";
import {
  libraryInfoAtom,
  libraryViewModeAtom,
  libraryTimelineLayoutAtom,
  libraryResultsLayoutAtom,
  libraryTimeHubAtom,
  librarySortAtom,
  librarySortDirAtom,
  libraryThumbSizeAtom,
  libraryThumbFitAtom,
  defaultSortDir,
  DEFAULT_TIME_HUB,
  DEFAULT_LIBRARY_SORT,
  DEFAULT_RESULTS_LAYOUT,
  DEFAULT_TIMELINE_LAYOUT,
  DEFAULT_THUMB_SIZE,
  DEFAULT_THUMB_FIT,
  type LibraryInfoKey,
  type TimelineLayout,
  type ResultsLayout,
  type ThumbSize,
  type ThumbFit,
} from "../../atoms/library";
import { breakpointAtom } from "../../atoms/viewport";
import { t } from "../../utils/i18n";
import { SORTS } from "../../views/LibraryView";

const ITEMS: { key: LibraryInfoKey; label: string }[] = [
  { key: "preview", label: "Thumbnail" },
  { key: "metadata", label: "Metadata" },
  { key: "country", label: "Country" },
  { key: "date", label: "Date" },
  { key: "connections", label: "Connections" },
];

const LAYOUTS: { id: TimelineLayout; label: string; detail: string }[] = [
  { id: "rail", label: "Rail", detail: "Periods on a track, click to filter" },
  { id: "density", label: "Density", detail: "Volume per period, click to filter" },
  { id: "spine", label: "Spine", detail: "Every entity at its exact date" },
  { id: "lanes", label: "Lanes", detail: "Template × period grid" },
];

const THUMB_SIZES: { id: ThumbSize; label: string }[] = [
  { id: "s", label: "Small" },
  { id: "m", label: "Medium" },
  { id: "l", label: "Large" },
];

const THUMB_FITS: { id: ThumbFit; label: string; detail: string }[] = [
  { id: "auto", label: "Auto", detail: "Ratio decides — wide fills, tall is matted" },
  { id: "cover", label: "Cover", detail: "Fill the slot, crop the image" },
  { id: "contain", label: "Contain", detail: "Whole image on a quiet mat" },
];

const RESULTS_LAYOUTS: { id: ResultsLayout; label: string; detail: string }[] = [
  { id: "grouped", label: "Grouped", detail: "One card per entity, fields beside pages" },
  { id: "tree", label: "Tree", detail: "Entity → field → snippets, collapsible" },
  { id: "passages", label: "Passages", detail: "Every passage, ranked; entity secondary" },
  { id: "spine", label: "Spine", detail: "Best passage at its date on a time axis" },
];

/** Header control for how the results are drawn: which info pieces the cards and
 *  rows carry, plus the view-specific modifiers.
 *
 *  Icon-only trigger at a fixed 2rem square, and the timeline's layout picker
 *  lives INSIDE the popover — a control that only exists in one view is a control
 *  that shoves every other control sideways when you switch views. The toolbar
 *  row is now the same width whatever is selected. */
export function DisplayMenu() {
  const [info, setInfo] = useAtom(libraryInfoAtom);
  const [layout, setLayout] = useAtom(libraryTimelineLayoutAtom);
  const [resultsLayout, setResultsLayout] = useAtom(libraryResultsLayoutAtom);
  const [timeHub, setTimeHub] = useAtom(libraryTimeHubAtom);
  const [thumbSize, setThumbSize] = useAtom(libraryThumbSizeAtom);
  const [thumbFit, setThumbFit] = useAtom(libraryThumbFitAtom);
  const [sort, setSort] = useAtom(librarySortAtom);
  const setSortDir = useSetAtom(librarySortDirAtom);
  const viewMode = useAtomValue(libraryViewModeAtom);
  const isMobile = useAtomValue(breakpointAtom) === "mobile";
  const [open, setOpen] = useState(false);

  // The map draws no cards or rows, so the info toggles have nothing to act on —
  // and neither does Results, whose rows are snippets, not metadata summaries.
  const showInfo = viewMode !== "map" && viewMode !== "results";
  const showLayouts = viewMode === "timeline";
  const showResultsLayouts = viewMode === "results";
  // Thumbnail size/fit only act where thumbnails draw — the same surfaces the
  // info toggles govern, and only while the Thumbnail toggle itself is on.
  const showThumbs = showInfo && info.preview !== false;

  // The dot means ONE thing in both Display menus (this and the Relationships
  // one): some control THE MENU IS SHOWING sits off its default.
  //  - every term is gated by the same condition that renders its section, so
  //    the badge can never point at a control this view mode hides (hiding
  //    Thumbnail in Cards then switching to Results used to leave it lit over a
  //    menu with no "Show information" in it, and no way to clear it);
  //  - and every rendered control counts, not just the hidden-info ones, so a
  //    non-default layout is advertised exactly like a hidden field is.
  // Defaults come from the atoms themselves — comparing against a hard-coded
  // guess is what lit the Relationships dot on every fresh panel.
  const modified =
    timeHub !== DEFAULT_TIME_HUB ||
    (isMobile && sort !== DEFAULT_LIBRARY_SORT) ||
    (showResultsLayouts && resultsLayout !== DEFAULT_RESULTS_LAYOUT) ||
    (showLayouts && layout !== DEFAULT_TIMELINE_LAYOUT) ||
    (showInfo && ITEMS.some((i) => info[i.key] === false)) ||
    (showThumbs && (thumbSize !== DEFAULT_THUMB_SIZE || thumbFit !== DEFAULT_THUMB_FIT));
  const toggle = (key: LibraryInfoKey) => setInfo((s) => ({ ...s, [key]: s[key] === false }));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t("System", "Display options")}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`relative inline-flex items-center justify-center w-8 h-8 rounded-md border transition-all cursor-pointer ${
          open || modified
            ? "bg-paper text-ink border-ink/40 shadow-sm"
            : "bg-paper text-ink-secondary border-border hover:border-ink/25 hover:text-ink hover:shadow-sm"
        }`}
      >
        <SlidersHorizontal size={14} />
        {modified && (
          <span
            className="absolute -top-0.5 -end-0.5 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "var(--accent-blue)" }}
          />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute end-0 mt-1 z-40 w-52 bg-paper border border-border rounded-md shadow-lg p-1">
            {/* The time strip belongs to EVERY layout — it filters by date and
                charts the whole result set, so cards and the table want it as
                much as the map and the timeline it started under. */}
            <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
              Chart
            </p>
            <button
              onClick={() => setTimeHub((v) => !v)}
              aria-pressed={timeHub}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-warm transition-colors cursor-pointer text-start"
            >
              <span className="w-4 shrink-0 flex items-center justify-center text-carbon">
                {timeHub && <Check size={13} />}
              </span>
              <span className={`text-xs ${timeHub ? "text-ink" : "text-ink-tertiary"}`}>
                Time strip
              </span>
            </button>

            <div className="my-1 h-px" style={{ backgroundColor: "var(--border-soft)" }} />

            {/* Sort lives here on a phone — the toolbar gives its width to the
                view switcher, which matters more than a sort key you set once. */}
            {isMobile && (
              <>
                <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
                  Sort by
                </p>
                {SORTS.map((s) => {
                  const on = sort === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => {
                        setSort(s.value as typeof sort);
                        setSortDir(defaultSortDir(s.value as typeof sort));
                      }}
                      aria-pressed={on}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-warm transition-colors cursor-pointer text-start"
                    >
                      <span className="w-4 shrink-0 flex items-center justify-center text-carbon">
                        {on && <Check size={13} />}
                      </span>
                      <span className={`text-xs ${on ? "text-ink font-semibold" : "text-ink-secondary"}`}>
                        {s.label}
                      </span>
                    </button>
                  );
                })}
                {(showLayouts || showResultsLayouts || showInfo) && (
                  <div className="my-1 h-px" style={{ backgroundColor: "var(--border-soft)" }} />
                )}
              </>
            )}

            {showResultsLayouts && (
              <>
                <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
                  Results layout
                </p>
                {RESULTS_LAYOUTS.map((l) => {
                  const on = resultsLayout === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setResultsLayout(l.id)}
                      aria-pressed={on}
                      className="w-full flex items-start gap-2 px-2 py-1.5 rounded hover:bg-warm transition-colors cursor-pointer text-start"
                    >
                      <span className="w-4 shrink-0 pt-0.5 flex justify-center text-carbon">
                        {on && <Check size={13} />}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block text-xs ${on ? "text-ink font-semibold" : "text-ink-secondary"}`}
                        >
                          {l.label}
                        </span>
                        <span className="block text-[10px] text-ink-tertiary leading-tight">
                          {l.detail}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </>
            )}

            {showLayouts && (
              <>
                <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
                  Timeline layout
                </p>
                {LAYOUTS.map((l) => {
                  const on = layout === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setLayout(l.id)}
                      aria-pressed={on}
                      className="w-full flex items-start gap-2 px-2 py-1.5 rounded hover:bg-warm transition-colors cursor-pointer text-start"
                    >
                      <span className="w-4 shrink-0 pt-0.5 flex justify-center text-carbon">
                        {on && <Check size={13} />}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block text-xs ${on ? "text-ink font-semibold" : "text-ink-secondary"}`}
                        >
                          {l.label}
                        </span>
                        <span className="block text-[10px] text-ink-tertiary leading-tight">
                          {l.detail}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </>
            )}

            {showInfo && (
              <>
                {showLayouts && (
                  <div className="my-1 h-px" style={{ backgroundColor: "var(--border-soft)" }} />
                )}
                <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
                  Show information
                </p>
                {ITEMS.map((it) => {
                  const shown = info[it.key] !== false;
                  return (
                    <button
                      key={it.key}
                      onClick={() => toggle(it.key)}
                      aria-pressed={shown}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-warm transition-colors cursor-pointer text-start"
                    >
                      <span className="w-4 shrink-0 flex items-center justify-center text-carbon">
                        {shown && <Check size={13} />}
                      </span>
                      <span className={`text-xs ${shown ? "text-ink" : "text-ink-tertiary"}`}>
                        {it.label}
                      </span>
                    </button>
                  );
                })}
              </>
            )}

            {showThumbs && (
              <>
                <div className="my-1 h-px" style={{ backgroundColor: "var(--border-soft)" }} />
                <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
                  Thumbnail size
                </p>
                {THUMB_SIZES.map((s) => {
                  const on = thumbSize === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setThumbSize(s.id)}
                      aria-pressed={on}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-warm transition-colors cursor-pointer text-start"
                    >
                      <span className="w-4 shrink-0 flex items-center justify-center text-carbon">
                        {on && <Check size={13} />}
                      </span>
                      <span className={`text-xs ${on ? "text-ink font-semibold" : "text-ink-secondary"}`}>
                        {s.label}
                      </span>
                    </button>
                  );
                })}
                <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
                  Image fit
                </p>
                {THUMB_FITS.map((f) => {
                  const on = thumbFit === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setThumbFit(f.id)}
                      aria-pressed={on}
                      className="w-full flex items-start gap-2 px-2 py-1.5 rounded hover:bg-warm transition-colors cursor-pointer text-start"
                    >
                      <span className="w-4 shrink-0 pt-0.5 flex justify-center text-carbon">
                        {on && <Check size={13} />}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block text-xs ${on ? "text-ink font-semibold" : "text-ink-secondary"}`}
                        >
                          {f.label}
                        </span>
                        <span className="block text-[10px] text-ink-tertiary leading-tight">
                          {f.detail}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </>
            )}

          </div>
        </>
      )}
    </div>
  );
}
