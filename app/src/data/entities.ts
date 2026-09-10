import { getEntityProp } from "./entityMetadata";
import { countryCoords, type LatLng } from "./geo";
import type { PropertyKind } from "../utils/propertyKind";
import { cejilTypeById } from "./cejil/typesAdapter";
import { cejilLibraryEntities } from "./cejil/adapt";
import { artworkEntityById } from "./artworks/adapt";
import { artworkTypeById } from "./artworks/typesAdapter";
import { artworks, ARTWORK_IMAGE_BASE } from "./artworks/artworks";
import { asset } from "../utils/asset";

/** One property as a CARD shows it: the key that names it to the record, the
 *  kind that says how to draw it, the label, the display value, and the "+N"
 *  tail a summarising adapter leaves on a multi-valued property. */
export interface CardField {
  /** The TEMPLATE's own property name — the same key the metadata record puts
   *  on its field cards as `data-field-key`. It is what lets a click on a card
   *  property name that property to the drawer; without it the card carries a
   *  localized label and a synthesized id, neither of which the record knows.
   *  Optional because a hand-authored corpus may not have one. */
  key?: string;
  /** What the property IS, normalized — see `utils/propertyKind`. A card that
   *  draws a coordinate differently from a sentence has to be told which it is
   *  holding. */
  kind?: PropertyKind;
  label: string;
  value: string;
  /** The first few values of a MULTI-valued property, where the kind is drawn as
   *  a set rather than as a sentence (`chips`). `value` stays the first of them,
   *  so every consumer that wants one string still gets one — this is the extra
   *  a chip row needs and nothing else reads. Capped at four: three are drawn
   *  and the fourth only proves there are more, which `more` already counts. */
  values?: string[];
  more?: number;
}

export interface EntityType {
  id: string;
  name: string;
  color: string;
}

export const entityTypes: EntityType[] = [
  { id: "person", name: "Person", color: "#8B5CF6" },
  { id: "court_case", name: "Court Case", color: "#0891B2" },
  { id: "country", name: "Country", color: "#059669" },
  { id: "judgment", name: "Judgment", color: "#D97706" },
  { id: "violation", name: "Violation", color: "#E8432A" },
  { id: "right", name: "Right", color: "#2563EB" },
  { id: "organization", name: "Organization", color: "#8B5CF6" },
  { id: "document", name: "Document", color: "#6B7280" },
];

export interface Entity {
  id: string;
  title: string;
  typeId: string;
  /** When the entity was added to the library. Seeded deterministically below so
   *  the Library has a natural, type-mixed order when sorted by date. Optional
   *  so runtime-created entities (CreateRelationship flow) don't need it. */
  createdAt?: string;
  /** When the entity was last edited, if it ever was. Optional and often
   *  absent: a record that has never been touched since import has no edited
   *  date, and the record footer says only "Created X" for it — which is the
   *  truth, not a gap to fill. Seeded for the curated Sample corpus below;
   *  the CEJIL import carries no edit date at all (see `adapt.ts`). */
  updatedAt?: string;
  /** Publishing status (seeded). Published entities are public; the rest are
   *  restricted. Drives the Library's Restricted/Published facet. */
  published?: boolean;
  /** Optional preview thumbnail kind shown on the Library card. Document-bearing
   *  entities get a page preview; a few others get image/video/audio. */
  preview?: PreviewKind;
  /** The actual asset behind `preview: "image"`. Adapter-supplied, like `geo`
   *  and `fields` — see {@link EntityImage}. */
  image?: EntityImage;
  /** EVERY image the template fills, `image` first.
   *
   *  Uwazi templates can select more than one image or preview property to show
   *  on a card, and a slot draws ONE. The rest were simply gone: not truncated,
   *  not counted, absent. So the card names them instead — a filename is a
   *  poorer thing than a picture and an honest one, and it is a link into the
   *  record where the picture actually is.
   *
   *  Absent, or one entry long, for the ordinary single-image entity: the
   *  fallback row only appears when there is something it alone can say. */
  images?: EntityImage[];
  /** Optional geolocation (from the entity's country) for the Library map view. */
  geo?: LatLng;
  /** Optional country name (for the Countries facet) — set by adapters whose
   *  entities don't carry a mock entityMetadata profile (e.g. CEJIL). */
  country?: string;
  /** Adapter-supplied display fields (label/value) for the Library card, when the
   *  entity has no mock entityMetadata profile. Resolved from real metadata.
   *
   *  `more` = how many FURTHER values this field held beyond the one shown. A
   *  multi-valued field (three document titles, say) renders as "first title
   *  +2 more", never as a comma-joined dump — joining two long titles was what
   *  turned the card grid into a wall of prose. */
  fields?: CardField[];
  /** Kinds the entity carries that cannot be a card LINE — a paragraph, a
   *  table, a media config. Drawn as footer glyphs, so they cost no line and no
   *  layout. */
  marks?: PropertyKind[];
  /** Adapter-supplied FULL metadata projection, for SEARCH — every non-empty
   *  property, every value, untruncated.
   *
   *  `fields` above is a CARD summariser: three fields, the first value of each,
   *  cut at 90 characters. The search index and the snippet builder were reading
   *  it, so on a corpus that summarises (CEJIL: ~3.9 non-empty properties per
   *  entity, a third of them multi-valued, `resumen` running to paragraphs) a
   *  term in a 4th property, in a 2nd value, or past the 90th character matched
   *  nothing at all — the card's ellipsis was also the end of the index.
   *
   *  Adapters that summarise supply this too. Where it's absent, `fields` IS the
   *  whole record (the mock and artwork corpora hold a handful of short values)
   *  and search reads that, as before. */
  searchFields?: { label: string; value: string }[];
  /** Adapter-supplied keyword facet values (e.g. CEJIL "descriptores"/violations). */
  descriptors?: string[];
  /** Adapter-supplied INHERITED relationship-property values, keyed by propId
   *  (e.g. CEJIL `mecanismo` → the connected body's name). Drives the dynamic
   *  inherited-property filters for sources without a mock entityMetadata
   *  profile. */
  inherited?: Record<string, string[]>;
}

export type PreviewKind = "document" | "image" | "video" | "audio";

/** An image's own deep-focus key — the property it came from, plus the ASSET.
 *
 *  A property key alone cannot address one picture of several: every image of a
 *  multi-image property carried the same `data-field-key`, so `querySelector`
 *  stopped at the first card and a click on the third filename scrolled to the
 *  first image. Keyed on the FILENAME (falling back to the url) rather than on
 *  the index, because the card's array and the record's are built by different
 *  functions and index parity between them is an assumption waiting to break;
 *  the asset is the same asset on both sides by construction. */
export function imageFocusKey(image: EntityImage): string {
  return `${image.fieldKey ?? "image"}#${image.filename ?? image.url}`;
}

/** A real image asset for a card whose `preview` is `"image"`.
 *
 *  Until the artworks corpus there was nothing behind that preview kind —
 *  `EntityThumbnail`'s image branch drew a glyph, because no dataset had a
 *  picture. This is the shape that branch reads.
 *
 *  `width`/`height` are the JPEG's OWN pixels, parsed from its SOF marker at
 *  sample time (`scripts/sample-artworks.cjs`), not a guess and not a rendered
 *  size. They are here so a card can reserve the correct box BEFORE the image
 *  loads — paintings run 0.55 to 1.60 in ratio, so a square placeholder is wrong
 *  for most of them and reflows when the real thing arrives.
 *
 *  `url` is already resolved through `utils/asset` by the adapter, the same way
 *  `data/files.ts` resolves its own — a consumer renders it as-is. */
export interface EntityImage {
  url: string;
  /** Intrinsic pixel width of the asset. */
  width: number;
  /** Intrinsic pixel height of the asset. */
  height: number;
  /** Precomputed from the real dimensions, so a card can branch without
   *  dividing. `square` is within ±5% of 1:1. */
  aspect: "portrait" | "landscape" | "square";
  /** Human-readable description for `alt` — the asset's original filename is
   *  not one. */
  alt: string;
  /** The asset's ORIGINAL filename, which is not alt text and is not a caption
   *  — it is how the person who uploaded it refers to it. A card that cannot
   *  draw a second picture can still name one, and this is the name. */
  filename?: string;
  /** The template property this image came from, so a click on its name can
   *  tell the record WHICH image to scroll to — the same key the record puts on
   *  its field cards. */
  fieldKey?: string;
}

const baseEntities: Omit<Entity, "createdAt">[] = [
  // Persons
  { id: "e1", title: "Juan Carlos Abella", typeId: "person" },
  { id: "e11", title: "María Elena Almeida", typeId: "person" },
  { id: "e12", title: "Pedro Cabrera", typeId: "person" },
  { id: "e16", title: "Carlos Mendoza", typeId: "person" },
  { id: "e17", title: "Rosa Quintero", typeId: "person" },
  { id: "e18", title: "Luis Hernández", typeId: "person" },
  { id: "e19", title: "Ana Velázquez", typeId: "person" },
  { id: "e20", title: "Jorge Fuentes", typeId: "person" },
  { id: "e21", title: "Beatriz Morales", typeId: "person" },
  { id: "e22", title: "Roberto Cárdenas", typeId: "person" },
  { id: "e23", title: "Elena Ríos", typeId: "person" },
  { id: "e24", title: "Manuel Ortega", typeId: "person" },
  { id: "e25", title: "Sofía Reyes", typeId: "person" },
  // Countries
  { id: "e2", title: "Argentina", typeId: "country" },
  { id: "e15", title: "Colombia", typeId: "country" },
  { id: "e26", title: "Honduras", typeId: "country" },
  { id: "e27", title: "Guatemala", typeId: "country" },
  { id: "e28", title: "Peru", typeId: "country" },
  { id: "e29", title: "Chile", typeId: "country" },
  { id: "e30", title: "Mexico", typeId: "country" },
  // Court cases
  { id: "e3", title: "Case 11.137 (La Tablada)", typeId: "court_case" },
  { id: "e13", title: "Case 12.045 (Velásquez Rodríguez)", typeId: "court_case" },
  { id: "e31", title: "Case 10.488 (Ellacuría)", typeId: "court_case" },
  { id: "e32", title: "Case 11.481 (Gelman)", typeId: "court_case" },
  { id: "e33", title: "Case 12.250 (Bámaca Velásquez)", typeId: "court_case" },
  // Rights
  { id: "e4", title: "Right to Life", typeId: "right" },
  { id: "e5", title: "Right to Humane Treatment", typeId: "right" },
  { id: "e6", title: "Right to a Fair Trial", typeId: "right" },
  { id: "e34", title: "Right to Personal Liberty", typeId: "right" },
  { id: "e35", title: "Right to Judicial Protection", typeId: "right" },
  { id: "e36", title: "Freedom of Expression", typeId: "right" },
  { id: "e37", title: "Right to Privacy", typeId: "right" },
  // Judgments
  { id: "e7", title: "La Tablada Attack", typeId: "judgment" },
  { id: "e38", title: "Velásquez Rodríguez Judgment", typeId: "judgment" },
  { id: "e39", title: "Bámaca Velásquez Judgment", typeId: "judgment" },
  { id: "e40", title: "Gelman v. Uruguay Ruling", typeId: "judgment" },
  // Organizations
  { id: "e8", title: "Inter-American Commission", typeId: "organization" },
  { id: "e41", title: "Inter-American Court", typeId: "organization" },
  { id: "e42", title: "United Nations Human Rights Council", typeId: "organization" },
  { id: "e43", title: "Amnesty International", typeId: "organization" },
  { id: "e44", title: "Human Rights Watch", typeId: "organization" },
  // Violations
  { id: "e9", title: "Enforced Disappearance", typeId: "violation" },
  { id: "e10", title: "Extrajudicial Execution", typeId: "violation" },
  { id: "e14", title: "Torture and Cruel Treatment", typeId: "violation" },
  { id: "e45", title: "Arbitrary Detention", typeId: "violation" },
  { id: "e46", title: "Forced Displacement", typeId: "violation" },
  { id: "e47", title: "Sexual Violence", typeId: "violation" },
  // Documents
  { id: "e48", title: "American Convention on Human Rights", typeId: "document" },
  { id: "e49", title: "Truth Commission Report 1991", typeId: "document" },
  { id: "e50", title: "Inter-American Convention on Disappearance", typeId: "document" },
  { id: "e51", title: "Geneva Conventions Protocol II", typeId: "document" },
  { id: "e52", title: "UN Universal Declaration of Human Rights", typeId: "document" },
  { id: "e53", title: "Final Report La Tablada Investigation", typeId: "document" },
];

/** Stable string hash (no Math.random / Date.now) for deterministic seeding. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Pseudo-random "date added" — spread across ~18 months ending 2024-06-30, so
 *  the Library's date order looks natural and isn't type-grouped. */
function seededDate(id: string): string {
  const dayOffset = hash(id) % 540; // 0..539 days back
  const d = new Date(Date.UTC(2024, 5, 30) - dayOffset * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** An edit date for roughly three in five entities, always AFTER the created
 *  one, and absent for the rest — so both halves of the record footer ("Created
 *  X" alone, and "Created X · Edited Y") are visible in the same library rather
 *  than one of them being a state nobody can find. Salted independently of the
 *  created date so the two are not correlated. */
function seededUpdatedAt(id: string): string | undefined {
  if (hash(`${id}·edited`) % 5 < 2) return undefined;
  const created = new Date(seededDate(id));
  const days = 1 + (hash(`${id}·editgap`) % 400);
  const edited = new Date(created.getTime() + days * 86_400_000);
  // Never in the future relative to the corpus's own "today".
  const cap = Date.UTC(2024, 5, 30);
  return new Date(Math.min(edited.getTime(), cap)).toISOString().slice(0, 10);
}

/** ~80% published, the rest restricted — salted so it's independent of the date. */
function seededPublished(id: string): boolean {
  return hash(`${id}·pub`) % 5 !== 0;
}

const PREVIEW_DOC_TYPES = new Set(["court_case", "judgment", "document"]);
/** Document-bearing entities get a page preview; a few others get image/video/
 *  audio so the Library has varied thumbnails (most non-doc entities get none). */
function seededPreview(id: string, typeId: string): PreviewKind | undefined {
  if (PREVIEW_DOC_TYPES.has(typeId)) return "document";
  const r = hash(`${id}·prev`) % 7;
  if (r === 0) return "image";
  if (r === 1) return "video";
  if (r === 2) return "audio";
  return undefined;
}

/** Geolocation from the entity's country: a country entity uses its own name, a
 *  person/case uses its native `country` property (English). */
function entityGeo(id: string, typeId: string, title: string): LatLng | undefined {
  const country = typeId === "country" ? title : getEntityProp(id, "country", "EN");
  return country ? countryCoords[country] : undefined;
}


/* MULTI-IMAGE ENTITIES, seeded so the fallback has something to fall back FROM.
 *
 *  Uwazi templates can select more than one image property to show on a card,
 *  and neither corpus had an entity carrying two: CEJIL declares nine `preview`
 *  properties that hold no values at all and 254 `media` links, one apiece, and
 *  the artworks are one painting each. So the card's "name what you cannot
 *  draw" path had nothing to render and nothing to be checked against.
 *
 *  The ASSETS ARE REAL — the artwork corpus's own files, with their own original
 *  filenames — because a seeded 404 would prove the layout and hide the loading.
 *  Three of the sample's templates carry an image property, chosen where a
 *  picture is plausible: a person's portraits, a case's exhibits, a violation's
 *  documentation. */
/** The artwork corpus's assets, as a flat pool to draw seeded images from. */
const artworkAssets = artworks.map((w) => ({
  ...w.image,
  title: w.title,
  artistName: w.artistName ?? "",
}));

/* WHICH pictures, not just how many. The pool is the artwork corpus, so every
   asset is a painting; drawn at random it put Warhol soup-tin silkscreens on a
   court case's exhibits, which is funny and useless — a seed has to look like
   the thing it stands in for or it teaches the reader to distrust the screen.

   So each property draws from painters whose subject FITS it: portraits for a
   person, social realism and war for a case's exhibits and a violation's
   documentation. Goya, Rivera, Kahlo, Courbet and Munch are the ones that read
   as a Latin-American human-rights archive rather than as an art gallery. */
const SAMPLE_IMAGE_TYPES: Record<
  string,
  { key: string; label: string; painters: string[] }
> = {
  person: {
    key: "portraits",
    label: "Portraits",
    painters: ["Amedeo Modigliani", "Diego Velazquez", "El Greco", "Gustav Klimt"],
  },
  court_case: {
    key: "exhibits",
    label: "Exhibits",
    painters: ["Francisco Goya", "Diego Rivera", "Gustave Courbet"],
  },
  violation: {
    key: "documentation",
    label: "Documentation",
    painters: ["Francisco Goya", "Edvard Munch", "Frida Kahlo"],
  },
};

/** How many images an entity of an image-bearing type carries: 0, 2 or 3.
 *  Never 1 — a single image is the case that already worked, and seeding more
 *  of it would tell us nothing. */
function seededImages(id: string, typeId: string): EntityImage[] | undefined {
  const spec = SAMPLE_IMAGE_TYPES[typeId];
  if (!spec) return undefined;
  const r = hash(`${id}\u00b7imgs`) % 5;
  if (r > 1) return undefined; // most entities have none
  const pool = artworkAssets.filter((a) => spec.painters.includes(a.artistName));
  if (pool.length < 2) return undefined;
  const count = Math.min(r === 0 ? 2 : 3, pool.length);
  const start = hash(`${id}\u00b7imgoff`) % pool.length;
  return Array.from({ length: count }, (_, i) => {
    const a = pool[(start + i) % pool.length];
    return {
      url: asset(`${ARTWORK_IMAGE_BASE}/${a.file}`),
      width: a.width,
      height: a.height,
      aspect: a.aspect,
      alt: `${spec.label} \u2014 ${a.title}`,
      filename: a.originalName,
      fieldKey: spec.key,
    };
  });
}

export const entities: Entity[] = baseEntities.map((e) => ({
  ...e,
  createdAt: seededDate(e.id),
  updatedAt: seededUpdatedAt(e.id),
  published: seededPublished(e.id),
  preview: seededPreview(e.id, e.typeId),
  geo: entityGeo(e.id, e.typeId, e.title),
  ...withImages(seededImages(e.id, e.typeId)),
}));

/** An entity's images, and the thumbnail that comes with them: the FIRST image
 *  becomes the card's picture, which is what a template selecting an image
 *  property means by it. Nothing is set for an entity with none, so the seeded
 *  document / video / audio previews are untouched. */
function withImages(images: EntityImage[] | undefined) {
  if (!images?.length) return {};
  return { preview: "image" as const, image: images[0], images };
}

/** Ephemeral types for previews (the settings TemplateCardPreview): a template
 *  being edited isn't in any registry yet, but the real EntityCard resolves its
 *  pill/dot through getEntityType — so the preview registers its live
 *  name/colour here (synchronously, before the card renders). Looked up LAST so
 *  a preview id can never shadow a real type. */
const previewTypes = new Map<string, EntityType>();
export function registerPreviewType(type: EntityType) {
  previewTypes.set(type.id, type);
}

export function getEntityType(typeId: string): EntityType | undefined {
  return (
    entityTypes.find((t) => t.id === typeId) ??
    cejilTypeById.get(typeId) ??
    artworkTypeById.get(typeId) ??
    previewTypes.get(typeId)
  );
}

// Lazy CEJIL lookup — the corpus loads on demand, and cejilLibraryEntities()
// returns a new (memoized) array once present, so rebuild the index only then.
let _cejilById: Map<string, Entity> | null = null;
let _cejilArr: Entity[] | null = null;
function cejilEntityById(): Map<string, Entity> {
  const arr = cejilLibraryEntities();
  if (arr !== _cejilArr) {
    _cejilArr = arr;
    _cejilById = new Map(arr.map((e) => [e.id, e]));
  }
  return _cejilById!;
}

export function getEntity(id: string): Entity | undefined {
  return entities.find((e) => e.id === id) ?? cejilEntityById().get(id) ?? artworkEntityById().get(id);
}

/** Which corpus an entity BELONGS to — resolved from the id, in the same order
 *  `getEntity` resolves it, so the two can't disagree.
 *
 *  Not to be confused with `dataSourceAtom`, which is what the LIBRARY is
 *  currently showing. Anything that offers one entity beside others (Copy From's
 *  candidate list) needs this one: an entity's peers are the corpus it came
 *  from, whatever the Library happens to be displaying. Ids are disjoint across
 *  the three corpora (asserted when the artworks seed landed), so this is a
 *  lookup, not a guess. */
export function entityCorpusOf(id: string): "mock" | "cejil" | "artworks" {
  if (entities.some((e) => e.id === id)) return "mock";
  if (cejilEntityById().has(id)) return "cejil";
  if (artworkEntityById().has(id)) return "artworks";
  // Unknown ids (a runtime-created entity not yet in the seed, a stale
  // persisted id) belong to the seed, which is the only corpus this app writes.
  return "mock";
}
