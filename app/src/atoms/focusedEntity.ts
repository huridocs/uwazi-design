import { atom, type Setter } from "jotai";
import { MAIN_ENTITY_ID, getEntityProfile } from "../data/entityProfiles";
import { appViewAtom } from "./navigation";
import {
  filesAtom,
  documentGroupsAtom,
  activePrimaryGroupIdAtom,
} from "./files";

/** The entity currently open in EntityView. Defaults to the canonical main
 *  entity so the existing single-entity experience is the initial focal entity. */
export const focusedEntityIdAtom = atom<string>(MAIN_ENTITY_ID);

/** Point the (globally consumed) file atoms at a given entity's own corpus.
 *  Files have no library-wide consumer, so re-seeding them on focus change is
 *  safe and keeps every existing FilesView / viewer consumer unchanged — they
 *  read the same atoms, now holding the focused entity's files. (References are
 *  scoped differently, via `scopedReferencesAtom`, because the Library needs the
 *  full corpus.) Resets the active primary so the new entity's first primary
 *  document leads. */
function seedFilesFor(entityId: string, set: Setter) {
  const profile = getEntityProfile(entityId);
  set(filesAtom, profile.files ?? []);
  set(documentGroupsAtom, profile.documentGroups ?? []);
  set(activePrimaryGroupIdAtom, null);
}

/** Focal navigation history — entity ids visited before the current one. Lets
 *  the entity-header back button retrace entity→entity hops; empty means the
 *  precedent screen is the Library. */
export const focalHistoryAtom = atom<string[]>([]);

/** Write-only: focus an entity *without* navigating or touching history. Used by
 *  the Library drawer preview so its tabbed bodies (which read the focused /
 *  scoped atoms) reflect the previewed entity while the user is still in the
 *  Library. `focusedEntityIdAtom` isn't surfaced anywhere in the Library shell
 *  (the navbar only shows it in the entity view), so this has no visible
 *  side effect there. */
export const focusEntityForPreviewAtom = atom(null, (_get, set, entityId: string) => {
  set(focusedEntityIdAtom, entityId);
  seedFilesFor(entityId, set);
});

/** Write-only: focus an entity AND switch to the entity view ("navigate into").
 *  Pushes the current entity onto the history when hopping entity→entity. */
export const openEntityAtom = atom(null, (get, set, entityId: string) => {
  if (get(appViewAtom) === "entity") {
    set(focalHistoryAtom, [...get(focalHistoryAtom), get(focusedEntityIdAtom)]);
  } else {
    set(focalHistoryAtom, []);
  }
  set(focusedEntityIdAtom, entityId);
  seedFilesFor(entityId, set);
  set(appViewAtom, "entity");
});

/** Write-only: go back to the precedent screen — the previous focal entity if
 *  any, else the Library. */
export const goBackAtom = atom(null, (get, set) => {
  const history = get(focalHistoryAtom);
  if (history.length > 0) {
    const prev = history[history.length - 1];
    set(focusedEntityIdAtom, prev);
    seedFilesFor(prev, set);
    set(focalHistoryAtom, history.slice(0, -1));
  } else {
    set(appViewAtom, "library");
  }
});
