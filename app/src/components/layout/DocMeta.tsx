import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileText, FileType, Code2 } from "lucide-react";
import { useAtom, useAtomValue } from "jotai";
import { languageAtom } from "../../atoms/language";
import {
  documentGroupsAtom,
  activePrimaryGroupIdAtom,
} from "../../atoms/files";
import { documentFormatAtom, type DocumentFormat } from "../../atoms/selection";
import { documentsByLanguage } from "../../data/document";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { getEntity } from "../../data/entities";
import { MAIN_ENTITY_ID } from "../../data/entityProfiles";
import { EntityPill } from "../shared/EntityPill";

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

/** Doc tab header strip. Renders the entity pill, the title of the default
 *  primary document, and — on the Document tab — a picker that switches
 *  between the document's renditions (PDF, plain text, HTML). */
export function DocMeta({ showPdfSelector = true }: DocMetaProps) {
  const language = useAtomValue(languageAtom);
  const groups = useAtomValue(documentGroupsAtom);
  const activeGroupId = useAtomValue(activePrimaryGroupIdAtom);
  const [format, setFormat] = useAtom(documentFormatAtom);
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const isMain = focusedId === MAIN_ENTITY_ID;

  const docEntity = documentsByLanguage[language];
  const focalEntity = getEntity(focusedId);
  const primaryGroups = groups
    .filter((g) => g.isPrimary)
    .sort((a, b) => a.order - b.order);
  // The Document tab shows the default primary document — the active one if a
  // selection floated it up, else the first by order. For the main entity this
  // is the Velásquez document; other focal entities show their own identity.
  const defaultGroup =
    primaryGroups.find((g) => g.id === activeGroupId) ?? primaryGroups[0];
  const title = isMain ? defaultGroup?.title ?? docEntity.title : focalEntity?.title ?? docEntity.title;
  const typeId = isMain ? docEntity.entityTypeId : focalEntity?.typeId ?? docEntity.entityTypeId;

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
      className="flex items-center gap-2 h-10 px-3 shrink-0"
      style={{ borderBottom: "1px solid var(--border-primary)" }}
    >
      <EntityPill typeId={typeId} />

      <span className="text-xs font-semibold text-ink truncate flex-1">
        {title}
      </span>

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
              className="absolute right-0 top-full mt-1 z-30 min-w-40 rounded-md bg-paper shadow-xl py-1 animate-fade-in-up"
              style={{ border: "1px solid var(--border-primary)" }}
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
