import { Search, X, HelpCircle } from "lucide-react";
import { useAtom } from "jotai";
import { searchQueryAtom } from "../../atoms/filters";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface SearchBarProps {
  rightSlot?: ReactNode;
  /** Chips rendered GitHub-style inside the input box, before the typing cursor. */
  inlineSlot?: ReactNode;
}

export function SearchBar({ rightSlot, inlineSlot }: SearchBarProps = {}) {
  const [query, setQuery] = useAtom(searchQueryAtom);
  const inputRef = useRef<HTMLInputElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const [hintOpen, setHintOpen] = useState(false);

  useEffect(() => {
    if (!hintOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!hintRef.current?.contains(e.target as Node)) setHintOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [hintOpen]);

  return (
    // The Library's toolbar, to the pixel: gap-2 between peers, an h-8 input with
    // a LEADING search icon, h-8 controls beside it. This row used gap-1.5, a
    // trailing magnifier and h-6 controls against an h-8 box — small buttons
    // floating beside a taller field, which is what read as unbalanced.
    // WRAPS on a phone. One row is right at any width the pane actually has —
    // but at 390px the controls (view + display + filters ≈ 210px) left the search
    // field too narrow to hold its own placeholder, and the help icon dropped onto
    // a second line INSIDE the input. Let the controls take the second row instead;
    // the field keeps a floor of 12rem and reclaims the first.
    <div className="px-3 pt-0.5 pb-2 flex items-center gap-2 flex-wrap">
      {/* min-h-8, not h-8: the chips wrap onto extra rows. But py-1 around an h-6
          input plus borders came to 34px — 2px taller than every control beside
          it, so the row sat a pixel off at both edges. py-0.5 keeps the content
          under the 32px floor and lets min-h do the work. */}
      <div
        className="relative flex-1 min-w-[12rem] flex items-center gap-1.5 min-h-8 py-0.5 ps-2 pe-2 bg-warm border border-border rounded-md
          focus-within:ring-2 focus-within:ring-carbon/20 focus-within:border-carbon/40 transition-all flex-wrap"
        onClick={() => inputRef.current?.focus()}
      >
        <Search size={14} className="text-ink-muted shrink-0" />
        {inlineSlot}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search  •  AND, OR, NOT, &quot;exact&quot;, wild*"
          aria-label="Search references"
          className="flex-1 min-w-[100px] h-6 bg-transparent text-xs font-medium placeholder:text-ink-muted focus:outline-none"
        />

        {query && (
          <button
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            aria-label="Clear search"
            className="shrink-0 p-0.5 rounded-full hover:bg-parchment text-ink-muted hover:text-ink cursor-pointer transition-colors"
          >
            <X size={12} />
          </button>
        )}

        {/* The magnifier moved to the front, so the tips affordance is what it
            always was — a question mark, not a search icon doing double duty. */}
        <div ref={hintRef} className="shrink-0 relative">
          <button
            onClick={(e) => { e.stopPropagation(); setHintOpen((o) => !o); }}
            aria-label="Search tips"
            aria-expanded={hintOpen}
            className="flex p-0.5 rounded-full text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            <HelpCircle size={13} />
          </button>

          {hintOpen && (
            <div
              role="dialog"
              aria-label="Search tips"
              className="absolute right-0 top-full mt-1 w-64 rounded-md bg-paper p-3 text-[11px] leading-snug"
              style={{
                border: "1px solid var(--border-primary)",
                boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                zIndex: 40,
              }}
            >
              <div className="font-semibold text-ink mb-1.5 text-xs">Search tips</div>
              <ul className="space-y-1 text-ink-secondary">
                <li>
                  <code className="font-mono text-[10px] text-ink">AND OR NOT</code> — boolean
                </li>
                <li>
                  <code className="font-mono text-[10px] text-ink">"exact phrase"</code> — match verbatim
                </li>
                <li>
                  <code className="font-mono text-[10px] text-ink">stat*</code> — wildcard (many chars)
                </li>
                <li>
                  <code className="font-mono text-[10px] text-ink">wom?n</code> — wildcard (one char)
                </li>
                <li>
                  <code className="font-mono text-[10px] text-ink">( ... )</code> — group expressions
                </li>
              </ul>
              <div className="mt-2 pt-2 text-[10px] text-ink-tertiary" style={{ borderTop: "1px solid var(--border-soft)" }}>
                e.g. <code className="font-mono text-ink-secondary">status AND women NOT Nicaragua</code>
              </div>
            </div>
          )}
        </div>
      </div>
      {rightSlot}
    </div>
  );
}
