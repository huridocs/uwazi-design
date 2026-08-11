import type { ReactNode } from "react";
import { thesaurusParentOf } from "../../utils/thesauri";

/**
 * A thesaurus-backed value with its group as QUIET context: `Americas › Central
 * America` — parent in tertiary ink, a muted ›, then the child in whatever the
 * host row already styles. Uwazi thesauri nest one level (a value can live
 * inside a group); the child label alone ("Caribbean") reads fine to a domain
 * expert but loses the hierarchy everywhere the full checklist isn't visible.
 *
 * The parent is looked up by label against every known thesaurus
 * (`utils/thesauri.ts`); a top-level value or free text resolves to nothing and
 * renders exactly as before — so this can wrap ANY value cell without first
 * asking whether the field is thesaurus-backed. Pass `parent` to skip the
 * lookup (stories, previews). `children` renders the child label when the host
 * needs its own treatment (e.g. `HighlightedText`); it must display the same
 * `value` string.
 *
 * ONE implementation on purpose: entity cards, the metadata record and
 * inherited-value tags all render nested values through this, so the treatment
 * can't drift per surface.
 */
export function ThesaurusValueLabel({
  value,
  parent,
  children,
  className = "",
}: {
  value: string;
  parent?: string;
  children?: ReactNode;
  className?: string;
}) {
  const group = parent ?? thesaurusParentOf(value);
  const child = children ?? value;
  if (!group) return <>{child}</>;
  return (
    <span className={`inline-flex max-w-full items-baseline gap-1 min-w-0 ${className}`}>
      <span className="shrink-0 font-normal text-ink-tertiary">{group}</span>
      <span aria-hidden className="shrink-0 text-ink-muted">
        ›
      </span>
      <span className="truncate min-w-0">{child}</span>
    </span>
  );
}
