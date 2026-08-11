import { X } from "lucide-react";

/** The mark on a metadata field that is armed for click-to-fill.
 *
 *  It rides the field's own LABEL ROW — a row that is already mounted, at a
 *  height the 14px bold label sets and this 10px chip cannot exceed. Nothing
 *  below it moves when a field arms or disarms, which is the whole reason it
 *  isn't a banner over the form.
 *
 *  It says what to do, not what state we're in: "listening" is the state, and a
 *  user reading it still has to guess that a selection somewhere else is what
 *  this field wants. The dot carries the state; the words carry the instruction.
 *
 *  No new colour. The dot is carbon — the accent already used for focus, and for
 *  everything else in the app that means "the system is attending to this" — and
 *  the chip sits on `bg-warm`, the same quiet well every other inline chip uses.
 *  bg-parchment stays what it has always been: selection. */
export function ListeningChip({ label, onStop }: { label: string; onStop: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 h-4 ps-1.5 pe-0.5 rounded-md bg-warm">
      <span className="w-1.5 h-1.5 rounded-full bg-carbon shrink-0" aria-hidden />
      {/* `aria-live`: arming happens on FOCUS, so a keyboard user who tabbed
          into the field never sees the chip appear — it has to be spoken. */}
      <span className="text-[10px] leading-none text-ink-tertiary" aria-live="polite">
        select text or a value
      </span>
      <button
        type="button"
        onClick={onStop}
        title={`Stop filling ${label} — Escape does the same`}
        aria-label={`Stop filling ${label}`}
        className="flex items-center justify-center w-4 h-4 rounded text-ink-muted
          hover:text-ink hover:bg-parchment transition-colors cursor-pointer
          focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
      >
        <X size={10} />
      </button>
    </span>
  );
}
