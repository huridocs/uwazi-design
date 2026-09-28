import { getEntityType } from "../../data/entities";
import { typeLabelColor } from "../../utils/typeColor";

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
  variant = "tag",
}: {
  typeId: string;
  /** Override the template's name (e.g. an aggregate row's relation type). */
  label?: string;
  className?: string;
  /** `swatch`: the dot-only form for dense rows (the List table, Results rows). */
  variant?: "tag" | "swatch";
}) {
  if (variant === "swatch") return <EntityTypeSwatch typeId={typeId} />;
  const type = getEntityType(typeId);
  const color = type?.color ?? "#6B7280";
  const name = label ?? type?.name ?? typeId;

  return (
    <span
      data-component="EntityTypeTag"
      title={name}
      className={`inline-flex items-center gap-1.5 min-w-0 max-w-full ${className}`}
    >
      <span
        data-part="dot"
        className="w-2 h-2 rounded-[2px] shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span data-part="label" className="text-meta font-semibold uppercase tracking-[0.08em] text-ink-tertiary truncate">
        {name}
      </span>
    </span>
  );
}

/** The compact form for dense rows: the colour dot in a tinted square, expanding
 *  to the full tinted pill (dot + name) on hover. The expanded pill overlays
 *  (absolute, opaque), so it never pushes the row's other columns. Its label
 *  colour comes from `typeLabelColor`, never the raw type colour. */
function EntityTypeSwatch({ typeId }: { typeId: string }) {
  const type = getEntityType(typeId);
  const color = type?.color ?? "#6B7280";
  const name = type?.name ?? typeId;
  const textColor = typeLabelColor(color);

  const dot = (
    <span
      data-part="dot"
      className="rounded-[2px] shrink-0 ring-1 ring-inset ring-ink/20 w-[0.4375rem] h-[0.4375rem]"
      style={{ backgroundColor: color }}
    />
  );

  return (
    <span
      data-component="EntityTypeTag"
      data-variant="swatch"
      className="group/chip relative inline-flex items-center"
      title={name}
    >
      {/* Collapsed: a small tinted square holding the dot. */}
      <span
        data-part="swatch"
        className="inline-flex items-center justify-center rounded-md shrink-0"
        style={{
          backgroundColor: `${color}20`,
          border: `1px solid ${color}40`,
          width: "1.5rem",
          height: "1.5rem",
        }}
      >
        {dot}
      </span>
      {/* Expanded overlay on row hover — opaque (tint over surface) so it covers
          whatever sits to the right. */}
      <span
        data-part="expanded"
        className="absolute start-0 top-1/2 -translate-y-1/2 z-10 hidden group-hover/chip:inline-flex
          items-center gap-1.5 h-6 ps-1.5 pe-2.5 rounded-md whitespace-nowrap shadow-sm"
        style={{
          background: `linear-gradient(${color}20, ${color}20), var(--bg-surface)`,
          border: `1px solid ${color}40`,
          color: textColor,
        }}
      >
        {dot}
        <span data-part="label" className="text-xs font-medium">
          {name}
        </span>
      </span>
    </span>
  );
}
