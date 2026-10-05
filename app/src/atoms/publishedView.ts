import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { focusedEntityIdAtom } from "./focusedEntity";
import { appViewAtom } from "./navigation";
import { breakpointAtom } from "./viewport";
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
 *  published view's document link, consumed (and cleared) by `EntityView`. */
export const entityTabRequestAtom = atom<string | null>(null);

/** Whether the published-view toggle is on screen: the entity view of an entity
 *  whose template has a published view. */
export const publishedToggleShownAtom = atom((get) => get(appViewAtom) === "entity" && get(focusedHasPublishedViewAtom));

/** Below desktop the entity view has no drawer, so its tab row runs to the
 *  screen's end, under the toggle. That row keeps the toggle's slot free
 *  (`MainTabs`); on desktop the toggle sits in the drawer tab row's empty end. */
export const reserveToggleSlotAtom = atom((get) => get(publishedToggleShownAtom) && get(breakpointAtom) !== "desktop");
