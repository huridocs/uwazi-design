import { useState, type DragEvent, type Dispatch, type SetStateAction } from "react";

const move = <T,>(arr: T[], from: number, to: number): T[] => {
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

/** Native HTML5 drag-to-reorder for a flat list held in React state. Returns the
 *  index being dragged plus prop spreaders for the row (drop target) and the grip
 *  (drag handle). Live-reorders on drag-enter for a smooth feel. */
export function useReorder<T>(setList: Dispatch<SetStateAction<T[]>>) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const enter = (to: number) => {
    if (dragIdx === null || dragIdx === to) return;
    setList((prev) => move(prev, dragIdx, to));
    setDragIdx(to);
  };
  return {
    dragIdx,
    rowProps: (i: number) => ({
      onDragEnter: () => enter(i),
      onDragOver: (e: DragEvent) => e.preventDefault(),
    }),
    gripProps: (i: number) => ({
      draggable: true,
      onDragStart: () => setDragIdx(i),
      onDragEnd: () => setDragIdx(null),
    }),
  };
}
