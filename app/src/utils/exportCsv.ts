import type { Language } from "../atoms/language";
import { getEntity, getEntityType, type Entity } from "../data/entities";
import { getEntityProfile } from "../data/entityProfiles";
import { getEntityProp } from "../data/entityMetadata";
import { resolveInheritedValue } from "./inheritance";

/** Export a list of entities as CSV — the Library's current result set today,
 *  a multi-selection next. Takes the LIST, not the Library's state, so any
 *  caller that has entities can export them.
 *
 *  The format is Uwazi's IMPORT format, so an export goes back through Import
 *  CSV unchanged.
 *
 *  Columns: Title, Template, Language, Date added, then the UNION of the
 *  properties the entities' templates carry, in the order they are first met.
 *  A property is a column by its label, so two templates that both define
 *  "Fecha" share one column, as they would in Uwazi's own export.
 *
 *  Values:
 *   - a multi-value property is its values joined with "|" (from the adapter's
 *     card `fields[].values` where the corpus keeps them apart; the record's
 *     display string has already joined them with a separator a value can
 *     itself contain);
 *   - a relationship property is the connected entities' TITLES, "|"-joined,
 *     once per connection (sibling fields over one `connectionKey` are one
 *     connection). Inherited values are derived, and would not re-import, so
 *     they are left out unless `includeInherited` asks for them — then each
 *     title carries its value: "Juan Carlos Abella (Petitioner)";
 *   - a date is ISO `yyyy-mm-dd` where the record holds a full day;
 *   - media and file lists are left out: an export of metadata is not a
 *     transfer of files. */

export interface CsvExport {
  csv: string;
  rows: number;
  columns: string[];
}

const FIXED = ["Title", "Template", "Language", "Date added"];

/** `dd/mm/yyyy` (how the CEJIL record prints a day) as ISO; anything else — an
 *  ISO day already, a bare year, a range — as it is. */
function isoDay(v: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v.trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : v;
}
const SKIP_TYPES = new Set(["media", "file-list"]);
/** Entities per slice between yields — small enough that the page stays
 *  responsive while a CEJIL profile is built per row, large enough that the
 *  progress bar moves in visible steps. */
const CHUNK = 150;

function rowOf(
  e: Entity,
  language: Language,
  columns: string[],
  seen: Set<string>,
  includeInherited: boolean,
): Record<string, string> {
  const row: Record<string, string> = {
    Title: e.title,
    Template: getEntityType(e.typeId)?.name ?? e.typeId,
    Language: language.toLowerCase(),
    "Date added": e.createdAt ?? "",
  };
  const connections = new Set<string>();
  const multi = new Map(
    (e.fields ?? []).filter((f) => f.key && f.values?.length).map((f) => [f.key!, f.values!]),
  );
  for (const f of getEntityProfile(e.id).metadata[language] ?? []) {
    if (SKIP_TYPES.has(f.type)) continue;
    let value: string;
    if (f.type === "relationship") {
      const inherits = !!f.inheritProperty || !!f.inheritPath?.length;
      // One connection, one column: its siblings are inherited columns over
      // the same entities, which only `includeInherited` adds.
      if (f.connectionKey) {
        if (connections.has(f.connectionKey) && !includeInherited) continue;
        connections.add(f.connectionKey);
      }
      value = f.connectedEntityIds
        .map((id) => {
          const title = getEntity(id)?.title ?? id;
          const inherited =
            inherits && includeInherited ? resolveInheritedValue(id, f, language, getEntityProp) : undefined;
          return inherited ? `${title} (${inherited})` : title;
        })
        .filter(Boolean)
        .join("|");
    } else {
      value = multi.get(f.id)?.join("|") ?? f.value ?? "";
      if (f.type === "date") value = isoDay(value);
    }
    if (!value || value === "—") continue;
    if (!seen.has(f.label)) {
      seen.add(f.label);
      columns.push(f.label);
    }
    // Two properties with one label on the same entity (an inherited column
    // beside its connection) share the cell rather than overwrite it.
    row[f.label] = row[f.label] ? `${row[f.label]}|${value}` : value;
  }
  return row;
}

/** RFC 4180: quote a cell holding a comma, a quote or a line break; double any
 *  quote inside it. */
function cell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export async function exportEntitiesCsv(
  entities: readonly Entity[],
  language: Language,
  onProgress?: (done: number, total: number) => void,
  { includeInherited = false }: { includeInherited?: boolean } = {},
): Promise<CsvExport> {
  const columns = [...FIXED];
  const seen = new Set(FIXED);
  const rows: Record<string, string>[] = [];
  for (let i = 0; i < entities.length; i += CHUNK) {
    for (const e of entities.slice(i, i + CHUNK)) rows.push(rowOf(e, language, columns, seen, includeInherited));
    onProgress?.(Math.min(i + CHUNK, entities.length), entities.length);
    // Yield, so the progress is painted and the page stays usable.
    await new Promise((r) => setTimeout(r, 0));
  }
  const lines = [
    columns.map(cell).join(","),
    ...rows.map((r) => columns.map((c) => cell(r[c] ?? "")).join(",")),
  ];
  return { csv: lines.join("\r\n"), rows: rows.length, columns };
}

/** Hand a CSV to the browser as a download. The BOM makes spreadsheet apps read
 *  it as UTF-8, which every accented title in the corpora needs. */
export function downloadCsv(csv: string, filename: string): void {
  const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
