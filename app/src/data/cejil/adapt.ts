// Heavy adapter: maps CEJIL entities → the prototype's `Entity` shape for the
// Library. Imported only by the library-data atom (pulls the full entity list).
import type { Entity } from "../entities";
import { countryCoords } from "../geo";
import { cejilEntities } from "./entities";
import { cejilFiles } from "./files";
import { cejilTemplates } from "./templates";

const docEntities = new Set(cejilFiles.map((f) => f.entity));

/** template _id → ordered [{name,label,type}] for resolving display fields. */
const propsByTemplate = new Map(
  cejilTemplates.map((t) => [
    t._id,
    [...(t.commonProperties || []), ...t.properties].map((p) => ({ name: p.name, label: p.label, type: p.type })),
  ]),
);

const SKIP_TYPES = new Set(["preview", "geolocation", "image", "link", "media", "nested", "generatedtoc"]);

function formatVals(type: string, vals: { value?: unknown; label?: unknown }[]): string {
  if (SKIP_TYPES.has(type)) return "";
  if (type === "date") {
    const v = vals[0]?.value;
    return typeof v === "number" && v > 0 ? String(new Date(v * 1000).getUTCFullYear()) : "";
  }
  const labels = vals.map((v) => v?.label).filter((l): l is string => typeof l === "string" && !!l);
  if (labels.length) return labels.slice(0, 2).join(", ");
  const v = vals[0]?.value;
  if (typeof v === "string" && v.trim()) {
    const s = v.replace(/\s+/g, " ").trim();
    // Skip raw URLs / JSON blobs (media, embed configs) — not card-displayable.
    if (/^https?:\/\//.test(s) || s.startsWith("{") || s.startsWith("[")) return "";
    return s.length > 90 ? s.slice(0, 90) + "…" : s;
  }
  return "";
}

/** First few non-empty metadata fields (label + display value), in template order. */
function fieldsOf(e: { template: string; metadata?: Record<string, { value?: unknown; label?: unknown }[]> }) {
  const props = propsByTemplate.get(e.template) || [];
  const out: { label: string; value: string }[] = [];
  for (const p of props) {
    if (p.name === "title") continue;
    const vals = e.metadata?.[p.name];
    if (!vals || !vals.length) continue;
    const value = formatVals(p.type, vals);
    if (!value) continue;
    out.push({ label: p.label, value });
    if (out.length >= 3) break;
  }
  return out.length ? out : undefined;
}

/** Spanish doc is canonical for the card list (titles/labels are richest in es). */
const esEntities = cejilEntities.filter((e) => e.language === "es");

/** First country label found on the entity (relationship `pa_s` value or, for a
 *  País entity, its own title). Used for the Countries facet + map geo. */
function countryOf(e: (typeof esEntities)[number]): string | undefined {
  if (e.templateName === "País") return e.title;
  const pais = e.metadata?.pa_s?.[0];
  return pais && typeof pais.label === "string" ? pais.label : undefined;
}

/** A representative unix-seconds date from the metadata, → ISO, for sort-by-date. */
function createdOf(e: (typeof esEntities)[number]): string | undefined {
  for (const key of ["fecha", "presentaci_n_ante_la_corteidh", "denuncia_ante_la_cidh"]) {
    const v = e.metadata?.[key]?.[0]?.value;
    if (typeof v === "number" && v > 0) return new Date(v * 1000).toISOString();
  }
  return undefined;
}

export const cejilLibraryEntities: Entity[] = esEntities.map((e) => {
  const country = countryOf(e);
  return {
    id: e.sharedId,
    title: e.title.trim(),
    typeId: e.template,
    published: e.published,
    preview: docEntities.has(e.sharedId) ? ("document" as const) : undefined,
    country,
    geo: country ? countryCoords[country] : undefined,
    createdAt: createdOf(e),
    fields: fieldsOf(e),
  };
});
