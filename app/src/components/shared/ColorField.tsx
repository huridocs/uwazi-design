import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { MODAL_INPUT, MODAL_LABEL } from "./ModalParts";

const HEX = /^#[0-9a-fA-F]{6}$/;
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** A colour value as a control: a swatch with its hex, opening a panel with
 *  suggested swatches, the system colour picker and a hex field.
 *
 *  - `options` are the swatches. `suggested` is marked among them (a ring and
 *    "suggested" in its name): the value the caller would choose.
 *  - A swatch or the system picker commits at once. The hex field commits
 *    when it holds six digits; anything else is shown as invalid and changes
 *    nothing.
 *  - The panel is a dialog: focus moves in and is trapped, Escape and a press
 *    outside close it, and focus returns to the swatch. It is portaled and
 *    fixed, so a scrolling pane does not clip it, and it follows the swatch
 *    when the pane scrolls.
 *
 *  `label` names the colour for assistive tech; the visible label is the
 *  caller's (a row title, a field label). */
export function ColorField({
  label,
  value,
  options = [],
  suggested,
  onChange,
  disabled = false,
}: {
  label: string;
  /** `#RRGGBB`. */
  value: string;
  options?: string[];
  suggested?: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value.slice(1));
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const panel = useFocusTrap<HTMLDivElement>(open);
  const hexId = useId();
  const nativeId = useId();

  useEffect(() => setHex(value.slice(1)), [value]);

  // Below the swatch, or above when there is no room; inside the viewport.
  const position = useCallback(() => {
    const t = trigger.current?.getBoundingClientRect();
    const p = panel.current?.getBoundingClientRect();
    if (!t || !p) return;
    const gap = 4;
    const below = t.bottom + gap + p.height <= window.innerHeight - 8;
    const rtl = getComputedStyle(trigger.current!).direction === "rtl";
    const left = rtl ? t.right - p.width : t.left;
    setPlace({
      top: below ? t.bottom + gap : Math.max(8, t.top - gap - p.height),
      left: Math.min(Math.max(8, left), window.innerWidth - p.width - 8),
    });
  }, [panel]);

  useLayoutEffect(() => {
    if (open) position();
    else setPlace(null);
  }, [open, options.length, position]);

  useEffect(() => {
    if (!open) return;
    const inside = (target: EventTarget | null) =>
      target instanceof Node && (panel.current?.contains(target) || trigger.current?.contains(target));
    const press = (e: MouseEvent) => !inside(e.target) && setOpen(false);
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Handled here, so a dialog or the page beneath does not also close.
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    };
    // The panel follows its swatch when the pane scrolls or the window resizes.
    const follow = (e: Event) => !(e.target instanceof Node && panel.current?.contains(e.target)) && position();
    document.addEventListener("mousedown", press);
    document.addEventListener("keydown", key, true);
    window.addEventListener("scroll", follow, true);
    window.addEventListener("resize", follow);
    return () => {
      document.removeEventListener("mousedown", press);
      document.removeEventListener("keydown", key, true);
      window.removeEventListener("scroll", follow, true);
      window.removeEventListener("resize", follow);
    };
  }, [open, panel, position]);

  const invalid = hex !== "" && !HEX.test(`#${hex}`);
  const shown = value.toUpperCase();

  return (
    <>
      <button
        ref={trigger}
        type="button"
        data-component="ColorField"
        aria-label={`${label}: ${shown}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 h-8 px-2 rounded-md border border-border bg-paper transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30 ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-warm"
        }`}
      >
        <span data-part="swatch" aria-hidden className="size-5 rounded-md border border-ink/20" style={{ backgroundColor: value }} />
        <span data-part="hex" dir="ltr" className="text-xs font-mono text-ink-secondary tabular-nums">
          {shown}
        </span>
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            role="dialog"
            aria-label={label}
            data-component="ColorFieldPanel"
            style={{ position: "fixed", top: place?.top ?? 0, left: place?.left ?? 0, visibility: place ? "visible" : "hidden" }}
            className="z-[70] w-60 p-2 bg-paper border border-border rounded-lg shadow-lg flex flex-col gap-2"
          >
            {options.length > 0 && (
              <ul data-part="swatches" aria-label="Suggested colors" className="grid grid-cols-7 max-md:grid-cols-5 gap-1.5 max-md:gap-2 max-h-40 max-md:max-h-48 overflow-y-auto p-1">
                {options.map((c) => {
                  const current = same(c, value);
                  const isSuggested = suggested !== undefined && same(c, suggested);
                  return (
                    <li key={c} className="flex">
                      <button
                        type="button"
                        aria-label={`${c.toUpperCase()}${isSuggested ? ", suggested" : ""}`}
                        title={isSuggested ? `${c.toUpperCase()} (suggested)` : c.toUpperCase()}
                        aria-pressed={current}
                        onClick={() => onChange(c.toUpperCase())}
                        className={`size-6 max-md:size-9 rounded-md border border-ink/20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-paper focus-visible:ring-carbon ${
                          current
                            ? "ring-2 ring-offset-1 ring-offset-paper ring-ink"
                            : isSuggested
                              ? "ring-1 ring-offset-1 ring-offset-paper ring-ink-tertiary"
                              : ""
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex items-center gap-2">
              <label htmlFor={nativeId} className={`${MODAL_LABEL} flex-1`}>
                Pick a color
              </label>
              <input
                id={nativeId}
                type="color"
                value={HEX.test(value) ? value : "#000000"}
                onChange={(e) => onChange(e.target.value.toUpperCase())}
                className="h-7 w-10 p-0 rounded-md border border-border bg-paper cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={hexId} className={MODAL_LABEL}>
                Manually set a color
              </label>
              <div className="relative">
                <span aria-hidden className="absolute inset-y-0 start-2.5 flex items-center text-sm font-mono text-ink-tertiary">
                  #
                </span>
                <input
                  id={hexId}
                  type="text"
                  dir="ltr"
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={6}
                  value={hex}
                  aria-invalid={invalid || undefined}
                  onChange={(e) => {
                    const v = e.target.value.replace(/^#/, "").trim();
                    setHex(v);
                    if (HEX.test(`#${v}`)) onChange(`#${v.toUpperCase()}`);
                  }}
                  className={`${MODAL_INPUT} w-full ps-6 font-mono uppercase ${invalid ? "border-seal/60" : ""}`}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
