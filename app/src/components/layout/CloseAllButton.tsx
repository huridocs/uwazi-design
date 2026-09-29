import { X } from "lucide-react";
import { BAR_GHOST } from "../shared/warmButton";

/** The phone sheet stack's "close everything" control, on every layer above
 *  the first. Labelled, so it can't be mistaken for closing one layer (Back
 *  does that, beside it). Only a stacked layer shows it, so it appears only
 *  while two or more layers are open. */
export function CloseAllButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-part="close-all"
      data-gutter-align="box"
      className={`relative after:absolute after:-inset-y-2 after:-inset-x-1 after:content-[''] shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md ${BAR_GHOST} transition-colors cursor-pointer`}
    >
      <X size={14} aria-hidden />
      Close all
    </button>
  );
}
