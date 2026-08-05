/// <reference lib="webworker" />
import { fold } from "./queryTokens";
import type { DocumentFolds } from "./librarySnippets";

/** Folds the CEJIL corpus's document text OFF THE MAIN THREAD.
 *
 *  Searching this corpus is, in profile, almost entirely `fold`: an NFD
 *  normalise, a `\p{Diacritic}` strip and a lowercase over every page. That work
 *  is the same for every query — only the terms change — so it is done once,
 *  here, and shipped to the main thread's caches (`primeDocumentFolds`).
 *
 *  Doing it here rather than in a `useMemo` is what keeps the keystroke free: the
 *  main thread never runs the pass at all in the common case, so there is no
 *  long task to break up and nothing to yield between. The search path itself
 *  stays synchronous — see `primeDocumentFolds` for why that matters.
 *
 *  It fetches its own copy of `fullText.json` instead of receiving the corpus by
 *  postMessage: the main thread would otherwise have to structured-clone the
 *  entire text across, which is the copy this is meant to avoid. (That file is
 *  ~175KB with the stand-in documents and 5.3MB with the recovered ones — see
 *  `scripts/recover-cejil-docs.cjs` — so what this does NOT compute matters.) */

export interface ScanRequest {
  /** `import.meta.env.BASE_URL` — the worker can't read the app's base itself,
   *  and on GitHub Pages the corpus lives under a subpath (see `utils/asset`). */
  base: string;
}

export type ScanResponse =
  | { ok: true; docs: Record<string, DocumentFolds>; ms: number }
  | { ok: false; error: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (e: MessageEvent<ScanRequest>) => {
  const started = performance.now();
  try {
    const res = await fetch(`${e.data.base}cejil-data/fullText.json`);
    if (!res.ok) throw new Error(`fullText.json ${res.status}`);
    const corpus = (await res.json()) as Record<string, string[]>;

    const docs: Record<string, DocumentFolds> = {};

    // Keys are opaque here — a file `_id` or a legacy filename, whichever
    // `fullText.json` uses for that document — and are echoed back untouched.
    //
    // `fold`, not `foldWithMap`: the folded→original index map is only needed to
    // cut an excerpt, for the few pages that get one, and the main thread builds
    // those lazily (`pageFoldWithMap`). Building them here meant an `Int32Array`
    // per character of the corpus — 20.4MB live for the 26 recovered documents,
    // plus a transient `number[]` several times that inside this worker — to
    // pre-answer pages nobody reads. The folded TEXT is the part every scan
    // needs, and it is all this now computes.
    for (const [docKey, pages] of Object.entries(corpus)) {
      docs[docKey] = { folded: pages.map(fold) };
    }

    const msg: ScanResponse = { ok: true, docs, ms: performance.now() - started };
    ctx.postMessage(msg);
  } catch (err) {
    // A failed prime is not a failed search — the main thread simply folds
    // lazily, exactly as it did before this worker existed.
    const msg: ScanResponse = { ok: false, error: err instanceof Error ? err.message : String(err) };
    ctx.postMessage(msg);
  }
};
