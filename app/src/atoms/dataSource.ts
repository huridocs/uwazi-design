import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { entitiesAtom, entityTypesAtom } from "./entities";
import { entityTypes, type Entity, type EntityType } from "../data/entities";
import { cejilEntityTypes } from "../data/cejil/typesAdapter";
import { cejilLibraryEntities } from "../data/cejil/adapt";
import { artworkEntityTypes } from "../data/artworks/typesAdapter";
import { artworkLibraryEntities } from "../data/artworks/adapt";

export type DataSource = "mock" | "cejil" | "artworks";

/** Which dataset the Library renders. Persisted. `mock` keeps the curated demo
 *  (Velásquez etc.); `cejil` shows the real public summa.cejil.org sample;
 *  `artworks` is the bundled image corpus (see `data/artworks/adapt.ts`).
 *  Scoped to the Library — EntityView/Relationships stay on the mock seed. */
export const dataSourceAtom = atomWithStorage<DataSource>("uwazi:dataSource", "mock");

/** Flipped true once the lazy CEJIL corpus (public/cejil-data/*.json) has been
 *  fetched. LibraryView triggers the load and sets this; the entity atom below
 *  re-evaluates when it changes. */
export const cejilReadyAtom = atom(false);

/** The entity list the Library shows, by source. CEJIL data loads on demand, so
 *  this is [] until `cejilReadyAtom` flips (the Library shows a loading state). */
export const libraryEntitiesAtom = atom<Entity[]>((get) => {
  const source = get(dataSourceAtom);
  // Bundled TS — present the moment the app is, so no ready gate (see
  // `artworkLibraryEntities`). Checked before cejil so the lazy path stays the
  // exception rather than the default.
  if (source === "artworks") return artworkLibraryEntities();
  if (source !== "cejil") return get(entitiesAtom);
  get(cejilReadyAtom); // subscribe: recompute once the corpus is present
  return cejilLibraryEntities();
});

/** The entity types present for the active source (drives facet lists + colours). */
export const libraryTypesAtom = atom<EntityType[]>((get) => {
  const source = get(dataSourceAtom);
  if (source === "artworks") return artworkEntityTypes;
  return source === "cejil" ? cejilEntityTypes : (get(entityTypesAtom) ?? entityTypes);
});
