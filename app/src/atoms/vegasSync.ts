// The Las Vegas sync analysis (utils/syncAnalysis.ts) as an atom: null until
// the corpus has loaded, then computed once. It reads the corpus as built, not
// the Library's edit overlay: the annotations are references, which the
// prototype does not edit.
import { atom } from "jotai";
import { vegasReadyAtom } from "./dataSource";
import { vegasCorpus } from "../data/vegas/load";
import { analyseSync, type SyncAnalysis } from "../utils/syncAnalysis";

let cached: SyncAnalysis | null = null;

export const vegasSyncAtom = atom<SyncAnalysis | null>((get) => {
  get(vegasReadyAtom);
  const corpus = vegasCorpus();
  if (!corpus) return null;
  return (cached ??= analyseSync(corpus.entities, corpus.references));
});
