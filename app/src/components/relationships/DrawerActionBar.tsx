import { HelpCircle, Pencil, Share2, Trash2 } from "lucide-react";

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
}: {
  icon?: typeof Pencil;
  label: string;
  variant?: "default" | "danger";
}) {
  const tone =
    variant === "danger"
      ? "text-seal bg-seal-tint/40 hover:bg-seal-tint"
      : "text-ink-secondary bg-warm hover:bg-parchment hover:text-ink";
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer ${tone}`}
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
  return (
    <div
      className="flex items-center justify-between h-12 px-3 bg-paper shrink-0"
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      {activeTab === "metadata" && (
        <>
          <div className="flex items-center gap-2">
            <ActionPill icon={Pencil} label="Edit" />
            <ActionPill icon={Share2} label="Share" />
          </div>
          <ActionPill icon={Trash2} label="Delete" variant="danger" />
        </>
      )}

      {activeTab === "references" && (
        <>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-ink-tertiary">To add references check this</span>
            <span className="text-[11px] font-medium text-carbon cursor-pointer hover:underline">
              guide here.
            </span>
          </div>
          <HelpCircle size={18} className="text-carbon" aria-label="Help" />
        </>
      )}

      {activeTab === "toc" && (
        <>
          <ActionPill label="Edit" />
          <ActionPill label="Mark as reviewed" />
        </>
      )}

      {activeTab === "relationships" && (
        <>
          <ActionPill label="Add relationship" />
          <div />
        </>
      )}

      {activeTab === "search" && (
        <>
          <span className="text-[11px] text-ink-tertiary">Search tips</span>
          <HelpCircle size={18} className="text-carbon" aria-label="Search tips" />
        </>
      )}
    </div>
  );
}
