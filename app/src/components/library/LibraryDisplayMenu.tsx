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
  libraryCardInfoAtom,
  defaultSortDir,
  type LibraryDisplayState,
  type PreviewCount,
} from "../../atoms/library";
import {
  sectionsFor,
  sectionOptions,
  storageId,
  THUMBS_SHOWN,
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
  const cardInfo = useAtomValue(libraryCardInfoAtom);

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
  // `THUMBS_SHOWN` is Thumbnail with Auto resolved, which the stored value
  // alone cannot answer.
  const values: DisplayValues = {
    ...state.shared,
    ...(state.modes[mode] ?? {}),
    [THUMBS_SHOWN]: cardInfo.preview,
  };

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
    // A template's name finds all of its columns.
    const shown = q
      ? options.filter((o) => o.label.toLowerCase().includes(q) || !!o.group?.toLowerCase().includes(q))
      : options;
    const renderToggle = (o: (typeof options)[number]) => {
            const scope = o.scope ?? "mode";
            if (o.choices) {
              const current = String(valueOf(o.id, scope, o.default));
              return (
                <InlineChoiceRow
                  key={o.id}
                  label={o.label}
                  value={current}
                  choices={o.choices}
                  note={o.id === "preview" ? thumbNote(current, cardInfo.thumbAuto, cardInfo.thumbCount) : o.detail}
                  disabled={!live}
                  onChange={(id) => write(o.id, scope, id)}
                />
              );
            }
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
          };
    // Options with a `group` (a template's own columns) sit under its name, in
    // runs; the ungrouped ones (the built-ins) come first.
    const runs: { group?: string; options: typeof options }[] = [];
    for (const o of shown) {
      const last = runs[runs.length - 1];
      if (last && last.group === o.group) last.options.push(o);
      else runs.push({ group: o.group, options: [o] });
    }
    const body =
      section.kind === "choice"
        ? renderChoice(section, live)
        : runs.map((run, i) =>
            run.group ? (
              <div key={`${run.group}:${i}`} data-part="option-group" role="group" aria-label={run.group}>
                <p aria-hidden title={run.group} className={`px-2 pt-2 pb-0.5 text-meta font-semibold text-ink-secondary truncate ${live ? "" : "opacity-40"}`}>
                  {run.group}
                </p>
                {run.options.map(renderToggle)}
              </div>
            ) : (
              run.options.map(renderToggle)
            ),
          );

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
              // A column listed under several templates counts once.
              placeholder={`Search ${new Set(options.map((o) => o.id)).size} ${section.label.toLowerCase()}`}
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
      // The line under the row is always mounted. Dimmed, it names what turns
      // the control back on. Columns: the grid reports what it drew; Auto names
      // it, and a count the pane cannot fit says so rather than looking
      // ignored. Otherwise the picked choice's detail, if it has one.
      const n = Number(current);
      const note = !live
        ? (section.disabledReason ?? null)
        : option.id === "cardCols"
          ? !colsInEffect
            ? null
            : current === "auto"
              ? `${colsInEffect} in this pane`
              : colsInEffect < n
                ? `${colsInEffect} in effect: the pane is too narrow for ${n}`
                : null
          : (option.choices.find((c) => c.id === current)?.detail ?? null);
      return (
        <div className="px-2 pb-1 flex flex-col gap-1.5">
          {/* Dimmed and out of the tab order while the section is off. */}
          <div ref={(el) => el?.toggleAttribute("inert", !live)} className={live ? "" : "opacity-40 pointer-events-none"}>
            <SegmentedControl
              size="sm"
              fill
              ariaLabel={section.label}
              value={current}
              options={option.choices.map((c) => ({ id: c.id, label: c.label }))}
              onChange={(id) => write(key, scope, id)}
            />
          </div>
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

/** What Thumbnail is doing, under its control. Auto names its answer and
 *  why; On and Off say what they do to a record with nothing to preview. */
function thumbNote(mode: string, auto: boolean, count: PreviewCount | null): string {
  if (mode === "on") return "A slot on every card";
  if (mode === "off") return "Text cards for every result";
  if (!count) return "On";
  const n = `${count.withPreview.toLocaleString()} of ${count.total.toLocaleString()}`;
  return `${auto ? "On" : "Off"}: ${n} have a preview`;
}

/** A toggle row whose answer is one of a few short choices (Auto / On / Off):
 *  the label, a segmented control under it (the menu is too narrow for both
 *  on one line), and a note line that is always mounted, so a changing note
 *  never moves the rows below. Full width, on the section label's edge, like the
 *  segmented sections (Metadata properties, Columns). */
function InlineChoiceRow({
  label,
  value,
  choices,
  note,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  choices: { id: string; label: string }[];
  note?: string;
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  const touch = useContext(TouchRows);
  return (
    <div
      data-part="option"
      data-kind="choice"
      className={`flex flex-col gap-1.5 px-2 ${touch ? "py-2" : "py-1.5"} ${disabled ? "opacity-40 pointer-events-none" : ""}`}
    >
      <span className={`${touch ? "text-sm" : "text-xs"} text-ink`}>{label}</span>
      <SegmentedControl size="sm" fill ariaLabel={label} value={value} options={choices} onChange={onChange} />
      <p aria-live="polite" className={`min-h-4 ${touch ? "text-xs" : "text-meta"} leading-4 text-ink-tertiary truncate`}>
        {note}
      </p>
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
