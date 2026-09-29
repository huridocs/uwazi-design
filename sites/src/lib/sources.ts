import type { CollectionId, DataSource } from "../data/types";
import { MockSource } from "../data/mock";

/** One DataSource per collection, shared by the builder and the renderer. */
const sources = new Map<CollectionId, DataSource>();
export function sourceFor(id: CollectionId): DataSource {
  let s = sources.get(id);
  if (!s) sources.set(id, (s = new MockSource(id)));
  return s;
}

export const COLLECTIONS: { id: CollectionId; name: string; blurb: string }[] = [
  { id: "cejil", name: "CEJIL · Summa", blurb: "4,398 records of the Inter-American system: cases, judgments, provisional measures, judges." },
  { id: "sample", name: "Inter-American Cases", blurb: "The prototype's sample: 104 records — cases, hearings, people, states." },
  { id: "artworks", name: "Painting Archive", blurb: "60 paintings and their artists, each with a picture." },
];
