import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_COMMIT_DISABLED } from "../../shared/Modal";
import { BAR_GHOST } from "../../shared/warmButton";
import { CHECKERBOARD } from "../../shared/ImagePickerModal";
import {
  applyCropDrag,
  clampCrop,
  defaultOutputScale,
  LOGO_FRAME,
  logoDisplaySize,
  logoEditorSize,
  scaledCropSize,
  type Crop,
  type Size,
} from "../../../utils/theme/logoFrame";

const CORNERS = ["nw", "ne", "sw", "se"] as const;
const CORNER_CLASS: Record<(typeof CORNERS)[number], string> = {
  nw: "start-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
  ne: "end-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
  sw: "start-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
  se: "end-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
};

/** The crop drawn at `scale`, on a canvas. A crop that extends past the image
 *  leaves the extra area transparent. */
function drawCrop(image: HTMLImageElement, crop: Crop, scale: number) {
  const size = scaledCropSize(crop, scale);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.getContext("2d")?.drawImage(image, -crop.x * scale, -crop.y * scale, image.naturalWidth * scale, image.naturalHeight * scale);
  return { canvas, size };
}

const previewOf = (image: HTMLImageElement, crop: Crop) =>
  drawCrop(image, crop, Math.min(1, 400 / Math.max(crop.width, 1))).canvas.toDataURL("image/png");

/** Uwazi's "Crop or resize logo": drag the frame or a corner to crop, set
 *  the saved file's size with the slider, and see the result at the size the
 *  header draws it. Apply returns the cropped image as a PNG; the caller
 *  stores it. The frame also takes the arrow keys (move) and Shift + arrow
 *  keys (resize), which Uwazi's does not. */
export function LogoAdjustModal({
  src,
  barStyle,
  frame = LOGO_FRAME,
  onApply,
  onClose,
}: {
  src: string;
  /** The box the header draws the logo in, at the chosen layout and height. */
  frame?: Size;
  /** The header's ground, for the preview strip. */
  barStyle?: CSSProperties;
  onApply: (image: { src: string; width: number; height: number }) => void;
  onClose: () => void;
}) {
  const img = useRef<HTMLImageElement | null>(null);
  const drag = useRef<{ mode: string; x: number; y: number; origin: Crop } | null>(null);
  const [bounds, setBounds] = useState<Size>({ width: 0, height: 0 });
  const [crop, setCrop] = useState<Crop>({ x: 0, y: 0, width: 0, height: 0 });
  const cropRef = useRef(crop);
  const [scale, setScale] = useState(1);
  const [preview, setPreview] = useState("");
  const helpId = useId();
  const sliderId = useId();
  const ready = bounds.width > 0;

  const moveTo = (next: Crop, refresh = false) => {
    cropRef.current = next;
    setCrop(next);
    if (refresh && img.current) setPreview(previewOf(img.current, next));
  };

  useEffect(() => {
    const move = (e: globalThis.PointerEvent) => {
      const image = img.current;
      const d = drag.current;
      if (!image || !d || !bounds.width) return;
      const rect = image.getBoundingClientRect();
      moveTo(
        applyCropDrag(d.origin, d.mode, ((e.clientX - d.x) / rect.width) * bounds.width, ((e.clientY - d.y) / rect.height) * bounds.height, bounds),
      );
    };
    const up = () => {
      if (!drag.current) return;
      drag.current = null;
      if (img.current) setPreview(previewOf(img.current, cropRef.current));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [bounds]);

  const startDrag = (mode: string) => (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    drag.current = { mode, x: e.clientX, y: e.clientY, origin: cropRef.current };
  };

  /** Arrow keys move the frame; with Shift they move its bottom-right corner. */
  const onKey = (e: KeyboardEvent) => {
    const dir: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const d = dir[e.key];
    if (!d || !ready) return;
    e.preventDefault();
    const step = Math.max(1, Math.round(Math.max(bounds.width, bounds.height) / 100));
    const c = cropRef.current;
    moveTo(
      e.shiftKey
        ? clampCrop({ ...c, width: c.width + d[0] * step, height: c.height + d[1] * step }, bounds)
        : applyCropDrag(c, "move", d[0] * step, d[1] * step, bounds),
      true,
    );
  };

  const saved = scaledCropSize(crop, scale);
  const shown = logoDisplaySize(crop, frame);
  const fitted = logoEditorSize(bounds);

  const apply = () => {
    if (!img.current || !crop.width) return;
    const { canvas, size } = drawCrop(img.current, crop, scale);
    onApply({ src: canvas.toDataURL("image/png"), ...size });
  };

  return (
    <Modal
      component="LogoAdjustModal"
      title="Crop or resize logo"
      size="xl"
      onClose={onClose}
      footer={
        <>
          <button type="button" data-part="cancel" onClick={onClose} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
            Cancel
          </button>
          <button type="button" data-part="apply" disabled={!ready} onClick={apply} className={ready ? MODAL_COMMIT : MODAL_COMMIT_DISABLED}>
            Apply
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p id={helpId} className="text-xs text-ink-tertiary text-pretty">
          Crop changes how the logo fits in the header. Resize changes the saved file. Drag the frame or a corner, or use the arrow
          keys to move it and Shift with an arrow key to resize&nbsp;it.
        </p>
        <div
          data-part="stage"
          style={CHECKERBOARD}
          className="flex justify-center items-center min-h-48 overflow-hidden rounded-md border border-border-soft px-12 py-10"
        >
          <div className="relative inline-block max-w-full" dir="ltr">
            <img
              ref={img}
              src={src}
              alt="The logo being adjusted"
              draggable={false}
              className="block max-w-full h-auto select-none"
              style={ready ? { width: `${fitted.width / 16}rem` } : undefined}
              onLoad={(e) => {
                const image = e.currentTarget;
                const next = { width: image.naturalWidth, height: image.naturalHeight };
                const full = { x: 0, y: 0, ...next };
                setBounds(next);
                cropRef.current = full;
                setCrop(full);
                setScale(defaultOutputScale(full));
                setPreview(previewOf(image, full));
              }}
            />
            {ready && (
              <div
                data-part="crop"
                role="group"
                tabIndex={0}
                aria-label={`Crop frame, ${Math.round(crop.width)} by ${Math.round(crop.height)} pixels`}
                aria-describedby={helpId}
                onKeyDown={onKey}
                onPointerDown={startDrag("move")}
                className="absolute cursor-move touch-none border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-carbon"
                style={{
                  left: `${(crop.x / bounds.width) * 100}%`,
                  top: `${(crop.y / bounds.height) * 100}%`,
                  width: `${(crop.width / bounds.width) * 100}%`,
                  height: `${(crop.height / bounds.height) * 100}%`,
                }}
              >
                {CORNERS.map((c) => (
                  <span
                    key={c}
                    aria-hidden
                    data-part="corner"
                    onPointerDown={startDrag(c)}
                    className={`absolute size-3 max-md:size-5 bg-white border border-black/40 ${CORNER_CLASS[c]}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={sliderId} className="text-xs font-medium text-ink-secondary">
            Saved image{" "}
            <span className="font-normal text-ink-tertiary tabular-nums" dir="ltr">
              {saved.width}×{saved.height} px
            </span>
          </label>
          <input
            id={sliderId}
            type="range"
            min={0.01}
            max={1}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(Number(e.currentTarget.value))}
            className="w-full accent-ink cursor-pointer"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-ink-secondary">
            Shown in the header at{" "}
            <span className="font-normal text-ink-tertiary tabular-nums" dir="ltr">
              {Math.round(shown.width)}×{Math.round(shown.height)} px
            </span>
          </p>
          <div data-part="header-preview" style={barStyle} className="flex h-navbar items-center overflow-hidden rounded-md border border-border bg-paper px-3">
            {preview && (
              <img src={preview} alt="" className="w-auto object-contain" style={{ maxHeight: `${frame.height / 16}rem`, maxWidth: `${frame.width / 16}rem` }} />
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
