import { getEntityType } from "../../data/entities";

interface EntityPillProps {
  typeId: string;
  label?: string;
  size?: "sm" | "md";
}

export function EntityPill({ typeId, label, size = "sm" }: EntityPillProps) {
  const type = getEntityType(typeId);
  const color = type?.color ?? "#6B7280";
  const name = label ?? type?.name ?? typeId;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"
      }`}
      style={{
        backgroundColor: `${color}14`,
        color: color,
        border: `1px solid ${color}30`,
      }}
    >
      <span
        className="rounded-full shrink-0"
        style={{
          backgroundColor: color,
          width: size === "sm" ? 6 : 8,
          height: size === "sm" ? 6 : 8,
        }}
      />
      {name}
    </span>
  );
}
