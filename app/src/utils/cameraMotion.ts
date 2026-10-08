/** When the Library's camera (Network, Map) is easing, until when. A preview
 *  mounting beside it waits for the end before its heaviest work, a PDF's
 *  pages, which pdf.js renders on the main thread in one task and which would
 *  otherwise drop the ease's frames. */
let until = 0;

/** A camera move of `ms` starts now. */
export function noteCameraMove(ms: number) {
  until = Math.max(until, performance.now() + ms);
}

/** Runs `run` once no camera move is in progress: at once, or when the
 *  current one ends. Returns a cancel. */
export function afterCameraMove(run: () => void): () => void {
  const wait = until - performance.now();
  if (wait <= 0) {
    run();
    return () => {};
  }
  const t = window.setTimeout(run, wait);
  return () => window.clearTimeout(t);
}

export const cameraMoving = () => until > performance.now();
