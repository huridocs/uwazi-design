import type { Language } from "../atoms/language";

/**
 * Native metadata properties of the *source* entities — the values that a
 * relationship property on another entity can INHERIT (e.g. a Case relates to
 * People and inherits each person's `country` + `role`).
 *
 * Modelled as a separate id-keyed map (rather than fields on `Entity`) so the
 * entity list stays a lightweight id/title/type and only the entities that act
 * as inheritance sources need entries. A missing entry — or a missing prop —
 * means "no inherited value" (rendered as an em-dash with a provenance note),
 * which is a real case worth showing, so `e19` is intentionally left out below.
 *
 * Constraint mirrored from Uwazi: these are *native* props only. Inheritance is
 * single-level — a relationship field may inherit one of these, never another
 * inherited/relationship value.
 */
export interface EntityProps {
  [propId: string]: string;
}
export type EntityMetadata = Record<string /* entityId */, EntityProps>;

export const entityMetadataByLanguage: Record<Language, EntityMetadata> = {
  EN: {
    e1: { country: "Argentina", role: "Petitioner" },
    e16: { country: "Argentina", role: "Victim" },
    e17: { country: "Argentina", role: "Victim" },
    e18: { country: "Chile", role: "Expert witness" },
    // e19 intentionally absent → demonstrates a missing inherited value.
    e13: { country: "Honduras", region: "Central America" },
    e31: { country: "El Salvador", region: "Central America" },
    // e32 has country but no region → missing single-inherited value.
    e32: { country: "Uruguay" },
  },
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

/** Resolve one native property of a source entity in the given language. */
export function getEntityProp(
  entityId: string,
  propId: string,
  lang: Language,
): string | undefined {
  return entityMetadataByLanguage[lang]?.[entityId]?.[propId];
}
