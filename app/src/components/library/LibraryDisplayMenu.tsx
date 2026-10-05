import { languageAtom, type Language } from "../../atoms/language";
import { createContext, useContext, useEffect, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { SlidersHorizontal, Check, RotateCcw } from "lucide-react";
import { SectionLabel } from "../shared/SectionLabel";
import { ModalSearchField } from "../shared/ModalParts";
import { SegmentedControl } from "../shared/SegmentedControl";
import { MobileBottomSheet } from "../layout/MobileBottomSheet";
import { SheetDone } from "../layout/SheetDone";
import { breakpointAtom } from "../../atoms/viewport";
import {
  libraryDisplayAtom,
  libraryDisplayContextAtom,
  libraryDisplayModifiedAtom,
  resetLibraryDisplayAtom,
  libraryViewModeAtom,
  librarySortAtom,
  librarySortDirAtom,
  libraryActiveSearchAtom,
  libraryCardColumnsInEffectAtom,
  defaultSortDir,
  type LibraryDisplayState,
} from "../../atoms/library";
import {
  sectionsFor,
  sectionOptions,
  storageId,
  type DisplaySection,
  type DisplayValue,
  type DisplayValues,
} from "../../data/libraryDisplay";
import { t } from "../../utils/i18n";

/** Header control for how the results are drawn.
 *
 *  It renders `data/libraryDisplay` and nothing else. There are no
 *  `viewMode === "timeline"` branches in here any more: which sections exist,
 *  in what order, under what conditions and with what defaults is a fact about
 *  the registry, and this file is the thing that draws whatever the registry
 *  says. The dot folds over the same list, so it can no longer point at a
 *  control the current mode isn't showing.
 *
 *  Icon-only trigger at a fixed 2rem square, and every view-specific control
 *  lives INSIDE the popover — a control that only exists in one view is a
 *  control that shoves every other control sideways when you switch views. The
 *  toolbar row is the same width whatever is selected. */
export function LibraryDisplayMenu() {
  const [state, setState] = useAtom(libraryDisplayAtom);
  const mode = useAtomValue(libraryViewModeAtom);
  const ctx = useAtomValue(libraryDisplayContextAtom);
  const modified = useAtomValue(libraryDisplayModifiedAtom);
  const reset = useSetAtom(resetLibraryDisplayAtom);
  const [sort, setSort] = useAtom(librarySortAtom);
  const [language, setLanguage] = useAtom(languageAtom);
  const setSortDir = useSetAtom(librarySortDirAtom);
  const searching = useAtomValue(libraryActiveSearchAtom) !== null;
  const [open, setOpen] = useState(false);
  const [toggleQuery, setToggleQuery] = useState("");
  const colsInEffect = useAtomValue(libraryCardColumnsInEffectAtom);
  const mobile = useAtomValue(breakpointAtom) === "mobile";

  // Escape closes it, like every other overlay in the app. The scrim was the
  // only way out, which is a mouse-only exit from a keyboard-operable menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sections = sectionsFor(mode, ctx);

  // The merged view of this mode's answers — what `enabled` predicates read, and
  // what a control compares itself against. Sparse underneath: an absent key is
  // "still on its default", never a written-out copy of one.
  const values: DisplayValues = { ...state.shared, ...(state.modes[mode] ?? {}) };

  const valueOf = (id: string, scope: string, fallback: DisplayValue): DisplayValue => {
    const bag = scope === "shared" ? state.shared : state.modes[mode];
    return bag?.[id] ?? fallback;
  };

  const write = (id: string, scope: string, value: DisplayValue) =>
    setState((s: LibraryDisplayState) =>
      scope === "shared"
        ? { ...s, shared: { ...s.shared, [id]: value } }
        : { ...s, modes: { ...s.modes, [mode]: { ...s.modes[mode], [id]: value } } },
    );

  // Sort is the registry's one `external` option: the toolbar Select and the
  // table's own column headers write it too, and a repeat pick flips the
  // direction rather than re-picking the key. That behaviour belongs with the
  // control, not in a data file — so the registry declares the section and this
  // map binds it.
  const external: Record<string, { value: string; set: (v: string) => void }> = {
    sort: {
      value: sort,
      set: (v) => {
        setSort(v as typeof sort);
        setSortDir(defaultSortDir(v as typeof sort));
      },
    },
    // The toolbar's Language select folds into this menu on a narrow pane.
    language: { value: language, set: (v) => setLanguage(v as Language) },
  };

  const renderSection = (section: DisplaySection) => {
    // Values-only, and it DIMS rather than unmounts: turning Thumbnail off must
    // not make three sections vanish from under a pointer already travelling
    // toward them.
    const live = section.enabled?.(values) ?? true;
    const options = section.kind === "choice" ? [] : sectionOptions(section, ctx);
    // A long toggle list (a corpus's property columns) gets a search.
    const searchable = options.length > SEARCH_FROM;
    const q = searchable ? toggleQuery.trim().toLowerCase() : "";
    const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    const body =
      section.kind === "choice"
        ? renderChoice(section, live)
        : shown.map((o) => {
            const scope = o.scope ?? "mode";
            const on = valueOf(o.id, scope, o.default) !== false;
            return (
              <OptionRow
                key={o.id}
                label={o.label}
                detail={o.detail}
                on={on}
                disabled={!live}
                onClick={() => write(o.id, scope, !on)}
              />
            );
          });

    return (
      <div key={section.id} data-part="section" data-section={section.id} role="group" aria-label={section.label}>
        {section.separator && (
          <div role="separator" className="my-1 h-px" style={{ backgroundColor: "var(--border-soft)" }} />
        )}
        <SectionLabel as="p" className={`px-2 pt-1 pb-1 ${live ? "" : "opacity-40"}`}>
          {section.label}
        </SectionLabel>
        {searchable && (
          <div data-part="toggle-search" className="px-1 pb-1">
            <ModalSearchField
              value={toggleQuery}
              onChange={setToggleQuery}
              ariaLabel={`Search ${section.label.toLowerCase()}`}
              placeholder={`Search ${options.length} ${section.label.toLowerCase()}`}
            />
          </div>
        )}
        {body}
        {searchable && shown.length === 0 && <p className="px-2 py-1.5 text-xs text-ink-tertiary">No matches.</p>}
      </div>
    );
  };

  const renderChoice = (
    section: Extract<DisplaySection, { kind: "choice" }>,
    live: boolean,
  ) => {
    const { option } = section;
    const scope = option.scope ?? "mode";
    const bound = scope === "external" ? external[option.id] : undefined;
    const key = storageId(option, values);
    const current = bound ? bound.value : (valueOf(key, scope, option.default) as string);
    if (option.layout === "segmented") {
      // Columns: the grid reports what it drew. Auto names it; a count the
      // pane cannot fit says so rather than looking ignored.
      const n = Number(current);
      const note =
        option.id !== "cardCols" || !colsInEffect
          ? null
          : current === "auto"
            ? `${colsInEffect} in this pane`
            : colsInEffect < n
              ? `${colsInEffect} in effect: the pane is too narrow for ${n}`
              : null;
      return (
        <div className={`px-2 pb-1 flex flex-col gap-1.5 ${live ? "" : "opacity-40 pointer-events-none"}`}>
          <SegmentedControl
            size="sm"
            fill
            ariaLabel={section.label}
            value={current}
            options={option.choices.map((c) => ({ id: c.id, label: c.label }))}
            onChange={(id) => write(key, scope, id)}
          />
          <p data-part="in-effect" aria-live="polite" className="min-h-4 text-meta leading-4 text-ink-tertiary">
            {note}
          </p>
        </div>
      );
    }
    // Relevance is an order only while a query runs; with none it isn't offered.
    // Sort also offers the templates' prioritySorting properties.
    const all = option.id === "sort" && ctx.sortChoices ? ctx.sortChoices : option.choices;
    const choices = bound && !searching ? all.filter((c) => c.id !== "relevance") : all;
    return choices.map((c) => (
      <OptionRow
        key={c.id}
        label={c.label}
        detail={c.detail}
        on={current === c.id}
        strong
        disabled={!live}
        onClick={() => (bound ? bound.set(c.id) : write(option.id, scope, c.id))}
      />
    ));
  };

  const contents = (
    <>
            {sections.map(renderSection)}
      {/* The dot says something is off its default; this is the way back.
          It is ALWAYS mounted and merely goes quiet when there is nothing
          to reset — a row that appeared with the dot would shove the whole
          panel the moment you ticked anything. Shared options (the time
          strip) are not this mode's to clear, so it resets the mode. */}
      <div role="separator" className="my-1 h-px" style={{ backgroundColor: "var(--border-soft)" }} />
      <button
        type="button"
        role="menuitem"
        data-part="reset"
        onClick={() => reset()}
        disabled={!modified}
        className={`w-full flex items-center gap-2 px-2 rounded text-start transition-colors ${mobile ? "min-h-11 text-sm" : "py-1.5 text-xs"} ${
          modified
            ? "text-ink-secondary hover:bg-warm hover:text-ink cursor-pointer"
            : "text-ink-muted cursor-not-allowed"
        }`}
      >
        <span className="w-4 shrink-0 flex items-center justify-center">
          <RotateCcw size={12} />
        </span>
        Reset this view
      </button>
    </>
  );

  return (
    <div data-component="LibraryDisplayMenu" className="relative">
      <button
        type="button"
        data-part="trigger"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("System", "Display options")}
        aria-haspopup="menu"
        aria-expanded={open}
        // Background tint on hover, nothing raised. Open/modified keeps the
        // shadow and the ink border — the same split as FiltersButton beside it,
        // so a hovered trigger can't be mistaken for an open one.
        className={`relative inline-flex items-center justify-center w-8 h-8 rounded-md border transition-colors cursor-pointer ${
          open || modified
            ? "bg-paper text-ink border-ink/40 shadow-sm"
            : "bg-paper text-ink-secondary border-border hover:bg-parchment hover:text-ink"
        }`}
      >
        <SlidersHorizontal size={14} aria-hidden />
        {modified && (
          <span
            data-part="dot"
            aria-hidden
            className="absolute -top-0.5 -end-0.5 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "var(--accent-blue)" }}
          />
        )}
      </button>
      {mobile ? (
        // Phones: a bottom sheet on the shared stack, the rows at touch size,
        // Done at the foot. The options apply as they are picked.
        <MobileBottomSheet open={open} onClose={() => setOpen(false)} title="Display options" defaultSnap="full" footer={<SheetDone onClick={() => setOpen(false)} />}>
          <TouchRows.Provider value={true}>
            <div data-part="menu" role="menu" aria-label="Display options" className="px-2 py-2">
              {contents}
            </div>
          </TouchRows.Provider>
        </MobileBottomSheet>
      ) : open && (
        <>
          <div data-part="scrim" className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          {/* The list's column list can run long on a corpus with a dozen
              properties, so the panel scrolls at a fixed ceiling rather than
              growing past the viewport. Every mode's menu is the same width. */}
          <div
            data-part="menu"
            className="absolute end-0 mt-1 z-40 w-52 max-h-[70vh] overflow-y-auto bg-paper
              border border-border rounded-md shadow-lg p-1"
            role="menu"
          >
            {contents}
          </div>
        </>
      )}
    </div>
  );
}

/** Toggle lists longer than this get a search above them. */
const SEARCH_FROM = 12;

/** Phones draw the rows at touch size (44px, text-sm) inside a sheet. */
const TouchRows = createContext(false);

/** One row of the menu — a check gutter, a label, and an optional second line.
 *
 *  `strong` is the difference between "this is showing" (a toggle) and "this is
 *  the one" (a choice): a picked choice bolds, a shown toggle doesn't, which is
 *  how the two kinds read apart at a glance without a second control shape.
 *
 *  A disabled row keeps its box and its check — it dims. The check gutter is
 *  reserved at every state, so nothing in the panel moves when a row's mark
 *  comes or goes. */
function OptionRow({
  label,
  detail,
  on,
  strong = false,
  disabled = false,
  onClick,
}: {
  label: string;
  detail?: string;
  on: boolean;
  strong?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const touch = useContext(TouchRows);
  return (
    <button
      type="button"
      data-part="option"
      data-state={on ? "on" : "off"}
      onClick={onClick}
      disabled={disabled}
      role="menuitemcheckbox"
      aria-checked={on}
      className={`w-full flex gap-2 rounded transition-colors text-start ${touch ? "min-h-11 items-center px-2 py-2" : "items-start px-2 py-1.5"} ${
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-warm cursor-pointer"
      }`}
    >
      <span className={`w-4 shrink-0 flex justify-center text-carbon ${touch ? "" : "pt-0.5"}`}>
        {on && <Check size={touch ? 15 : 13} aria-hidden />}
      </span>
      <span className="min-w-0">
        <span
          className={`block ${touch ? "text-sm" : "text-xs"} ${
            on ? `text-ink ${strong ? "font-semibold" : ""}` : "text-ink-tertiary"
          }`}
        >
          {label}
        </span>
        {detail && (
          <span className={`block ${touch ? "text-xs" : "text-meta"} text-ink-tertiary leading-tight`}>{detail}</span>
        )}
      </span>
    </button>
  );
}
