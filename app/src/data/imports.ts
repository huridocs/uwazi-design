export type ImportStatus =
  | "completed"
  | "completed_warnings"
  | "completed_errors"
  | "processing"
  | "uploading"
  | "pending"
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
  // Total row count in the CSV (drives the "X / Y" progress label).
  totalRows?: number;
  // Detail-view extras (optional; detail view falls back to sensible defaults)
  createdBy?: string;
  time?: string;               // e.g. "3:24 PM"
  sourceKind?: "CSV" | "ZIP";
  sourceSizeKb?: number;
  thesauriTouched?: number;
  relationshipsCreated?: number;
  filesExtracted?: number;
  thesauriObserved?: number;
  thesauriCreated?: number;
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

export interface CreatedEntity {
  id: string;
  title: string;
  template: string;
  date: string;
}

const courtCaseNames = [
  "Velásquez Rodríguez v. Honduras", "Godínez Cruz v. Honduras", "Aloeboetoe et al. v. Suriname",
  "Neira Alegría et al. v. Peru", "Caballero Delgado and Santana v. Colombia", "El Amparo v. Venezuela",
  "Garrido and Baigorria v. Argentina", "Loayza Tamayo v. Peru", "Castillo Páez v. Peru",
  "Suárez Rosero v. Ecuador", "Blake v. Guatemala", "Paniagua Morales et al. v. Guatemala",
  "Cantoral Benavides v. Peru", "Durand and Ugarte v. Peru", "Bámaca Velásquez v. Guatemala",
  "Barrios Altos v. Peru", "Hilaire v. Trinidad and Tobago", "Myrna Mack Chang v. Guatemala",
  "Maritza Urrutia v. Guatemala", "Molina Theissen v. Guatemala",
];

const personNames = [
  "Juan Carlos Abella", "María Elena Almeida", "Pedro Sánchez García", "Ana Lucía Flores",
  "Roberto Mendoza", "Carmen Díaz Ortega", "Fernando Torres", "Isabel Ramírez",
  "Diego Morales", "Luisa Fernanda Pérez", "Andrés Martínez", "Claudia Vásquez",
  "Miguel Ángel Reyes", "Patricia Herrera", "Javier Gutiérrez", "Sofía Castillo",
  "Ricardo Vargas", "Daniela Rojas", "Alejandro Ruiz", "Valentina Espinoza",
];

const countryNames = [
  "Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Costa Rica", "Cuba",
  "Dominican Republic", "Ecuador", "El Salvador", "Guatemala", "Haiti", "Honduras",
  "Jamaica", "Mexico", "Nicaragua", "Panama", "Paraguay", "Peru", "Suriname",
];

function namePool(template: string): string[] {
  if (template === "Court Case") return courtCaseNames;
  if (template === "Person") return personNames;
  if (template === "Country") return countryNames;
  return courtCaseNames;
}

export function generateCreatedEntities(entry: ImportEntry): CreatedEntity[] {
  if (entry.entities === 0) return [];
  const pool = namePool(entry.template);
  const count = Math.min(entry.entities, 20); // show up to 20
  return Array.from({ length: count }, (_, i) => ({
    id: `${entry.id}-ent-${i}`,
    title: pool[i % pool.length] + (i >= pool.length ? ` (${Math.floor(i / pool.length) + 1})` : ""),
    template: entry.template,
    date: entry.date,
  }));
}

export const defaultImports: ImportEntry[] = [
  {
    id: "imp1",
    filename: "cases.csv",
    template: "Court Case",
    status: "completed",
    progress: 100,
    entities: 932,
    failed: 0,
    warnings: 0,
    errors: 0,
    date: "2026-02-18",
    totalRows: 932,
    createdBy: "santi",
    time: "3:24 PM",
    sourceKind: "CSV",
    sourceSizeKb: 245,
    thesauriTouched: 3,
    relationshipsCreated: 47,
    filesExtracted: 1,
    thesauriObserved: 128,
    thesauriCreated: 14,
    issues: [],
  },
  {
    id: "imp2",
    filename: "locations.csv",
    template: "Country",
    status: "processing",
    progress: Math.round((412 / 634) * 100),
    entities: 412,
    failed: 3,
    warnings: 0,
    errors: 0,
    date: "2026-02-19",
    totalRows: 634,
    createdBy: "maria",
    time: "10:08 AM",
    sourceKind: "CSV",
    sourceSizeKb: 98,
    thesauriTouched: 1,
    relationshipsCreated: 12,
    filesExtracted: 1,
    thesauriObserved: 52,
    thesauriCreated: 4,
    issues: [],
  },
  {
    id: "imp3",
    filename: "judges-import.zip",
    template: "Judge",
    status: "failed",
    progress: Math.round((89 / 234) * 100),
    entities: 89,
    failed: 12,
    warnings: 0,
    errors: 3,
    date: "2026-02-17",
    totalRows: 234,
    createdBy: "santi",
    time: "4:51 PM",
    sourceKind: "ZIP",
    sourceSizeKb: 1240,
    thesauriTouched: 0,
    relationshipsCreated: 0,
    filesExtracted: 234,
    thesauriObserved: 0,
    thesauriCreated: 0,
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
    entities: 156,
    failed: 2,
    warnings: 12,
    errors: 0,
    date: "2026-02-15",
    totalRows: 156,
    createdBy: "santi",
    time: "9:42 AM",
    sourceKind: "CSV",
    sourceSizeKb: 68,
    thesauriTouched: 2,
    relationshipsCreated: 28,
    filesExtracted: 1,
    thesauriObserved: 43,
    thesauriCreated: 5,
    issues: [
      { id: "iss4", field: "phone_number", issue: "Missing value — left blank in 5 rows", type: "warning", date: "2026-03-16" },
      { id: "iss5", field: "address", issue: "Truncated to 255 characters in 4 rows", type: "warning", date: "2026-03-16" },
      { id: "iss6", field: "email", issue: "Invalid email format in 3 rows", type: "warning", date: "2026-03-16" },
    ],
  },
  {
    id: "imp5",
    filename: "hearings-2026.csv",
    template: "Hearing",
    status: "pending",
    progress: 0,
    entities: 0,
    failed: 0,
    warnings: 0,
    errors: 0,
    date: "2026-02-20",
    totalRows: 1204,
    createdBy: "maria",
    time: "11:17 AM",
    sourceKind: "CSV",
    sourceSizeKb: 412,
    thesauriTouched: 4,
    relationshipsCreated: 82,
    filesExtracted: 1,
    thesauriObserved: 174,
    thesauriCreated: 22,
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
