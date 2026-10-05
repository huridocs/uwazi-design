// The two Best Artworks templates as template definitions
// (data/templates/types.ts). The corpus never had templates: its record fields
// were built per entity (data/artworks/profile.ts), and Create entity copied an
// existing entity's fields. These are those fields, declared once, with the
// names the record already uses, so every key-based feature keeps working.
//
// On main the values keep the types the record has always shown: genres and
// nationalities are comma lists (main has no Best Artworks thesauri), born
// and died are years, so they are text. The dataset number and the painting
// count are numbers; an artwork's picture is its image property.
import type { PropertyType, TemplateDef } from "../templates/types";
import { commonPropertiesFor, propertyIdOf } from "../templates/types";
import { ARTIST_TYPE_ID, ARTWORK_TYPE_ID, artworkTypeById } from "./typesAdapter";

/** The card lines both templates have always shown. */
const CARDED = new Set(["artist", "genres", "nationalities", "born", "died", "paintings"]);

const p = (templateId: string, name: string, label: string, type: PropertyType, content?: string) => ({
  id: propertyIdOf(templateId, name),
  name,
  label,
  type,
  ...(content ? { content } : {}),
  ...(type === "multiselect" ? { filter: true } : {}),
  ...(CARDED.has(name) ? { showInCard: true } : {}),
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
        showInCard: true,
        content: ARTIST_TYPE_ID,
        relationType: "Painted by",
      },
      p(ARTWORK_TYPE_ID, "genres", "Genre", "text"),
      p(ARTWORK_TYPE_ID, "nationalities", "Nationality", "text"),
      p(ARTWORK_TYPE_ID, "dataset-number", "Dataset number", "numeric"),
      p(ARTWORK_TYPE_ID, "image", "Image", "image"),
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
      p(ARTIST_TYPE_ID, "paintings", "Paintings in the dataset", "numeric"),
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
