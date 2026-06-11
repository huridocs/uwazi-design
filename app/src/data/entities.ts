import { getEntityProp } from "./entityMetadata";
import { countryCoords, type LatLng } from "./geo";

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
  /** Publishing status (seeded). Published entities are public; the rest are
   *  restricted. Drives the Library's Restricted/Published facet. */
  published?: boolean;
  /** Optional preview thumbnail kind shown on the Library card. Document-bearing
   *  entities get a page preview; a few others get image/video/audio. */
  preview?: PreviewKind;
  /** Optional geolocation (from the entity's country) for the Library map view. */
  geo?: LatLng;
}

export type PreviewKind = "document" | "image" | "video" | "audio";

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

export const entities: Entity[] = baseEntities.map((e) => ({
  ...e,
  createdAt: seededDate(e.id),
  published: seededPublished(e.id),
  preview: seededPreview(e.id, e.typeId),
  geo: entityGeo(e.id, e.typeId, e.title),
}));

export function getEntityType(typeId: string): EntityType | undefined {
  return entityTypes.find((t) => t.id === typeId);
}

export function getEntity(id: string): Entity | undefined {
  return entities.find((e) => e.id === id);
}
