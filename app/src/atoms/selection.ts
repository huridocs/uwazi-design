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
