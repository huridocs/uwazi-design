import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import { useAtom, useAtomValue } from "jotai";
import { languageAtom } from "../../atoms/language";
import {
  documentGroupsAtom,
  activePrimaryGroupIdAtom,
} from "../../atoms/files";
import { documentsByLanguage } from "../../data/document";
import { EntityPill } from "../shared/EntityPill";

interface DocMetaProps {
  showPdfSelector?: boolean;
}

/** Doc tab header strip. Renders the entity pill, the title of the active
 *  primary `DocumentGroup`, and — when there's more than one primary —
 *  a small picker to switch between them. */
export function DocMeta({ showPdfSelector = true }: DocMetaProps) {
  const language = useAtomValue(languageAtom);
  const groups = useAtomValue(documentGroupsAtom);
  const [activeGroupId, setActiveGroupId] = useAtom(activePrimaryGroupIdAtom);

  const entity = documentsByLanguage[language];
  const primaryGroups = groups
    .filter((g) => g.isPrimary)
    .sort((a, b) => a.order - b.order);
  const resolvedActiveId = activeGroupId ?? primaryGroups[0]?.id ?? null;
  const activeGroup =
    primaryGroups.find((g) => g.id === resolvedActiveId) ?? primaryGroups[0];

  const showPrimaryPicker = showPdfSelector && primaryGroups.length > 1;
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

  const title = activeGroup?.title ?? entity.title;

  return (
    <div
      className="flex items-center gap-2 h-10 px-3 shrink-0"
      style={{ borderBottom: "1px solid var(--border-primary)" }}
    >
      <EntityPill typeId={entity.entityTypeId} />

      <span className="text-xs font-semibold text-ink truncate flex-1">
        {title}
      </span>

      {showPrimaryPicker && activeGroup && (
        <div ref={pickerRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setPickerOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={pickerOpen}
            className="flex items-center gap-1.5 pl-2 pr-2 py-1 text-xs font-medium text-ink-secondary rounded-full bg-warm hover:bg-parchment transition-colors cursor-pointer"
          >
            <FileText size={12} className="text-ink-tertiary" />
            {primaryGroups.length} primary
            <ChevronDown
              size={12}
              className={`text-ink-tertiary transition-transform ${pickerOpen ? "rotate-180" : ""}`}
            />
          </button>
          {pickerOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 z-30 min-w-[260px] rounded-md bg-paper shadow-xl py-1 animate-fade-in-up"
              style={{ border: "1px solid var(--border-primary)" }}
            >
              {primaryGroups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setActiveGroupId(g.id);
                    setPickerOpen(false);
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs text-left transition-colors cursor-pointer ${
                    g.id === resolvedActiveId
                      ? "bg-vellum text-ink font-semibold"
                      : "text-ink-secondary hover:bg-warm"
                  }`}
                >
                  <FileText size={12} className="text-ink-tertiary shrink-0" />
                  <span className="truncate">{g.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
