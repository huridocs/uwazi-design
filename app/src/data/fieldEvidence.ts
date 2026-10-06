// Per-property evidence: which sources back a record's field, and how well.
// A collection that records it (the Nepal corpus) registers a provider; the
// record reads through `fieldEvidence`, so no component imports a corpus.
import { atom } from "jotai";
import type { Verification } from "./references";

/** One set of sources backing one or more of a record's properties. */
export interface FieldEvidence {
  /** Template property names this row backs. */
  props: string[];
  /** Record ids of the sources. */
  sources: string[];
  verification: Verification;
  /** Research's note on how the sources were read. */
  note?: string;
  /** Not stated by the sources for this field: carried over from the
   *  record's other facts or from references that report on it. */
  inferred?: boolean;
}

interface EvidenceProvider {
  /** Does this provider answer for the record? Known before loading. */
  covers(entityId: string): boolean;
  /** The record's rows, or undefined while the provider has not loaded. */
  rows(entityId: string): FieldEvidence[] | undefined;
  /** Fetch whatever the provider needs. Resolves once; later calls are free. */
  load(): Promise<unknown>;
}

const providers: EvidenceProvider[] = [];
export function registerEvidenceProvider(p: EvidenceProvider): void {
  providers.push(p);
}

/** Bumped when a provider finishes loading, so readers re-render. */
export const evidenceVersionAtom = atom(0);

export function evidenceProviderFor(entityId: string): EvidenceProvider | undefined {
  return providers.find((p) => p.covers(entityId));
}

/** The rows that back `fieldId` on the record, explicit before inferred.
 *  Undefined while loading; [] when nothing backs the field. */
export function fieldEvidence(entityId: string, fieldId: string): FieldEvidence[] | undefined {
  const rows = evidenceProviderFor(entityId)?.rows(entityId);
  if (!rows) return undefined;
  return rows
    .filter((r) => r.props.includes(fieldId))
    .sort((a, b) => Number(!!a.inferred) - Number(!!b.inferred));
}
