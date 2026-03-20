export type ImportStatus =
  | "completed"
  | "completed_warnings"
  | "completed_errors"
  | "processing"
  | "uploading"
  | "failed";

export interface ImportIssue {
  id: string;
  field: string;
  issue: string;
  type: "warning" | "error";
  date: string;
}

export interface ImportEntry {
  id: string;
  filename: string;
  template: string;
  status: ImportStatus;
  progress: number;
  entities: number;
  failed: number;
  warnings: number;
  errors: number;
  date: string;
  issues: ImportIssue[];
}

export const templates = [
  { id: "t1", name: "Court Case" },
  { id: "t2", name: "Judgment" },
  { id: "t3", name: "Person" },
  { id: "t4", name: "Country" },
  { id: "t5", name: "Violation" },
  { id: "t6", name: "Right" },
  { id: "t7", name: "Organization" },
  { id: "t8", name: "Document" },
];

export const defaultImports: ImportEntry[] = [
  {
    id: "imp1",
    filename: "cases.csv",
    template: "Court Case",
    status: "completed",
    progress: 100,
    entities: 847,
    failed: 0,
    warnings: 0,
    errors: 0,
    date: "2026-03-15",
    issues: [],
  },
  {
    id: "imp2",
    filename: "locations.csv",
    template: "Country",
    status: "processing",
    progress: 64,
    entities: 312,
    failed: 0,
    warnings: 0,
    errors: 0,
    date: "2026-03-18",
    issues: [],
  },
  {
    id: "imp3",
    filename: "judges.zip",
    template: "Person",
    status: "failed",
    progress: 37,
    entities: 0,
    failed: 156,
    warnings: 0,
    errors: 3,
    date: "2026-03-17",
    issues: [
      { id: "iss1", field: "date_of_birth", issue: "Invalid date format in 89 rows", type: "error", date: "2026-03-17" },
      { id: "iss2", field: "nationality", issue: "Unrecognized thesaurus value in 42 rows", type: "error", date: "2026-03-17" },
      { id: "iss3", field: "file_attachment", issue: "ZIP archive corrupted — extraction failed", type: "error", date: "2026-03-17" },
    ],
  },
  {
    id: "imp4",
    filename: "witnesses.csv",
    template: "Person",
    status: "completed_warnings",
    progress: 100,
    entities: 523,
    failed: 0,
    warnings: 12,
    errors: 0,
    date: "2026-03-16",
    issues: [
      { id: "iss4", field: "phone_number", issue: "Missing value — left blank in 5 rows", type: "warning", date: "2026-03-16" },
      { id: "iss5", field: "address", issue: "Truncated to 255 characters in 4 rows", type: "warning", date: "2026-03-16" },
      { id: "iss6", field: "email", issue: "Invalid email format in 3 rows", type: "warning", date: "2026-03-16" },
    ],
  },
  {
    id: "imp5",
    filename: "hearings.csv",
    template: "Court Case",
    status: "completed_errors",
    progress: 100,
    entities: 1204,
    failed: 18,
    warnings: 7,
    errors: 4,
    date: "2026-03-14",
    issues: [
      { id: "iss7", field: "case_number", issue: "Duplicate case number in 8 rows", type: "error", date: "2026-03-14" },
      { id: "iss8", field: "hearing_date", issue: "Date out of range in 10 rows", type: "error", date: "2026-03-14" },
      { id: "iss9", field: "judge_name", issue: "Unresolved relationship in 4 rows", type: "error", date: "2026-03-14" },
      { id: "iss10", field: "location", issue: "Missing value — left blank in 3 rows", type: "warning", date: "2026-03-14" },
      { id: "iss11", field: "notes", issue: "Truncated to 255 characters in 2 rows", type: "warning", date: "2026-03-14" },
      { id: "iss12", field: "transcript", issue: "Encoding issue — replaced with fallback in 2 rows", type: "warning", date: "2026-03-14" },
      { id: "iss13", field: "status", issue: "Unrecognized thesaurus value in 4 rows", type: "error", date: "2026-03-14" },
    ],
  },
];
