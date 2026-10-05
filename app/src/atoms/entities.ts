import { atom } from "jotai";
import { entities as seedEntities, Entity, EntityType } from "../data/entities";
import { templateTypesAtom } from "./templates";

/** Writable atom over the entity list. Seeded from data/entities.ts so the
 *  CreateRelationship flow can append a freshly minted entity. */
export const entitiesAtom = atom<Entity[]>(seedEntities);

/** The Sample corpus's types: a projection of its templates
 *  (`atoms/templates.ts`). */
export const entityTypesAtom = atom<EntityType[]>((get) => get(templateTypesAtom("mock")));
