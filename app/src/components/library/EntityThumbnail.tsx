import { Image as ImageIcon, Play, AudioLines } from "lucide-react";
import type { PreviewKind } from "../../data/entities";
import { getEntityProfile } from "../../data/entityProfiles";
import { DocPlaceholder } from "../shared/DocPlaceholder";

/** A Library card's preview — a mock, and honest about it: we don't rasterise
 *  pages.
 *
 *  For a document it's a sheet cropped by the frame (see DocPlaceholder) carrying
 *  the file's extension — the one real fact a preview can offer without rendering
 *  the document. image/video/audio keep their glyphs; there are no assets there
 *  either. */
export function EntityThumbnail({
  kind,
  entityId,
  size = "md",
  className = "",
}: {
  kind: PreviewKind;
  /** Only used to read the file's extension off the entity's profile. */
  entityId?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  if (kind === "document") {
    return (
      <div className={className}>
        <DocPlaceholder ext={entityId ? fileExt(entityId) : undefined} size={size} />
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
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ backgroundColor: "var(--text-primary)" }}
      >
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

/** The entity's primary file type ("pdf"). Profiles are cached, so calling this
 *  per card is cheap. */
function fileExt(entityId: string): string | undefined {
  const profile = getEntityProfile(entityId);
  if (!profile.hasDocument) return undefined;
  const primary = (profile.documentGroups ?? []).filter((g) => g.isPrimary)[0];
  const files = profile.files ?? [];
  const inGroup = primary ? files.filter((f) => f.groupId === primary.id) : files;
  return (inGroup[0] ?? files[0])?.type;
}
