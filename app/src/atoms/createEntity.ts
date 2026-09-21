import { atom } from "jotai";
import type { Entity } from "../data/entities";
import {
  createdCorpus,
  createdEntity,
  createdProfile,
  newEntityId,
  registerCreatedEntity,
  unregisterCreatedEntity,
  type CreatedCorpus,
} from "../data/createdEntities";
import {
  adapterFieldsOf,
  buildCreatedProfile,
  templateFields,
  today,
  type AttachedFile,
  type EditResult,
} from "../utils/createEntity";
import type { Language } from "./language";

/** Entities created in this session, per corpus. The Library appends its
 *  corpus's list to what it shows (`libraryEntitiesAtom`), so a created entity
 *  appears in every view mode, in the facets and in search. Session-lived, like
 *  every other edit in the prototype: a reload returns the seed. */
export const createdEntitiesAtom = atom<Record<CreatedCorpus, Entity[]>>({
  mock: [],
  cejil: [],
  artworks: [],
});

/** The entity being created — registered so every reader resolves it while its
 *  form is open, but not in the Library until Save. Null when nothing is being
 *  created. The entity panel opens this id straight into its edit form. */
export const draftEntityIdAtom = atom<string | null>(null);

/** Begin creating an entity of `typeId` in `corpus`: an empty record of that
 *  template, registered as the draft. Returns its id for the caller to open. */
export const startDraftAtom = atom(
  null,
  (_get, set, { typeId, corpus }: { typeId: string; corpus: CreatedCorpus }): string => {
    const id = newEntityId();
    const entity: Entity = { id, title: "", typeId, createdAt: today(), published: false };
    registerCreatedEntity(
      entity,
      buildCreatedProfile({ id, typeId, fieldsByLang: templateFields(typeId, corpus) }),
      corpus,
    );
    set(draftEntityIdAtom, id);
    return id;
  },
);

/** Save the draft: the form's values become the record, the entity joins its
 *  corpus's library list. `language` is the language the form was saved in —
 *  the title and the card fields are read from it. */
export const commitDraftAtom = atom(
  null,
  (get, set, { id, result, language }: { id: string; result: EditResult; language: Language }) => {
    const entity = createdEntity(id);
    const profile = createdProfile(id);
    const corpus = createdCorpus(id);
    if (!entity || !profile || !corpus) return;
    const title =
      result.titles[language]?.trim() ||
      Object.values(result.titles).find((t) => t.trim())?.trim() ||
      "Untitled";
    const saved: Entity = { ...entity, title };
    // Adapter corpora carry their card and search text on the entity; the
    // Sample corpus reads its profile, which is replaced below either way.
    if (corpus !== "mock") {
      const fields = adapterFieldsOf(result.fieldsByLang[language] ?? []);
      saved.fields = fields;
      saved.searchFields = fields;
    }
    registerCreatedEntity(
      saved,
      buildCreatedProfile({ id, typeId: entity.typeId, fieldsByLang: result.fieldsByLang }),
      corpus,
    );
    set(createdEntitiesAtom, (prev) => ({ ...prev, [corpus]: [saved, ...prev[corpus]] }));
    if (get(draftEntityIdAtom) === id) set(draftEntityIdAtom, null);
  },
);

/** Cancel the draft: nothing of it survives. */
export const discardDraftAtom = atom(null, (get, set, id: string) => {
  unregisterCreatedEntity(id);
  if (get(draftEntityIdAtom) === id) set(draftEntityIdAtom, null);
});

/** Add a finished entity straight to the library — an upload, which is a
 *  record the moment its file is processed, with no form in between. */
export const addCreatedEntityAtom = atom(
  null,
  (
    _get,
    set,
    { typeId, corpus, title, file }: { typeId: string; corpus: CreatedCorpus; title: string; file: AttachedFile },
  ): string => {
    const id = newEntityId();
    const entity: Entity = {
      id,
      title,
      typeId,
      createdAt: today(),
      published: false,
      preview: "document",
    };
    registerCreatedEntity(
      entity,
      buildCreatedProfile({ id, typeId, fieldsByLang: templateFields(typeId, corpus), file }),
      corpus,
    );
    set(createdEntitiesAtom, (prev) => ({ ...prev, [corpus]: [entity, ...prev[corpus]] }));
    return id;
  },
);
