import { atom } from "jotai";
import { suggestions as seedSuggestions, IxSuggestion } from "../data/suggestions";

export const suggestionsAtom = atom<IxSuggestion[]>(seedSuggestions);

/** Only the suggestions awaiting review. Surfaces the count for the tab
 *  badge sparkle and the IxSuggestionsCard pending list. */
export const pendingSuggestionsAtom = atom((get) =>
  get(suggestionsAtom).filter((s) => s.status === "pending"),
);
