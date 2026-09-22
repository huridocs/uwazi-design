import { useState } from "react";
import { HelpCircle, Pencil, Share2, Trash2 } from "lucide-react";
import { useNotify } from "../../hooks/useNotify";
import { ShareEntityModal } from "../share/ShareEntityModal";
import { SearchTipsPopover } from "../library/SearchTipsPopover";
import { docSearchQueryAtom } from "../../atoms/references";
import { useSetAtom } from "jotai";
import { BAR_DANGER, BAR_GHOST, WARM_BUTTON } from "../shared/warmButton";

interface DrawerActionBarProps {
  activeTab: string;
}

/** The drawer action bar's button, on the bar ladder (`warmButton.ts`):
 *  `lead` is the one filled button, `default` a ghost, `danger` seal text. */
function ActionPill({
  icon: Icon,
  label,
  variant = "default",
  onClick,
}: {
  icon?: typeof Pencil;
  label: string;
  variant?: "lead" | "default" | "danger";
  onClick?: () => void;
}) {
  const tone = variant === "danger" ? BAR_DANGER : variant === "lead" ? WARM_BUTTON : BAR_GHOST;
  return (
    <button
      type="button"
      onClick={onClick}
      data-part="action"
      data-gutter-align="box"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${tone}`}
    >
      {Icon && (
        <Icon
          size={12}
          aria-hidden
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
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div
      data-component="DrawerActionBar"
      data-tab={activeTab}
      // `bleed`: the rule spans the panel, the pills sit on the host's gutter.
      className="bleed flex items-center justify-between h-12 bg-paper shrink-0"
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      <ShareEntityModal open={shareOpen} onClose={() => setShareOpen(false)} />
      {activeTab === "metadata" && (
        <>
          <div className="flex items-center gap-2">
            <ActionPill icon={Pencil} label="Edit" variant="lead" onClick={() => notify("Editing metadata")} />
            <ActionPill icon={Share2} label="Share" onClick={() => setShareOpen(true)} />
          </div>
          <ActionPill icon={Trash2} label="Delete" variant="danger" onClick={() => notify("Entity deleted", "success")} />
        </>
      )}

      {activeTab === "references" && (
        <>
          <div className="flex items-center gap-1">
            <span className="text-meta text-ink-tertiary">To add references check this</span>
            <button
              type="button"
              onClick={() => notify("Opening references guide")}
              className="text-meta font-medium text-carbon cursor-pointer hover:underline"
            >
              guide here.
            </button>
          </div>
          <button type="button" onClick={() => notify("Opening references guide")} aria-label="Help">
            <HelpCircle size={18} aria-hidden className="text-carbon" />
          </button>
        </>
      )}

      {activeTab === "toc" && (
        <>
          <ActionPill label="Edit" variant="lead" onClick={() => notify("Editing table of contents")} />
          <ActionPill label="Mark as reviewed" onClick={() => notify("Marked as reviewed", "success")} />
        </>
      )}

      {activeTab === "relationships" && (
        <>
          <ActionPill label="Add relationship" variant="lead" onClick={() => notify("Relationship added", "success")} />
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
