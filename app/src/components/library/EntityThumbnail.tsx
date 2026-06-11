import { Image as ImageIcon, Play, AudioLines } from "lucide-react";
import type { PreviewKind } from "../../data/entities";

/** A stylized, calm placeholder preview for a Library card — mock-only (we have
 *  no real assets), keyed by the entity's preview kind. */
export function EntityThumbnail({ kind, className = "" }: { kind: PreviewKind; className?: string }) {
  if (kind === "document") {
    return (
      <div className={`flex items-center justify-center bg-vellum ${className}`}>
        <div className="bg-paper shadow-sm rounded-[2px] w-[38%] h-[78%] p-2 flex flex-col gap-1.5">
          <div className="h-1.5 w-2/3 rounded-full bg-border" />
          <div className="h-1 w-full rounded-full bg-border-soft" />
          <div className="h-1 w-full rounded-full bg-border-soft" />
          <div className="h-1 w-4/5 rounded-full bg-border-soft" />
          <div className="h-1 w-full rounded-full bg-border-soft" />
        </div>
      </div>
    );
  }
  if (kind === "image") {
    return (
      <div className={`flex items-center justify-center bg-carbon-tint ${className}`}>
        <ImageIcon size={24} className="text-carbon/60" />
      </div>
    );
  }
  if (kind === "video") {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ backgroundColor: "var(--text-primary)" }}>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-paper/90">
          <Play size={14} className="text-ink ms-0.5" fill="currentColor" />
        </div>
      </div>
    );
  }
  // audio
  return (
    <div className={`flex items-center justify-center bg-warm ${className}`}>
      <AudioLines size={24} className="text-ink-tertiary" />
    </div>
  );
}
