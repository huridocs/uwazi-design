import { useSetAtom } from "jotai";
import { FileText, FileX } from "lucide-react";
import { openEntityAtom } from "../../atoms/focusedEntity";
import { getEntityType } from "../../data/entities";
import { WARM_BUTTON } from "../shared/warmButton";

/** What the Document tab shows for a record with no document of its own whose
 *  connected records hold one (a CEJIL Causa and its Sentencias): it says so
 *  and lists them, each opening that record. Never a connected record's PDF,
 *  which read as this record's document. */
export function NoDocumentPane({ elsewhere }: { elsewhere: { entityId: string; title: string; typeId?: string }[] }) {
  const openEntity = useSetAtom(openEntityAtom);
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
        This record holds no file. {elsewhere.length === 1 ? "Its document is on this record:" : "Its documents are on these records:"}
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
                {/* Wraps rather than truncates: holders share a case name and
                    differ at the end ("…Sentencia de 17 de agosto"). */}
                <span className="min-w-0 flex-1">{h.title}</span>
                {type && <span className="shrink-0 text-meta font-normal text-ink-tertiary">{type.name}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
