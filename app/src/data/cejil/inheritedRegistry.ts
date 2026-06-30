// CEJIL inherited values are themselves graph-derived (a judge's país is another
// relationship hop), so they can't live in the scalar entity-metadata map the
// mock uses. buildCejilProfile pre-resolves them via the chain engine and stashes
// them here; the entity-metadata prop readers fall back to this registry, so the
// existing inheritance renderer resolves CEJIL inherited values with no special
// casing. Tiny + dependency-free to keep it out of any import cycle.
import type { Language } from "../../atoms/language";

const registry = new Map<string, string>();
const key = (entityId: string, propId: string, lang: Language) => `${entityId}::${propId}::${lang}`;

/** Record one resolved inherited value (called while building a CEJIL profile). */
export function registerCejilInherited(entityId: string, propId: string, lang: Language, value: string) {
  registry.set(key(entityId, propId, lang), value);
}

/** Read a CEJIL inherited value, or undefined. The prop readers consult this
 *  after the mock metadata map, so mock values always win and CEJIL fills the gap. */
export function cejilInheritedValue(entityId: string, propId: string, lang: Language): string | undefined {
  return registry.get(key(entityId, propId, lang));
}

/** Prop ids minted for CEJIL inherited relationship columns (namespaced so they
 *  never collide with a real scalar property name). */
export const CEJIL_INHERIT_FIRMANTE_PAIS = "cejil:firmante-pais";
