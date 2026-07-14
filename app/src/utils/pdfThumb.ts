import { pdfjs } from "react-pdf";
import "./pdfWorker";

/** Page one of a PDF, rasterised once and cached as an image.
 *
 *  Deliberately NOT react-pdf's <Document>/<Page> per card. A thumbnail is a
 *  picture, not a live document: a grid would otherwise hold dozens of open
 *  PDFDocumentProxies (each with worker-side state) to show one page each, and
 *  every sample court case points at one of only two stand-in judgments — so the
 *  same file would be parsed over and over.
 *
 *  Rasterise once per (url, width), cache the data URL: fifty cards sharing two
 *  PDFs cost two renders, and scrolling back is instant.
 *
 *  Note pdf.js drives rendering off requestAnimationFrame, so nothing here
 *  resolves while the tab is HIDDEN — which is exactly when you don't want the
 *  work anyway. Thumbnails appear when the tab is looked at. */
const cache = new Map<string, Promise<string | null>>();

export function pdfThumb(url: string, width: number): Promise<string | null> {
  const key = `${url}@${width}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const p = render(url, width).catch((err) => {
    // A thumbnail must never take the page down. Warn, though: a silent null is
    // indistinguishable from "this document has no preview".
    console.warn("[pdfThumb] failed", url, err);
    return null;
  });
  cache.set(key, p);
  return p;
}

async function render(url: string, width: number): Promise<string | null> {
  const doc = await pdfjs.getDocument(url).promise;
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    // Rasterise at device resolution — a thumbnail rendered at CSS pixels looks
    // soft on any retina screen.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const viewport = page.getViewport({ scale: (width / base.width) * dpr });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return null;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    // Free the worker's copy of the document; we only ever wanted one page.
    doc.destroy();
  }
}
