import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "success";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  children?: ReactNode;
}

const variants: Record<Variant, string> = {
  // The canonical action-bar button (the Translations page's "Translate" /
  // "Import" buttons) — calm warm fill, ink-secondary text. Used for every
  // action-bar action. Seal stays for danger only.
  primary: "bg-warm text-ink-secondary hover:bg-parchment hover:text-ink",
  secondary: "bg-warm text-ink-secondary hover:bg-parchment hover:text-ink",
  danger: "bg-seal text-white hover:bg-seal/90",
  ghost: "text-ink-secondary hover:bg-warm hover:text-ink",
  // Active save affordance — green only once there's an unsaved change.
  success: "bg-success text-white hover:bg-success/90",
};

// Padding-based, matching the app's hand-rolled pills (ToolsActionBar /
// CreateRelationshipModal) — not fixed heights.
const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
};

/** Settings-scoped button. We don't have a global Button primitive (every
 *  other surface hand-rolls inline pills), so this keeps the many cloned
 *  settings views consistent without touching the rest of the app. */
// Flat, calm disabled state — a vellum chip rather than translucent ink
// (which goes muddy-grey over a paper footer). Replaces the variant fill.
const disabledClass = "bg-vellum text-ink-muted cursor-not-allowed";

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center font-medium rounded-md transition-colors ${
        disabled ? disabledClass : `cursor-pointer ${variants[variant]}`
      } ${sizes[size]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
