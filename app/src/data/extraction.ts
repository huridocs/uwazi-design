/** Metadata extraction (Uwazi's IX): extractors and the run states their
 *  model goes through. Copy and rules are Uwazi's (`IXDashboard`,
 *  `ExtractorModal`, `IXSuggestions`; uwazi-settings-inventory.md › Part 5). */

/** Uwazi's model status (`ixStatus`), plus `error` with its message. */
export type IxRunStatus =
  | "ready"
  | "sending_labeled_data"
  | "processing_model"
  | "processing_suggestions"
  | "processing_auto_accept"
  | "cancel"
  | "error";

/** The footer line for a run status (Uwazi's `ixmessages`). */
export const IX_RUN_TEXT: Record<IxRunStatus, string> = {
  ready: "",
  sending_labeled_data: "Sending labeled data...",
  processing_model: "Training model...",
  processing_suggestions: "Finding suggestions...",
  processing_auto_accept: "Accepting suggestions...",
  cancel: "Canceling...",
  error: "Error",
};

/** The list's status pill: what an admin scans for. */
export type ExtractorStatus = "ready" | "training" | "processing" | "error";
export const statusOfRun = (s: IxRunStatus): ExtractorStatus =>
  s === "ready" ? "ready" : s === "error" ? "error" : s === "sending_labeled_data" || s === "processing_model" ? "training" : "processing";

/** Property types an extractor can fill, plus the title. */
export const IX_PROPERTY_TYPES = ["text", "numeric", "date", "select", "multiselect", "relationship", "markdown"] as const;

/** The options a train or process run was started with, kept so Retry can
 *  start it again. */
export interface IxRun {
  kind: "train" | "process";
  /** Train: find suggestions after training, how many. Process: find for the
   *  filtered rows. 0 = no find. */
  find: number;
  samplePolicy?: "only_marked" | "marked_plus_labeled";
  filters?: { nonProcessed: boolean; obsolete: boolean; error: boolean };
  autoAccept?: boolean;
  acceptFrom?: "previous" | "all";
  overwrite?: "blank_only" | "all";
  /** Process selected: the entity ids ticked. */
  only?: string[];
}

export interface IxExtractor {
  id: string;
  name: string;
  /** The property's `name` in every selected template, or "title". */
  property: string;
  templates: string[];
  /** "pdf", "title", or a text/markdown property's name. */
  source: string;
  status: IxRunStatus;
  /** With `status: "error"`. */
  error?: string;
  /** While finding suggestions. */
  progress?: { processed: number; total: number };
  lastRun?: IxRun;
  /** Per template, how many times its suggestions were discarded (a property
   *  change discards all; removing a template discards its own). Suggestions
   *  of a template at 0 are the seed's; above 0 they start unprocessed. */
  epochs?: Record<string, number>;
}

/** The Sample's extractors. Other collections start with none. */
export const seedIxExtractors: IxExtractor[] = [
  { id: "ix1", name: "Date filed", property: "dateFiled", templates: ["court_case"], source: "pdf", status: "ready" },
  { id: "ix2", name: "Respondent state", property: "respondent", templates: ["court_case"], source: "pdf", status: "ready" },
  { id: "ix3", name: "Hearing and judgment date", property: "date", templates: ["hearing", "judgment"], source: "pdf", status: "ready" },
  { id: "ix4", name: "Country region", property: "region", templates: ["country"], source: "title", status: "ready" },
  {
    id: "ix5",
    name: "Judgment outcome",
    property: "outcome",
    templates: ["judgment"],
    source: "pdf",
    status: "error",
    error: "Documents are not segmented yet. Try again once PDF segmentation has finished.",
  },
];

/** A small stable hash, for the mock's deterministic suggestions. */
export function hashOf(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
