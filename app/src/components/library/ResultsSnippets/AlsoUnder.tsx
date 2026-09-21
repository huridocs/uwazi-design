import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Entity } from "../../../data/entities";
import { getEntityType } from "../../../data/entities";
import { useFocusTrap } from "../../../hooks/useFocusTrap";
import { ProvenanceLine } from "../../shared/ProvenanceLine";
import { Hint } from "../../shared/Hint";

const POPOVER_W = 288; // 18rem
const EDGE = 8;
const GAP = 4;

/** `↳ also under N entities` — the results folded into one passage row, and the
 *  way to them.
 *
 *  The names used to sit in a `title` attribute: invisible to a keyboard, late on
 *  hover, and not clickable. The trigger now opens a portalled list (type dot +
 *  title), each entry opening that entity. The list traps focus while open and
 *  gives it back to the trigger on close (`useFocusTrap`); Escape and a click
 *  outside close it. Portalled for the same reason as `Hint`: the row scrolls
 *  inside an `overflow-auto` pane. */
export function AlsoUnder({
  entities,
  onOpenEntity,
}: {
  entities: Entity[];
  onOpenEntity: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const panel = useFocusTrap<HTMLDivElement>(open);
  const n = entities.length;
  const label = `${n.toLocaleString()} ${n === 1 ? "entity" : "entities"}`;

  useLayoutEffect(() => {
    if (!open || !trigger.current) return setPos(null);
    const r = trigger.current.getBoundingClientRect();
    const w = Math.min(POPOVER_W, window.innerWidth - EDGE * 2);
    const left = Math.max(EDGE, Math.min(r.left, window.innerWidth - w - EDGE));
    // Flip above when the lower part of the viewport can't hold the list.
    setPos(
      window.innerHeight - r.bottom < 220
        ? { left, bottom: window.innerHeight - r.top + GAP }
        : { left, top: r.bottom + GAP },
    );
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !trigger.current?.contains(t)) setOpen(false);
    };
    // The list is placed once from the trigger's rect; any scroll would leave it
    // floating over the wrong row, so a scroll outside it closes it.
    const onScroll = (e: Event) => {
      if (!panel.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open, panel]);

  return (
    <ProvenanceLine inline label="also under" className="shrink-0">
      <Hint text={`Show the ${label} with this passage`}>
        {(hint) => (
          <button
            {...hint}
            ref={trigger}
            type="button"
            data-part="also"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
            className="tabular-nums rounded-sm hover:underline cursor-pointer
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/40"
          >
            {label}
          </button>
        )}
      </Hint>
      {open &&
        createPortal(
          <div
            ref={panel}
            role="dialog"
            aria-label={`Also under ${label}`}
            tabIndex={-1}
            data-component="AlsoUnder"
            data-part="popover"
            className="fixed z-50 max-h-[18rem] overflow-auto rounded-md border border-border bg-paper
              p-1 shadow-lg focus:outline-none"
            style={{
              left: pos?.left ?? -9999,
              top: pos?.top,
              bottom: pos?.bottom,
              width: Math.min(POPOVER_W, window.innerWidth - EDGE * 2),
            }}
          >
            <ul className="flex flex-col">
              {entities.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    aria-label={`Open ${e.title}`}
                    onClick={() => {
                      setOpen(false);
                      onOpenEntity(e.id);
                    }}
                    className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-start text-xs
                      text-ink hover:bg-parchment cursor-pointer focus-visible:outline-none
                      focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20"
                  >
                    <span
                      aria-hidden
                      className="w-1.5 h-1.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: getEntityType(e.typeId)?.color ?? "#6B7280" }}
                    />
                    <span className="truncate">{e.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </ProvenanceLine>
  );
}
