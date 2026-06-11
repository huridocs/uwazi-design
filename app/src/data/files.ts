export type FileKind = "pdf" | "document" | "audio" | "video" | "image" | "link";

export interface FileEntry {
  id: string;
  /** Each file belongs to exactly one DocumentGroup; siblings in a group are
   *  translations of each other. */
  groupId: string;
  name: string;
  /** Free-form language code. UI exposes EN/ES/FR/AR plus "+ Add language". */
  language: string;
  type: FileKind;
  size: string;
  modified: string;
  /** Stub URL for the viewer — every seeded file points at a real IACtHR judgment in /docs/ so the
   *  prototype can demo file-switching without juggling real assets. */
  url?: string;
}

export interface DocumentGroup {
  id: string;
  /** Human-readable doc title (falls back to first file's name). */
  title: string;
  /** Primary = shown in the Document tab viewer. Supporting = listed only. */
  isPrimary: boolean;
  /** Stable display order across the primaries/supporting sections. */
  order: number;
}

export const documentGroups: DocumentGroup[] = [
  // Primary documents — the merits judgment with 4 translations.
  {
    id: "g-judgment",
    title: "Velásquez-Rodríguez v. Honduras — Judgment (1988)",
    isPrimary: true,
    order: 0,
  },
  // Second primary — Gelman v. Uruguay judgment with 2 translations.
  // Group id kept as `g-final-report` for seed stability; only the
  // selector-visible title reflects the actual vendored PDF.
  {
    id: "g-final-report",
    title: "Gelman v. Uruguay — Judgment (2011)",
    isPrimary: true,
    order: 1,
  },
  // Supporting groups (one file each in the seed; users can add translations).
  { id: "g-hearing-audio", title: "Hearing recording", isPrimary: false, order: 2 },
  { id: "g-press-conf", title: "Press conference recording", isPrimary: false, order: 3 },
  { id: "g-evidence-photo", title: "Evidence photo", isPrimary: false, order: 4 },
  { id: "g-witness-doc", title: "Witness testimony transcript", isPrimary: false, order: 5 },
  { id: "g-external-link", title: "External news coverage", isPrimary: false, order: 6 },
];

// Real Inter-American Court of Human Rights judgments, vendored in
// `app/public/docs/`. Sourced from corteidh.or.cr via Wayback Machine since
// the live site blocks direct downloads. Bundled locally so react-pdf renders
// them without CORS hits, and the document viewer shows distinct authentic
// content per row — handy when iterating on the Connections / minimap UI.
export const DOC_VELASQUEZ_EN = "/docs/Velasquez-Rodriguez_v_Honduras_Judgment_1988_EN.pdf";
export const DOC_VELASQUEZ_ES = "/docs/Velasquez-Rodriguez_c_Honduras_Sentencia_1988_ES.pdf";
export const DOC_GELMAN_EN    = "/docs/Gelman_v_Uruguay_Judgment_2011_EN.pdf";
export const DOC_GELMAN_ES    = "/docs/Gelman_c_Uruguay_Sentencia_2011_ES.pdf";

export const files: FileEntry[] = [
  // Judgment — 4 translations
  {
    id: "f-judg-en",
    groupId: "g-judgment",
    name: "Velasquez-Rodriguez_v_Honduras_Judgment_1988.pdf",
    type: "pdf",
    size: "213 KB",
    language: "EN",
    modified: "1988-07-29",
    url: DOC_VELASQUEZ_EN,
  },
  {
    id: "f-judg-es",
    groupId: "g-judgment",
    name: "Velasquez-Rodriguez_c_Honduras_Sentencia_1988.pdf",
    type: "pdf",
    size: "191 KB",
    language: "ES",
    modified: "1988-07-29",
    url: DOC_VELASQUEZ_ES,
  },
  {
    id: "f-judg-fr",
    groupId: "g-judgment",
    // No official French PDF exists in the IACtHR archive; this FR slot is the
    // same Velásquez judgment, so the PDF view falls back to the EN file while
    // the text/HTML rendition shows the French translation. Keeping one
    // document keeps the references aligned across languages.
    name: "Velasquez-Rodriguez_c_Honduras_Arret_1988.pdf",
    type: "pdf",
    size: "213 KB",
    language: "FR",
    modified: "1988-07-29",
    url: DOC_VELASQUEZ_EN,
  },
  {
    id: "f-judg-ar",
    groupId: "g-judgment",
    // No Arabic PDF either; same Velásquez judgment, EN PDF fallback with an
    // Arabic text/HTML rendition.
    name: "Velasquez-Rodriguez_Honduras_Hukm_1988.pdf",
    type: "pdf",
    size: "213 KB",
    language: "AR",
    modified: "1988-07-29",
    url: DOC_VELASQUEZ_EN,
  },
  // Final Report — Gelman v. Uruguay judgment used as the "report" doc since
  // the original La Tablada IACHR report isn't available as a standalone PDF.
  {
    id: "f-report-en",
    groupId: "g-final-report",
    name: "Gelman_v_Uruguay_Judgment_2011.pdf",
    type: "pdf",
    size: "606 KB",
    language: "EN",
    modified: "2011-02-24",
    url: DOC_GELMAN_EN,
  },
  {
    id: "f-report-es",
    groupId: "g-final-report",
    name: "Gelman_c_Uruguay_Sentencia_2011.pdf",
    type: "pdf",
    size: "738 KB",
    language: "ES",
    modified: "2011-02-24",
    url: DOC_GELMAN_ES,
  },
  // Supporting — one file per group, mixed kinds
  {
    id: "f-hearing-audio",
    groupId: "g-hearing-audio",
    name: "audiencia_velasquez_rodriguez_1987.wav",
    type: "audio",
    size: "18.7 MB",
    language: "ES",
    modified: "1987-09-15",
  },
  {
    id: "f-press-conf",
    groupId: "g-press-conf",
    name: "press_conference_commission.mp4",
    type: "video",
    size: "84.2 MB",
    language: "ES",
    modified: "1988-03-22",
  },
  {
    id: "f-evidence-photo",
    groupId: "g-evidence-photo",
    name: "evidence_site_la_tablada.jpg",
    type: "image",
    size: "1.6 MB",
    language: "—",
    modified: "1989-02-11",
  },
  {
    id: "f-witness-doc",
    groupId: "g-witness-doc",
    name: "testimonio_testigos_velasquez_rodriguez.pdf",
    type: "pdf",
    size: "4.1 MB",
    language: "ES",
    modified: "1987-04-22",
    url: DOC_GELMAN_ES,
  },
  {
    id: "f-external-link",
    groupId: "g-external-link",
    name: "https://youtube.com/watch?v=iachr-velasquez",
    type: "link",
    size: "—",
    language: "ES",
    modified: "2019-03-10",
  },
];

/** Per-entity primary document for doc-bearing entities other than the main
 *  one. The actual PDF bytes are a stand-in (the bundled Velásquez / Gelman
 *  judgments) — mock-only, same convention as the FR/AR fallbacks above — but
 *  the group title, file names, and language set are derived from the entity so
 *  the Files tab and Document viewer read as that entity's own corpus rather
 *  than e3's. A single EN + ES primary group is enough to exercise the UI. */
export function entityDocument(
  entityId: string,
  title: string,
  modified: string,
  variant: "velasquez" | "gelman" = "velasquez",
): { group: DocumentGroup; files: FileEntry[] } {
  const groupId = `g-${entityId}`;
  const slug = title.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const [enUrl, esUrl] =
    variant === "gelman" ? [DOC_GELMAN_EN, DOC_GELMAN_ES] : [DOC_VELASQUEZ_EN, DOC_VELASQUEZ_ES];
  return {
    group: { id: groupId, title, isPrimary: true, order: 0 },
    files: [
      { id: `f-${entityId}-en`, groupId, name: `${slug}_EN.pdf`, type: "pdf", size: "213 KB", language: "EN", modified, url: enUrl },
      { id: `f-${entityId}-es`, groupId, name: `${slug}_ES.pdf`, type: "pdf", size: "191 KB", language: "ES", modified, url: esUrl },
    ],
  };
}

