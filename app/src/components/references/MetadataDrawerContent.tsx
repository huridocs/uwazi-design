import { currentDocument } from "../../data/document";
import { metadataFields } from "../../data/metadata";

export function MetadataDrawerContent() {
  return (
    <div className="flex-1 overflow-auto px-3 py-3 space-y-3">
      {/* Entity header */}
      <div className="bg-warm rounded-md px-3 py-2.5 space-y-1.5">
        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-[#C4B5FD] text-[#4C1D95]">
          Case
        </span>
        <p className="text-sm font-bold text-ink leading-relaxed">
          {currentDocument.title}
        </p>
      </div>

      {/* Geolocation */}
      <div className="bg-paper border border-border/40 rounded-md overflow-hidden">
        <div className="px-3 py-2">
          <h4 className="text-xs font-bold text-ink">Geolocation</h4>
        </div>
        <div className="h-[140px] bg-warm flex items-center justify-center">
          <span className="text-xs text-ink-muted">Map Preview</span>
        </div>
      </div>

      {/* Metadata fields */}
      {metadataFields
        .filter((f) => !["description", "other-files"].includes(f.id))
        .map((field) => (
          <div key={field.id} className="bg-paper border border-border/40 rounded-md px-3 py-2.5">
            <h4 className="text-xs font-bold text-ink mb-1">{field.label}</h4>
            {field.type === "country" ? (
              <div className="flex items-center gap-2">
                <span className="text-lg leading-none">{field.flag}</span>
                <span className="text-sm font-medium text-ink">{field.value}</span>
              </div>
            ) : field.type === "link" ? (
              <p className="text-sm font-medium text-ink underline">{field.value}</p>
            ) : (
              <p className="text-sm font-medium text-ink">{field.value}</p>
            )}
          </div>
        ))}
    </div>
  );
}
