import { getEntityType } from "../../data/entities";

interface EntityPillProps {
  typeId: string;
  label?: string;
  size?: "sm" | "md";
}

/** Perceived luminance (0–1) of a #RRGGBB colour. Pale colours (lime, yellow,
 *  pastels) score high and are unreadable as text on a light tint. */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length < 6) return 0.5;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function EntityPill({ typeId, label, size = "sm" }: EntityPillProps) {
  const type = getEntityType(typeId);
  const color = type?.color ?? "#6B7280";
  const resolved = label ?? type?.name ?? typeId;
  const isMissing = !resolved;
  const name = isMissing ? "Unknown entity" : resolved;

  // Saturated/dark colours read fine as label text; pale ones fall back to ink
  // so the label stays legible in both themes. The dot keeps the true colour.
  const isPale = luminance(color) > 0.6;
  const textColor = isPale ? "var(--text-primary)" : color;

  return (
    <span
      title={name}
      className={`inline-flex items-center gap-1.5 rounded-md min-w-0 max-w-full align-middle ${
        isMissing ? "italic font-normal" : "font-medium"
      } ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}`}
      style={{
        backgroundColor: `${color}20`,
        color: textColor,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className="rounded-[2px] shrink-0 ring-1 ring-inset ring-ink/20"
        style={{
          backgroundColor: color,
          width: size === "sm" ? 6 : 8,
          height: size === "sm" ? 6 : 8,
        }}
      />
      <span className="truncate">{name}</span>
    </span>
  );
}
