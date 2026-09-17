import { fold, tokenizeQuery } from "../../utils/queryTokens";
import type { RelevanceBreakdown, TermAttribution } from "../../utils/relevance";

/** Which field each query term matched in, for a multi-term query.
 *
 *  ATTRIBUTION, NOT A SCORE. The relevance order is real but the margins between
 *  neighbouring scores are not, so nothing here says how well a result matched:
 *  no number, no count of terms, no bar. It names the field that carried each
 *  term (title, a property by its own label, the entity's document, or a document
 *  it borrows) and strikes the terms it missed. The groups follow the order the
 *  score weighs fields in, which is also the order a reader would check them.
 *
 *  Multi-term queries only. With one term the line would only repeat the section
 *  labels under it, so it renders nothing. The borrowed document's SOURCE is not
 *  named here: `BorrowedDocLine` rides the Document section label on every
 *  surface, single-term queries included, and this line only says "Borrowed
 *  document" so the field reads correctly beside the others.
 *
 *  Terms print as the reader typed them, not folded: "desaparición", not
 *  "desaparicion". */
export function MatchedTerms({
  relevance,
  query,
  missedOnly = false,
  className = "",
}: {
  relevance: RelevanceBreakdown | null;
  query: string;
  /** Only the "Not found" group — for the tree, whose branches already name
   *  the fields that matched. Renders nothing when no term was missed. */
  missedOnly?: boolean;
  className?: string;
}) {
  if (!relevance || relevance.perTerm.length < 2) return null;
  const typed = typedTerms(query);
  const groups = groupAttribution(relevance.perTerm).filter((g) => !missedOnly || g.field === null);
  if (groups.length === 0) return null;

  return (
    <dl
      data-component="MatchedTerms"
      className={`flex flex-wrap items-baseline gap-x-3 gap-y-0.5 min-w-0 text-meta ${className}`}
    >
      {groups.map((g) => (
        <div key={g.key} data-part="group" data-field={g.field ?? "none"} className="inline-flex items-baseline gap-1.5 min-w-0">
          <dt className="shrink-0 font-semibold uppercase tracking-wide text-ink-tertiary">{g.label}</dt>
          {g.terms.map((t) => (
            <dd
              key={t}
              className={
                g.field === null
                  ? "text-ink-tertiary line-through decoration-ink-tertiary/70"
                  : "font-medium text-ink"
              }
            >
              {typed.get(t) ?? t}
            </dd>
          ))}
        </div>
      ))}
    </dl>
  );
}

interface Group {
  key: string;
  field: TermAttribution["field"];
  label: string;
  terms: string[];
}

const FIELD_ORDER: Record<string, number> = { title: 0, property: 1, document: 2, "borrowed document": 3 };

function groupAttribution(perTerm: TermAttribution[]): Group[] {
  const byKey = new Map<string, Group & { order: number; seen: number }>();
  perTerm.forEach((a, i) => {
    const key = a.field === "property" ? `property:${a.propertyKey}` : (a.field ?? "none");
    let g = byKey.get(key);
    if (!g) {
      g = {
        key,
        field: a.field,
        label:
          a.field === null
            ? "Not found"
            : a.field === "title"
              ? "Title"
              : a.field === "property"
                ? (a.propertyLabel ?? "Property")
                : a.field === "document"
                  ? "Document"
                  : "Borrowed document",
        terms: [],
        order: a.field === null ? 4 : FIELD_ORDER[a.field],
        seen: i,
      };
      byKey.set(key, g);
    }
    if (!g.terms.includes(a.term)) g.terms.push(a.term);
  });
  return [...byKey.values()].sort((a, b) => a.order - b.order || a.seen - b.seen);
}

/** Folded term → the term as typed, from the raw query. */
function typedTerms(query: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const tok of tokenizeQuery(query)) {
    if (tok.kind === "op") continue;
    const f = fold(tok.value.trim());
    if (f && !out.has(f)) out.set(f, tok.kind === "phrase" ? `“${tok.value}”` : tok.value);
  }
  return out;
}
