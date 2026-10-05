import type { Corpus } from "../entityChanges";
import type { TemplateDef } from "./types";
import { sampleTemplateDefs } from "../sample/templates";
import { cejilTemplateDefs } from "../cejil/templatesSeed";
import { travesiaTemplateDefs } from "../travesia/templatesSeed";
import { nepalTemplateDefs } from "../nepal/templatesSeed";
import { artworkTemplateDefs } from "../artworks/templates";

/** Templates for code outside React (record profiles, blank forms, the
 *  projection). The store (`atoms/templates.ts`) registers its reader here, so
 *  these return what the atoms hold, overlay included. Kept in `data/` with no
 *  atom import: the profiles that read it are loaded while `data/entities` is
 *  still initialising, and an atom import from them closes a cycle back into
 *  it. Until the store has registered, the seeds answer (the overlay is empty
 *  then anyway). */

export const TEMPLATE_SEEDS: Record<Corpus, () => TemplateDef[]> = {
  mock: sampleTemplateDefs,
  cejil: cejilTemplateDefs,
  travesia: travesiaTemplateDefs,
  nepal: nepalTemplateDefs,
  artworks: artworkTemplateDefs,
};

let reader: ((corpus: Corpus) => TemplateDef[]) | null = null;
export function registerTemplateReader(read: (corpus: Corpus) => TemplateDef[]) {
  reader = read;
}

/** A corpus's templates. */
export const templatesMirror = (corpus: Corpus): TemplateDef[] => (reader ? reader(corpus) : TEMPLATE_SEEDS[corpus]?.() ?? []);

/** One template. */
export const templateMirror = (corpus: Corpus, id: string): TemplateDef | undefined =>
  templatesMirror(corpus).find((t) => t.id === id);
