import { getEntityType } from "../../data/entities";

/** The template tag: a square dot in the true type colour + a small-caps label.
 *
 *  This is how a TYPE reads everywhere now — the entity-view header, the Library
 *  drawer, the overlay, the cards, the relationship rows. It replaced the filled
 *  tinted pill, which shouted the template louder than the entity's own name.
 *
 *  `EntityPill` stays for ENTITY REFERENCES (a chip carrying an entity's title):
 *  those are objects you can click through to, and they earn a filled chip. A
 *  type is a label, not a thing.
 *
 *  It's an inline-flex, so its BASELINE is the label's baseline — put it in an
 *  `items-baseline` row beside a title and the two texts sit on one line. Centring
 *  the boxes instead lines up their box-centres, which is not the same thing and
 *  reads as a misalignment when one is 10px caps and the other 15px mixed-case. */
export function EntityTypeTag({
  typeId,
  label,
  className = "",
}: {
  typeId: string;
  /** Override the template's name (e.g. an aggregate row's relation type). */
  label?: string;
  className?: string;
}) {
  const type = getEntityType(typeId);
  const color = type?.color ?? "#6B7280";
  const name = label ?? type?.name ?? typeId;

  return (
    <span
      title={name}
      className={`inline-flex items-center gap-1.5 min-w-0 max-w-full ${className}`}
    >
      <span
        className="w-2 h-2 rounded-[2px] shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-tertiary truncate">
        {name}
      </span>
    </span>
  );
}
