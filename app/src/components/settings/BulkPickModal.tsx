import { useId, useState, type ReactNode } from "react";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_COMMIT_DISABLED } from "../shared/Modal";
import { ModalList, ModalListRow, ModalSearchRow, ModalStatus } from "../shared/ModalParts";
import { BAR_GHOST } from "../shared/warmButton";

export interface BulkPickOption {
  value: string;
  label: string;
  /** Trailing meta on the row ("4 members"). */
  meta?: ReactNode;
}

/** One choice applied to a selection: Add to group, Change role, Move to
 *  group. A radio list (with a search past eight options), then a readback
 *  line saying what the choice does to the selection before it is applied,
 *  including what it will leave alone and why. The commit names the action.
 *
 *  Always mounted at one height: the readback line is reserved, so choosing
 *  moves nothing. */
export function BulkPickModal({
  title,
  subtitle,
  options,
  confirmLabel,
  readback,
  onConfirm,
  onClose,
  initial = "",
  empty = "Nothing to choose from",
}: {
  title: string;
  subtitle?: ReactNode;
  options: BulkPickOption[];
  confirmLabel: string;
  /** What the chosen value does to the selection; null before a choice. A
   *  choice that changes nothing returns `{ text, none: true }` and the
   *  commit stays off. */
  readback: (value: string) => { text: ReactNode; none?: boolean } | null;
  onConfirm: (value: string) => void;
  onClose: () => void;
  initial?: string;
  empty?: ReactNode;
}) {
  const [value, setValue] = useState(initial);
  const [query, setQuery] = useState("");
  const name = useId();
  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  const said = value ? readback(value) : null;
  const can = !!value && !said?.none;
  return (
    <Modal
      component="BulkPickModal"
      size="sm"
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      height={options.length > 8 ? "md:h-[min(30rem,100%)]" : undefined}
      bodyClassName="flex flex-col min-h-0 py-0"
      footer={
        <>
          <button type="button" onClick={onClose} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
            Cancel
          </button>
          <button
            type="button"
            data-part="submit"
            disabled={!can}
            onClick={() => can && onConfirm(value)}
            className={can ? MODAL_COMMIT : MODAL_COMMIT_DISABLED}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {options.length > 8 && (
        <ModalSearchRow value={query} onChange={setQuery} ariaLabel={`Search ${title.toLowerCase()}`} placeholder="Search…" />
      )}
      <ModalList role="radiogroup" aria-label={title}>
        {shown.length === 0 ? (
          <ModalStatus as="li">{options.length ? "No match" : empty}</ModalStatus>
        ) : (
          shown.map((o) => (
            <ModalListRow
              key={o.value}
              selected={value === o.value}
              title={o.label}
              meta={o.meta}
              control={
                <input
                  type="radio"
                  name={name}
                  checked={value === o.value}
                  onChange={() => setValue(o.value)}
                  className="w-3.5 h-3.5 accent-ink shrink-0 cursor-pointer"
                />
              }
            />
          ))
        )}
      </ModalList>
      <p
        role="status"
        data-part="readback"
        className="bleed shrink-0 min-h-10 flex items-center py-2 border-t border-border-soft text-xs text-ink-secondary text-pretty"
      >
        {said?.text ?? <span className="text-ink-muted">Choose one to see what changes.</span>}
      </p>
    </Modal>
  );
}
