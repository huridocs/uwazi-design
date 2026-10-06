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
import type { AnyMetadataField, RelationshipMetadataField } from "../metadata";
import type { EntityProfile } from "../entityProfiles";
import type { DocumentGroup, FileEntry } from "../files";
import { asset } from "../../utils/asset";
import { artworks, artworkArtists, ARTWORK_IMAGE_BASE } from "./artworks";
import { ARTIST_TYPE_ID, ARTWORK_TYPE_ID } from "./typesAdapter";
import { templateMirror } from "../templates/mirror";
import { blankField, legacyTypeOf } from "../../utils/templateProjection";
import type { Artwork, ArtworkArtist } from "./types";

const LANGS: Language[] = ["EN", "ES", "FR", "AR"];

/** One field set, every reading language. The corpus is English-only — titles,
 *  genres and nationalities are English strings upstream — so translating the
 *  LABELS while the values stayed English would dress a monolingual record as a
 *  multilingual one. CEJIL does the same with its Spanish labels. */
const byLang = <T,>(v: T): Record<Language, T> =>
  LANGS.reduce((acc, l) => ((acc[l] = v), acc), {} as Record<Language, T>);

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

/** One property's value on an artwork or an artist, as the record has always
 *  printed it: every genre and nationality as one comma list (the card shows
 *  the first and counts the rest, because it is a card), years and counts as
 *  strings. */
function valueOf(e: Artwork | ArtworkArtist, name: string): string | undefined {
  const w = e as Artwork;
  const a = e as ArtworkArtist;
  switch (name) {
    case "genres":
      return e.genres.length ? e.genres.join(", ") : undefined;
    case "nationalities":
      return e.nationalities.length ? e.nationalities.join(", ") : undefined;
    case "dataset-number":
      return w.datasetNumber != null ? String(w.datasetNumber) : undefined;
    // Born and died as separate rows, not the card's "1471–1528": the card has
    // one line to spend and the record doesn't, and a painter who is still
    // alive has a birth year and no dash.
    case "born":
      return a.bornYear != null ? String(a.bornYear) : undefined;
    case "died":
      return a.diedYear != null ? String(a.diedYear) : undefined;
    case "paintings":
      return a.paintings != null ? String(a.paintings) : undefined;
    case "wikipedia":
      return a.wikipedia || undefined;
    default:
      return undefined;
  }
}

/** The entities a relationship property connects, by name. The artist is an
 *  ENTITY in this corpus, not a string, so it connects rather than reads: the
 *  pill previews them, and their own record lists the works. */
function connectionsOf(e: Artwork | ArtworkArtist, name: string): string[] {
  const { artistById, worksByArtist } = index();
  if (name === "artist") {
    const w = e as Artwork;
    return w.artistId && artistById.has(w.artistId) ? [w.artistId] : [];
  }
  if (name === "works") return worksByArtist.get(e.id) ?? [];
  return [];
}

/** A record as its template's projection (step M4): every property in
 *  template order, typed by the template, empty ones included for the form.
 *  Replaces the per-type field builders. */
function recordFields(e: Artwork | ArtworkArtist, typeId: string): AnyMetadataField[] {
  const out: AnyMetadataField[] = [];
  for (const p of templateMirror("artworks", typeId)?.properties ?? []) {
    if (p.type === "relationship") {
      const ids = connectionsOf(e, p.name);
      if (ids.length) {
        const field: RelationshipMetadataField = {
          id: p.name,
          label: p.label,
          type: "relationship",
          relationType: p.relationType ?? "",
          targetTypeId: p.content ?? "",
          connectedEntityIds: ids,
        };
        out.push(field);
        continue;
      }
      // Named upstream but not among the artists we sampled: the name is
      // still true, it just has nothing to point at.
      const name = p.name === "artist" ? (e as Artwork).artistName : undefined;
      if (name) out.push({ id: p.name, label: p.label, propertyType: "text", type: "text", value: name });
      continue;
    }
    const value = valueOf(e, p.name);
    const type = legacyTypeOf(p.type);
    if (value && type) out.push({ id: p.name, label: p.label, propertyType: p.type, type, value });
    else {
      const blank = blankField("artworks", p, "EN");
      if (blank) out.push(blank);
    }
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
      metadata: byLang(recordFields(artist, ARTIST_TYPE_ID)),
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
    metadata: byLang(recordFields(w, ARTWORK_TYPE_ID)),
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
