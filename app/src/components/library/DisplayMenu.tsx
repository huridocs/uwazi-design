import { useEffect, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { SlidersHorizontal, Check, RotateCcw } from "lucide-react";
import { SectionLabel } from "../shared/SectionLabel";
import {
  libraryDisplayAtom,
  libraryDisplayContextAtom,
  libraryDisplayModifiedAtom,
  resetLibraryDisplayAtom,
  libraryViewModeAtom,
  librarySortAtom,
  librarySortDirAtom,
  defaultSortDir,
  type LibraryDisplayState,
} from "../../atoms/library";
import {
  sectionsFor,
  sectionOptions,
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
export function DisplayMenu() {
  const [state, setState] = useAtom(libraryDisplayAtom);
  const mode = useAtomValue(libraryViewModeAtom);
  const ctx = useAtomValue(libraryDisplayContextAtom);
  const modified = useAtomValue(libraryDisplayModifiedAtom);
  const reset = useSetAtom(resetLibraryDisplayAtom);
  const [sort, setSort] = useAtom(librarySortAtom);
  const setSortDir = useSetAtom(librarySortDirAtom);
  const [open, setOpen] = useState(false);

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
  };

  const renderSection = (section: DisplaySection) => {
    // Values-only, and it DIMS rather than unmounts: turning Thumbnail off must
    // not make three sections vanish from under a pointer already travelling
    // toward them.
    const live = section.enabled?.(values) ?? true;
    const body =
      section.kind === "choice"
        ? renderChoice(section, live)
        : sectionOptions(section, ctx).map((o) => {
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
      <div key={section.id}>
        {section.separator && (
          <div className="my-1 h-px" style={{ backgroundColor: "var(--border-soft)" }} />
        )}
        <SectionLabel as="p" className={`px-2 pt-1 pb-1 ${live ? "" : "opacity-40"}`}>
          {section.label}
        </SectionLabel>
        {body}
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
    const current = bound ? bound.value : (valueOf(option.id, scope, option.default) as string);
    return option.choices.map((c) => (
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

  return (
    <div className="relative">
      <button
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
          {/* The list's column list can run long on a corpus with a dozen
              properties, so the panel scrolls at a fixed ceiling rather than
              growing past the viewport. Every mode's menu is the same width. */}
          <div
            className="absolute end-0 mt-1 z-40 w-52 max-h-[70vh] overflow-y-auto bg-paper
              border border-border rounded-md shadow-lg p-1"
            role="menu"
          >
            {sections.map(renderSection)}
            {/* The dot says something is off its default; this is the way back.
                It is ALWAYS mounted and merely goes quiet when there is nothing
                to reset — a row that appeared with the dot would shove the whole
                panel the moment you ticked anything. Shared options (the time
                strip) are not this mode's to clear, so it resets the mode. */}
            <div className="my-1 h-px" style={{ backgroundColor: "var(--border-soft)" }} />
            <button
              onClick={() => reset()}
              disabled={!modified}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-start text-xs transition-colors ${
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
          </div>
        </>
      )}
    </div>
  );
}

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
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      role="menuitemcheckbox"
      aria-checked={on}
      className={`w-full flex items-start gap-2 px-2 py-1.5 rounded transition-colors text-start ${
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-warm cursor-pointer"
      }`}
    >
      <span className="w-4 shrink-0 pt-0.5 flex justify-center text-carbon">
        {on && <Check size={13} />}
      </span>
      <span className="min-w-0">
        <span
          className={`block text-xs ${
            on ? `text-ink ${strong ? "font-semibold" : ""}` : "text-ink-tertiary"
          }`}
        >
          {label}
        </span>
        {detail && (
          <span className="block text-meta text-ink-tertiary leading-tight">{detail}</span>
        )}
      </span>
    </button>
  );
}
