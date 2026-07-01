import { ExternalLink } from "lucide-react";
import type { MetadataField } from "../../data/metadata";

/** Scalar (native) metadata fields as a compact bordered label|value table — the
 *  same ruled treatment the relationship/inherited cards use, so a drawer's whole
 *  metadata surface reads as one tabular system instead of a stack of cards.
 *  Long-form fields (multiline, or a long value) stay as labelled blocks above the
 *  table, since a paragraph doesn't belong in a value cell. Renders nothing when
 *  given no fields. */
export function MetadataFieldsTable({ fields }: { fields: MetadataField[] }) {
  const isLong = (f: MetadataField) => f.type === "multiline" || (f.value?.length ?? 0) > 100;
  const longFields = fields.filter(isLong);
  const shortFields = fields.filter((f) => !isLong(f));
  if (fields.length === 0) return null;

  return (
    <div className="space-y-2">
      {longFields.map((f) => (
        <div key={f.id}>
          <span className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider block mb-0.5">
            {f.label}
          </span>
          <p className="text-sm text-ink leading-snug">{f.value}</p>
        </div>
      ))}
      {shortFields.length > 0 && (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm border-collapse">
            <tbody>
              {shortFields.map((f) => (
                <tr
                  key={f.id}
                  className="align-top border-t border-border/40 first:border-t-0 hover:bg-warm/30 transition-colors"
                >
                  <th
                    scope="row"
                    className="w-0 py-1.5 pr-3 text-start align-top font-medium text-[11px] uppercase tracking-wide text-ink-tertiary whitespace-nowrap"
                  >
                    {f.label}
                  </th>
                  <td className="py-1.5 align-top text-ink">
                    {f.type === "country" ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="leading-none">{f.flag}</span>
                        <span className="font-medium">{f.value}</span>
                      </span>
                    ) : f.type === "link" ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="font-medium underline">{f.value}</span>
                        <ExternalLink size={10} className="text-ink-muted shrink-0" />
                      </span>
                    ) : (
                      <span className="font-medium leading-snug">{f.value}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
