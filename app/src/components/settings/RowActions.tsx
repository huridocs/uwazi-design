import { Pencil, Trash2 } from "lucide-react";

/** Edit + delete icon buttons for a table row — the recurring action pair
 *  across the settings list views. */
export function RowActions({
  label,
  onEdit,
  onDelete,
}: {
  label: string;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <button
        onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
        aria-label={`Edit ${label}`}
        className="p-1.5 rounded-md text-ink-tertiary hover:bg-warm hover:text-ink transition-colors cursor-pointer"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
        aria-label={`Delete ${label}`}
        className="p-1.5 rounded-md text-ink-tertiary hover:bg-seal-tint hover:text-seal transition-colors cursor-pointer"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
