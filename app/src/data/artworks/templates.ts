// The two Best Artworks templates as template definitions
// (data/templates/types.ts). The corpus never had templates: its record fields
// were built per entity (data/artworks/profile.ts), and Create entity copied an
// existing entity's fields. These are those fields, declared once, with the
// names the record already uses, so every key-based feature keeps working.
//
// Kept as the record types them today (text, link): step M4 types them
// (genres and nationalities as multiselects on new thesauri, the dataset
// number and paintings as numbers, born and died as dates, the image).
import type { TemplateDef } from "../templates/types";
import { commonPropertiesFor, propertyIdOf } from "../templates/types";
import { ARTIST_TYPE_ID, ARTWORK_TYPE_ID, artworkTypeById } from "./typesAdapter";

const p = (templateId: string, name: string, label: string, type: "text" | "link") => ({
  id: propertyIdOf(templateId, name),
  name,
  label,
  type,
});

let built: TemplateDef[] | null = null;
/** Built on first read (see data/sample/templates.ts). */
export const artworkTemplateDefs = (): TemplateDef[] => (built ??= [
  {
    id: ARTWORK_TYPE_ID,
    name: artworkTypeById.get(ARTWORK_TYPE_ID)!.name,
    color: artworkTypeById.get(ARTWORK_TYPE_ID)!.color,
    isDefault: true,
    commonProperties: commonPropertiesFor(ARTWORK_TYPE_ID),
    properties: [
      {
        id: propertyIdOf(ARTWORK_TYPE_ID, "artist"),
        name: "artist",
        label: "Artist",
        type: "relationship",
        content: ARTIST_TYPE_ID,
        relationType: "Painted by",
      },
      p(ARTWORK_TYPE_ID, "genres", "Genre", "text"),
      p(ARTWORK_TYPE_ID, "nationalities", "Nationality", "text"),
      p(ARTWORK_TYPE_ID, "dataset-number", "Dataset number", "text"),
    ],
  },
  {
    id: ARTIST_TYPE_ID,
    name: artworkTypeById.get(ARTIST_TYPE_ID)!.name,
    color: artworkTypeById.get(ARTIST_TYPE_ID)!.color,
    isDefault: false,
    commonProperties: commonPropertiesFor(ARTIST_TYPE_ID),
    properties: [
      p(ARTIST_TYPE_ID, "born", "Born", "text"),
      p(ARTIST_TYPE_ID, "died", "Died", "text"),
      p(ARTIST_TYPE_ID, "nationalities", "Nationality", "text"),
      p(ARTIST_TYPE_ID, "genres", "Movement", "text"),
      p(ARTIST_TYPE_ID, "paintings", "Paintings in the dataset", "text"),
      p(ARTIST_TYPE_ID, "wikipedia", "Wikipedia", "link"),
      {
        id: propertyIdOf(ARTIST_TYPE_ID, "works"),
        name: "works",
        label: "Works in this collection",
        type: "relationship",
        content: ARTWORK_TYPE_ID,
        relationType: "Painted",
      },
    ],
  },
]);
