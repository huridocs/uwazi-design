import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { focusedEntityIdAtom } from "./focusedEntity";
import { appViewAtom } from "./navigation";
import { breakpointAtom } from "./viewport";
import { templatesAtom } from "./templates";
import { entityCorpusOf } from "../data/entities";
import { getEntityProfile } from "../data/entityProfiles";
import type { PublishedTogglePlacement } from "../data/templates/types";

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
export const focusedHasPublishedViewAtom = atom((get): boolean => get(publishedTogglePlacementAtom) !== null);

/** Where the focused entity's toggle sits (its template's `publishedView`
 *  placement, default "center"), or null when its template has no published
 *  view. */
export const publishedTogglePlacementAtom = atom((get): PublishedTogglePlacement | null => {
  const id = get(focusedEntityIdAtom);
  const typeId = getEntityProfile(id).typeId;
  const view = get(templatesAtom(entityCorpusOf(id))).find((t) => t.id === typeId)?.publishedView;
  return view ? (view.placement ?? "center") : null;
});

/** Whether the focused entity shows in the published view now. */
export const showPublishedViewAtom = atom(
  (get) => get(focusedHasPublishedViewAtom) && get(entityDisplayModeAtom) === "published",
);

/** One-shot: the entity view opens on this tab when it next shows. Set by the
 *  published view's document link and by the toggle (Metadata), consumed (and
 *  cleared) by `EntityView`. */
export const entityTabRequestAtom = atom<string | null>(null);

/** Below desktop the entity view has no drawer, so its tab row runs to the
 *  screen's end, under a corner toggle. That row keeps the toggle's slot free
 *  (`MainTabs`); on desktop the toggle sits in the drawer tab row's empty end.
 *  A centre toggle sits on the navbar's edge and needs no slot. */
export const reserveToggleSlotAtom = atom(
  (get) => get(appViewAtom) === "entity" && get(publishedTogglePlacementAtom) === "corner" && get(breakpointAtom) !== "desktop",
);
