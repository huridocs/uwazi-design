import { getEntityType } from "../../data/entities";
import { typeLabelColor } from "../../utils/typeColor";

/** Compact entity-type indicator for dense rows: just the colour dot, expanding
 *  to the full tinted pill (dot + name) when you hover the chip — like the navbar
 *  Beacon. The expanded pill OVERLAYS (absolute, opaque) so it never pushes the
 *  row's other columns, and is itself hoverable so it stays open. */
export function EntityTypeChip({ typeId }: { typeId: string }) {
  const type = getEntityType(typeId);
  const color = type?.color ?? "#6B7280";
  const name = type?.name ?? typeId;
  // The shared rule, not a second one: a label never takes the raw type colour.
  // This chip was drawing it straight — 3.64:1 light, 3.21:1 dark, under AA for
  // 12px text. The dot keeps the true colour.
  const textColor = typeLabelColor(color);

  const dot = (
    <span
      className="rounded-[2px] shrink-0 ring-1 ring-inset ring-ink/20 w-[0.4375rem] h-[0.4375rem]"
      style={{ backgroundColor: color }}
    />
  );

  return (
    <span className="group/chip relative inline-flex items-center" title={name}>
      {/* Collapsed: a small tinted square holding the dot. */}
      <span
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
        className="absolute start-0 top-1/2 -translate-y-1/2 z-10 hidden group-hover/chip:inline-flex
          items-center gap-1.5 h-6 ps-1.5 pe-2.5 rounded-md whitespace-nowrap shadow-sm"
        style={{
          background: `linear-gradient(${color}20, ${color}20), var(--bg-surface)`,
          border: `1px solid ${color}40`,
          color: textColor,
        }}
      >
        {dot}
        <span className="text-xs font-medium">{name}</span>
      </span>
    </span>
  );
}
