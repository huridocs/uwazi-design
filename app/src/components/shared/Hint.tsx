import { useEffect, useId, useState, type FocusEvent, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** What a `Hint` hands its trigger. Spread onto the one element the hint is
 *  about — a button, or a plain span for text that isn't a control. */
export interface HintTriggerProps {
  "aria-describedby"?: string;
  onMouseEnter: (e: MouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
  onFocus: (e: FocusEvent<HTMLElement>) => void;
  onBlur: () => void;
}

/** A one-line hint above an element, on hover AND keyboard focus.
 *
 *  Not a `title` attribute: a title never shows on focus, shows late on hover,
 *  and can't be styled or dismissed. Portalled to `body` and positioned from the
 *  trigger's rect, because the rows that carry hints scroll inside
 *  `overflow-auto` panes that would clip it; a scroll, a resize or Escape hides
 *  it, since a fixed overlay goes stale the moment anything moves.
 *
 *  The description a screen reader hears is a hidden span beside the trigger,
 *  always mounted, so `aria-describedby` points at something that exists before
 *  focus lands (a description that appears after focus is not announced). Pass
 *  `describe={false}` where the trigger's own name already says the same words,
 *  so the text isn't read twice. */
export function Hint({
  text,
  describe = true,
  children,
}: {
  text: string;
  describe?: boolean;
  children: (props: HintTriggerProps) => ReactNode;
}) {
  const id = useId();
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!rect) return;
    const hide = () => setRect(null);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && hide();
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      window.removeEventListener("keydown", onKey);
    };
  }, [rect]);

  const show = (e: { currentTarget: HTMLElement }) => setRect(e.currentTarget.getBoundingClientRect());
  const hide = () => setRect(null);

  return (
    <>
      {children({
        "aria-describedby": describe ? id : undefined,
        onMouseEnter: show,
        onMouseLeave: hide,
        onFocus: show,
        onBlur: hide,
      })}
      {describe && (
        <span id={id} hidden>
          {text}
        </span>
      )}
      {rect &&
        createPortal(
          <div
            role="tooltip"
            aria-hidden
            data-component="Hint"
            className="pointer-events-none fixed z-50 max-w-[20rem] rounded-md bg-ink px-2 py-1
              text-meta font-normal normal-case tracking-normal text-paper shadow-md"
            style={{
              left: Math.min(Math.max(rect.left + rect.width / 2, 8), window.innerWidth - 8),
              top: rect.top - 6,
              transform: "translate(-50%, -100%)",
            }}
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}
