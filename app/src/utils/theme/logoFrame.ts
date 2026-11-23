/** The logo's frame and the crop maths of "Adjust logo", after
 *  huridocs/uwazi `app/react/V2/theme/logoFrame.ts`. Sizes are image pixels. */

/** The box a custom logo is drawn in on the header: `max-w-32 max-h-7`
 *  (`Wordmark`). Uwazi's header allows 128 × 48; this navbar is 52px tall. */
export const LOGO_FRAME = { width: 128, height: 28 };
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

/** The size a `width` × `height` logo is drawn at in the header. Never enlarged. */
export function logoDisplaySize({ width, height }: Size): Size {
  if (!width || !height) return { width: 0, height: 0 };
  const scale = Math.min(LOGO_FRAME.width / width, LOGO_FRAME.height / height, 1);
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
