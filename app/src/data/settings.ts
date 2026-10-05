/** Mock seed for the cloned Settings views. Shapes mirror Uwazi's real
 *  collections (languages, users, groups) but trimmed to what the prototype
 *  renders. No backend — these are the initial atom values. */
import { entityTypes } from "./entities";

export interface SettingsLanguage {
  key: string;
  label: string;
  localizedLabel: string;
  ltr: boolean;
  default: boolean;
  translationsCount: number;
}

export const seedLanguages: SettingsLanguage[] = [
  { key: "en", label: "English", localizedLabel: "English", ltr: true, default: true, translationsCount: 100 },
  { key: "es", label: "Spanish", localizedLabel: "Español", ltr: true, default: false, translationsCount: 100 },
  { key: "fr", label: "French", localizedLabel: "Français", ltr: true, default: false, translationsCount: 94 },
  { key: "ar", label: "Arabic", localizedLabel: "العربية", ltr: false, default: false, translationsCount: 81 },
  // Installed with no predefined interface translation (acceptance SD-8).
  { key: "pt", label: "Portuguese", localizedLabel: "Português", ltr: true, default: false, translationsCount: 67 },
];

export type UserRole = "admin" | "editor" | "collaborator";

export interface SettingsUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  /** Uwazi locks an account after repeated failed sign-ins; an admin unlocks it. */
  locked?: boolean;
  /** Group ids, not names: a renamed group keeps its members. */
  groupIds: string[];
  using2fa: boolean;
}

export const seedUsers: SettingsUser[] = [
  { id: "u1", username: "admin", email: "admin@uwazi.io", role: "admin", groupIds: ["g1"], using2fa: true },
  { id: "u2", username: "mlopez", email: "m.lopez@cejil.org", role: "editor", groupIds: ["g2"], using2fa: true },
  { id: "u3", username: "jnkemba", email: "j.nkemba@example.org", role: "editor", groupIds: ["g2", "g3"], using2fa: false },
  { id: "u4", username: "afarah", email: "a.farah@example.org", role: "collaborator", groupIds: ["g3"], using2fa: false },
  { id: "u5", username: "tbuergenthal", email: "t.buergenthal@example.org", role: "collaborator", groupIds: [], using2fa: false, locked: true },
];

/** A group's members are the users that list its id; the count is derived
 *  (`atoms/users.ts`), never stored. */
export interface SettingsGroupRecord {
  id: string;
  name: string;
}

export const seedGroups: SettingsGroupRecord[] = [
  { id: "g1", name: "Administrators" },
  { id: "g2", name: "Litigation" },
  { id: "g3", name: "Research" },
];

/** The account signed in when the prototype opens, until someone signs in as
 *  another seed user (`signedInUserIdAtom`). */
export const DEFAULT_SIGNED_IN_USER_ID = "u1";

// ── Templates ──────────────────────────────────────────────────────────────
export interface SettingsTemplate {
  id: string;
  name: string;
  color: string;
  propertyCount: number;
  entityCount: number;
  isDefault: boolean;
}

/** The Sample's templates as the extraction pages list them, until those
 *  pages read the template store (`atoms/templates.ts`). Settings › Templates
 *  and every other reader use the store. */
export const seedTemplates: SettingsTemplate[] = entityTypes.map((t, i) => ({
  id: t.id,
  name: t.name,
  color: t.color,
  propertyCount: [8, 12, 6, 10, 5, 7, 9, 4][i] ?? 6,
  entityCount: [18, 13, 9, 6, 4, 5, 3, 2][i] ?? 1,
  // The template store's default (data/sample/templates.ts): uploads take it.
  isDefault: t.id === "document",
}));

// ── Thesauri (dictionaries) ─────────────────────────────────────────────────
export interface SettingsThesaurus {
  id: string;
  name: string;
  itemCount: number;
}

export const seedThesauri: SettingsThesaurus[] = [
  { id: "t1", name: "Violation types", itemCount: 24 },
  { id: "t2", name: "Legal instruments", itemCount: 16 },
  { id: "t3", name: "Case status", itemCount: 5 },
  { id: "t4", name: "Document types", itemCount: 11 },
  { id: "t5", name: "Regions", itemCount: 8 },
  // Decision S3: a country on a record is a select on this thesaurus (Uwazi
  // has no country type); the flag comes from the label (utils/countryFlag).
  { id: "t6", name: "Countries", itemCount: 22 },
];

/** A thesaurus value, in Uwazi's exact shape: `{ id, label, values? }`. A value
 *  carrying `values` is a GROUP — its children are the selectable values, one
 *  level deep (Uwazi nests no further). */
export interface ThesaurusValue {
  id: string;
  label: string;
  values?: { id: string; label: string }[];
}

/** Representative values per thesaurus, for the thesaurus detail editor.
 *  (Prototype sample — not the full `itemCount` set.) Violation types and
 *  Regions carry nested groups; the Regions children are the same strings the
 *  mock entities use for their `region` property, so child values surface with
 *  parent context on cards, metadata views and facets. */
export const seedThesaurusValues: Record<string, ThesaurusValue[]> = {
  t1: [
    {
      id: "t1-g1",
      label: "Life and personal integrity",
      values: [
        { id: "t1-1", label: "Enforced disappearance" },
        { id: "t1-2", label: "Extrajudicial execution" },
        { id: "t1-3", label: "Torture" },
      ],
    },
    {
      id: "t1-g2",
      label: "Liberty and due process",
      values: [
        { id: "t1-4", label: "Arbitrary detention" },
        { id: "t1-5", label: "Denial of fair trial" },
      ],
    },
    { id: "t1-6", label: "Forced displacement" },
  ],
  t2: [
    { id: "t2-1", label: "American Convention on Human Rights" },
    { id: "t2-2", label: "Convention against Torture" },
    { id: "t2-3", label: "Geneva Conventions" },
    { id: "t2-4", label: "ICCPR" },
  ],
  t3: [
    { id: "t3-1", label: "Open" },
    { id: "t3-2", label: "Under review" },
    { id: "t3-3", label: "Admissible" },
    { id: "t3-4", label: "Decided" },
    { id: "t3-5", label: "Archived" },
  ],
  t4: [
    { id: "t4-1", label: "Judgment" },
    { id: "t4-2", label: "Petition" },
    { id: "t4-3", label: "Amicus brief" },
    { id: "t4-4", label: "Witness statement" },
    { id: "t4-5", label: "Press release" },
  ],
  t5: [
    {
      id: "t5-g1",
      label: "Americas",
      values: [
        { id: "t5-1", label: "North America" },
        { id: "t5-2", label: "Central America" },
        { id: "t5-3", label: "Caribbean" },
        { id: "t5-4", label: "South America" },
      ],
    },
    {
      id: "t5-g2",
      label: "Europe",
      values: [
        { id: "t5-5", label: "Western Europe" },
        { id: "t5-6", label: "Southern Europe" },
      ],
    },
  ],
  t6: [
    { id: "t6-argentina", label: "Argentina" },
    { id: "t6-barbados", label: "Barbados" },
    { id: "t6-bolivia", label: "Bolivia" },
    { id: "t6-brazil", label: "Brazil" },
    { id: "t6-chile", label: "Chile" },
    { id: "t6-colombia", label: "Colombia" },
    { id: "t6-costa-rica", label: "Costa Rica" },
    { id: "t6-dominican-republic", label: "Dominican Republic" },
    { id: "t6-ecuador", label: "Ecuador" },
    { id: "t6-el-salvador", label: "El Salvador" },
    { id: "t6-guatemala", label: "Guatemala" },
    { id: "t6-haiti", label: "Haiti" },
    { id: "t6-honduras", label: "Honduras" },
    { id: "t6-mexico", label: "Mexico" },
    { id: "t6-nicaragua", label: "Nicaragua" },
    { id: "t6-panama", label: "Panama" },
    { id: "t6-paraguay", label: "Paraguay" },
    { id: "t6-peru", label: "Peru" },
    { id: "t6-suriname", label: "Suriname" },
    { id: "t6-trinidad-and-tobago", label: "Trinidad and Tobago" },
    { id: "t6-uruguay", label: "Uruguay" },
    { id: "t6-venezuela", label: "Venezuela" },
  ]
};

// ── Relationship types ──────────────────────────────────────────────────────
// Relationship types are not seeded here: the Sample's registry is
// `relationTypes` in data/references.ts (atoms/relationTypes.ts).

// ── Translations ────────────────────────────────────────────────────────────
export interface SettingsTranslationContext {
  id: string;
  name: string;
  type: "System" | "Template" | "Thesaurus" | "Menu";
  keyCount: number;
}

export const seedTranslationContexts: SettingsTranslationContext[] = [
  { id: "tc0", name: "User Interface", type: "System", keyCount: 412 },
  { id: "tc1", name: "Court Case", type: "Template", keyCount: 12 },
  { id: "tc2", name: "Person", type: "Template", keyCount: 8 },
  { id: "tc3", name: "Violation types", type: "Thesaurus", keyCount: 24 },
  { id: "tc4", name: "Menu", type: "Menu", keyCount: 6 },
];

/** A translatable term and its value in each active language (by language key).
 *  Drives the per-context translation editor (Translations → detail). */
export interface TranslationKey {
  key: string;
  values: Record<string, string>;
}

export const seedTranslationKeys: Record<string, TranslationKey[]> = {
  tc0: [
    { key: "Library", values: { en: "Library", es: "Biblioteca", fr: "Bibliothèque", ar: "المكتبة", pt: "Biblioteca" } },
    { key: "Search", values: { en: "Search", es: "Buscar", fr: "Rechercher", ar: "بحث", pt: "Pesquisar" } },
    { key: "Filters", values: { en: "Filters", es: "Filtros", fr: "Filtres", ar: "المرشحات", pt: "Filtros" } },
    { key: "Upload", values: { en: "Upload", es: "Subir", fr: "Téléverser", ar: "رفع", pt: "Enviar" } },
    { key: "Save", values: { en: "Save", es: "Guardar", fr: "Enregistrer", ar: "حفظ", pt: "Salvar" } },
    { key: "Cancel", values: { en: "Cancel", es: "Cancelar", fr: "Annuler", ar: "إلغاء", pt: "Cancelar" } },
  ],
  tc1: [
    { key: "Case number", values: { en: "Case number", es: "Número de caso", fr: "Numéro d'affaire", ar: "رقم القضية", pt: "Número do caso" } },
    { key: "Date filed", values: { en: "Date filed", es: "Fecha de presentación", fr: "Date de dépôt", ar: "تاريخ التقديم", pt: "Data de registro" } },
    { key: "Respondent state", values: { en: "Respondent state", es: "Estado demandado", fr: "État défendeur", ar: "الدولة المدعى عليها", pt: "Estado requerido" } },
    { key: "Status", values: { en: "Status", es: "Estado", fr: "Statut", ar: "الحالة", pt: "Estado" } },
  ],
  tc4: [
    { key: "Library", values: { en: "Library", es: "Biblioteca", fr: "Bibliothèque", ar: "المكتبة", pt: "Biblioteca" } },
    { key: "About", values: { en: "About", es: "Acerca de", fr: "À propos", ar: "حول", pt: "Sobre" } },
    { key: "Resources", values: { en: "Resources", es: "Recursos", fr: "Ressources", ar: "موارد", pt: "Recursos" } },
    { key: "Contact", values: { en: "Contact", es: "Contacto", fr: "Contact", ar: "اتصل", pt: "Contato" } },
  ],
};

// ── Pages ───────────────────────────────────────────────────────────────────
export interface SettingsPage {
  id: string;
  title: string;
  slug: string;
  published: boolean;
}

export const seedPages: SettingsPage[] = [
  { id: "p1", title: "About this collection", slug: "about", published: true },
  { id: "p2", title: "Methodology", slug: "methodology", published: true },
  { id: "p3", title: "Partners", slug: "partners", published: false },
  { id: "p4", title: "Contact", slug: "contact", published: true },
];

// ── Activity log ────────────────────────────────────────────────────────────
export type LogMethod = "CREATE" | "UPDATE" | "DELETE" | "MIGRATE";

export interface SettingsLogEntry {
  id: string;
  time: string;
  user: string;
  method: LogMethod;
  summary: string;
  /** The settings record the entry is about, where it is one: an editor's
   *  "Saved … by …" line reads the newest entry for its record. */
  domain?: string;
  targetId?: string;
}

export const seedActivityLog: SettingsLogEntry[] = [
  { id: "l1", time: "2026-06-15 18:42", user: "admin", method: "UPDATE", summary: "Updated entity “Velásquez-Rodríguez v. Honduras”" },
  { id: "l2", time: "2026-06-15 17:10", user: "mlopez", method: "CREATE", summary: "Created relationship type “Represented by”" },
  { id: "l3", time: "2026-06-15 14:55", user: "mlopez", method: "CREATE", summary: "Created entity “Case 12.250 (Bámaca Velásquez)”" },
  { id: "l4", time: "2026-06-14 09:30", user: "admin", method: "DELETE", summary: "Deleted user “t.guest@example.org”" },
  { id: "l5", time: "2026-06-13 22:05", user: "system", method: "MIGRATE", summary: "Ran migration “add-relationship-tiers”" },
  { id: "l6", time: "2026-06-13 11:48", user: "jnkemba", method: "UPDATE", summary: "Updated thesaurus “Violation types”", domain: "thesaurus", targetId: "t1" },
  { id: "l7", time: "2026-06-12 16:20", user: "mlopez", method: "UPDATE", summary: "Updated template “Court Case”", domain: "template", targetId: "court_case" },
];

// ── Menu (navlinks) ─────────────────────────────────────────────────────────
/** One navbar item: a link, or a group of links (Uwazi's `settings.links`,
 *  where a group's links are its `sublinks`). Groups do not nest. */
export interface SettingsMenuSublink {
  id: string;
  title: string;
  url: string;
}
export interface SettingsMenuLink {
  id: string;
  title: string;
  url: string;
  type: "link" | "group";
  sublinks: SettingsMenuSublink[];
}

export const seedMenuLinks: SettingsMenuLink[] = [
  { id: "m1", title: "Library", url: "/library", type: "link", sublinks: [] },
  { id: "m2", title: "About", url: "/page/about", type: "link", sublinks: [] },
  {
    id: "m3",
    title: "Resources",
    url: "",
    type: "group",
    sublinks: [
      { id: "m4", title: "Methodology", url: "/page/methodology" },
      { id: "m5", title: "Contact", url: "/page/contact" },
    ],
  },
];



// ── Uploads (custom uploads) ────────────────────────────────────────────────
/** A custom upload. `filename` is the stored name and fixes the URL
 *  (`/assets/<filename>`); `name` is what the list shows and Edit renames, as
 *  in Uwazi, where renaming a file keeps its URL. `src` is the file's content
 *  as a data URL, for images (thumbnails, the favicon, `<img>` in Pages). */
export interface SettingsUpload {
  id: string;
  name: string;
  filename: string;
  mimetype: string;
  kind: "image" | "pdf" | "font" | "other";
  /** bytes */
  size: number;
  src?: string;
  width?: number;
  height?: number;
}

const svgData = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const LOGO_SVG = svgData(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="24" fill="#1c1712"/><path d="M40 48h22v52c0 10 8 16 18 16s18-6 18-16V48h22v54c0 22-18 36-40 36s-40-14-40-36z" fill="#f5f0e8"/></svg>`,
);
const BANNER_SVG = svgData(
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9cdb8"/><stop offset="1" stop-color="#7a6a55"/></linearGradient></defs><rect width="1200" height="400" fill="url(#g)"/><circle cx="930" cy="140" r="70" fill="#f5f0e8" opacity=".7"/><path d="M0 330 L260 210 L470 300 L720 170 L1200 320 L1200 400 L0 400z" fill="#3b3128" opacity=".75"/></svg>`,
);

export const seedUploads: SettingsUpload[] = [
  { id: "up1", name: "logo-iachr.svg", filename: "logo-iachr.svg", mimetype: "image/svg+xml", kind: "image", size: 12_288, src: LOGO_SVG, width: 160, height: 160 },
  { id: "up2", name: "cover-banner.jpg", filename: "cover-banner.jpg", mimetype: "image/jpeg", kind: "image", size: 253_952, src: BANNER_SVG, width: 1200, height: 400 },
  { id: "up3", name: "style-guide.pdf", filename: "style-guide.pdf", mimetype: "application/pdf", kind: "pdf", size: 1_468_006 },
  { id: "up4", name: "Inter-brand.woff2", filename: "Inter-brand.woff2", mimetype: "font/woff2", kind: "font", size: 65_536 },
];
