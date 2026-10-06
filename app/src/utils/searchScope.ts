/** Where a search looks: everywhere, or one kind of text. Set by the Adv.
 *  Search view's "Search in" control (`librarySearchScopeAtom`). The filter
 *  (`matchesSearch`), the snippets, the match categories and the ranking all
 *  read it, so a scoped search matches, excerpts and ranks the same text.
 *  `metadata` is every field but the title and the quotes; `quotes` are the
 *  references' anchored quotes (`quote:` fields, Nepal only). */
export type SearchScope = "all" | "title" | "metadata" | "fulltext" | "quotes";

/** What "Search in" calls each scope, in its menu and wherever the search is
 *  described (the masthead chip, the empty state). */
export const SEARCH_SCOPE_LABEL: Record<SearchScope, string> = {
  all: "All",
  title: "Title",
  metadata: "Metadata",
  fulltext: "Full text",
  quotes: "Quotes",
};

const isQuoteField = (fieldKey: string) => fieldKey.startsWith("quote:");

/** Whether a metadata field (title included) is searched under `scope`. */
export function fieldInScope(fieldKey: string, scope: SearchScope): boolean {
  switch (scope) {
    case "all":
      return true;
    case "title":
      return fieldKey === "title";
    case "metadata":
      return fieldKey !== "title" && !isQuoteField(fieldKey);
    case "quotes":
      return isQuoteField(fieldKey);
    case "fulltext":
      return false;
  }
}

/** Whether document bodies are searched under `scope`. */
export const bodyInScope = (scope: SearchScope): boolean => scope === "all" || scope === "fulltext";

/** Document bodies are scanned only for a query this long or longer, so one-
 *  and two-character queries never scan every CEJIL body. */
export const FULL_TEXT_MIN = 3;
