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
    name: "Velasquez-Rodriguez_v_Honduras_Judgment_1987.pdf",
    type: "pdf",
    size: "114 KB",
    language: "EN",
    modified: "1987-06-26",
    isDefault: true,
    group: "primary",
  },
  {
    id: "f4",
    name: "Velasquez-Rodriguez_c_Honduras_Sentencia_1987.pdf",
    type: "document",
    size: "118 KB",
    language: "ES",
    modified: "1987-06-26",
    group: "primary",
  },
  {
    id: "f5",
    name: "Velasquez-Rodriguez_c_Honduras_Arret_1987.pdf",
    type: "document",
    size: "121 KB",
    language: "FR",
    modified: "1988-01-15",
    group: "primary",
  },
  // Supporting files
  {
    id: "f2",
    name: "audiencia_velasquez_rodriguez_1987.wav",
    type: "audio",
    size: "18.7 MB",
    language: "ES",
    modified: "1987-09-15",
    group: "supporting",
  },
  {
    id: "f3",
    name: "https://youtube.com/watch?v=iachr-velasquez",
    type: "link",
    size: "—",
    language: "ES",
    modified: "2019-03-10",
    group: "supporting",
  },
  {
    id: "f6",
    name: "testimonio_testigos_velasquez_rodriguez.pdf",
    type: "pdf",
    size: "4.1 MB",
    language: "ES",
    modified: "1987-04-22",
    group: "supporting",
  },
];

export const primaryFiles = files.filter((f) => f.group === "primary");
export const supportingFiles = files.filter((f) => f.group === "supporting");
