import { atom } from "jotai";

/** The phone's stack of bottom sheets — every layer that is open, bottom first.
 *
 *  On a phone every nested view is a bottom sheet, and a sheet opened from
 *  inside another one goes ON TOP of it rather than replacing it: the Filters
 *  or Relationships sheet, a connected entity's preview, another entity opened
 *  from that preview, a dialog opened from there. ONE stack for all of them,
 *  whichever component draws the layer (`MobileBottomSheet`, `Modal`), so a
 *  Modal opened from a sheet knows it is layer 3 of 4 and not a fresh page.
 *  Desktop never registers: nothing here changes it. */
export const sheetStackAtom = atom<string[]>([]);

/** How a layer is drawn, from its place in the stack. Lengths in rem. */
export const SHEET_STACK = {
  /** Top edge of the lowest staggered layer, below the navbar's reach. */
  base: 2.5,
  /** How far each layer sits below the one under it: the lower one's peek. */
  step: 0.75,
  /** Layers drawn staggered; any deeper collapse onto the base offset. */
  visible: 4,
  /** Scale lost per layer of depth below the top. */
  scaleStep: 0.03,
} as const;

/** z-index for a layer's scrim (the panel takes the next one). Above every
 *  page-level overlay (the navbar menus sit at 60, `Modal` at 50). */
export const sheetZ = (index: number) => 70 + index * 2;
