import { Search, X } from "lucide-react";
import { useAtom } from "jotai";
import { searchQueryAtom } from "../../atoms/filters";
import { useRef } from "react";

export function SearchBar() {
  const [query, setQuery] = useAtom(searchQueryAtom);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="px-3 pt-0.5 pb-2">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search references"
          className="w-full h-8 pl-3 pr-8 text-xs font-medium bg-warm border border-border rounded-md
            placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20
            focus:border-carbon/40 transition-all"
        />
        {query ? (
          <button
            onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-parchment text-ink-muted hover:text-ink cursor-pointer transition-colors"
          >
            <X size={12} />
          </button>
        ) : (
          <Search
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
          />
        )}
      </div>
    </div>
  );
}
