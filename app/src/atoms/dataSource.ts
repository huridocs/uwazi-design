import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { entitiesAtom, entityTypesAtom } from "./entities";
import { entityTypes, type Entity, type EntityType } from "../data/entities";
import { cejilEntityTypes } from "../data/cejil/typesAdapter";
import { cejilLibraryEntities } from "../data/cejil/adapt";

export type DataSource = "mock" | "cejil";

/** Which dataset the Library renders. Persisted. `mock` keeps the curated demo
 *  (Velásquez etc.); `cejil` shows the real public summa.cejil.org sample.
 *  Scoped to the Library — EntityView/Relationships stay on the mock seed. */
export const dataSourceAtom = atomWithStorage<DataSource>("uwazi:dataSource", "mock");

/** Flipped true once the lazy CEJIL corpus (public/cejil-data/*.json) has been
 *  fetched. LibraryView triggers the load and sets this; the entity atom below
 *  re-evaluates when it changes. */
export const cejilReadyAtom = atom(false);

/** The entity list the Library shows, by source. CEJIL data loads on demand, so
 *  this is [] until `cejilReadyAtom` flips (the Library shows a loading state). */
export const libraryEntitiesAtom = atom<Entity[]>((get) => {
  if (get(dataSourceAtom) !== "cejil") return get(entitiesAtom);
  get(cejilReadyAtom); // subscribe: recompute once the corpus is present
  return cejilLibraryEntities();
});

/** The entity types present for the active source (drives facet lists + colours). */
export const libraryTypesAtom = atom<EntityType[]>((get) =>
  get(dataSourceAtom) === "cejil" ? cejilEntityTypes : (get(entityTypesAtom) ?? entityTypes),
);
