import { ReactNode, useId } from "react";

interface MetadataCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  /** The heading's level in the outline it sits in. A record card sits under
   *  the entity's `h2` title; a card inside a titled section (the Images group)
   *  is one below that section's heading. */
  headingLevel?: 3 | 4;
  /** The `data-component` the card stamps — the wrapping component's name
   *  (DocumentCard, ConnectionGroupCard…) where there is one. */
  component?: string;
}

/** The card head NAMES the thing in the card — a metadata field, a connection,
 *  the document — so it is the app's label recipe, not a heading.
 *
 *  It was `text-sm font-bold text-ink leading-tight`: 14px/700, no case change,
 *  no tracking. TYPOGRAPHY.md names that string as matching exactly one
 *  component in the codebase, and this was the component. Once the record became
 *  a stack of one card per field it also became the failure that file records
 *  for form labels — "a 14px bold word naming an input, two full steps above
 *  every other field label in the app" — printed a dozen times down a column
 *  whose values are 14px regular.
 *
 *  Now the `table header` combo at one colour step up: 11px semibold uppercase
 *  `tracking-wider`, `ink-secondary`. Same level as every other label for a
 *  piece of data in this app (the connection tables' column heads, the
 *  per-entity cards' cell labels, the old record table's `th`), and
 *  `-secondary` rather than `-tertiary` because a card head has to outrank the
 *  labels INSIDE it — in a ConnectionGroupCard the head and its column headers
 *  would otherwise be the same text. One colour step, no second size.
 *
 *  Icons in this row belong at 11px to match; the callers pass them. */
export function MetadataCard({
  title,
  icon,
  children,
  className = "",
  headingLevel = 3,
  component = "MetadataCard",
}: MetadataCardProps) {
  const Heading = headingLevel === 4 ? "h4" : "h3";
  const titleId = useId();
  return (
    /* `section` without a landmark: no accessible name is set on the element
       itself, so a record of twelve cards is not twelve regions. */
    <section
      data-component={component}
      className={`bg-paper border border-border/40 rounded-md overflow-hidden ${className}`}
    >
      <div data-part="body" className="flex flex-col gap-2 px-4 py-3">
        <header data-part="header" className="flex items-center gap-1.5">
          {icon}
          <Heading
            id={titleId}
            data-part="title"
            className="text-meta font-semibold uppercase tracking-wider text-ink-secondary"
          >
            {title}
          </Heading>
        </header>
        {children}
      </div>
    </section>
  );
}

interface PropertyProps {
  label?: string;
  value: string;
  linked?: boolean;
  /** Clip to one line, full value on hover. Filenames don't wrap or break — a
   *  Velasquez-Rodriguez_v_Honduras_Judgment_1988.pdf ran straight out of the
   *  card on a phone. */
  truncate?: boolean;
  /** Keep the value left-to-right (filenames, sizes, dates) so RTL bidi
   *  doesn't reorder it to e.g. "KB 948" or "2000-11-25". */
  ltr?: boolean;
}

/** A label over its value — one `dl` pair per property, so it is valid on its
 *  own (the catalog renders it bare) and inside any grid a caller lays out. */
export function Property({ label, value, linked, ltr, truncate }: PropertyProps) {
  return (
    <dl data-component="Property" className="flex flex-col items-start min-w-0 w-full">
      {label && (
        <dt data-part="label" className="text-xs text-ink-tertiary leading-relaxed">{label}</dt>
      )}
      <dd
        data-part="value"
        dir={ltr ? "ltr" : undefined}
        title={truncate ? value : undefined}
        className={`text-sm font-medium text-ink leading-relaxed max-w-full ${
          linked ? "underline decoration-solid" : ""
        } ${truncate ? "truncate" : ""}`}
      >
        {value}
      </dd>
    </dl>
  );
}

export function PropertyRow({ children }: { children: ReactNode }) {
  return (
    <div data-component="PropertyRow" className="flex gap-6 items-start w-full">
      {children}
    </div>
  );
}
