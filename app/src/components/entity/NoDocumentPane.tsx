import { useSetAtom } from "jotai";
import { ExternalLink, FileText, FileX, Globe } from "lucide-react";
import { openEntityAtom } from "../../atoms/focusedEntity";
import { getEntityType } from "../../data/entities";
import { noWidow } from "../../utils/typography";
import { nepalSourceLink } from "../../data/nepal/sourceLink";
import { vegasSourceLink } from "../../data/vegas/links";
import { WARM_BUTTON } from "../shared/warmButton";

/** What the entity view shows where a document would be, for a record that
 *  has none: a Source's link (publisher, date, "Open source" in a new tab),
 *  the connected records that hold a document (`elsewhere`, a CEJIL Causa's
 *  Sentencias; each opens that record on its Document tab), or a short empty
 *  state. Never the sample PDF or a connected record's PDF, which read as this
 *  record's document. */
export function NoDocumentPane({
  entityId,
  elsewhere,
}: {
  entityId: string;
  elsewhere?: { entityId: string; title: string; typeId?: string }[];
}) {
  const link = nepalSourceLink(entityId) ?? vegasSourceLink(entityId);
  const openEntity = useSetAtom(openEntityAtom);
  if (!link && elsewhere?.length) {
    return (
      <div
        data-component="NoDocumentPane"
        data-state="elsewhere"
        className="flex-1 min-h-0 overflow-auto flex flex-col items-center gap-2 px-6 py-10 text-center"
      >
        <span aria-hidden className="flex items-center justify-center w-9 h-9 rounded-md bg-vellum text-ink-tertiary">
          <FileX size={16} />
        </span>
        <p data-part="title" className="text-sm font-medium text-ink-secondary">
          No document of its own
        </p>
        <p data-part="hint" className="max-w-xs text-xs text-ink-tertiary text-pretty">
          This record holds no file. {elsewhere.length === 1 ? "Its\u00a0document is on this record:" : "Its\u00a0documents are on these records:"}
        </p>
        <ul data-part="holders" className="mt-1 flex flex-col items-stretch gap-1 w-full max-w-lg">
          {elsewhere.map((h) => {
            const type = h.typeId ? getEntityType(h.typeId) : undefined;
            return (
              <li key={h.entityId}>
                <button
                  type="button"
                  onClick={() => openEntity(h.entityId)}
                  data-gutter-align="box"
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-start text-xs font-medium ${WARM_BUTTON} transition-colors`}
                >
                  <FileText size={12} aria-hidden className="shrink-0 text-ink-tertiary" />
                  {/* Wraps rather than truncates: holders share a case name
                      and differ at the end ("…Sentencia de 17 de agosto"). */}
                  <span className="min-w-0 flex-1">{noWidow(h.title)}</span>
                  {type && <span className="shrink-0 text-meta font-normal text-ink-tertiary">{type.name}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
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
