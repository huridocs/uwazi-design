import { useAtomValue } from "jotai";
import { ChevronDown } from "lucide-react";
import { languageAtom } from "../../atoms/language";
import { documentsByLanguage } from "../../data/document";
import { EntityPill } from "../shared/EntityPill";

interface DocMetaProps {
  showPdfSelector?: boolean;
}

export function DocMeta({ showPdfSelector = true }: DocMetaProps) {
  const language = useAtomValue(languageAtom);
  const doc = documentsByLanguage[language];

  return (
    <div
      className="flex items-center gap-2 h-10 px-4 shrink-0"
      style={{ borderBottom: "1px solid var(--border-primary)" }}
    >
      <EntityPill typeId={doc.entityTypeId} />

      {/* Document title */}
      <span className="text-xs font-semibold text-ink truncate flex-1">
        {doc.title}
      </span>

      {/* PDF dropdown */}
      {showPdfSelector && (
        <button className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-ink rounded-md bg-warm border border-border shrink-0 hover:bg-parchment transition-colors">
          PDF
          <ChevronDown size={12} className="text-ink-tertiary" />
        </button>
      )}
    </div>
  );
}
