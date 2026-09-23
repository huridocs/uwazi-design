import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const EDGE = 8;
const GAP = 6;

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
 *  so the text isn't read twice.
 *
 *  `muted` stops it from showing — for a trigger whose own popover is open, or
 *  that just got focus back from one closing (the focus return would otherwise
 *  raise the hint over the row the reader has moved on from). */
export function Hint({
  text,
  describe = true,
  muted = false,
  children,
}: {
  text: string;
  describe?: boolean;
  muted?: boolean;
  children: (props: HintTriggerProps) => ReactNode;
}) {
  const id = useId();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  // The BOX is clamped to the viewport, not its centre: centring a 20rem hint on
  // a trigger near an edge put half of it off-screen. Measured once it exists,
  // then placed above the trigger, or below when there is no room above.
  useLayoutEffect(() => {
    const tip = tipRef.current;
    if (!rect || !tip) return setPos(null);
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const left = Math.max(EDGE, Math.min(rect.left + rect.width / 2 - w / 2, window.innerWidth - w - EDGE));
    const above = rect.top - GAP - h;
    setPos({ left, top: above >= EDGE ? above : rect.bottom + GAP });
  }, [rect]);

  useEffect(() => {
    if (muted) setRect(null);
  }, [muted]);

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

  const show = (e: { currentTarget: HTMLElement }) => {
    if (!muted) setRect(e.currentTarget.getBoundingClientRect());
  };
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
            ref={tipRef}
            role="tooltip"
            aria-hidden
            data-component="Hint"
            className="pointer-events-none fixed z-50 max-w-[20rem] rounded-md bg-ink px-2 py-1
              text-meta font-normal normal-case tracking-normal text-paper shadow-md"
            // Hidden until placed: the first layout pass only measures it.
            style={pos ? { left: pos.left, top: pos.top } : { left: 0, top: 0, visibility: "hidden" }}
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}
