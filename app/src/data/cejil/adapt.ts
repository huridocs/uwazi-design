// Heavy adapter: maps CEJIL entities → the prototype's `Entity` shape for the
// Library. Imported only by the library-data atom (pulls the full entity list).
import type { Entity } from "../entities";
import { countryCoords } from "../geo";
import { cejilEntities } from "./entities";
import { cejilFiles } from "./files";

const docEntities = new Set(cejilFiles.map((f) => f.entity));

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
  };
});
