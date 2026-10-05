import { createContext, useContext, type ButtonHTMLAttributes, type ReactNode } from "react";
import { BAR_DANGER, BAR_GHOST, BAR_LEAD, COMMIT_FILL, WARM_BUTTON } from "../shared/warmButton";

/** - `commit`: the solid ink commit (Create, Invite, Publish).
 *  - `success`: the commit when it is a Save. The ladder's one green.
 *  - `primary`: in a bar, the lead action when the bar has no commit
 *    ("Add template"); in a page body, a warm button.
 *  - `lead`: `BAR_LEAD` anywhere.
 *  - `secondary`: in a bar, a ghost; in a page body, a warm button.
 *  - `ghost`: no fill at rest.
 *  - `danger`: in a bar, seal text; in a page body, the seal fill. */
type Variant = "commit" | "success" | "primary" | "lead" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

interface SettingsButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  children?: ReactNode;
}

/** True inside `SettingsContent.Footer`. A bar button carries no fill at rest
 *  and no edge (the ladder in `warmButton.ts`); the same variant in a page
 *  body sits on paper and keeps the warm fill and its edge. */
export const SettingsBarContext = createContext(false);

const SUCCESS = "bg-success text-white hover:bg-success/90";

const inBar: Record<Variant, string> = {
  commit: COMMIT_FILL,
  success: SUCCESS,
  primary: BAR_LEAD,
  lead: BAR_LEAD,
  secondary: BAR_GHOST,
  ghost: BAR_GHOST,
  danger: BAR_DANGER,
};

const inBody: Record<Variant, string> = {
  commit: COMMIT_FILL,
  success: SUCCESS,
  primary: WARM_BUTTON,
  lead: BAR_LEAD,
  secondary: WARM_BUTTON,
  ghost: BAR_GHOST,
  danger: "bg-seal-fill text-white hover:bg-seal-fill/90",
};

// Padding-based, matching the bar and modal buttons (`MODAL_BUTTON`).
const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
};

/** Disabled: a filled rung keeps its shape at low contrast; an unfilled rung
 *  stays unfilled, so a disabled ghost does not read as a pressed chip. */
function disabledClass(variant: Variant, bar: boolean): string {
  if (variant === "commit") return "bg-ink/40 text-paper cursor-not-allowed";
  const filled = variant === "success" || (!bar && variant !== "ghost" && variant !== "lead");
  return filled ? "bg-vellum text-ink-muted cursor-not-allowed" : "text-ink-muted cursor-not-allowed";
}

/** Settings-scoped button. We don't have a global Button primitive (every
 *  other surface hand-rolls inline pills), so this keeps the many cloned
 *  settings views consistent without touching the rest of the app. */
export function SettingsButton({
  variant = "secondary",
  size = "md",
  icon,
  children,
  className = "",
  disabled,
  ...props
}: SettingsButtonProps) {
  const bar = useContext(SettingsBarContext);
  const look = disabled ? disabledClass(variant, bar) : `cursor-pointer ${(bar ? inBar : inBody)[variant]}`;
  return (
    <button
      type="button"
      data-component="SettingsButton"
      data-variant={variant}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-medium rounded-md transition-colors ${look} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
