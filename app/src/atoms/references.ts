import { atom } from "jotai";
import { references as initialRefs, Reference } from "../data/references";

export const referencesAtom = atom<Reference[]>(initialRefs);

export const activeRefIdAtom = atom<string | null>(null);

/** ID of a reference that was just clicked in the panel — viewer should scroll to it */
export const scrollToHighlightAtom = atom<string | null>(null);

/** ID of a reference whose highlight was just clicked — panel should scroll to it */
export const scrollToRefAtom = atom<string | null>(null);

/** Active drawer tab — shared so highlight clicks can switch to "references" */
export const activeDrawerTabAtom = atom("metadata");

/** One-shot signal: expand the group containing this ref ID, then clear */
export const expandGroupForRefAtom = atom<string | null>(null);

/** Toast messages */
export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}
export const toastsAtom = atom<Toast[]>([]);
