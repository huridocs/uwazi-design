import { primeDocumentFolds } from "./librarySnippets";
import type { ScanRequest, ScanResponse } from "./searchScan.worker";

/** Kick the document-fold worker once per session.
 *
 *  Call it after the CEJIL corpus resolves: by the time the user's third
 *  character turns full-text search on (the `q.length ≥ 3` gate), the folds are
 *  already in the main thread's caches and that keystroke does no scanning at
 *  all. Before this, that one keystroke folded the whole corpus inline.
 *
 *  Every failure path degrades to the old behaviour rather than to a broken
 *  search: no `Worker` (SSR, a test runner), a bundler that won't build it, a
 *  404 on the corpus — the main thread just folds lazily on demand, which is
 *  what `buildSnippetsFor` does anyway when a document wasn't primed.
 *
 *  Fire-and-forget by design: nothing awaits it and no UI gates on it, so a slow
 *  worker can never hold up a render. */
let started = false;

export function warmSearchScan(): void {
  if (started || typeof Worker === "undefined") return;
  started = true;

  let worker: Worker;
  try {
    // `new URL(…, import.meta.url)` is the form Vite compiles into a worker
    // bundle; a bare string path would ship as a fetch of a TS file.
    worker = new Worker(new URL("./searchScan.worker.ts", import.meta.url), { type: "module" });
  } catch {
    return; // no worker support in this environment — lazy folding still works
  }

  const done = () => worker.terminate();

  worker.onmessage = (e: MessageEvent<ScanResponse>) => {
    if (e.data.ok) primeDocumentFolds(e.data.docs);
    // The worker has one job and has done it; holding the thread open would
    // keep its copy of the corpus alive for the life of the session.
    done();
  };
  worker.onerror = done;
  worker.onmessageerror = done;

  const req: ScanRequest = { base: import.meta.env.BASE_URL };
  worker.postMessage(req);
}
