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
  /** Stub URL for the viewer — every seeded file points at /sample.pdf so the
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
    title: "Velásquez-Rodríguez v. Honduras — Judgment (1987)",
    isPrimary: true,
    order: 0,
  },
  // Final report with 2 translations.
  {
    id: "g-final-report",
    title: "Final Report — La Tablada Investigation",
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

// Bundled sample PDFs in app/public/ — kept local so react-pdf doesn't run
// into CORS issues fetching from third-party hosts. Each file in the seed
// points at one of these so the viewer renders distinct content per row.
const SAMPLE_MAIN = "/sample.pdf";            // canonical IACHR judgment demo
const SAMPLE_ACADEMIC = "/tracemonkey.pdf";   // Mozilla PDF.js academic paper
const SAMPLE_REPORT = "/report-sample.pdf";   // Adobe sample report
const SAMPLE_DOC = "/sample-doc.pdf";         // W3 dummy single-page

export const files: FileEntry[] = [
  // Judgment — 4 translations
  {
    id: "f-judg-en",
    groupId: "g-judgment",
    name: "Velasquez-Rodriguez_v_Honduras_Judgment_1987.pdf",
    type: "pdf",
    size: "114 KB",
    language: "EN",
    modified: "1987-06-26",
    url: SAMPLE_MAIN,
  },
  {
    id: "f-judg-es",
    groupId: "g-judgment",
    name: "Velasquez-Rodriguez_c_Honduras_Sentencia_1987.pdf",
    type: "pdf",
    size: "118 KB",
    language: "ES",
    modified: "1987-06-26",
    url: SAMPLE_ACADEMIC,
  },
  {
    id: "f-judg-fr",
    groupId: "g-judgment",
    name: "Velasquez-Rodriguez_c_Honduras_Arret_1987.pdf",
    type: "pdf",
    size: "121 KB",
    language: "FR",
    modified: "1988-01-15",
    url: SAMPLE_REPORT,
  },
  {
    id: "f-judg-ar",
    groupId: "g-judgment",
    name: "Velasquez-Rodriguez_Honduras_Hukm_1987.pdf",
    type: "pdf",
    size: "127 KB",
    language: "AR",
    modified: "1988-04-02",
    url: SAMPLE_DOC,
  },
  // Final Report — 2 translations
  {
    id: "f-report-en",
    groupId: "g-final-report",
    name: "Final_Report_La_Tablada_Investigation.pdf",
    type: "pdf",
    size: "2.3 MB",
    language: "EN",
    modified: "1991-11-10",
    url: SAMPLE_REPORT,
  },
  {
    id: "f-report-es",
    groupId: "g-final-report",
    name: "Informe_Final_Investigacion_La_Tablada.pdf",
    type: "pdf",
    size: "2.4 MB",
    language: "ES",
    modified: "1991-11-10",
    url: SAMPLE_ACADEMIC,
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
    url: SAMPLE_DOC,
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

