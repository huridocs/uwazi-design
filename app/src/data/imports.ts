/** Import CSV (Uwazi's `csv.v2`): one record per registered import, as
 *  `GET /api/csvImportEntities/imports/:id` returns it, with its row errors.
 *  The pipeline and copy are Uwazi's (`statusMessages.ts`, `ImportsTable.tsx`,
 *  `UploadStatus.tsx`); see uwazi-settings-inventory.md › Import CSV. */

/** The stages a job walks through, in order. */
export type CsvStage = "queued" | "validating" | "extracting" | "scanning" | "thesauri" | "relationships" | "entities";
/** A stage, or where the job ended (or a retry). */
export type CsvStatus = CsvStage | "retrying" | "completed" | "failed" | "cancelled";

export const CSV_STAGES: CsvStage[] = ["queued", "validating", "extracting", "scanning", "thesauri", "relationships", "entities"];

/** Uwazi's status titles and descriptions, exact. */
export const CSV_STATUS_TEXT: Record<CsvStatus | "completedWithErrors", { title: string; description: string }> = {
  queued: { title: "Queued", description: "This import is waiting in queue." },
  validating: { title: "Validating", description: "Validating file structure and headers." },
  extracting: { title: "Extracting files", description: "Extracting files from uploaded package." },
  scanning: { title: "Scanning", description: "Scanning rows before import." },
  thesauri: { title: "Creating thesauri", description: "Preparing required thesauri values." },
  relationships: { title: "Creating relationships", description: "Preparing required relationships." },
  entities: { title: "Creating entities", description: "Import is currently processing rows." },
  retrying: { title: "Retrying", description: "Import is retrying after an error." },
  completed: { title: "Completed", description: "Import finished successfully." },
  completedWithErrors: { title: "Completed with errors", description: "Import finished with errors. Review details below." },
  failed: { title: "Failed", description: "Import failed. Review details below." },
  cancelled: { title: "Cancelled", description: "Import was cancelled." },
};

export const isTerminal = (s: CsvStatus) => s === "completed" || s === "failed" || s === "cancelled";

/** A row the job could not write. `row` is the spreadsheet row: the header is
 *  row 1, so the first data row is 2. */
export interface CsvRowError {
  row: number;
  property: string;
  message: string;
}

export interface CsvImport {
  id: string;
  filename: string;
  /** A template id of the import's collection. A deleted template shows its
   *  raw id, as in Uwazi. */
  templateId: string;
  status: CsvStatus;
  /** Set once a retry happened, so the stepper shows it. */
  retried?: boolean;
  /** The stage a cancel or failure stopped at. */
  stoppedAt?: CsvStage;
  /** epoch ms */
  created: number;
  updated: number;
  /** Who registered it. */
  user: string;
  totalRows: number;
  rowsProcessed: number;
  entitiesCreated: number;
  entitiesUpdated: number;
  rowsFailed: number;
  thesauriValuesCreated: number;
  relatedEntitiesCreated: number;
  /** A job failure (status `failed`). */
  failure?: { message: string; stage: string; code: string; retryable: boolean };
  rowErrors: CsvRowError[];
  /** Row errors the job will meet while it runs (the mock's script). */
  plannedErrors?: CsvRowError[];
  /** Rows per runner tick in "Creating entities". */
  rate?: number;
  /** Ticks spent in the current stage. */
  ticks?: number;
  /** Another import this one waits behind (stays Queued until it ends). */
  waitFor?: string;
}

/** The Uwazi completed-with-errors case: completed, some rows failed. */
export const csvTitle = (i: Pick<CsvImport, "status" | "rowsFailed">) =>
  CSV_STATUS_TEXT[i.status === "completed" && i.rowsFailed > 0 ? "completedWithErrors" : i.status];

const at = (iso: string) => new Date(iso).getTime();

/** The Sample's imports. Other collections start with none. */
export const seedCsvImports: CsvImport[] = [
  {
    id: "imp1",
    filename: "cases.csv",
    templateId: "court_case",
    status: "completed",
    created: at("2026-02-18T15:24:10"),
    updated: at("2026-02-18T15:31:52"),
    user: "admin",
    totalRows: 932,
    rowsProcessed: 932,
    entitiesCreated: 920,
    entitiesUpdated: 12,
    rowsFailed: 0,
    thesauriValuesCreated: 14,
    relatedEntitiesCreated: 47,
    rowErrors: [],
  },
  {
    id: "imp2",
    filename: "locations.csv",
    templateId: "country",
    status: "entities",
    created: at("2026-02-19T10:08:31"),
    updated: at("2026-02-19T10:12:05"),
    user: "mlopez",
    totalRows: 634,
    rowsProcessed: 412,
    entitiesCreated: 409,
    entitiesUpdated: 0,
    rowsFailed: 3,
    thesauriValuesCreated: 4,
    relatedEntitiesCreated: 12,
    rowErrors: [
      { row: 57, property: "region", message: "Thesaurus value “Caribe Norte” not found in “Regions”." },
      { row: 203, property: "", message: "Row is empty or malformed." },
      { row: 388, property: "capital", message: "Related entity “Ciudad Vieja” not found." },
    ],
    // A long job, so it is still running when someone opens it.
    rate: 1,
  },
  {
    id: "imp3",
    filename: "judges-import.zip",
    templateId: "person",
    status: "failed",
    stoppedAt: "extracting",
    created: at("2026-02-17T16:51:02"),
    updated: at("2026-02-17T16:51:09"),
    user: "admin",
    totalRows: 0,
    rowsProcessed: 0,
    entitiesCreated: 0,
    entitiesUpdated: 0,
    rowsFailed: 0,
    thesauriValuesCreated: 0,
    relatedEntitiesCreated: 0,
    failure: {
      message: "import.csv not found at zip root",
      stage: "Extracting files",
      code: "IMPORT_CSV_NOT_FOUND",
      retryable: false,
    },
    rowErrors: [],
  },
  {
    id: "imp4",
    filename: "witnesses.csv",
    templateId: "person",
    status: "completed",
    created: at("2026-02-15T09:42:44"),
    updated: at("2026-02-15T09:44:30"),
    user: "admin",
    totalRows: 156,
    rowsProcessed: 156,
    entitiesCreated: 154,
    entitiesUpdated: 0,
    rowsFailed: 2,
    thesauriValuesCreated: 5,
    relatedEntitiesCreated: 28,
    rowErrors: [
      { row: 14, property: "email", message: "Invalid value format for property “email”." },
      { row: 87, property: "date_of_birth", message: "Value cannot be transformed to the correct type." },
    ],
  },
  {
    id: "imp5",
    // Main's Sample has no Hearing template (playground's Sample v4 does).
    filename: "judgments-2026.csv",
    templateId: "judgment",
    status: "queued",
    created: at("2026-02-20T11:17:26"),
    updated: at("2026-02-20T11:17:26"),
    user: "mlopez",
    totalRows: 1204,
    rowsProcessed: 0,
    entitiesCreated: 0,
    entitiesUpdated: 0,
    rowsFailed: 0,
    thesauriValuesCreated: 0,
    relatedEntitiesCreated: 0,
    rowErrors: [],
    waitFor: "imp2",
  },
];
