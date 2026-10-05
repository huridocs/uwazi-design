import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { focusedEntityIdAtom } from "./focusedEntity";
import { templatesAtom } from "./templates";
import { entityCorpusOf } from "../data/entities";
import { getEntityProfile } from "../data/entityProfiles";

/** Which of the two views an entity opens in when its template has a published
 *  view: the published view (a stand-in for Uwazi's entity view page, drawn
 *  full width) or the prototype's own entity view (panes, tabs, drawer).
 *
 *  One choice for the session, not per entity: it survives tab and entity
 *  switches, and a reload (session storage, like `appViewAtom`). Entities of
 *  other templates ignore it and open in the entity view. */
export type EntityDisplayMode = "published" | "entity";

const sessionJSON = createJSONStorage<EntityDisplayMode>(() => sessionStorage);
export const entityDisplayModeAtom = atomWithStorage<EntityDisplayMode>("uwazi:entityDisplay", "published", sessionJSON, {
  getOnInit: true,
});

/** Whether the focused entity's template has a published view (the seeded
 *  `publishedView` flag, standing in for Uwazi's `entityViewPage`). */
export const focusedHasPublishedViewAtom = atom((get): boolean => {
  const id = get(focusedEntityIdAtom);
  const typeId = getEntityProfile(id).typeId;
  return !!get(templatesAtom(entityCorpusOf(id))).find((t) => t.id === typeId)?.publishedView;
});

/** Whether the focused entity shows in the published view now. */
export const showPublishedViewAtom = atom(
  (get) => get(focusedHasPublishedViewAtom) && get(entityDisplayModeAtom) === "published",
);

/** One-shot: the entity view opens on this tab when it next shows. Set by the
 *  published view's document link and by the toggle (Metadata), consumed (and
 *  cleared) by `EntityView`. */
export const entityTabRequestAtom = atom<string | null>(null);
