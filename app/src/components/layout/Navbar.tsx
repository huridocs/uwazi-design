import { BookOpen, Settings } from "lucide-react";

export function Navbar() {
  return (
    <header
      className="h-[52px] bg-paper flex items-center justify-between px-5 shrink-0"
      style={{ borderBottom: "1px solid var(--border-primary)" }}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-4">
        <img src="/nu-logo.svg" alt="Uwazi" style={{ height: 14.7 }} />
      </div>

      {/* Right: Library + Settings */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium text-ink-secondary rounded-md bg-warm border border-border-soft/60 hover:bg-parchment transition-colors">
          <BookOpen size={14} /> Library
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1 text-[13px] font-medium text-ink-secondary rounded-md bg-warm border border-border-soft/60 hover:bg-parchment transition-colors">
          <Settings size={14} /> Settings
        </button>
      </div>
    </header>
  );
}
