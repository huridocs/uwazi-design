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

    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={ariaLabel}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
          onKeyDown?.(e);
        }}
        className={composed}
      >
        {children}
      </div>
    );
  },
);
