import { ArrowLeft, ArrowLeftRight, ArrowRight } from "lucide-react";
import { Direction } from "../../data/references";

interface DirectionGlyphProps {
  /** Pass a single direction for a unidirectional badge, or "both" for a
   *  bidirectional one (used when an aggregate covers refs in both
   *  directions on the same target+type). */
  direction: Direction | "both";
  /** Glyph footprint. "sm" matches the drawer-panel rows; "md" matches the
   *  main-tab tree's TargetCardDetail. */
  size?: "sm" | "md";
}

/** Inline arrow badge that signals whether a relationship flows out of the
 *  source document ("outgoing", ArrowRight), into it ("incoming", ArrowLeft),
 *  or both ("both", ArrowLeftRight — bidirectional aggregate). */
export function DirectionGlyph({ direction, size = "sm" }: DirectionGlyphProps) {
  const Icon =
    direction === "both"
      ? ArrowLeftRight
      : direction === "incoming"
        ? ArrowLeft
        : ArrowRight;
  const title =
    direction === "both"
      ? "Bidirectional"
      : direction === "incoming"
        ? "Incoming"
        : "Outgoing";
  // The bidirectional icon needs a slightly wider box to read clearly.
  const baseBox = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
  const box = direction === "both" ? (size === "sm" ? "w-4 h-3" : "w-5 h-3.5") : baseBox;
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
