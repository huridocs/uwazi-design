// The Las Vegas sync analysis (utils/syncAnalysis.ts) as an atom: null until
// the corpus has loaded, then computed once. It reads the corpus as built, not
// the Library's edit overlay: the annotations are references, which the
// prototype does not edit.
import { atom } from "jotai";
import { vegasReadyAtom } from "./dataSource";
import { vegasSyncAnalysis } from "../data/vegas/load";
import type { SyncAnalysis } from "../utils/syncAnalysis";

export const vegasSyncAtom = atom<SyncAnalysis | null>((get) => {
  get(vegasReadyAtom);
  return vegasSyncAnalysis();
});
