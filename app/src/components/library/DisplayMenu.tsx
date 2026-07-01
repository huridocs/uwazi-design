import { useState } from "react";
import { useAtom } from "jotai";
import { SlidersHorizontal, Check } from "lucide-react";
import {
  libraryInfoAtom,
  type LibraryInfoKey,
} from "../../atoms/library";

const ITEMS: { key: LibraryInfoKey; label: string }[] = [
  { key: "preview", label: "Thumbnail" },
  { key: "metadata", label: "Metadata" },
  { key: "country", label: "Country" },
  { key: "date", label: "Date" },
  { key: "connections", label: "Connections" },
];

/** Header control to show less / more information in the results — toggles which
 *  info pieces appear on the cards and the list table. A key is shown unless set
 *  to false. */
export function DisplayMenu() {
  const [info, setInfo] = useAtom(libraryInfoAtom);
  const [open, setOpen] = useState(false);
  const hiddenCount = ITEMS.filter((i) => info[i.key] === false).length;
  const toggle = (key: LibraryInfoKey) =>
    setInfo((s) => ({ ...s, [key]: s[key] === false }));

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Display options"
        className={`inline-flex items-center gap-1.5 px-2.5 h-8 text-xs font-medium rounded-md transition-colors cursor-pointer ${
          open || hiddenCount > 0
            ? "bg-vellum text-ink"
            : "bg-warm text-ink-secondary hover:bg-parchment hover:text-ink"
        }`}
      >
        <SlidersHorizontal size={14} />
        <span className="hidden lg:inline">Display</span>
        {hiddenCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-ink/10 text-[10px] font-semibold tabular-nums">
            {ITEMS.length - hiddenCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute end-0 mt-1 z-40 w-44 bg-paper border border-border rounded-md shadow-lg p-1">
            <p className="px-2 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary">
              Show information
            </p>
            {ITEMS.map((it) => {
              const shown = info[it.key] !== false;
              return (
                <button
                  key={it.key}
                  onClick={() => toggle(it.key)}
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
          </div>
        </>
      )}
    </div>
  );
}
