import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { entitiesAtom, entityTypesAtom } from "./entities";
import { entityCorpusOf, entityTypes, type Entity, type EntityType } from "../data/entities";
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
  switch (source) {
    case "artworks":
      // Bundled TS — present the moment the app is, so no ready gate (see
      // `artworkLibraryEntities`).
      return artworkLibraryEntities();
    case "mock":
      return get(entitiesAtom);
    case "cejil":
      get(cejilReadyAtom); // subscribe: recompute once the corpus is present
      return cejilLibraryEntities();
    default: {
      // Compile-time: widening DataSource without answering here is a type
      // error. Runtime: `dataSourceAtom` is storage-backed, so a stale
      // persisted value degrades to the mock seed instead of crashing.
      const _exhaustive: never = source;
      void _exhaustive;
      return get(entitiesAtom);
    }
  }
});

/** Every entity of ONE entity's own corpus — the pool a feature draws from when
 *  it offers peers of a given entity rather than "whatever the Library is
 *  showing" (`libraryEntitiesAtom`, a Library setting).
 *
 *  Copy From read the Library's list, so editing a mock entity while the Library
 *  sat on artworks offered paintings as sources for a court case. Same seam, one
 *  step further: the CEJIL corpus loads lazily, so an empty list there means
 *  "not here yet", not "nothing to copy" — `loading` says which, and a caller
 *  that renders one sentence for both is telling the user something false.
 *
 *  Takes the mock list as an argument rather than reading `entitiesAtom` itself,
 *  so it stays a plain function; React callers pass `useAtomValue(entitiesAtom)`
 *  and subscribe to `cejilReadyAtom` for the load. */
export function entityCorpusPool(
  entityId: string,
  mock: Entity[],
): { corpus: DataSource; entities: Entity[]; loading: boolean } {
  const corpus = entityCorpusOf(entityId);
  if (corpus === "artworks") return { corpus, entities: artworkLibraryEntities(), loading: false };
  if (corpus === "cejil") {
    const entities = cejilLibraryEntities();
    return { corpus, entities, loading: entities.length === 0 };
  }
  return { corpus, entities: mock, loading: false };
}

/** The entity types present for the active source (drives facet lists + colours). */
export const libraryTypesAtom = atom<EntityType[]>((get) => {
  const source = get(dataSourceAtom);
  switch (source) {
    case "artworks":
      return artworkEntityTypes;
    case "cejil":
      return cejilEntityTypes;
    case "mock":
      return get(entityTypesAtom) ?? entityTypes;
    default: {
      // Same shape as libraryEntitiesAtom: type error on widening, mock
      // fallback for a stale persisted value.
      const _exhaustive: never = source;
      void _exhaustive;
      return get(entityTypesAtom) ?? entityTypes;
    }
  }
});
