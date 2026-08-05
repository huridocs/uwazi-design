// Light adapter: maps the two "Best Artworks" templates → the prototype's
// EntityType shape. Mirrors data/cejil/typesAdapter.ts, and stays a separate
// module for the same reason: `getEntityType` is called app-wide (EntityPill,
// cards, facet chips) and must not drag the entity list in behind it.
import type { EntityType } from "../entities";

/** The corpus has exactly two templates, so the colours are chosen rather than
 *  generated from a palette by index: amber for the pictures, teal for the
 *  people who made them. Both are existing app colours (see `entityTypes`), so
 *  a mixed facet list still reads as one system. */
export const ARTWORK_TYPE_ID = "artwork";
export const ARTIST_TYPE_ID = "artist";

export const artworkEntityTypes: EntityType[] = [
  { id: ARTWORK_TYPE_ID, name: "Artwork", color: "#D97706" },
  { id: ARTIST_TYPE_ID, name: "Artist", color: "#0891B2" },
];

export const artworkTypeById = new Map(artworkEntityTypes.map((t) => [t.id, t]));
