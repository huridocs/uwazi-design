import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";

/** One icon button in a row's action cluster. `danger` takes the seal hover;
 *  everything else the warm one. Stops the click reaching the row target. */
export function RowActionButton({
  label,
  icon,
  onClick,
  tone = "default",
  part,
}: {
  /** The accessible name, naming its object ("Reset Spanish"). */
  label: string;
  icon: ReactNode;
  onClick: () => void;
  tone?: "default" | "danger";
  part?: string;
}) {
  return (
    <button
      type="button"
      data-part={part}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className={`p-1.5 rounded-md text-ink-tertiary transition-colors cursor-pointer ${
        tone === "danger" ? "hover:bg-seal-tint hover:text-seal-label" : "hover:bg-warm hover:text-ink"
      }`}
    >
      {icon}
    </button>
  );
}

/** The action cluster at the end of a settings row.
 *
 *  - Shown on hover and on keyboard focus inside the row (`group-focus-within`);
 *    always shown on phones and on devices without hover. Opacity only, so
 *    revealing it moves nothing.
 *  - A row with a row target (it opens the editor) passes no `onEdit`: the
 *    row is the edit. `onEdit` is for rows that have no target.
 *  - Further actions (reset, set default) go in `children`, before delete. */
export function RowActions({
  label,
  onEdit,
  onDelete,
  deleteLabel = "Delete",
  children,
}: {
  /** The row's object, used in each button's name ("Delete Court case"). */
  label: string;
  onEdit?: () => void;
  onDelete?: () => void;
  /** The verb on the delete button's name ("Revoke", "Uninstall"). */
  deleteLabel?: string;
  children?: ReactNode;
}) {
  return (
    <div
      data-component="RowActions"
      className="flex items-center justify-end gap-1 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
    >
      {onEdit && (
        <RowActionButton part="edit" label={`Edit ${label}`} icon={<Pencil size={14} aria-hidden />} onClick={onEdit} />
      )}
      {children}
      {onDelete && (
        <RowActionButton
          part="delete"
          tone="danger"
          label={`${deleteLabel} ${label}`}
          icon={<Trash2 size={14} aria-hidden />}
          onClick={onDelete}
        />
      )}
    </div>
  );
}
