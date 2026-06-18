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
  { key: "pt", label: "Portuguese", localizedLabel: "Português", ltr: true, default: false, translationsCount: 67 },
];

export type UserRole = "admin" | "editor" | "collaborator";

export interface SettingsUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  groups: string[];
  using2fa: boolean;
}

export const seedUsers: SettingsUser[] = [
  { id: "u1", username: "admin", email: "admin@uwazi.io", role: "admin", groups: ["Administrators"], using2fa: true },
  { id: "u2", username: "mlopez", email: "m.lopez@cejil.org", role: "editor", groups: ["Litigation"], using2fa: true },
  { id: "u3", username: "jnkemba", email: "j.nkemba@example.org", role: "editor", groups: ["Litigation", "Research"], using2fa: false },
  { id: "u4", username: "afarah", email: "a.farah@example.org", role: "collaborator", groups: ["Research"], using2fa: false },
  { id: "u5", username: "tbuergenthal", email: "t.buergenthal@example.org", role: "collaborator", groups: [], using2fa: false },
];

export interface SettingsGroupRecord {
  id: string;
  name: string;
  memberCount: number;
}

export const seedGroups: SettingsGroupRecord[] = [
  { id: "g1", name: "Administrators", memberCount: 1 },
  { id: "g2", name: "Litigation", memberCount: 2 },
  { id: "g3", name: "Research", memberCount: 2 },
];

/** The signed-in account (Account settings page). */
export const currentAccount = {
  username: "admin",
  email: "admin@uwazi.io",
  role: "admin" as UserRole,
};

// ── Templates ──────────────────────────────────────────────────────────────
export interface SettingsTemplate {
  id: string;
  name: string;
  color: string;
  propertyCount: number;
  entityCount: number;
  isDefault: boolean;
}

export const seedTemplates: SettingsTemplate[] = entityTypes.map((t, i) => ({
  id: t.id,
  name: t.name,
  color: t.color,
  propertyCount: [8, 12, 6, 10, 5, 7, 9, 4][i] ?? 6,
  entityCount: [18, 13, 9, 6, 4, 5, 3, 2][i] ?? 1,
  isDefault: t.id === "court_case",
}));

export type PropertyType =
  | "text"
  | "select"
  | "relationship"
  | "date"
  | "numeric"
  | "markdown"
  | "geolocation"
  | "image";

export interface TemplateProperty {
  id: string;
  label: string;
  type: PropertyType;
  required: boolean;
  filterable: boolean;
}

/** Per-template property lists for the Template editor. Court Case is fleshed
 *  out; others fall back to a small default set. */
export const templatePropertiesByTemplate: Record<string, TemplateProperty[]> = {
  court_case: [
    { id: "cp1", label: "Case number", type: "text", required: true, filterable: true },
    { id: "cp2", label: "Date filed", type: "date", required: true, filterable: true },
    { id: "cp3", label: "Respondent state", type: "relationship", required: true, filterable: true },
    { id: "cp4", label: "Status", type: "select", required: false, filterable: true },
    { id: "cp5", label: "Summary", type: "markdown", required: false, filterable: false },
    { id: "cp6", label: "Location", type: "geolocation", required: false, filterable: false },
  ],
  person: [
    { id: "pp1", label: "Full name", type: "text", required: true, filterable: true },
    { id: "pp2", label: "Date of birth", type: "date", required: false, filterable: true },
    { id: "pp3", label: "Nationality", type: "relationship", required: false, filterable: true },
    { id: "pp4", label: "Photo", type: "image", required: false, filterable: false },
  ],
};

export const defaultTemplateProperties: TemplateProperty[] = [
  { id: "dp1", label: "Title", type: "text", required: true, filterable: true },
  { id: "dp2", label: "Date", type: "date", required: false, filterable: true },
  { id: "dp3", label: "Description", type: "markdown", required: false, filterable: false },
];

export const propertyTypeLabels: Record<PropertyType, string> = {
  text: "Text",
  select: "Select",
  relationship: "Relationship",
  date: "Date",
  numeric: "Number",
  markdown: "Rich text",
  geolocation: "Geolocation",
  image: "Image",
};

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
];

/** Representative items per thesaurus, for the thesaurus detail editor.
 *  (Prototype sample — not the full `itemCount` set.) */
export const seedThesaurusItems: Record<string, string[]> = {
  t1: [
    "Arbitrary detention",
    "Enforced disappearance",
    "Extrajudicial execution",
    "Torture",
    "Forced displacement",
    "Denial of fair trial",
  ],
  t2: [
    "American Convention on Human Rights",
    "Convention against Torture",
    "Geneva Conventions",
    "ICCPR",
  ],
  t3: ["Open", "Under review", "Admissible", "Decided", "Archived"],
  t4: ["Judgment", "Petition", "Amicus brief", "Witness statement", "Press release"],
  t5: ["Americas", "Andean region", "Central America", "Caribbean", "Southern Cone"],
};

// ── Relationship types ──────────────────────────────────────────────────────
export interface SettingsRelationType {
  id: string;
  name: string;
  usageCount: number;
}

export const seedRelationTypes: SettingsRelationType[] = [
  { id: "r1", name: "Mentions", usageCount: 142 },
  { id: "r2", name: "Relates to", usageCount: 87 },
  { id: "r3", name: "Cites", usageCount: 54 },
  { id: "r4", name: "Refers to", usageCount: 31 },
  { id: "r5", name: "Represented by", usageCount: 12 },
];

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
}

export const seedActivityLog: SettingsLogEntry[] = [
  { id: "l1", time: "2026-06-15 18:42", user: "admin", method: "UPDATE", summary: "Updated entity “Velásquez-Rodríguez v. Honduras”" },
  { id: "l2", time: "2026-06-15 17:10", user: "mlopez", method: "CREATE", summary: "Created relationship type “Represented by”" },
  { id: "l3", time: "2026-06-15 14:55", user: "mlopez", method: "CREATE", summary: "Created entity “Case 12.250 (Bámaca Velásquez)”" },
  { id: "l4", time: "2026-06-14 09:30", user: "admin", method: "DELETE", summary: "Deleted user “t.guest@example.org”" },
  { id: "l5", time: "2026-06-13 22:05", user: "system", method: "MIGRATE", summary: "Ran migration “add-relationship-tiers”" },
  { id: "l6", time: "2026-06-13 11:48", user: "jnkemba", method: "UPDATE", summary: "Edited thesaurus “Violation types”" },
];

// ── Menu (navlinks) ─────────────────────────────────────────────────────────
export interface SettingsMenuLink {
  id: string;
  title: string;
  url: string;
  type: "link" | "group";
}

export const seedMenuLinks: SettingsMenuLink[] = [
  { id: "m1", title: "Library", url: "/library", type: "link" },
  { id: "m2", title: "About", url: "/page/about", type: "link" },
  { id: "m3", title: "Resources", url: "", type: "group" },
  { id: "m4", title: "Methodology", url: "/page/methodology", type: "link" },
  { id: "m5", title: "Contact", url: "/page/contact", type: "link" },
];

// ── Filters configuration ───────────────────────────────────────────────────
// Which templates surface as library filters (reuses the template list).
export interface SettingsFilterConfig {
  templateId: string;
  name: string;
  color: string;
  active: boolean;
}

export const seedFilterConfig: SettingsFilterConfig[] = seedTemplates.map((t) => ({
  templateId: t.id,
  name: t.name,
  color: t.color,
  active: !["document", "organization"].includes(t.id),
}));

// ── Metadata extraction (IX) ────────────────────────────────────────────────
export type ExtractorStatus = "ready" | "training" | "processing" | "error";

export interface SettingsExtractor {
  id: string;
  property: string;
  template: string;
  status: ExtractorStatus;
  documents: number;
  accuracy: number | null;
}

export const seedExtractors: SettingsExtractor[] = [
  { id: "x1", property: "Date filed", template: "Court Case", status: "ready", documents: 142, accuracy: 94 },
  { id: "x2", property: "Respondent state", template: "Court Case", status: "ready", documents: 142, accuracy: 88 },
  { id: "x3", property: "Court", template: "Judgment", status: "training", documents: 56, accuracy: null },
  { id: "x4", property: "Date of birth", template: "Person", status: "processing", documents: 38, accuracy: 71 },
  { id: "x5", property: "Article", template: "Right", status: "error", documents: 12, accuracy: null },
];

// ── Paragraph extraction ────────────────────────────────────────────────────
export interface SettingsParagraphJob {
  id: string;
  template: string;
  status: ExtractorStatus;
  paragraphs: number;
}

export const seedParagraphJobs: SettingsParagraphJob[] = [
  { id: "pe1", template: "Judgment", status: "ready", paragraphs: 1840 },
  { id: "pe2", template: "Court Case", status: "processing", paragraphs: 612 },
  { id: "pe3", template: "Document", status: "ready", paragraphs: 327 },
];

// ── Preserve ────────────────────────────────────────────────────────────────
export interface SettingsPreserveToken {
  id: string;
  name: string;
  token: string;
  capturedCount: number;
  lastRun: string;
}

export const seedPreserveTokens: SettingsPreserveToken[] = [
  { id: "pr1", name: "Court press releases", token: "pk_live_a1b2…f9", capturedCount: 214, lastRun: "2026-06-15 06:00" },
  { id: "pr2", name: "NGO bulletins", token: "pk_live_c3d4…2a", capturedCount: 87, lastRun: "2026-06-14 06:00" },
];

// ── Uploads (custom uploads) ────────────────────────────────────────────────
export interface SettingsUpload {
  id: string;
  name: string;
  type: "image" | "pdf" | "font" | "other";
  size: string;
  url: string;
}

export const seedUploads: SettingsUpload[] = [
  { id: "up1", name: "logo-iachr.svg", type: "image", size: "12 KB", url: "/uploads/logo-iachr.svg" },
  { id: "up2", name: "cover-banner.jpg", type: "image", size: "248 KB", url: "/uploads/cover-banner.jpg" },
  { id: "up3", name: "style-guide.pdf", type: "pdf", size: "1.4 MB", url: "/uploads/style-guide.pdf" },
  { id: "up4", name: "Inter-brand.woff2", type: "font", size: "64 KB", url: "/uploads/Inter-brand.woff2" },
];
