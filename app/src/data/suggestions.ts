import type { RelationType, TextSelection } from "./references";

export type SuggestionStatus = "pending" | "accepted" | "rejected";

export interface IxSuggestion {
  id: string;
  sourceSelection: TextSelection;
  proposedTargetEntityId: string;
  proposedRelType: RelationType;
  /** Model confidence 0–1. Surfaced as a faint chip on the row. */
  confidence: number;
  status: SuggestionStatus;
}

/** Seeded IX (Information Extraction) suggestions — the prototype mock for
 *  Uwazi's per-template suggestion review surface. The user accepts a
 *  suggestion into a real reference or rejects it. */
export const suggestions: IxSuggestion[] = [
  {
    id: "sug-1",
    sourceSelection: {
      text: "Manfredo Velásquez was last seen on September 12, 1981, in the custody of agents of the Honduran armed forces.",
      page: 4,
      top: 0.18,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    proposedTargetEntityId: "e26",
    proposedRelType: "mentions",
    confidence: 0.92,
    status: "pending",
  },
  {
    id: "sug-2",
    sourceSelection: {
      text: "the Court has consistently held that the duty of due diligence requires the State to investigate violations promptly.",
      page: 10,
      top: 0.32,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    proposedTargetEntityId: "e34",
    proposedRelType: "cites",
    confidence: 0.86,
    status: "pending",
  },
  {
    id: "sug-3",
    sourceSelection: {
      text: "Article 4 of the American Convention guarantees the right to life as a non-derogable obligation.",
      page: 11,
      top: 0.22,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    proposedTargetEntityId: "e4",
    proposedRelType: "cites",
    confidence: 0.97,
    status: "pending",
  },
  {
    id: "sug-4",
    sourceSelection: {
      text: "the Inter-American Commission referred the case to the Court on April 24, 1986.",
      page: 2,
      top: 0.54,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    proposedTargetEntityId: "e8",
    proposedRelType: "mentions",
    confidence: 0.74,
    status: "pending",
  },
  {
    id: "sug-5",
    sourceSelection: {
      text: "the practice of forced disappearance in Honduras between 1981 and 1984 was systematic and tolerated by senior officials.",
      page: 8,
      top: 0.4,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    proposedTargetEntityId: "e9",
    proposedRelType: "cites",
    confidence: 0.81,
    status: "pending",
  },
];
