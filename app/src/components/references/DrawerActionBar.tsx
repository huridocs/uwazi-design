import { HelpCircle } from "lucide-react";

export function DrawerActionBar() {
  return (
    <div
      className="flex items-center justify-between h-12 px-4 bg-paper shrink-0"
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-ink-muted">To add references check this</span>
        <span className="text-[11px] font-medium text-carbon cursor-pointer hover:underline">
          guide here.
        </span>
      </div>
      <HelpCircle size={18} className="text-carbon" />
    </div>
  );
}
