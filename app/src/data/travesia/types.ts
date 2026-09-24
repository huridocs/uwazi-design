// "Red Travesía" — a FICTIONAL shelter network over a real Uwazi schema.
// Shapes mirror the Uwazi documents the schema came from (see
// scripts/import-travesia-schema.mjs); the entities are generated
// (scripts/generate-travesia.mjs).

export interface TravesiaProperty {
  _id: string;
  name: string;
  label: string;
  type: string;
  /** select / multiselect: the thesaurus; relationship: the target template. */
  content?: string;
  relationType?: string;
  /** One native property read off each connected entity. `property` is that
   *  property's `_id` on the target template. */
  inherit?: { property: string; type: string };
  showInCard?: boolean;
  filter?: boolean;
}

export interface TravesiaTemplate {
  _id: string;
  name: string;
  default: boolean;
  color: string | null;
  properties: TravesiaProperty[];
}

export interface TravesiaThesaurusValue {
  id: string;
  label: string;
  values?: TravesiaThesaurusValue[];
}
export interface TravesiaThesaurus {
  _id: string;
  name: string;
  values: TravesiaThesaurusValue[];
}

export interface TravesiaRelationType {
  _id: string;
  name: string;
}

/** A metadata value as Uwazi stores it: `value`, and `label` for a thesaurus
 *  or relationship value. A relationship that inherits carries the connected
 *  entity's value in `inheritedValue`. */
export interface TravesiaMetaValue {
  value: unknown;
  label?: string;
  inheritedValue?: { value: unknown; label?: string }[];
  inheritedType?: string;
}

export interface TravesiaEntity {
  sharedId: string;
  template: string;
  title: string;
  /** Epoch milliseconds. */
  creationDate: number;
  metadata: Record<string, TravesiaMetaValue[]>;
}

export interface TravesiaRelationship {
  from: string;
  to: string;
  relationType: string;
  typeName: string;
}
