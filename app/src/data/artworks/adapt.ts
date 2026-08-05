import type { Entity } from "../entities";
import { asset } from "../../utils/asset";
import { artworks, artworkArtists, ARTWORK_IMAGE_BASE } from "./artworks";
import { ARTIST_TYPE_ID, ARTWORK_TYPE_ID } from "./typesAdapter";

/**
 * "Best Artworks" → the Library's `Entity` shape. The counterpart of
 * data/cejil/adapt.ts, with one structural difference worth stating: this seed
 * is BUNDLED TypeScript, not lazy JSON.
 *
 * CEJIL is 29MB fetched at runtime, so it needs `cejilReadyAtom`, a loading
 * state, and every consumer guarding on "has the corpus landed yet". This is 60
 * artworks and 22 artists in a 40KB module — it is present the moment the app
 * is. So there is no ready atom, no gate, and no loading branch to write, and
 * adding one would be inventing a wait that never happens.
 *
 * Memoised anyway, because the mapping allocates and the derived atom re-reads
 * it on every source switch.
 */
let _entities: Entity[] | null = null;

export function artworkLibraryEntities(): Entity[] {
  if (_entities) return _entities;

  const artistById = new Map(artworkArtists.map((a) => [a.id, a]));

  const paintings: Entity[] = artworks.map((w) => {
    const artist = w.artistId ? artistById.get(w.artistId) : undefined;
    return {
      id: w.id,
      title: w.title,
      typeId: ARTWORK_TYPE_ID,
      published: true,
      // THE POINT OF THIS CORPUS. Every artwork carries a real asset, so
      // `EntityThumbnail`'s `kind === "image"` branch finally has something to
      // render instead of a glyph.
      preview: "image",
      image: {
        url: asset(`${ARTWORK_IMAGE_BASE}/${w.image.file}`),
        width: w.image.width,
        height: w.image.height,
        aspect: w.image.aspect,
        // The original filename ("Albrecht_Dürer_117.jpg") is not alt text.
        alt: artist ? `${w.title} — ${artist.name}` : w.title,
      },
      // Card rows. Nationality is a DEMONYM here ("German", not "Germany"), so
      // it is shown as a field and deliberately NOT written to `country`, which
      // feeds the Countries facet and the map's geocoding.
      fields: [
        artist ? { label: "Artist", value: artist.name } : null,
        w.genres.length ? { label: "Genre", value: w.genres[0], more: w.genres.length - 1 } : null,
        w.nationalities.length ? { label: "Nationality", value: w.nationalities[0] } : null,
      ].filter((f): f is { label: string; value: string; more?: number } => f !== null),
      // The movement is the keyword worth faceting on.
      descriptors: w.genres,
    };
  });

  const artists: Entity[] = artworkArtists.map((a) => ({
    id: a.id,
    title: a.name,
    typeId: ARTIST_TYPE_ID,
    published: true,
    fields: [
      a.bornYear
        ? { label: "Lived", value: a.diedYear ? `${a.bornYear}–${a.diedYear}` : `b. ${a.bornYear}` }
        : null,
      a.nationalities.length ? { label: "Nationality", value: a.nationalities[0] } : null,
      a.paintings ? { label: "Paintings", value: String(a.paintings) } : null,
    ].filter((f): f is { label: string; value: string } => f !== null),
    descriptors: a.genres,
  }));

  // Artworks first: they are what this corpus is for, and the Library's default
  // sort has nothing else to order by — neither template carries a date, so
  // `createdAt` is left off rather than invented from a birth year (it means
  // "added to the library", not "when the painter lived"). The timeline view
  // will say so instead of plotting a fiction.
  _entities = [...paintings, ...artists];
  return _entities;
}

/** Lookup for `getEntity` — the same accessor shape CEJIL exposes. */
let _byId: Map<string, Entity> | null = null;
export function artworkEntityById(): Map<string, Entity> {
  if (!_byId) _byId = new Map(artworkLibraryEntities().map((e) => [e.id, e]));
  return _byId;
}
