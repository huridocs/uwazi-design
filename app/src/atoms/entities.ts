import { atom } from "jotai";
import { entities as seedEntities, entityTypes, Entity, EntityType } from "../data/entities";

/** Writable atom over the entity list. Seeded from data/entities.ts so the
 *  CreateRelationship flow can append a freshly minted entity. */
export const entitiesAtom = atom<Entity[]>(seedEntities);

/** Entity types are static (no UI to add new ones in this prototype). */
export const entityTypesAtom = atom<EntityType[]>(entityTypes);
