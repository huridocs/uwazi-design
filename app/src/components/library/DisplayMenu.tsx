import { useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { SlidersHorizontal, Check } from "lucide-react";
import {
  libraryInfoAtom,
  libraryViewModeAtom,
  libraryTimelineLayoutAtom,
  type LibraryInfoKey,
  type TimelineLayout,
} from "../../atoms/library";

const ITEMS: { key: LibraryInfoKey; label: string }[] = [
  { key: "preview", label: "Thumbnail" },
  { key: "metadata", label: "Metadata" },
  { key: "country", label: "Country" },
  { key: "date", label: "Date" },
  { key: "connections", label: "Connections" },
];

const LAYOUTS: { id: TimelineLayout; label: string; detail: string }[] = [
  { id: "rail", label: "Rail", detail: "Periods on a track, fan out" },
  { id: "density", label: "Density", detail: "Volume per period, click to filter" },
  { id: "spine", label: "Spine", detail: "Every entity at its exact date" },
  { id: "lanes", label: "Lanes", detail: "Template × period grid" },
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
  const viewMode = useAtomValue(libraryViewModeAtom);
  const [open, setOpen] = useState(false);

  const hiddenCount = ITEMS.filter((i) => info[i.key] === false).length;
  // The map draws no cards or rows, so the info toggles have nothing to act on.
  const showInfo = viewMode !== "map";
  const showLayouts = viewMode === "timeline";
  const toggle = (key: LibraryInfoKey) => setInfo((s) => ({ ...s, [key]: s[key] === false }));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Display options"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`relative inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer ${
          open || hiddenCount > 0
            ? "bg-vellum text-ink"
            : "bg-warm text-ink-secondary hover:bg-parchment hover:text-ink"
        }`}
      >
        <SlidersHorizontal size={14} />
        {hiddenCount > 0 && (
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

            {!showInfo && !showLayouts && (
              <p className="px-2 py-2 text-[11px] text-ink-tertiary">
                No display options for this view.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
