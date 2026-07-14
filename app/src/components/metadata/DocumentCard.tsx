import { useAtomValue } from "jotai";
import { Download } from "lucide-react";
import type { Language } from "../../atoms/language";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { filesAtom, documentGroupsAtom, activePrimaryGroupIdAtom } from "../../atoms/files";
import { resolvePrimaryFile } from "../../data/files";
import type { EntityProfile } from "../../data/entityProfiles";
import { useNotify } from "../../hooks/useNotify";
import { MetadataCard, Property } from "./MetadataCard";
import { PdfPageThumb } from "../shared/PdfPageThumb";
import { ViewButton } from "../shared/ViewButton";

/** The entity's document: its first page, its file facts, and what you can do
 *  with it.
 *
 *  It lives in the RECORD (see MetadataRecord), not in the Metadata view, so the
 *  drawer gets it too — the drawer is the same view at a different width, and a
 *  block that only one of them renders is a fork waiting to happen. It was exactly
 *  that: the main view drew this card inline, so a previewed entity showed its
 *  properties and no sign of the document they came from.
 *
 *  Renders nothing when the entity has no document — which is a question we answer
 *  from the FILE, not from `profile.hasDocument`. Those are two different claims,
 *  and when they disagree it's the file that's real. */
export function DocumentCard({
  profile,
  language,
}: {
  profile: EntityProfile;
  language: Language;
}) {
  const notify = useNotify();
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const files = useAtomValue(filesAtom);
  const groups = useAtomValue(documentGroupsAtom);
  const activeGroupId = useAtomValue(activePrimaryGroupIdAtom);

  // For the entity you're ON, read the live atoms: they carry file edits and the
  // primary document you picked in the Files tab. For any OTHER entity — the one
  // previewed in the library drawer — read its own profile, since the atoms
  // describe the focused entity, not this one.
  const isFocused = profile.id === focusedId;
  const file = isFocused
    ? resolvePrimaryFile(files, groups, activeGroupId, language)
    : resolvePrimaryFile(profile.files ?? [], profile.documentGroups ?? [], null, language);

  // A hand-authored profile carries a richer block (real Added/Last-Edited dates);
  // everything else derives from the file, which is where those facts actually
  // live.
  const authored = profile.pdfMetadata?.[language];
  const doc =
    authored ??
    (file && {
      name: file.name,
      type: file.type.toUpperCase(),
      size: file.size,
      lastEdited: file.modified,
      added: file.modified,
    });

  if (!doc) return null;

  return (
    <MetadataCard title="Document">
      <div className="flex items-start gap-4">
        <PdfPageThumb
          url={file?.url}
          ext={file?.type ?? doc.type}
          size="lg"
          className="hidden sm:block shrink-0 rounded overflow-hidden"
          style={{ width: 88, height: 117, border: "1px solid var(--border-primary)" }}
        />
        <div className="@container flex-1 min-w-0 space-y-2">
          <Property label="Name" value={doc.name} ltr />
          {/* A grid keyed to the CONTAINER, not the viewport. Four facts across a
              narrow drawer left "Last Edited" wrapping onto two lines — and a
              `lg:` breakpoint wouldn't have helped, because the viewport is wide
              while the pane is not. It's the pane that has to decide. */}
          <div className="grid grid-cols-2 @sm:grid-cols-4 gap-x-6 gap-y-2">
            <Property label="Type" value={doc.type} />
            <Property label="Size" value={doc.size} ltr />
            <Property label="Last Edited" value={doc.lastEdited} ltr />
            <Property label="Added" value={doc.added} ltr />
          </div>
        </div>
      </div>

      {/* The actions belong to the CARD, not to the facts column — inside it they
          sat indented by the width of the thumbnail, floating in the middle of a
          narrow drawer instead of starting where every other line of the card
          does. */}
      <div className="flex items-center gap-2 pt-1">
        <ViewButton size="md" />
        <button
          onClick={() => notify("Download started", "success")}
          className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Download size={12} className="text-ink-tertiary" /> Download
        </button>
      </div>
    </MetadataCard>
  );
}
