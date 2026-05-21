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
const DOC_VELASQUEZ_EN = "/docs/Velasquez-Rodriguez_v_Honduras_Judgment_1988_EN.pdf";
const DOC_VELASQUEZ_ES = "/docs/Velasquez-Rodriguez_c_Honduras_Sentencia_1988_ES.pdf";
const DOC_BAMACA_EN    = "/docs/Bamaca-Velasquez_v_Guatemala_Judgment_2000_EN.pdf";
const DOC_BAMACA_ES    = "/docs/Bamaca-Velasquez_c_Guatemala_Sentencia_2000_ES.pdf";
const DOC_GELMAN_EN    = "/docs/Gelman_v_Uruguay_Judgment_2011_EN.pdf";
const DOC_GELMAN_ES    = "/docs/Gelman_c_Uruguay_Sentencia_2011_ES.pdf";

export const files: FileEntry[] = [
  // Judgment — 4 translations
  {
    id: "f-judg-en",
    groupId: "g-judgment",
    name: "Velasquez-Rodriguez_v_Honduras_Judgment_1988.pdf",
    type: "pdf",
    size: "114 KB",
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
    // No official French translation exists in the IACtHR archive; this entry
    // points at the Bámaca-Velásquez judgment (Guatemala) as a stand-in so
    // the language-switcher demo has distinct content for FR.
    name: "Bamaca-Velasquez_c_Guatemala_Sentencia_2000.pdf",
    type: "pdf",
    size: "924 KB",
    language: "FR",
    modified: "2000-11-25",
    url: DOC_BAMACA_ES,
  },
  {
    id: "f-judg-ar",
    groupId: "g-judgment",
    // No Arabic translation either; using the English Bámaca judgment as a
    // stand-in for the AR slot.
    name: "Bamaca-Velasquez_v_Guatemala_Judgment_2000.pdf",
    type: "pdf",
    size: "948 KB",
    language: "AR",
    modified: "2000-11-25",
    url: DOC_BAMACA_EN,
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

