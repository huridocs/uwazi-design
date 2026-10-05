// The Sample corpus's field table: per template, its native properties in
// order, their editor type and bound thesaurus, and their labels per language.
// A light module (no app imports beyond types) so the template seed
// (`data/sample/templates.ts`) can read it without loading every profile.
import type { Language } from "../../atoms/language";
import type { MetadataField } from "../metadata";

/** Localized labels for the handful of synthesized fields, so AR/RTL renders. */
export const FIELD_LABELS: Record<string, Record<Language, string>> = {
  country: { EN: "Country", ES: "País", FR: "Pays", AR: "البلد" },
  role: { EN: "Role", ES: "Rol", FR: "Rôle", AR: "الدور" },
  region: { EN: "Region", ES: "Región", FR: "Région", AR: "المنطقة" },
  born: { EN: "Date of birth", ES: "Fecha de nacimiento", FR: "Date de naissance", AR: "تاريخ الميلاد" },
  summary: { EN: "Summary", ES: "Resumen", FR: "Résumé", AR: "ملخص" },
  article: { EN: "Convention article", ES: "Artículo de la Convención", FR: "Article de la Convention", AR: "مادة الاتفاقية" },
  instrument: { EN: "Source instrument", ES: "Instrumento fuente", FR: "Instrument source", AR: "الصك المصدر" },
  founded: { EN: "Founded", ES: "Fundación", FR: "Fondation", AR: "التأسيس" },
  headquarters: { EN: "Headquarters", ES: "Sede", FR: "Siège", AR: "المقر" },
  date: { EN: "Date", ES: "Fecha", FR: "Date", AR: "التاريخ" },
  citation: { EN: "Citation", ES: "Cita", FR: "Référence", AR: "المرجع" },
  issuingBody: { EN: "Issuing body", ES: "Órgano emisor", FR: "Organe émetteur", AR: "الجهة المصدرة" },
};

/** English labels for the broader property set (localized labels above win). */
const ENGLISH_LABELS: Record<string, string> = {
  country: "Country",
  role: "Role",
  profession: "Profession",
  born: "Date of birth",
  region: "Region",
  achrRatified: "Ratified ACHR",
  courtJurisdiction: "Accepts Court jurisdiction",
  caseNumber: "Case number",
  dateFiled: "Date filed",
  respondent: "Respondent State",
  status: "Status",
  instrument: "Legal instrument",
  article: "Article",
  category: "Category",
  date: "Date",
  court: "Court",
  series: "Series",
  outcome: "Outcome",
  orgType: "Type",
  founded: "Founded",
  headquarters: "Headquarters",
  relatedRight: "Related right",
  definition: "Definition",
  docType: "Type",
  adopted: "Date of adoption",
  source: "Source",
};

export function lbl(key: string, lang: Language): string {
  return FIELD_LABELS[key]?.[lang] ?? ENGLISH_LABELS[key] ?? key;
}


/** Per-type property order + field type for the Library/Metadata display.
 *
 *  `type: "link"` means the VALUE IS A URL — the read view anchors it and the
 *  editor validates it with `new URL()`, an ERROR that blocks save. Four props
 *  here were typed `link` while every seeded value is a proper noun
 *  ("El Salvador", "Inter-American Court"), so the edit form on a court_case,
 *  right, judgment or violation opened already invalid and could never be
 *  saved — the only way out was Cancel or Discard. They are names; they are
 *  `text`. Type a prop `link` only when its values really are addresses. */
/*  `select` / `multiselect` name their thesaurus (`data/settings` seed ids):
 *  Case status t3, Regions t5, Document types t4, Legal instruments t2. The
 *  organisation type is a select the template binds to NO thesaurus, the case
 *  the form's "New thesaurus" exists for. */
export const TYPE_FIELDS: Record<string, { prop: string; type: MetadataField["type"]; thesaurus?: string }[]> = {
  person: [
    { prop: "country", type: "text" },
    { prop: "role", type: "text" },
    { prop: "profession", type: "text" },
    { prop: "born", type: "text" },
  ],
  country: [
    { prop: "region", type: "select", thesaurus: "t5" },
    { prop: "achrRatified", type: "text" },
    { prop: "courtJurisdiction", type: "text" },
  ],
  court_case: [
    { prop: "caseNumber", type: "text" },
    { prop: "dateFiled", type: "text" },
    { prop: "respondent", type: "text" },
    { prop: "status", type: "select", thesaurus: "t3" },
    { prop: "region", type: "select", thesaurus: "t5" },
  ],
  right: [
    { prop: "instrument", type: "multiselect", thesaurus: "t2" },
    { prop: "article", type: "text" },
    { prop: "category", type: "text" },
  ],
  judgment: [
    { prop: "date", type: "text" },
    { prop: "court", type: "text" },
    { prop: "series", type: "text" },
    { prop: "outcome", type: "text" },
  ],
  organization: [
    { prop: "orgType", type: "select" },
    { prop: "founded", type: "text" },
    { prop: "headquarters", type: "text" },
  ],
  violation: [
    { prop: "category", type: "text" },
    { prop: "relatedRight", type: "text" },
    { prop: "definition", type: "multiline" },
  ],
  document: [
    { prop: "docType", type: "select", thesaurus: "t4" },
    { prop: "adopted", type: "text" },
    { prop: "source", type: "text" },
  ],
};

/** The Sample corpus's template properties, as Settings' usage queries read
 *  them (`utils/settingsUsage.ts`): the type, the property key, its English
 *  label, its field type and the thesaurus it is bound to. */
export function sampleTemplateProperties(): { typeId: string; prop: string; label: string; type: string; thesaurus?: string }[] {
  return Object.entries(TYPE_FIELDS).flatMap(([typeId, spec]) =>
    spec.map(({ prop, type, thesaurus }) => ({ typeId, prop, label: lbl(prop, "EN"), type, thesaurus })),
  );
}

