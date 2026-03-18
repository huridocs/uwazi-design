import { HelpCircle, Pencil, Share2, Trash2 } from "lucide-react";

interface DrawerActionBarProps {
  activeTab: string;
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
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors">
              <Pencil size={12} /> Edit
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors">
              <Share2 size={12} /> Share
            </button>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-seal rounded-md border border-seal/30 hover:bg-seal-tint transition-colors">
            <Trash2 size={12} /> Delete
          </button>
        </>
      )}

      {activeTab === "references" && (
        <>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-ink-muted">To add references check this</span>
            <span className="text-[11px] font-medium text-carbon cursor-pointer hover:underline">
              guide here.
            </span>
          </div>
          <HelpCircle size={18} className="text-carbon" aria-label="Help" />
        </>
      )}

      {activeTab === "toc" && (
        <>
          <button className="px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors">
            Edit
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors">
            Mark as reviewed
          </button>
        </>
      )}

      {activeTab === "relationships" && (
        <>
          <button className="px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors">
            Add relationship
          </button>
          <div />
        </>
      )}

      {activeTab === "search" && (
        <>
          <span className="text-[11px] text-ink-muted">Search tips</span>
          <HelpCircle size={18} className="text-carbon" aria-label="Search tips" />
        </>
      )}
    </div>
  );
}
