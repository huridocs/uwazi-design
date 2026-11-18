import { atom } from "jotai";

/** Live translate (Uwazi's inline edit, `inlineEditAtom`): an admin mode in
 *  which the interface's translatable text is underlined. On while true; the
 *  strip under the navbar (`LiveTranslateStrip`) says so and ends it. */
export const liveTranslateAtom = atom(false);
