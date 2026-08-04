import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileText, FileType, Code2 } from "lucide-react";
import { useAtom, useAtomValue } from "jotai";
import {
  documentGroupsAtom,
  activePrimaryGroupIdAtom,
} from "../../atoms/files";
import { documentFormatAtom, type DocumentFormat } from "../../atoms/selection";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { getEntity } from "../../data/entities";
import { EntityIdentity } from "../shared/EntityIdentity";

interface DocMetaProps {
  /** Show the format picker (PDF / Plain text / HTML). Only the Document tab
   *  wants it; the metadata/files headers pass false. */
  showPdfSelector?: boolean;
}

const FORMATS: { id: DocumentFormat; label: string; icon: typeof FileText }[] = [
  { id: "pdf", label: "PDF", icon: FileText },
  { id: "text", label: "Plain text", icon: FileType },
  { id: "html", label: "HTML", icon: Code2 },
];

/** Entity header strip. Names the ENTITY (type tag + its own title) and — on the
 *  Document tab — the document on screen plus a picker that switches between
 *  that document's renditions (PDF, plain text, HTML). */
export function DocMeta({ showPdfSelector = true }: DocMetaProps) {
  const groups = useAtomValue(documentGroupsAtom);
  const activeGroupId = useAtomValue(activePrimaryGroupIdAtom);
  const [format, setFormat] = useAtom(documentFormatAtom);
  const focusedId = useAtomValue(focusedEntityIdAtom);

  // The header identifies the ENTITY whose page this is — for every entity,
  // main or focal. It used to name the DOCUMENT instead, by two separate
  // routes, and both printed something that isn't this entity's name:
  //   - main: the default group's title, i.e. the document. Entity `e3` is
  //     "Case 11.137 (La Tablada)" and its primary group is
  //     "Velásquez-Rodríguez v. Honduras — Judgment (1988)"; the header showed
  //     the latter.
  //   - focal: the entity's own title, but falling back to `documentsByLanguage`
  //     — the MOCK document — whenever the entity didn't resolve. A CEJIL
  //     entity read before its corpus lands would be captioned with the
  //     Velásquez judgment's name.
  // Only the first one fired in practice — a CEJIL entity is never `isMain`,
  // since `focusEntity` moves the focused id and the groups together — but the
  // group title is at its most obviously not-the-entity there: a Causa with no
  // PDF of its own BORROWS a connected Sentencia's (`docFilesFor`), so its
  // group is titled after a different entity ("Kimel" → "Kimel. Sentencia de 2
  // de mayo de 2008"). That title is right for a GROUP — see `buildCejilProfile`'s
  // `docTitle`, which names the document, which is what a group title is for.
  // It just must never be read back as the entity's name.
  //
  // `getEntity` covers main and focal alike (seed entities and the CEJIL
  // corpus), so the split disappears. Unresolved falls through to
  // `EntityIdentity`'s own "Unknown entity" rather than borrowing a document's
  // name — an honest blank beats a confident wrong one.
  const entity = getEntity(focusedId);
  const primaryGroups = groups
    .filter((g) => g.isPrimary)
    .sort((a, b) => a.order - b.order);
  // The document on screen: the active primary if a selection floated one up,
  // else the first by order — the same resolution `DocumentViewer` uses, so
  // this names what is actually rendered.
  const defaultGroup =
    primaryGroups.find((g) => g.id === activeGroupId) ?? primaryGroups[0];
  // Nothing else on the Document tab names the document — the viewer draws the
  // file and the picker only switches RENDITION (PDF / text / HTML). With more
  // than one primary document that title is the only way to tell which one you
  // are looking at, so it stays in the strip; it just stops impersonating the
  // entity. Suppressed when it merely repeats the heading (an entity that owns
  // its document titles the group after itself).
  const docName =
    defaultGroup?.title && defaultGroup.title !== entity?.title ? defaultGroup.title : null;

  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [pickerOpen]);

  const activeFormat = FORMATS.find((f) => f.id === format) ?? FORMATS[0];
  const ActiveIcon = activeFormat.icon;

  return (
    <div
      className="flex items-center gap-2 min-h-11 pt-1 pb-2 px-3 shrink-0"
      style={{ borderBottom: "1px solid var(--border-primary)" }}
    >
      {/* Stacked, like the drawer: tag over title. Side by side, a long template
          name ("Resolución de Presidencia de la CorteIDH") ran halfway across the
          strip and squeezed the entity's own name — squeezing the wrong thing. */}
      <EntityIdentity entity={entity} />

      {showPdfSelector && docName && (
        // Quiet, and only on the tab that actually shows a document. Hidden on
        // a phone, where the strip has room for the entity and the picker and
        // nothing else; the Files tab names the document there.
        <span
          title={docName}
          className="hidden md:block shrink max-w-[18rem] truncate text-[11px] text-ink-tertiary"
        >
          {docName}
        </span>
      )}

      {showPdfSelector && (
        <div ref={pickerRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={pickerOpen}
            aria-label="Document format"
            className="flex items-center gap-1.5 pl-2 pr-2 py-1 text-xs font-medium text-ink-secondary rounded-md bg-warm hover:bg-parchment transition-colors cursor-pointer"
          >
            <ActiveIcon size={12} className="text-ink-tertiary" />
            {activeFormat.label}
            <ChevronDown
              size={12}
              className={`text-ink-tertiary transition-transform ${pickerOpen ? "rotate-180" : ""}`}
            />
          </button>
          {pickerOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 z-30 min-w-40 rounded-md bg-paper border border-border shadow-xl py-1 animate-fade-in-up"
            >
              {FORMATS.map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setFormat(f.id);
                      setPickerOpen(false);
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                      f.id === format
                        ? "bg-vellum text-ink font-semibold"
                        : "text-ink-secondary hover:bg-warm"
                    }`}
                  >
                    <Icon size={12} className="text-ink-tertiary shrink-0" />
                    <span className="truncate">{f.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
