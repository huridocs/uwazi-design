// The per-entity bundle for "Best Artworks" — the counterpart of
// data/cejil/profile.ts, and the reason an artwork now has a record at all.
//
// `data/artworks/adapt.ts` builds the LIBRARY shape (`Entity`): a title, an
// image, three card rows. Everything that reads an entity in depth — the drawer
// preview, the Metadata view, the Copy From matcher — reads
// `getEntityProfile(id).metadata[lang]` instead, and artworks fell through to
// `buildLightweightProfile`, whose `TYPE_FIELDS` table knows the mock's eight
// types and not these two. So every artwork's record was literally empty: "No
// metadata for this entity yet" beside a painting the card had just drawn.
//
// The sampled record holds more than the card shows — every genre and
// nationality rather than the first, the dataset number, the artist as a real
// entity in this corpus, and the JPEG's own geometry. This is where all of it
// lands.
import type { Language } from "../../atoms/language";
import type { AnyMetadataField, MetadataField, RelationshipMetadataField } from "../metadata";
import type { EntityProfile } from "../entityProfiles";
import type { DocumentGroup, FileEntry } from "../files";
import { asset } from "../../utils/asset";
import { artworks, artworkArtists, ARTWORK_IMAGE_BASE } from "./artworks";
import { ARTIST_TYPE_ID, ARTWORK_TYPE_ID } from "./typesAdapter";
import type { Artwork, ArtworkArtist } from "./types";

const LANGS: Language[] = ["EN", "ES", "FR", "AR"];

/** One field set, every reading language. The corpus is English-only — titles,
 *  genres and nationalities are English strings upstream — so translating the
 *  LABELS while the values stayed English would dress a monolingual record as a
 *  multilingual one. CEJIL does the same with its Spanish labels. */
const byLang = <T,>(v: T): Record<Language, T> =>
  LANGS.reduce((acc, l) => ((acc[l] = v), acc), {} as Record<Language, T>);

const text = (id: string, label: string, value: string): MetadataField => ({
  id,
  label,
  type: "text",
  value,
});

let _artworkById: Map<string, Artwork> | null = null;
let _artistById: Map<string, ArtworkArtist> | null = null;
/** artist id → the sampled works of theirs, in corpus order. */
let _worksByArtist: Map<string, string[]> | null = null;

function index() {
  if (!_artworkById) {
    _artworkById = new Map(artworks.map((w) => [w.id, w]));
    _artistById = new Map(artworkArtists.map((a) => [a.id, a]));
    _worksByArtist = new Map();
    for (const w of artworks) {
      if (!w.artistId) continue;
      const list = _worksByArtist.get(w.artistId);
      if (list) list.push(w.id);
      else _worksByArtist.set(w.artistId, [w.id]);
    }
  }
  return {
    artworkById: _artworkById!,
    artistById: _artistById!,
    worksByArtist: _worksByArtist!,
  };
}

export function isArtworkEntity(id: string): boolean {
  const { artworkById, artistById } = index();
  return artworkById.has(id) || artistById.has(id);
}

/** Bytes → the same "213 KB" shape the seeded files use. */
const fileSize = (bytes: number): string =>
  bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

function artworkFields(w: Artwork): AnyMetadataField[] {
  const { artistById } = index();
  const out: AnyMetadataField[] = [];

  // The artist is an ENTITY in this corpus, not a string, so it connects rather
  // than reads — the pill previews them, and their own record lists the works.
  const artist = w.artistId ? artistById.get(w.artistId) : undefined;
  if (artist) {
    const field: RelationshipMetadataField = {
      id: "artist",
      label: "Artist",
      type: "relationship",
      relationType: "Painted by",
      targetTypeId: ARTIST_TYPE_ID,
      connectedEntityIds: [artist.id],
    };
    out.push(field);
  } else if (w.artistName) {
    // Named upstream but not among the artists we sampled — the name is still
    // true, it just has nothing to point at.
    out.push(text("artist", "Artist", w.artistName));
  }

  // ALL of them. The card shows the first and counts the rest, because it is a
  // card; a record that did the same would be a card in a different font.
  if (w.genres.length) out.push(text("genres", "Genre", w.genres.join(", ")));
  if (w.nationalities.length)
    out.push(text("nationalities", "Nationality", w.nationalities.join(", ")));
  if (w.datasetNumber != null)
    out.push(text("dataset-number", "Dataset number", String(w.datasetNumber)));
  return out;
}

function artistFields(a: ArtworkArtist): AnyMetadataField[] {
  const { worksByArtist } = index();
  const out: AnyMetadataField[] = [];
  // Born and died as separate rows, not the card's "1471–1528": the card has one
  // line to spend and the record doesn't, and a painter who is still alive has a
  // birth year and no dash.
  if (a.bornYear != null) out.push(text("born", "Born", String(a.bornYear)));
  if (a.diedYear != null) out.push(text("died", "Died", String(a.diedYear)));
  if (a.nationalities.length)
    out.push(text("nationalities", "Nationality", a.nationalities.join(", ")));
  if (a.genres.length) out.push(text("genres", "Movement", a.genres.join(", ")));
  if (a.paintings != null)
    out.push(text("paintings", "Paintings in the dataset", String(a.paintings)));
  if (a.wikipedia) out.push({ id: "wikipedia", label: "Wikipedia", type: "link", value: a.wikipedia });

  const works = worksByArtist.get(a.id) ?? [];
  if (works.length) {
    const field: RelationshipMetadataField = {
      id: "works",
      // Not "Works": this corpus is a capped sample (a few paintings per
      // artist), so a label promising their catalogue would be answered by
      // three pills. The row above says how many the dataset holds.
      label: "Works in this collection",
      type: "relationship",
      relationType: "Painted",
      targetTypeId: ARTWORK_TYPE_ID,
      connectedEntityIds: works,
    };
    out.push(field);
  }
  return out;
}

/** The artwork's JPEG as a real file, so the Files tab answers with the asset
 *  the entity actually has instead of "0". It is NOT a document: `hasDocument`
 *  stays false (no Document tab promising a PDF), and `DocumentCard` steps aside
 *  for an image file so the record's leading card is the painting itself. */
function imageFile(w: Artwork): { files: FileEntry[]; groups: DocumentGroup[] } {
  const groupId = `g-artwork-${w.id}`;
  return {
    groups: [{ id: groupId, title: w.title, isPrimary: true, order: 0 }],
    files: [
      {
        id: `f-artwork-${w.id}`,
        groupId,
        name: w.image.originalName,
        language: "EN",
        type: "image",
        size: fileSize(w.image.bytes),
        modified: "",
        url: asset(`${ARTWORK_IMAGE_BASE}/${w.image.file}`),
      },
    ],
  };
}

export function buildArtworkProfile(id: string): EntityProfile {
  const { artworkById, artistById } = index();

  const artist = artistById.get(id);
  if (artist) {
    return {
      id,
      typeId: ARTIST_TYPE_ID,
      hasDocument: false,
      metadata: byLang(artistFields(artist)),
      documentGroups: [],
      files: [],
      relationships: { kind: "references" },
    };
  }

  const w = artworkById.get(id)!;
  const { files, groups } = imageFile(w);
  return {
    id,
    typeId: ARTWORK_TYPE_ID,
    hasDocument: false,
    metadata: byLang(artworkFields(w)),
    // The painting. `EntityProfile.image` is what the record's leading card
    // renders, the same way `files` is what the document card renders.
    image: {
      url: asset(`${ARTWORK_IMAGE_BASE}/${w.image.file}`),
      width: w.image.width,
      height: w.image.height,
      aspect: w.image.aspect,
      alt: w.artistName ? `${w.title} — ${w.artistName}` : w.title,
    },
    documentGroups: groups,
    files,
    relationships: { kind: "references" },
  };
}
