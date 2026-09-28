import { atom } from "jotai";
import { libraryQueryAtom } from "./library";

/** The entity-view drawer's Search-tab query. Lifted out of the tab body so the
 *  action bar's "Search tips" popover can drop an example straight into it. */
export const docSearchQueryAtom = atom("");

/** The query whose hits get marked in the rendered document.
 *
 *  The drawer's Search tab wins when it has one; otherwise the Library query, so
 *  a jump from the Library Results panel also lands on marked text. (Consequence
 *  worth knowing: walking into an entity while a Library search is still active
 *  marks that term in the document too — which is usually why you're there.) */
export const docHighlightQueryAtom = atom((get) =>
  get(docSearchQueryAtom).trim() || get(libraryQueryAtom).trim(),
);
