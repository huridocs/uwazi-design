import { GripVertical } from "lucide-react";
import type { HTMLAttributes } from "react";

/** The shared drag handle for reorderable settings rows. Spread the `gripProps`
 *  from useReorder onto it. */
export function DragGrip(props: HTMLAttributes<HTMLSpanElement> & { draggable?: boolean }) {
  return (
    <span
      {...props}
      aria-label="Drag to reorder"
      className="shrink-0 cursor-grab active:cursor-grabbing"
    >
      <GripVertical size={14} className="text-ink-muted" />
    </span>
  );
}
