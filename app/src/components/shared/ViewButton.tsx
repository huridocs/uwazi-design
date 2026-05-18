import { Eye } from "lucide-react";

interface ViewButtonProps {
  onClick?: () => void;
  label?: string;
  ariaLabel?: string;
  size?: "sm" | "md";
}

/** Shared "View" affordance. Soft pill (rounded-full, bg-warm, no border)
 *  with an Eye glyph — used in file rows, metadata cards, and anywhere the
 *  app needs a tertiary "open this" action. */
export function ViewButton({
  onClick,
  label = "View",
  ariaLabel,
  size = "sm",
}: ViewButtonProps) {
  const dims = size === "md" ? "px-3 py-1.5 text-xs gap-1.5" : "px-2.5 py-1 text-[11px] gap-1";
  const icon = size === "md" ? 13 : 11;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? label}
      className={`inline-flex items-center font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-full transition-colors cursor-pointer ${dims}`}
    >
      <Eye size={icon} className="text-ink-tertiary" />
      {label}
    </button>
  );
}
