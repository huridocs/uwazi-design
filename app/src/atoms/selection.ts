import { atom } from "jotai";

export interface TextSelectionState {
  text: string;
  page: number;
  rect: { top: number; left: number; width: number; height: number };
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

/** Signal: scroll the document viewer to this page number, then clear.
 *  Set by ToC entries, the page picker, anything that wants to jump pages
 *  without highlighting a specific reference. */
export const scrollToPageAtom = atom<number | null>(null);
