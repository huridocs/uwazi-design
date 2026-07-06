import { ReactNode, forwardRef, KeyboardEvent } from "react";

interface BaseProps {
  selected: boolean;
  onClick: () => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  ariaLabel?: string;
  className?: string;
  children: ReactNode;
}

type ListCardRowProps =
  | ({ as?: "div" } & BaseProps)
  | ({ as: "button" } & BaseProps);

const baseClasses =
  "group px-3 py-2.5 border-b border-border/50 last:border-b-0 cursor-pointer transition-colors";

export const ListCardRow = forwardRef<HTMLElement, ListCardRowProps>(
  function ListCardRow(props, ref) {
    const { selected, onClick, onKeyDown, ariaLabel, className, children, as } =
      props;
    const selectedClass = selected ? "bg-parchment" : "";
    const composed = `${baseClasses} ${selectedClass} ${className ?? ""}`;

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
    // (page tags, chevrons, checkboxes), and an interactive ancestor around
    // interactive children is invalid for AT. Instead a stretched, invisible
    // primary-action button (first child) carries the keyboard/AT path:
    // focusable, labeled, aria-pressed, Enter/Space native. The content
    // wrapper is positioned above it, so nested controls stay clickable and
    // clicks on content bubble to the container's plain onClick as before.
    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        onClick={onClick}
        className={`relative ${composed}`}
      >
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
        <div className="relative">{children}</div>
      </div>
    );
  },
);
