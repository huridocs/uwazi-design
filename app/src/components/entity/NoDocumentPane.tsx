import { ExternalLink, FileX, Globe } from "lucide-react";
import { nepalSourceLink } from "../../data/nepal/sourceLink";
import { WARM_BUTTON } from "../shared/warmButton";

/** What the entity view shows where a document would be, for a record that
 *  has none: a Source's link (publisher, date, "Open source" in a new tab), or
 *  a short empty state. Never the sample PDF, which read as this record's
 *  document. */
export function NoDocumentPane({ entityId }: { entityId: string }) {
  const link = nepalSourceLink(entityId);
  return (
    <div
      data-component="NoDocumentPane"
      data-state={link ? "source" : "empty"}
      className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 px-6 text-center"
    >
      <span aria-hidden className="flex items-center justify-center w-9 h-9 rounded-md bg-vellum text-ink-tertiary">
        {link ? <Globe size={16} /> : <FileX size={16} />}
      </span>
      {link ? (
        <>
          <p data-part="title" className="text-sm font-medium text-ink-secondary">
            {link.publisher ?? link.host}
          </p>
          <p data-part="meta" className="text-xs text-ink-tertiary tabular-nums">
            {[link.dateLine, link.publisher ? link.host : undefined].filter(Boolean).join(" · ")}
          </p>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            data-gutter-align="box"
            className={`mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${WARM_BUTTON} transition-colors`}
          >
            Open source
            <ExternalLink size={12} aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </>
      ) : (
        <>
          <p data-part="title" className="text-sm font-medium text-ink-secondary">
            No document
          </p>
          <p data-part="hint" className="max-w-xs text-xs text-ink-tertiary text-pretty">
            This record holds no file.
          </p>
        </>
      )}
    </div>
  );
}
