import { HighlightedText } from "../shared/HighlightedText";
import { ThesaurusValueLabel } from "../shared/ThesaurusValueLabel";
import type { EntityScalarField } from "../../utils/entityFields";

/** ONE renderer for a property's value on a Library surface, switching on the
 *  property's KIND.
 *
 *  Before this, every value was a string in a truncating span, whatever it was:
 *  a set of twelve thesaurus terms printed its first label and "+11 more", which
 *  is the field describing itself rather than showing itself, and a date range
 *  printed nothing at all. The kind now decides the drawing, in one place, so
 *  the card and the list row cannot answer the same question differently — which
 *  is the whole reason this is a component and not two branches.
 *
 *  It renders the VALUE only. The label, the trigger button and the row's
 *  geometry belong to the surface, because those differ and should.
 *
 *  Deliberately NOT a rival to `fieldKind` (components/metadata/items.tsx): that
 *  one answers how tall a value renders inside the record, this one answers what
 *  shape it has on a card. `PropertyKind` is the shared vocabulary underneath. */
export function CardValue({
  field,
  query,
  compact = false,
}: {
  field: EntityScalarField;
  /** Marked in the value, as everywhere else on the card. */
  query: string;
  /** The list row's middot line: one line of running text, no chips, no marks.
   *  A chip row inside a middot-separated sentence reads as neither. */
  compact?: boolean;
}) {
  const marked = (text: string) => (
    <ThesaurusValueLabel value={text}>
      <HighlightedText text={text} query={query} />
    </ThesaurusValueLabel>
  );

  /* CHIPS: a set, drawn as a set. Three at most and then the count, all on ONE
     line and clipped — a chip row that wraps grows the card, and the whole
     contract is that a property takes the lines it was given. `values` carries
     the first four; `more` is the true remainder, counted by the adapter over
     every value, not over the four. */
  if (field.kind === "chips" && field.values && field.values.length > 1 && !compact) {
    const shown = field.values.slice(0, 3);
    const rest = field.more ?? 0;
    return (
      <span className="flex items-center gap-1 min-w-0 overflow-hidden">
        {shown.map((v, i) => (
          <span
            key={`${v}-${i}`}
            title={v}
            className="shrink-0 max-w-[9rem] truncate rounded-md bg-warm px-1.5 py-px text-meta text-ink-secondary"
          >
            {marked(v)}
          </span>
        ))}
        {rest > shown.length - 1 && (
          <span className="shrink-0 text-meta text-ink-tertiary">
            +{rest - (shown.length - 1)}
          </span>
        )}
      </span>
    );
  }

  /* A SPAN OF TIME reads as one thing, so it gets `tabular-nums` and no
     wrapping: "1993–2002" broken across a line break is two years. */
  if (field.kind === "dateSpan" || field.kind === "date") {
    return (
      <span className="truncate tabular-nums" title={field.value}>
        {marked(field.value)}
      </span>
    );
  }

  /* A PLACE, in the sexagesimal notation a coordinate is written in — see
     `formatPlace`. Mono because the parts line up column-wise down a grid of
     cards, and they are digits, not prose. */
  if (field.kind === "place") {
    return (
      <span className="truncate font-mono text-meta tabular-nums" title={field.value}>
        {marked(field.value)}
      </span>
    );
  }

  return (
    <span className="truncate" title={field.value}>
      {marked(field.value)}
    </span>
  );
}

/** Whether this field's own rendering already accounts for its extra values, so
 *  the surface should not print a second "+N more" beside it. A chip row ends in
 *  its own count. */
export function ownsItsRemainder(field: EntityScalarField, compact = false): boolean {
  return (
    !compact && field.kind === "chips" && !!field.values && field.values.length > 1
  );
}
