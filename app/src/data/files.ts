export interface FileEntry {
  id: string;
  name: string;
  type: "pdf" | "audio" | "link" | "document";
  size: string;
  language: string;
  modified: string;
  isDefault?: boolean;
  /** Groups translations of the primary document together */
  group: "primary" | "supporting";
}

export const files: FileEntry[] = [
  // Primary document + translations
  {
    id: "f1",
    name: "cases_report_2024.pdf",
    type: "pdf",
    size: "2.4 MB",
    language: "EN",
    modified: "2024-06-15",
    isDefault: true,
    group: "primary",
  },
  {
    id: "f4",
    name: "informe_casos_2024.pdf",
    type: "document",
    size: "1.8 MB",
    language: "ES",
    modified: "2024-07-02",
    group: "primary",
  },
  {
    id: "f5",
    name: "rapport_affaires_2024.pdf",
    type: "document",
    size: "1.9 MB",
    language: "FR",
    modified: "2024-07-10",
    group: "primary",
  },
  // Supporting files
  {
    id: "f2",
    name: "interview_recording_2024.wav",
    type: "audio",
    size: "18.7 MB",
    language: "EN",
    modified: "2024-06-18",
    group: "supporting",
  },
  {
    id: "f3",
    name: "https://youtube.com/watch?v=abc123",
    type: "link",
    size: "—",
    language: "EN",
    modified: "2024-06-20",
    group: "supporting",
  },
  {
    id: "f6",
    name: "witness_testimony_scan.pdf",
    type: "pdf",
    size: "4.1 MB",
    language: "EN",
    modified: "2024-08-03",
    group: "supporting",
  },
];

export const primaryFiles = files.filter((f) => f.group === "primary");
export const supportingFiles = files.filter((f) => f.group === "supporting");
