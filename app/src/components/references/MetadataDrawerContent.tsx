import { useState } from "react";
import { useAtomValue } from "jotai";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { languageAtom } from "../../atoms/language";
import { documentsByLanguage } from "../../data/document";
import { metadataFieldsByLanguage, pdfMetadataByLanguage } from "../../data/metadata";
import { EntityPill } from "../shared/EntityPill";

export function MetadataDrawerContent() {
  const language = useAtomValue(languageAtom);
  const doc = documentsByLanguage[language];
  const fields = metadataFieldsByLanguage[language];
  const pdf = pdfMetadataByLanguage[language];

  const description = fields.find((f) => f.id === "description");
  const otherFiles = fields.find((f) => f.id === "other-files");
  const regularFields = fields.filter(
    (f) => !["description", "other-files"].includes(f.id)
  );

  return (
    <div className="flex-1 overflow-auto px-3 py-3 pb-8 space-y-3">
      {/* Entity header */}
      <div className="bg-warm rounded-md px-3 py-2.5 space-y-1.5">
        <EntityPill typeId={doc.entityTypeId} />
        <p className="text-sm font-bold text-ink leading-relaxed">
          {doc.title}
        </p>
      </div>

      {/* Description */}
      {description && (
        <CollapsibleSection title={description.label} defaultExpanded>
          <p className="text-xs text-ink-secondary leading-relaxed">
            {description.value}
          </p>
        </CollapsibleSection>
      )}

      {/* PDF Metadata */}
      <CollapsibleSection title="PDF" defaultExpanded>
        <div className="space-y-1.5">
          <MetaRow label={language === "ES" ? "Nombre" : language === "FR" ? "Nom" : "Name"} value={pdf.name} />
          <div className="flex gap-4">
            <MetaRow label={language === "ES" ? "Tipo" : "Type"} value={pdf.type} />
            <MetaRow label={language === "ES" ? "Tamaño" : language === "FR" ? "Taille" : "Size"} value={pdf.size} />
          </div>
          <div className="flex gap-4">
            <MetaRow label={language === "ES" ? "Editado" : language === "FR" ? "Modifié" : "Edited"} value={pdf.lastEdited} />
            <MetaRow label={language === "ES" ? "Añadido" : language === "FR" ? "Ajouté" : "Added"} value={pdf.added} />
          </div>
        </div>
      </CollapsibleSection>

      {/* Geolocation */}
      <CollapsibleSection title={language === "ES" ? "Geolocalización" : language === "FR" ? "Géolocalisation" : "Geolocation"}>
        <div className="h-[120px] bg-warm rounded flex items-center justify-center">
          <span className="text-xs text-ink-muted">Map Preview</span>
        </div>
      </CollapsibleSection>

      {/* Metadata fields */}
      {regularFields.map((field) => (
        <div key={field.id} className="bg-paper border border-border/40 rounded-md px-3 py-2.5">
          <h4 className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider mb-1">
            {field.label}
          </h4>
          {field.type === "country" ? (
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">{field.flag}</span>
              <span className="text-sm font-medium text-ink">{field.value}</span>
            </div>
          ) : field.type === "link" ? (
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-ink underline">{field.value}</span>
              <ExternalLink size={10} className="text-ink-muted shrink-0" />
            </div>
          ) : (
            <p className="text-sm font-medium text-ink">{field.value}</p>
          )}
        </div>
      ))}

      {/* Other Files */}
      {otherFiles?.items && otherFiles.items.length > 0 && (
        <CollapsibleSection title={otherFiles.label} defaultExpanded>
          <div className="space-y-1.5">
            {otherFiles.items.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-2.5 py-2 bg-warm rounded hover:bg-parchment transition-colors cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-ink truncate">{item.value}</p>
                  <span className="text-[10px] text-ink-muted">{item.label}</span>
                </div>
                <ChevronRight size={12} className="text-ink-muted shrink-0 ml-2" />
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

/* ── Helpers ── */

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 min-w-0">
      <span className="text-[10px] text-ink-muted block">{label}</span>
      <span className="text-xs font-medium text-ink truncate block">{value}</span>
    </div>
  );
}

function CollapsibleSection({
  title,
  defaultExpanded = false,
  children,
}: {
  title: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-paper border border-border/40 rounded-md overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center justify-between w-full px-3 py-2 hover:bg-warm/50 transition-colors"
      >
        <h4 className="text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider">
          {title}
        </h4>
        <ChevronDown
          size={12}
          className={`text-ink-muted transition-transform ${expanded ? "" : "-rotate-90"}`}
        />
      </button>
      {expanded && <div className="px-3 pb-2.5">{children}</div>}
    </div>
  );
}
