import { useEffect, useId, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Modal, MODAL_BUTTON } from "./Modal";
import { BAR_GHOST, WARM_BUTTON } from "./warmButton";
import { Dropzone } from "./Dropzone";
import { uploads, uploadsAtom } from "../../atoms/uploads";
import { useSettingsNotify } from "../../hooks/useSettingsNotify";
import type { SettingsUpload } from "../../data/settings";

/** A size rule for a picked image, Uwazi's `brandImageUploadRules`.
 *  `strict`: an image outside the rule is refused and not listed. `soft`:
 *  every image is listed, and one outside the rule asks before it is used. */
export interface ImageSizeRule {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  square: boolean;
  policy: "strict" | "soft";
}

/** The favicon's rule: square, 16 to 512 px a side. */
export const FAVICON_RULE: ImageSizeRule = { minWidth: 16, maxWidth: 512, minHeight: 16, maxHeight: 512, square: true, policy: "strict" };
/** The theme logo's rule: 48x16 to 800x256 px, recommended, not required. */
export const LOGO_RULE: ImageSizeRule = { minWidth: 48, maxWidth: 800, minHeight: 16, maxHeight: 256, square: false, policy: "soft" };

export const fitsRule = (rule: ImageSizeRule, w: number, h: number) =>
  w >= rule.minWidth && w <= rule.maxWidth && h >= rule.minHeight && h <= rule.maxHeight && (!rule.square || w === h);

/** "16x16 to 512x512 px (square)", for a field's "Recommended:" line. */
export const ruleRange = (rule: ImageSizeRule) =>
  `${rule.minWidth}x${rule.minHeight} to ${rule.maxWidth}x${rule.maxHeight} px${rule.square ? " (square)" : ""}`;

/** Uwazi's message, `Actual:` and `Expected:` literal. */
export const ruleMessage = (rule: ImageSizeRule, w: number, h: number) =>
  `Image doesn't match the required size. Actual: ${w}x${h} px. Expected: ${
    rule.square ? `square ${rule.minWidth}x${rule.minWidth} to ${rule.maxWidth}x${rule.maxWidth}` : `${rule.minWidth}x${rule.minHeight} to ${rule.maxWidth}x${rule.maxHeight}`
  } px`;

/** An image the picker offers or returns: an upload, or one that ships with
 *  the app. */
export interface PickableImage {
  id: string;
  name: string;
  src?: string;
}

/** The checkerboard behind an image preview, so transparency reads. */
export const CHECKERBOARD = {
  backgroundColor: "var(--bg-surface)",
  backgroundImage: "conic-gradient(var(--bg-muted) 25%, transparent 0 50%, var(--bg-muted) 0 75%, transparent 0)",
  backgroundSize: "0.75rem 0.75rem",
} as const;

const IMAGE_ACCEPT = ".avif,.bmp,.gif,.ico,.jpg,.jpeg,.png,.svg,.webp";

/** The pixel size of an image source, or null when it does not load. */
function measure(src: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const readDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });

/** Pick an image from Settings › Uploads, or upload one (Uwazi's custom
 *  upload image picker). `builtins` are listed first and never checked.
 *
 *  A strict `rule` lists only the images that pass it and refuses a dropped
 *  file that does not. A soft rule lists every image; one outside it shows
 *  the size message with "Use image", and nothing is picked or uploaded
 *  until that is pressed.
 *
 *  A dropped file that is accepted is uploaded to the Uploads store at once,
 *  independent of the form's Save, then picked. Picking closes the modal;
 *  Cancel and Escape close it with no change. */
export function ImagePickerModal({
  title,
  rule,
  value,
  builtins = [],
  emptyHint = "There are no images in Uploads yet. Upload one above to use it here.",
  onPick,
  onClose,
}: {
  title: string;
  rule: ImageSizeRule;
  /** The id of the image currently chosen, ringed in the gallery. */
  value: string;
  /** Images that ship with the app, listed before the uploads. */
  builtins?: PickableImage[];
  emptyHint?: string;
  onPick: (image: PickableImage) => void;
  onClose: () => void;
}) {
  const all = useAtomValue(uploadsAtom);
  const create = useSetAtom(uploads.createAtom);
  const { record, fail } = useSettingsNotify();
  const headingId = useId();
  const [measured, setMeasured] = useState<Record<string, { width: number; height: number } | null>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  /** A soft-rule image waiting for "Use image". */
  const [pending, setPending] = useState<{ message: string; use: () => void } | null>(null);
  const soft = rule.policy === "soft";

  const images = all.filter((u) => u.kind === "image" && u.src);
  const sizeOf = (u: SettingsUpload) =>
    u.width && u.height ? { width: u.width, height: u.height } : measured[u.id];
  const unmeasured = images.filter((u) => sizeOf(u) === undefined);

  // Uploads that carry no size are loaded once to read it.
  useEffect(() => {
    let live = true;
    for (const u of unmeasured)
      measure(u.src!).then((s) => live && setMeasured((m) => ({ ...m, [u.id]: s })));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unmeasured.map((u) => u.id).join(",")]);

  const fits = (u: SettingsUpload) => {
    const s = sizeOf(u);
    return !!s && fitsRule(rule, s.width, s.height);
  };
  const fitting = soft ? images : images.filter(fits);
  const listed: PickableImage[] = [...builtins, ...fitting];

  /** A gallery pick. Under a soft rule an upload outside it asks first. */
  const pick = (image: PickableImage) => {
    const upload = images.find((u) => u.id === image.id);
    const size = upload && sizeOf(upload);
    if (soft && upload && size && !fitsRule(rule, size.width, size.height)) {
      setProgress(null);
      setPending({ message: ruleMessage(rule, size.width, size.height), use: () => onPick(image) });
      return;
    }
    onPick(image);
  };

  const store = (file: File, src: string, size: { width: number; height: number }) => {
    setPending(null);
    setProgress(`Uploading ${file.name} 100%`);
    const id = create({
      value: {
        name: file.name,
        filename: file.name,
        mimetype: file.type || "image/png",
        kind: "image",
        size: file.size,
        src,
        width: size.width,
        height: size.height,
      },
    });
    record({ method: "CREATE", domain: "upload", noun: "custom file", id, name: file.name, message: "Uploaded custom file", summary: `Uploaded custom file “${file.name}”` });
    // The progress line shows for a moment before the modal closes on the new file.
    setTimeout(() => onPick({ id, name: file.name, src }), 400);
  };

  const upload = async (file: File) => {
    setFeedback(null);
    setPending(null);
    try {
      const src = await readDataUrl(file);
      const size = await measure(src);
      if (!size) {
        setFeedback("The file could not be read as an image.");
        return;
      }
      if (!fitsRule(rule, size.width, size.height)) {
        const message = ruleMessage(rule, size.width, size.height);
        // A favicon must be square whatever the policy, as in Uwazi.
        if (soft && !(rule.square && size.width !== size.height)) setPending({ message, use: () => store(file, src, size) });
        else setFeedback(message);
        return;
      }
      store(file, src, size);
    } catch (e) {
      setProgress(null);
      fail("An error occurred", e instanceof Error ? e.message : undefined);
    }
  };

  return (
    <Modal
      component="ImagePickerModal"
      title={title}
      size="lg"
      onClose={onClose}
      footer={
        <button type="button" data-part="cancel" onClick={onClose} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
          Cancel
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <Dropzone accept={IMAGE_ACCEPT} title="Browse files to upload" hint="or drop your files here." onFile={upload} />
        <div aria-live="polite" className="min-h-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta leading-4">
          {progress ? (
            <span data-part="progress" className="text-ink-secondary">{progress}</span>
          ) : pending ? (
            <>
              <span data-part="warning" className="text-warning-label">{pending.message}</span>
              <button type="button" data-part="use-image" onClick={pending.use} className={`${MODAL_BUTTON} ${WARM_BUTTON} cursor-pointer`}>
                Use image
              </button>
            </>
          ) : feedback ? (
            <span data-part="feedback" className="text-seal-label">{feedback}</span>
          ) : null}
        </div>
        <section aria-labelledby={headingId} className="flex flex-col gap-3">
          <h3 id={headingId} className="text-sm font-semibold text-ink">
            Select an existing image
          </h3>
          {listed.length === 0 && images.length === 0 ? (
            <p data-part="empty" className="text-xs text-ink-tertiary">
              {emptyHint}
            </p>
          ) : listed.length === 0 && unmeasured.length > 0 ? (
            <p data-part="checking" className="text-xs text-ink-tertiary">Checking which images fit the requirements…</p>
          ) : listed.length === 0 ? (
            <p data-part="none-fit" className="text-xs text-ink-tertiary">No uploaded images fit the requirements</p>
          ) : (
            <ul data-part="gallery" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {listed.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    aria-pressed={u.id === value}
                    onClick={() => pick(u)}
                    className={`w-full flex flex-col gap-1.5 p-2 rounded-lg text-start cursor-pointer hover:bg-warm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30 ${
                      u.id === value ? "ring-2 ring-ink" : ""
                    }`}
                  >
                    <span style={CHECKERBOARD} className="aspect-square w-full rounded-md flex items-center justify-center overflow-hidden border border-border-soft p-2">
                      <img src={u.src} alt="" className="max-w-full max-h-full object-contain" />
                    </span>
                    <span className="text-xs text-ink-secondary truncate" dir="ltr">{u.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}
