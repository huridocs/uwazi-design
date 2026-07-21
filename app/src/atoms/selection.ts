import { atom } from "jotai";

export interface NormRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface TextSelectionState {
  text: string;
  page: number;
  /** Page-relative (0-1) bounding box of the whole selection. */
  rect: NormRect;
  /** Page-relative per-line rects from the selection Range's getClientRects().
   *  These are the exact line boxes the browser computed, so highlights paint
   *  precisely instead of approximating line breaks. */
  rects: NormRect[];
  /** Screen coordinates for floating menu positioning */
  screenX: number;
  screenY: number;
}

export const textSelectionAtom = atom<TextSelectionState | null>(null);

/** Whether the entity picker modal is open */
export const entityPickerOpenAtom = atom(false);

/** Current page number in PDF viewer */
export const currentPageAtom = atom(1);

/** Which rendition of the default primary document the Document tab shows.
 *  Uwazi keeps the uploaded PDF plus a derived plain-text extraction and an
 *  HTML version of the same document. */
export type DocumentFormat = "pdf" | "text" | "html";
export const documentFormatAtom = atom<DocumentFormat>("pdf");

/** A pending page jump. `nonce` makes every request distinct. */
export interface PageJump {
  page: number;
  nonce: number;
}

const pageJumpStateAtom = atom<PageJump | null>(null);
let pageJumpNonce = 0;

/** Signal: scroll the document viewer to this page, then clear. Set by ToC
 *  entries, the page picker, the Library Results panel, the drawer's Search tab
 *  — anything that wants to jump pages without highlighting a reference.
 *
 *  Writers still set a plain page number (or `null`); readers get `{page,
 *  nonce}`. Two reasons for the nonce:
 *   - SAME-PAGE REQUESTS. Writing the same number twice used to leave the atom
 *     unchanged, so clicking the row for the page you're already on did nothing
 *     at all. Each write is now a new signal.
 *   - The viewer that can service a jump isn't always the one that sees it
 *     first: `DocumentViewer` is mounted in eight places and this signal is
 *     global, so a hidden instance (a drawer's file preview, another tab's pane)
 *     also receives it. Instances that can't service a jump must LEAVE IT ALONE
 *     rather than consume it — see `DocumentViewer`. */
export const scrollToPageAtom = atom(
  (get) => get(pageJumpStateAtom),
  (_get, set, page: number | null) =>
    set(pageJumpStateAtom, page === null ? null : { page, nonce: ++pageJumpNonce }),
);
