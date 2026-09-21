import type { Entity } from "./entities";
import type { EntityProfile } from "./entityProfiles";

/** Entities created at runtime (Create entity, Upload PDF), with the profile
 *  their record is built from and the corpus they were created in.
 *
 *  A plain module registry, not an atom, because the readers are plain
 *  functions: `getEntity`, `entityCorpusOf` and `getEntityProfile` are called
 *  from utilities that have no store. Those three consult it FIRST, so a created
 *  entity resolves everywhere a seeded one does — the drawer, the record, the
 *  search index, the thumbnail. What the LIBRARY lists is a separate question,
 *  answered by `createdEntitiesAtom` (a draft is registered here while its form
 *  is open, and only joins the library on Save). */
export type CreatedCorpus = "mock" | "cejil" | "artworks";

interface Created {
  entity: Entity;
  profile: EntityProfile;
  corpus: CreatedCorpus;
}

const byId = new Map<string, Created>();

export function registerCreatedEntity(entity: Entity, profile: EntityProfile, corpus: CreatedCorpus): void {
  byId.set(entity.id, { entity, profile, corpus });
}

export function unregisterCreatedEntity(id: string): void {
  byId.delete(id);
}

export const createdEntity = (id: string): Entity | undefined => byId.get(id)?.entity;
export const createdProfile = (id: string): EntityProfile | undefined => byId.get(id)?.profile;
export const createdCorpus = (id: string): CreatedCorpus | undefined => byId.get(id)?.corpus;

let seq = 0;
/** A new id, disjoint from every corpus's ids (they never start with `new-`). */
export function newEntityId(): string {
  seq += 1;
  return `new-${Date.now().toString(36)}-${seq}`;
}
