import type { DragEvent, KeyboardEvent } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { useSettingsAnnounce } from "./SettingsContent";

/** Keyboard reordering for a settings row (UX9), from the Filters pattern.
 *  Drag alone fails keyboard users and is unreliable on touch, so every
 *  reorderable row has two more ways to move:
 *
 *  - `ReorderGrip`: the drag handle is also a button. Focused, ArrowUp and
 *    ArrowDown move the row; Home and End send it to the start or end of its
 *    list. Focus stays on the grip, which moves with the row.
 *  - `MoveButtons`: Move up / Move down, shown with the row's actions.
 *
 *  Both report the new position through the page's announcer. The caller
 *  owns the list and decides what a list is (a group's values never cross
 *  into another group). */
export interface ReorderProps {
  /** The row's name, for the controls' names ("Move Bogotá up"). */
  label: string;
  /** Position within its own list, 0-based, and that list's length. */
  index: number;
  count: number;
  /** Move to `to` (0-based) within the same list. */
  onMove: (to: number) => void;
}

function useMove({ label, index, count, onMove }: ReorderProps) {
  const announce = useSettingsAnnounce();
  return (to: number) => {
    const target = Math.max(0, Math.min(count - 1, to));
    if (target === index) return;
    onMove(target);
    announce(`${label} moved to position ${target + 1} of ${count}`);
  };
}

export function ReorderGrip({
  draggable,
  onDragStart,
  onDragEnd,
  ...props
}: ReorderProps & {
  draggable?: boolean;
  onDragStart?: (e: DragEvent) => void;
  onDragEnd?: (e: DragEvent) => void;
}) {
  const move = useMove(props);
  const onKeyDown = (e: KeyboardEvent) => {
    const to =
      e.key === "ArrowUp" ? props.index - 1
      : e.key === "ArrowDown" ? props.index + 1
      : e.key === "Home" ? 0
      : e.key === "End" ? props.count - 1
      : null;
    if (to === null) return;
    e.preventDefault();
    e.stopPropagation();
    move(to);
  };
  return (
    <button
      type="button"
      data-component="ReorderGrip"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onKeyDown={onKeyDown}
      // Inside a clickable row, the grip is not the row's open action.
      onClick={(e) => e.stopPropagation()}
      aria-label={`Reorder ${props.label}, position ${props.index + 1} of ${props.count}. Arrow keys move it.`}
      className="shrink-0 p-0.5 -m-0.5 rounded-sm cursor-grab active:cursor-grabbing text-ink-muted hover:text-ink-secondary
        focus:outline-none focus-visible:ring-1 focus-visible:ring-carbon/50"
    >
      <GripVertical size={14} aria-hidden />
    </button>
  );
}

export function MoveButtons(props: ReorderProps) {
  const move = useMove(props);
  const btn =
    "p-1.5 rounded-md text-ink-tertiary hover:bg-warm hover:text-ink transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent";
  return (
    <span data-component="MoveButtons" className="inline-flex items-center">
      <button
        type="button"
        className={btn}
        disabled={props.index === 0}
        aria-label={`Move ${props.label} up`}
        onClick={(e) => {
          e.stopPropagation();
          move(props.index - 1);
        }}
      >
        <ChevronUp size={14} aria-hidden />
      </button>
      <button
        type="button"
        className={btn}
        disabled={props.index === props.count - 1}
        aria-label={`Move ${props.label} down`}
        onClick={(e) => {
          e.stopPropagation();
          move(props.index + 1);
        }}
      >
        <ChevronDown size={14} aria-hidden />
      </button>
    </span>
  );
}

/** Move one item of a list to `to`. */
export function moveTo<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
