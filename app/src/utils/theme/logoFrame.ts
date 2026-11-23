/** The logo's frame and the crop maths of "Adjust logo", after
 *  huridocs/uwazi `app/react/V2/theme/logoFrame.ts`. Sizes are image pixels. */

import type { HeaderHeight, HeaderLayout } from "./headerLayout";

/** The logo's sizes on the header, one per bar height (`Wordmark`'s `size`).
 *  `width` × `height` is the box a custom logo is drawn in, in CSS pixels at
 *  the default font size; `wordmark` is the built-in wordmark's height in rem,
 *  scaled with the box. Uwazi's header allows 128 × 48 in one 52px bar. */
export const LOGO_SIZES = {
  /** Compact, 2.5rem bar. */
  sm: { width: 112, height: 24, wordmark: 0.75 },
  /** Default, 3.25rem bar. */
  md: { width: 128, height: 28, wordmark: 0.919 },
  /** Tall, 4.5rem bar. */
  lg: { width: 192, height: 44, wordmark: 1.444 },
  /** Extra tall, 5.5rem bar. */
  xl: { width: 240, height: 56, wordmark: 1.838 },
} as const;
export type LogoSize = keyof typeof LOGO_SIZES;

/** The logo size the bar draws for a layout and a height. */
export const logoSizeFor = (layout: HeaderLayout, height: HeaderHeight): LogoSize =>
  layout === "compact" ? "sm" : height === "tall" ? "lg" : height === "extra-tall" ? "xl" : "md";

/** The default bar's frame. */
export const LOGO_FRAME: Size = LOGO_SIZES.md;
/** The largest the image is drawn in the crop editor. */
const EDITOR_MAX = { width: 480, height: 256 };
const MIN_CROP = 8;
/** A crop may extend past the image, up to twice its size, to add margin. */
const MAX_CROP_SCALE = 2;

export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Size {
  width: number;
  height: number;
}

/** The size a `width` × `height` logo is drawn at in the header, inside
 *  `frame`. Never enlarged. */
export function logoDisplaySize({ width, height }: Size, frame: Size = LOGO_FRAME): Size {
  if (!width || !height) return { width: 0, height: 0 };
  const scale = Math.min(frame.width / width, frame.height / height, 1);
  return { width: width * scale, height: height * scale };
}

export function logoEditorSize({ width, height }: Size): Size {
  if (!width || !height) return { width: 0, height: 0 };
  const scale = Math.min(EDITOR_MAX.width / width, EDITOR_MAX.height / height);
  return { width: width * scale, height: height * scale };
}

export function clampCrop(crop: Crop, bounds: Size): Crop {
  const width = Math.min(Math.max(MIN_CROP, crop.width), bounds.width * MAX_CROP_SCALE);
  const height = Math.min(Math.max(MIN_CROP, crop.height), bounds.height * MAX_CROP_SCALE);
  return {
    x: Math.min(Math.max(crop.x, MIN_CROP - width), bounds.width - MIN_CROP),
    y: Math.min(Math.max(crop.y, MIN_CROP - height), bounds.height - MIN_CROP),
    width,
    height,
  };
}

/** `mode` is "move" or the corner dragged: "nw", "ne", "sw", "se". */
export function applyCropDrag(origin: Crop, mode: string, dx: number, dy: number, bounds: Size): Crop {
  if (mode === "move") return clampCrop({ ...origin, x: origin.x + dx, y: origin.y + dy }, bounds);
  const d = (edge: string, delta: number) => (mode.includes(edge) ? delta : 0);
  return clampCrop(
    {
      x: origin.x + d("w", dx),
      y: origin.y + d("n", dy),
      width: origin.width + d("e", dx) - d("w", dx),
      height: origin.height + d("s", dy) - d("n", dy),
    },
    bounds,
  );
}

export const scaledCropSize = (crop: Crop, scale: number): Size => ({
  width: Math.max(1, Math.round(crop.width * scale)),
  height: Math.max(1, Math.round(crop.height * scale)),
});

/** The scale that brings a crop inside the logo's upload limit (800 × 256). */
export const defaultOutputScale = (crop: Crop, maxWidth = 800, maxHeight = 256) =>
  Math.min(1, maxWidth / crop.width, maxHeight / crop.height);
