import { HelpCircle, Pencil, Share2, Trash2 } from "lucide-react";
import { useNotify } from "../../hooks/useNotify";
import { SearchTipsPopover } from "../library/SearchTipsPopover";
import { docSearchQueryAtom } from "../../atoms/references";
import { useSetAtom } from "jotai";

interface DrawerActionBarProps {
  activeTab: string;
}

/** Soft pill button used across the drawer action bar. No visible border;
 *  bg-warm sits on the bar, parchment on hover. Matches ViewButton so the
 *  whole drawer reads with one button vocabulary. */
function ActionPill({
  icon: Icon,
  label,
  variant = "default",
  onClick,
}: {
  icon?: typeof Pencil;
  label: string;
  variant?: "default" | "danger";
  onClick?: () => void;
}) {
  const tone =
    variant === "danger"
      ? "text-seal bg-seal-tint/40 hover:bg-seal-tint"
      : "text-ink-secondary bg-warm hover:bg-parchment hover:text-ink";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${tone}`}
    >
      {Icon && (
        <Icon
          size={12}
          className={variant === "danger" ? "" : "text-ink-tertiary"}
        />
      )}
      {label}
    </button>
  );
}

export function DrawerActionBar({ activeTab }: DrawerActionBarProps) {
  const setDocSearchQuery = useSetAtom(docSearchQueryAtom);
  const notify = useNotify();
  return (
    <div
      className="flex items-center justify-between h-12 px-3 bg-paper shrink-0"
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      {activeTab === "metadata" && (
        <>
          <div className="flex items-center gap-2">
            <ActionPill icon={Pencil} label="Edit" onClick={() => notify("Editing metadata")} />
            <ActionPill icon={Share2} label="Share" onClick={() => notify("Share link copied", "success")} />
          </div>
          <ActionPill icon={Trash2} label="Delete" variant="danger" onClick={() => notify("Entity deleted", "success")} />
        </>
      )}

      {activeTab === "references" && (
        <>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-ink-tertiary">To add references check this</span>
            <button
              type="button"
              onClick={() => notify("Opening references guide")}
              className="text-[11px] font-medium text-carbon cursor-pointer hover:underline"
            >
              guide here.
            </button>
          </div>
          <button type="button" onClick={() => notify("Opening references guide")} aria-label="Help">
            <HelpCircle size={18} className="text-carbon" />
          </button>
        </>
      )}

      {activeTab === "toc" && (
        <>
          <ActionPill label="Edit" onClick={() => notify("Editing table of contents")} />
          <ActionPill label="Mark as reviewed" onClick={() => notify("Marked as reviewed", "success")} />
        </>
      )}

      {activeTab === "relationships" && (
        <>
          <ActionPill label="Add relationship" onClick={() => notify("Relationship added", "success")} />
          <div />
        </>
      )}

      {activeTab === "search" && (
        <>
          <div />
          {/* The real tips popover — clicking an example drops it into THIS
              tab's query, not the Library's. */}
          <SearchTipsPopover onInsert={setDocSearchQuery} />
        </>
      )}
    </div>
  );
}
