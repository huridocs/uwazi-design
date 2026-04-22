import { Search, X, HelpCircle } from "lucide-react";
import { useAtom } from "jotai";
import { searchQueryAtom } from "../../atoms/filters";
import { useEffect, useRef, useState } from "react";

export function SearchBar() {
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

  const rightPad = query ? 32 : 52;

  return (
    <div className="px-3 pt-0.5 pb-2">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search  •  AND, OR, NOT, &quot;exact&quot;, wild*"
          aria-label="Search references"
          style={{ paddingRight: rightPad }}
          className="w-full h-8 pl-3 text-xs font-medium bg-warm border border-border rounded-md
            placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20
            focus:border-carbon/40 transition-all"
        />

        {query && (
          <button
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            aria-label="Clear search"
            className="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-parchment text-ink-muted hover:text-ink cursor-pointer transition-colors"
          >
            <X size={12} />
          </button>
        )}

        <div ref={hintRef} className="absolute right-2 top-1/2 -translate-y-1/2">
          <button
            onClick={() => setHintOpen((o) => !o)}
            aria-label="Search tips"
            aria-expanded={hintOpen}
            className="p-0.5 rounded-full text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            {query ? <HelpCircle size={13} /> : <Search size={14} />}
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
    </div>
  );
}
