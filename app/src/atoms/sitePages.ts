import { atom } from "jotai";
import type { CodeDoc } from "../data/sitePages";
import { registerSettingsReset } from "./settingsCollection";

/** Each page's code documents for the session, seeded on first open from the
 *  page's starter (see `PagesPage`). Mock only. */
export const codeDocsAtom = atom<Record<string, CodeDoc>>({});
registerSettingsReset((set) => set(codeDocsAtom, {}));
