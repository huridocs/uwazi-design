import { ReactNode, forwardRef, KeyboardEvent } from "react";

interface BaseProps {
  selected: boolean;
  /** Omit for a row that is CHROME rather than a control — hover and selected
   *  styling, no click, no stretched button, nothing to tab to. The
   *  relationships rows are that: their targets are the entity pill and the page
   *  tag, which are real buttons of their own. */
  onClick?: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
}

type ListCardRowProps =
  | ({ as?: "div" } & BaseProps)
  | ({ as: "button" } & BaseProps);

const baseClasses =
  "group px-3 py-2.5 border-b border-border/50 last:border-b-0 transition-colors";

export const ListCardRow = forwardRef<HTMLElement, ListCardRowProps>(
  function ListCardRow(props, ref) {
    const { selected, onClick, onKeyDown, ariaLabel, className, children, as } =
      props;
    const selectedClass = selected ? "bg-parchment" : "";
    const cursorClass = onClick ? "cursor-pointer" : "";
    const composed = `${baseClasses} ${selectedClass} ${cursorClass} ${className ?? ""}`;

    if (as === "button") {
      return (
        <button
          ref={ref as React.Ref<HTMLButtonElement>}
          type="button"
          onClick={onClick}
          aria-pressed={selected}
          aria-label={ariaLabel}
          className={`${composed} w-full text-left flex items-center justify-between gap-2`}
        >
          {children}
        </button>
      );
    }

    // The container is NOT a button — rows host nested interactive controls
    // (page tags, pills, chevrons, checkboxes), and an interactive ancestor
    // around interactive children is invalid for AT.
    //
    // WITH an `onClick`, a stretched invisible primary-action button (first
    // child) carries the keyboard/AT path: focusable, labeled, aria-pressed,
    // Enter/Space native. The content wrapper sits above it, so nested controls
    // stay clickable and clicks on content bubble to the container's plain
    // onClick.
    //
    // WITHOUT one, the row is chrome: no stretched button, no tab stop, no
    // pointer cursor. That is the right shape when every action in the row is
    // already a control of its own — a row-wide target would be a third way to
    // do what the pill does, announced as "Open row".
    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        onClick={onClick}
        className={`relative ${composed}`}
      >
        {onClick && (
          <button
            type="button"
            aria-pressed={selected}
            aria-label={ariaLabel ?? "Open row"}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            onKeyDown={onKeyDown}
            className="absolute inset-0 w-full cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20"
          />
        )}
        <div className="relative">{children}</div>
      </div>
    );
  },
);
