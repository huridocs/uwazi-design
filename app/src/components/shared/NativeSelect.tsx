import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

/** Start padding, caret inset and caret size by control size. The caret sits
 *  as far in from the end as the text sits from the start, the way
 *  `DateInput` places its calendar icon; the end padding keeps the text clear
 *  of it. Logical sides, so RTL mirrors. */
const SIZES = {
  /** A dense grid (`BatchEntryModal`) or an inline chip. */
  xs: { pad: "ps-1.5 pe-6", caret: "end-1.5", icon: 12 },
  /** Panel controls, `h-8 text-xs` (Library filters). */
  sm: { pad: "ps-2 pe-7", caret: "end-2", icon: 14 },
  /** Page and modal inputs, `MODAL_INPUT` (`h-9 px-2.5 text-sm`). */
  md: { pad: "ps-2.5 pe-8", caret: "end-2.5", icon: 14 },
  /** The record's edit form fields (`px-3 py-2 text-sm`). */
  lg: { pad: "ps-3 pe-9", caret: "end-3", icon: 14 },
} as const;

export type NativeSelectSize = keyof typeof SIZES;

/** A native `<select>` with the app's caret instead of the browser's, which
 *  sits wherever the engine puts it (8px from the end in Chrome, against a
 *  start padding the engine also widens). The `Select` popover is the choice
 *  for a menu-like trigger; this is for a form field, where the platform list
 *  is what a reader expects. `className` styles the field (height, type,
 *  ground, border); it carries no inline padding, `size` sets it. */
export const NativeSelect = forwardRef<
  HTMLSelectElement,
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
    size?: NativeSelectSize;
    /** The wrapper's layout; a block that fills its row by default. */
    wrapClassName?: string;
  }
>(function NativeSelect({ size = "sm", className = "", wrapClassName = "relative flex min-w-0 w-full", children, ...rest }, ref) {
  const s = SIZES[size];
  return (
    <span data-component="NativeSelect" className={wrapClassName}>
      <select
        ref={ref}
        {...rest}
        className={`${className} ${s.pad} w-full min-w-0 appearance-none truncate cursor-pointer disabled:cursor-not-allowed`}
      >
        {children}
      </select>
      <ChevronDown
        size={s.icon}
        aria-hidden
        className={`pointer-events-none absolute ${s.caret} top-1/2 -translate-y-1/2 text-ink-tertiary`}
      />
    </span>
  );
});
