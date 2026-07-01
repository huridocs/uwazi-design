import type { Language } from "../atoms/language";
import { cejilInheritedValue } from "./cejil/inheritedRegistry";

/**
 * Native metadata properties per entity — the values the UI shows on cards, in
 * the drawer preview, and in the focal Metadata view, and the ones a
 * relationship property can INHERIT (e.g. a Case inherits each person's
 * `country` + `role`).
 *
 * `baseProps` holds the English values for every entity, modelled on Uwazi's
 * per-template property sets (person → role/nationality/…, country →
 * region/ratification, case → number/respondent/status, right → instrument/
 * article, etc.). `localized` overrides only the handful of props that drive the
 * localized inheritance demo (country / role / region). A missing prop renders as
 * an em-dash with provenance — so `e19` keeps NO country/role and `e32` keeps NO
 * region, preserving the multi- and single-inheritance missing-value demos.
 *
 * Constraint mirrored from Uwazi: these are *native* props only; inheritance is
 * single-level.
 */
export interface EntityProps {
  [propId: string]: string;
}
export type EntityMetadata = Record<string /* entityId */, EntityProps>;

const baseProps: EntityMetadata = {
  // ── People ──
  e1: { country: "Argentina", role: "Petitioner", profession: "Student", born: "1962" },
  e11: { country: "Ecuador", role: "Petitioner", profession: "Lawyer", born: "1958" },
  e12: { country: "Guatemala", role: "Witness", profession: "Journalist", born: "1965" },
  e16: { country: "Argentina", role: "Victim", profession: "Labor organizer", born: "1955" },
  e17: { country: "Argentina", role: "Victim", profession: "Teacher", born: "1968" },
  e18: { country: "Chile", role: "Expert witness", profession: "Forensic expert", born: "1950" },
  // e19 — intentionally NO country/role (multi-inheritance missing-value demo).
  e19: { profession: "Human rights defender", born: "1972" },
  e20: { country: "Honduras", role: "Petitioner", profession: "Trade unionist", born: "1960" },
  e21: { country: "Colombia", role: "Victim", profession: "Community leader", born: "1971" },
  e22: { country: "Mexico", role: "Petitioner", profession: "Lawyer", born: "1963" },
  e23: { country: "Peru", role: "Witness", profession: "Physician", born: "1969" },
  e24: { country: "Guatemala", role: "Victim", profession: "Farmer", born: "1957" },
  e25: { country: "Chile", role: "Petitioner", profession: "Student", born: "1980" },

  // ── Countries ──
  e2: { region: "South America", achrRatified: "1984", courtJurisdiction: "Yes" },
  e15: { region: "South America", achrRatified: "1973", courtJurisdiction: "Yes" },
  e26: { region: "Central America", achrRatified: "1977", courtJurisdiction: "Yes" },
  e27: { region: "Central America", achrRatified: "1978", courtJurisdiction: "Yes" },
  e28: { region: "South America", achrRatified: "1978", courtJurisdiction: "Yes" },
  e29: { region: "South America", achrRatified: "1990", courtJurisdiction: "Yes" },
  e30: { region: "North America", achrRatified: "1981", courtJurisdiction: "Yes" },

  // ── Court cases ──
  e3: { caseNumber: "11.137", respondent: "Argentina", dateFiled: "1992", status: "Decided" },
  e13: { caseNumber: "12.045", country: "Honduras", region: "Central America", respondent: "Honduras", dateFiled: "1986", status: "Decided" },
  e31: { caseNumber: "10.488", country: "El Salvador", region: "Central America", respondent: "El Salvador", dateFiled: "1993", status: "Decided" },
  // e32 — country but NO region (single-inheritance missing-value demo).
  e32: { caseNumber: "11.481", country: "Uruguay", respondent: "Uruguay", dateFiled: "2006", status: "Decided" },
  e33: { caseNumber: "12.250", country: "Guatemala", respondent: "Guatemala", dateFiled: "1993", status: "Decided" },

  // ── Rights ──
  e4: { instrument: "American Convention on Human Rights", article: "Article 4", category: "Civil and political" },
  e5: { instrument: "American Convention on Human Rights", article: "Article 5", category: "Civil and political" },
  e6: { instrument: "American Convention on Human Rights", article: "Article 8", category: "Civil and political" },
  e34: { instrument: "American Convention on Human Rights", article: "Article 7", category: "Civil and political" },
  e35: { instrument: "American Convention on Human Rights", article: "Article 25", category: "Civil and political" },
  e36: { instrument: "American Convention on Human Rights", article: "Article 13", category: "Civil and political" },
  e37: { instrument: "American Convention on Human Rights", article: "Article 11", category: "Civil and political" },

  // ── Judgments ──
  e7: { date: "1997-11-18", court: "Inter-American Commission", series: "Report 55/97", outcome: "Violations found" },
  e38: { date: "1988-07-29", court: "Inter-American Court", series: "Series C No. 4", outcome: "State responsible" },
  e39: { date: "2000-11-25", court: "Inter-American Court", series: "Series C No. 70", outcome: "State responsible" },
  e40: { date: "2011-02-24", court: "Inter-American Court", series: "Series C No. 221", outcome: "State responsible" },

  // ── Organizations ──
  e8: { orgType: "Treaty body", founded: "1959", headquarters: "Washington, D.C." },
  e41: { orgType: "International court", founded: "1979", headquarters: "San José, Costa Rica" },
  e42: { orgType: "Intergovernmental body", founded: "2006", headquarters: "Geneva, Switzerland" },
  e43: { orgType: "NGO", founded: "1961", headquarters: "London, United Kingdom" },
  e44: { orgType: "NGO", founded: "1978", headquarters: "New York, United States" },

  // ── Violations ──
  e9: { category: "Crime against humanity", relatedRight: "Right to Life", definition: "Arrest or abduction by the State followed by a refusal to acknowledge the deprivation of liberty or to disclose the fate of the person." },
  e10: { category: "Gross violation", relatedRight: "Right to Life", definition: "Unlawful and deliberate killing carried out by, or with the acquiescence of, State agents outside any judicial process." },
  e14: { category: "Gross violation", relatedRight: "Right to Humane Treatment", definition: "Intentional infliction of severe physical or mental suffering by State agents for purposes such as punishment or intimidation." },
  e45: { category: "Gross violation", relatedRight: "Right to Personal Liberty", definition: "Deprivation of liberty without legal basis or the guarantees of due process." },
  e46: { category: "Gross violation", relatedRight: "Right to Privacy", definition: "Coerced movement of persons from their homes or region in violation of international protections." },
  e47: { category: "Gross violation", relatedRight: "Right to Humane Treatment", definition: "Acts of a sexual nature committed by coercion, including in detention or armed conflict." },

  // ── Documents ──
  e48: { docType: "Treaty", adopted: "1969-11-22", source: "Organization of American States" },
  e49: { docType: "Report", adopted: "1991", source: "National Truth Commission" },
  e50: { docType: "Treaty", adopted: "1994-06-09", source: "Organization of American States" },
  e51: { docType: "Treaty", adopted: "1977-06-08", source: "International Committee of the Red Cross" },
  e52: { docType: "Declaration", adopted: "1948-12-10", source: "United Nations" },
  e53: { docType: "Report", adopted: "1997", source: "Inter-American Commission" },
};

/** Per-language overrides for the props that drive the localized inheritance
 *  demo (country / role / region). Everything else falls back to the English
 *  base props. */
const localized: Partial<Record<Language, EntityMetadata>> = {
  ES: {
    e1: { country: "Argentina", role: "Peticionario" },
    e16: { country: "Argentina", role: "Víctima" },
    e17: { country: "Argentina", role: "Víctima" },
    e18: { country: "Chile", role: "Perito" },
    e13: { country: "Honduras", region: "Centroamérica" },
    e31: { country: "El Salvador", region: "Centroamérica" },
    e32: { country: "Uruguay" },
  },
  FR: {
    e1: { country: "Argentine", role: "Requérant" },
    e16: { country: "Argentine", role: "Victime" },
    e17: { country: "Argentine", role: "Victime" },
    e18: { country: "Chili", role: "Témoin expert" },
    e13: { country: "Honduras", region: "Amérique centrale" },
    e31: { country: "El Salvador", region: "Amérique centrale" },
    e32: { country: "Uruguay" },
  },
  AR: {
    e1: { country: "الأرجنتين", role: "مقدِّم الطلب" },
    e16: { country: "الأرجنتين", role: "ضحية" },
    e17: { country: "الأرجنتين", role: "ضحية" },
    e18: { country: "تشيلي", role: "شاهد خبير" },
    e13: { country: "هندوراس", region: "أمريكا الوسطى" },
    e31: { country: "السلفادور", region: "أمريكا الوسطى" },
    e32: { country: "أوروغواي" },
  },
};

const LANGS: Language[] = ["EN", "ES", "FR", "AR"];

export const entityMetadataByLanguage: Record<Language, EntityMetadata> = Object.fromEntries(
  LANGS.map((lang) => [
    lang,
    Object.fromEntries(
      Object.entries(baseProps).map(([id, props]) => [id, { ...props, ...(localized[lang]?.[id] ?? {}) }]),
    ),
  ]),
) as Record<Language, EntityMetadata>;

/** Resolve one native property of an entity in the given language. Falls back to
 *  the CEJIL inherited-value registry so graph-derived CEJIL values resolve
 *  through the same path as mock native props. */
export function getEntityProp(entityId: string, propId: string, lang: Language): string | undefined {
  return entityMetadataByLanguage[lang]?.[entityId]?.[propId] ?? cejilInheritedValue(entityId, propId, lang);
}

/** All native props of an entity in the given language. */
export function getEntityProps(entityId: string, lang: Language): EntityProps {
  return entityMetadataByLanguage[lang]?.[entityId] ?? {};
}
