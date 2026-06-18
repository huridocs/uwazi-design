// Builds a real EntityProfile for a CEJIL entity (by sharedId), so the drawer
// preview + EntityView render real metadata / documents / relationships. Imported
// only by getEntityProfile (which delegates here for CEJIL ids); the heavy CEJIL
// data is already in the bundle via the Library, so this adds no new weight.
import type { Language } from "../../atoms/language";
import type { EntityProfile } from "../entityProfiles";
import type { MetadataField } from "../metadata";
import { cejilEntities } from "./entities";
import { cejilFiles } from "./files";
import { cejilTemplates } from "./templates";

const LANGS: Language[] = ["EN", "ES", "FR", "AR"];
// App language → CEJIL language code (es/en/pt). FR/AR fall back to es (canonical).
const LANG_CODE: Record<Language, string> = { EN: "en", ES: "es", FR: "es", AR: "es" };

// (sharedId, langCode) → entity doc
const bySidLang = new Map<string, (typeof cejilEntities)[number]>();
for (const e of cejilEntities) bySidLang.set(`${e.sharedId}::${e.language}`, e);

export const cejilSharedIds = new Set(cejilEntities.map((e) => e.sharedId));
export const isCejilEntity = (id: string) => cejilSharedIds.has(id);

const filesBySid = new Map<string, typeof cejilFiles>();
for (const f of cejilFiles) {
  const arr = filesBySid.get(f.entity) || [];
  arr.push(f);
  filesBySid.set(f.entity, arr);
}

const propsByTemplate = new Map(
  cejilTemplates.map((t) => [
    t._id,
    [...(t.commonProperties || []), ...t.properties].map((p) => ({ name: p.name, label: p.label, type: p.type })),
  ]),
);

const SKIP = new Set(["preview", "geolocation", "image", "link", "media", "nested", "generatedtoc", "relationship"]);

function fmtDate(v: unknown): string {
  if (typeof v !== "number" || v <= 0) return "";
  const d = new Date(v * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** Resolve one entity-language doc's metadata into scalar MetadataField[]. */
function mdFields(e: (typeof cejilEntities)[number]): MetadataField[] {
  const props = propsByTemplate.get(e.template) || [];
  const out: MetadataField[] = [];
  for (const p of props) {
    if (p.name === "title" || SKIP.has(p.type)) continue;
    const vals = e.metadata?.[p.name];
    if (!vals || !vals.length) continue;

    if (p.type === "date" || p.type === "datasection") {
      const value = fmtDate(vals[0]?.value);
      if (value) out.push({ id: p.name, label: p.label, type: "date", value });
      continue;
    }
    // país / country-flavoured relationship handled upstream as relationship —
    // but plain text/select/multiselect land here.
    const labels = vals.map((v) => (typeof v.label === "string" ? v.label : "")).filter(Boolean);
    if (labels.length) {
      out.push({ id: p.name, label: p.label, type: "text", value: labels.join(", ") });
      continue;
    }
    const v = vals[0]?.value;
    if (typeof v === "string" && v.trim()) {
      const s = v.replace(/\s+/g, " ").trim();
      if (/^https?:\/\//.test(s) || s.startsWith("{") || s.startsWith("[")) continue;
      out.push({ id: p.name, label: p.label, type: s.length > 120 ? "multiline" : "text", value: s });
    }
  }
  return out;
}

export function buildCejilProfile(sharedId: string): EntityProfile {
  const es = bySidLang.get(`${sharedId}::es`) || bySidLang.get(`${sharedId}::en`)!;
  const metadata = LANGS.reduce((acc, lang) => {
    const doc = bySidLang.get(`${sharedId}::${LANG_CODE[lang]}`) || es;
    acc[lang] = mdFields(doc);
    return acc;
  }, {} as Record<Language, MetadataField[]>);

  return {
    id: sharedId,
    typeId: es.template,
    // Step 1: metadata only — document/files come next, so default to Metadata.
    hasDocument: false,
    metadata,
    documentGroups: [],
    files: [],
    relationships: { kind: "references" },
  };
}
