import { useAtomValue, useSetAtom } from "jotai";
import { Pin } from "lucide-react";
import { entityPinnedAtom, togglePinAtom } from "../../atoms/notebook";
import { Hint } from "./Hint";
import { breakpointAtom } from "../../atoms/viewport";

/** Pin a record to the collection's notebook, or take it out. One control in
 *  three places: a Library card's footer and a relationship row's entity pill
 *  (`icon`), and the entity view's header (`label`).
 *
 *  `icon` with `reveal`: hidden until its row or card is hovered or holds
 *  focus, and always shown once pinned, so a pinned record is visible at rest
 *  and an unpinned one adds nothing; on a phone it is always shown. The slot
 *  is always there, so revealing it moves nothing. */
export function PinToggle({
  entityId,
  title,
  variant = "icon",
  reveal = false,
  className = "",
}: {
  entityId: string;
  /** The record's title, for the accessible name. */
  title?: string;
  variant?: "icon" | "label";
  reveal?: boolean;
  className?: string;
}) {
  const pinned = useAtomValue(entityPinnedAtom(entityId));
  const toggle = useSetAtom(togglePinAtom);
  // Touch has no hover: on a phone the pin is always shown.
  const phone = useAtomValue(breakpointAtom) === "mobile";
  const hidden = reveal && !pinned && !phone;
  const name = title ? `“${title}”` : "this record";
  const label = pinned ? `Remove ${name} from notebook` : `Pin ${name} to notebook`;
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggle(entityId);
  };

  if (variant === "label")
    return (
      <button
        type="button"
        data-component="PinToggle"
        data-variant="label"
        data-state={pinned ? "on" : "off"}
        aria-pressed={pinned}
        aria-label={label}
        onClick={onClick}
        className={`shrink-0 inline-flex items-center gap-1.5 px-2 h-7 text-xs font-medium rounded-md transition-colors cursor-pointer
          focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40 ${
            pinned ? "bg-parchment text-ink" : "bg-warm text-ink-secondary hover:bg-parchment hover:text-ink"
          } ${className}`}
      >
        <Pin size={12} aria-hidden fill={pinned ? "currentColor" : "none"} className={pinned ? "" : "text-ink-tertiary"} />
        {/* Both words held in one slot, so the button keeps its width. */}
        <span className="grid">
          <span className={`col-start-1 row-start-1 ${pinned ? "" : "invisible"}`}>Pinned</span>
          <span className={`col-start-1 row-start-1 ${pinned ? "invisible" : ""}`}>Pin</span>
        </span>
      </button>
    );

  return (
    <Hint text={pinned ? "Remove from notebook" : "Pin to notebook"} describe={false}>
      {(hint) => (
        <button
          {...hint}
          type="button"
          data-component="PinToggle"
          data-variant="icon"
          data-state={pinned ? "on" : "off"}
          aria-pressed={pinned}
          aria-label={label}
          onClick={onClick}
          className={`hit-area shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md transition-[opacity,color,background-color] cursor-pointer
            focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40 focus-visible:opacity-100 ${
              pinned ? "text-ink hover:bg-parchment" : "text-ink-muted hover:text-ink hover:bg-parchment"
            } ${hidden ? "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100" : ""} ${className}`}
        >
          <Pin size={12} aria-hidden fill={pinned ? "currentColor" : "none"} />
        </button>
      )}
    </Hint>
  );
}
