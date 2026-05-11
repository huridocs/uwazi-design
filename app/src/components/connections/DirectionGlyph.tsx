import { ArrowLeft, ArrowRight } from "lucide-react";
import { Direction } from "../../data/references";

interface DirectionGlyphProps {
  direction: Direction;
  /** Glyph footprint. "sm" matches the drawer-panel rows; "md" matches the
   *  main-tab tree's TargetCardDetail. */
  size?: "sm" | "md";
}

/** Inline arrow badge that signals whether a relationship flows out of the
 *  source document ("outgoing", ArrowRight) or into it ("incoming", ArrowLeft). */
export function DirectionGlyph({ direction, size = "sm" }: DirectionGlyphProps) {
  const Icon = direction === "incoming" ? ArrowLeft : ArrowRight;
  const title = direction === "incoming" ? "Incoming" : "Outgoing";
  const box = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
  const icon = size === "sm" ? 9 : 10;
  return (
    <span
      aria-label={title}
      title={title}
      className={`inline-flex items-center justify-center ${box} rounded-[2px] bg-vellum text-ink-tertiary shrink-0`}
    >
      <Icon size={icon} strokeWidth={2.5} />
    </span>
  );
}
