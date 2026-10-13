import { useEffect } from "react";
import { atom, useStore, type Getter, type Setter } from "jotai";
import { notificationsAtom, tasksAtom, toastsAtom, type Task } from "./notifications";
import { addUploadedDocumentsAtom, deleteEntitiesAtom, newEntityId, patchEntitiesAtom } from "./entityChanges";
import { dataSourceAtom } from "./dataSource";
import { registerSettingsReset } from "./settingsReset";
import { overlayRecord, type Corpus } from "../data/entityChanges";
import type { FileKind } from "../data/files";
import { buildRecord, fileKindOf, templateFields, titleFromFilename, uploadTemplateId } from "../utils/createEntity";
import { loadManifest, saveManifest } from "../utils/uploadManifest";
import { inputPick, type PickedFile } from "../utils/pickFiles";

/** The Library's Upload: any file, any number, in the background.
 *
 *  One queue for the session, run by `useFileUploadRunner` (mounted by `App`),
 *  so navigation, a view change or a collection switch does not stop it.
 *  Every file becomes an entity the moment it is queued, in the collection's
 *  upload template, titled from its filename without the extension: a PDF as
 *  its primary document, any other file as its first supporting file, with no
 *  preview. Uwazi creates entities from PDFs only; the rest needs a server
 *  change, which the task's card says once. The entity is clickable at once
 *  and carries an upload mark (`uploadEntityStateAtom`) until it is ready.
 *
 *  A file goes queued → uploading → uploaded (the server has every byte) →
 *  processing (a PDF's text, pages and thumbnail; Uwazi's `processing`) →
 *  ready. It can end failed, with its reason, or cancelled. Failures never
 *  stop the queue and stay listed until dismissed or retried.
 *
 *  Mock only: the transfer is a timer. Files go `PARALLEL` at a time, in
 *  `CHUNK`s; a file's offset is the end of its last whole chunk, so a dropped
 *  connection loses only the chunk on the wire. A failed request is tried
 *  again after 0, 1, 3 and 5 s (tus's delays), then shows Retry. Real Uwazi
 *  takes one multipart request per file and has no offset to resume from; it
 *  would need a tus or chunked endpoint.
 *
 *  The manifest (`utils/uploadManifest.ts`) is in IndexedDB, with each file's
 *  handle where the browser gives one. After a reload the unfinished files
 *  are interrupted: Continue reads them back through their handles (one
 *  permission prompt) or asks for them again, matched by name, size and last
 *  modified, and each continues from its offset.
 *
 *  The Beacon is the indicator: one task for the queue, its files listed in
 *  the notifications drawer (`UploadTaskCard`). */

export const CHUNK = 5 * 1024 * 1024;
export const PARALLEL = 3;
/** Per-file cap. Uwazi sets none in the app; the reverse proxy decides. */
export const FILE_LIMIT = 2 * 1024 * 1024 * 1024;
export const FILE_LIMIT_LABEL = "2 GB";
/** Simulated bytes per second per transfer. */
const RATE = 6 * 1024 * 1024;
const TICK_MS = 200;
/** tus's retry delays, in ms, after a failed request. */
const RETRY_DELAYS = [0, 1000, 3000, 5000];
/** The server's step after the last byte: "uploaded" until it picks the
 *  file up, then a PDF's processing. */
const UPLOADED_MS = 700;
const PROCESSING_MS = 1600;

export type UploadItemState = "queued" | "uploading" | "uploaded" | "processing" | "ready" | "failed" | "cancelled" | "interrupted";

export interface UploadItem {
  key: string;
  /** name + size + last modified: how a file chosen again is recognised. */
  fingerprint: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  kind: FileKind;
  entityId: string;
  title: string;
  corpus: Corpus;
  typeId: string;
  /** Bytes the server has: the end of the last whole chunk. */
  offset: number;
  /** Bytes sent, the chunk on the wire included. */
  sent: number;
  state: UploadItemState;
  error?: string;
  /** Failed requests in a row; the next try waits `RETRY_DELAYS[attempts]`. */
  attempts: number;
  /** When the current state's wait ends (a retry, the server's steps). */
  until?: number;
  /** Failed before sending (empty, over the cap): no entity, no retry. */
  refused?: boolean;
}

export interface UploadQueue {
  id: string;
  items: UploadItem[];
  paused: boolean;
  /** Ready files when the batch's notification went out with failures; a
   *  later finish reports only what came after it. */
  reportedReady?: number;
  /** Some files continued from an offset after a reload. */
  resumed?: boolean;
  /** Fingerprints of files that were ready before a reload: their entities
   *  went with the reload, but they count in the batch, and choosing them
   *  again on Continue is not an unmatched file. */
  earlier?: string[];
}

const UNFINISHED: UploadItemState[] = ["queued", "uploading", "interrupted"];
const SENDING: UploadItemState[] = ["queued", "uploading"];
const fingerprintOf = (f: { name: string; size: number; lastModified: number }) => `${f.name}:${f.size}:${f.lastModified}`;

/** The files and their handles, by item key. Files do not survive a reload;
 *  handles do, through the manifest. */
const files = new Map<string, File>();
const handles = new Map<string, FileSystemFileHandle>();

let seq = 0;

const queueBaseAtom = atom<UploadQueue | null>(null);
let lastStored = "";
export const uploadQueueAtom = atom(
  (get) => get(queueBaseAtom),
  (get, set, next: UploadQueue | null | ((prev: UploadQueue | null) => UploadQueue | null)) => {
    const value = typeof next === "function" ? next(get(queueBaseAtom)) : next;
    set(queueBaseAtom, value);
    // The manifest changes when an offset or a state does, not on every tick.
    const key = value ? `${value.paused}|${value.items.map((i) => `${i.key}:${i.offset}:${i.state}`).join(",")}` : "";
    if (key === lastStored) return;
    lastStored = key;
    saveManifest(
      value && {
        ...value,
        items: value.items.map((i) => ({ ...i, sent: i.offset })),
        handles: Object.fromEntries(value.items.filter((i) => handles.has(i.key)).map((i) => [i.key, handles.get(i.key)!])),
      },
    );
  },
);

/** The browser's own state (`navigator.onLine`), kept by the runner. */
export const browserOnlineAtom = atom(typeof navigator === "undefined" ? true : navigator.onLine);
/** Dev panel: the queue acts as if offline. */
export const dropConnectionAtom = atom(false);
/** Dev panel: every upload request fails, so the retries and Retry show. */
export const failUploadsAtom = atom(false);
registerSettingsReset((set) => {
  set(dropConnectionAtom, false);
  set(failUploadsAtom, false);
});
export const uploadOnlineAtom = atom((get) => get(browserOnlineAtom) && !get(dropConnectionAtom));

/** What the Library marks on an entity whose file is not ready. */
export type UploadMark = "uploading" | "waiting" | "paused" | "processing" | "failed";

export const uploadEntityStateAtom = atom((get) => {
  const q = get(uploadQueueAtom);
  const online = get(uploadOnlineAtom);
  const out = new Map<string, UploadMark>();
  for (const i of q?.items ?? []) {
    if (i.state === "ready" || i.state === "cancelled") continue;
    out.set(
      i.entityId,
      i.state === "failed"
        ? "failed"
        : i.state === "uploaded" || i.state === "processing"
          ? "processing"
          : i.state === "interrupted" || q!.paused
            ? "paused"
            : online
              ? "uploading"
              : "waiting",
    );
  }
  return out;
});

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
const say = (set: Setter, message: string, detail?: string) =>
  set(toastsAtom, (p) => [...p, { id: `upload-${Date.now()}-${++seq}`, message, type: "info", ...(detail ? { detail } : {}) }]);

const fileOf = (i: UploadItem, url?: string) => ({ name: i.name, size: i.size, url, kind: i.kind, primary: i.kind === "pdf" });

/** Queue files into `corpus`. A file matching an interrupted item continues
 *  that item at its offset. A second file with the same name and size as one
 *  already queued is left out, as Uwazi's upload does. Returns the files that
 *  matched nothing, when `resumeOnly` (Continue's re-select) is set. */
export const enqueueUploadsAtom = atom(
  null,
  (get, set, { corpus, picked, resumeOnly = false }: { corpus: Corpus; picked: PickedFile[]; resumeOnly?: boolean }) => {
    const q = get(uploadQueueAtom);
    const live = (q?.items ?? []).filter((i) => i.state !== "cancelled");
    const waiting = new Map(live.filter((i) => i.state === "interrupted").map((i) => [i.fingerprint, i]));
    const taken = new Set(live.map((i) => `${i.name}:${i.size}`));
    // Files the batch already knows (finished before a reload, or refused):
    // chosen again on Continue, they are neither resumed nor unmatched.
    const known = new Set([...(q?.earlier ?? []), ...(q?.items ?? []).map((i) => i.fingerprint)]);
    const resumed: UploadItem[] = [];
    const added: UploadItem[] = [];
    const unmatched: string[] = [];
    let duplicates = 0;
    const typeId = uploadTemplateId(corpus);
    for (const { file: f, handle } of picked) {
      const fp = fingerprintOf(f);
      const match = waiting.get(fp);
      if (match) {
        waiting.delete(fp);
        files.set(match.key, f);
        if (handle) handles.set(match.key, handle);
        resumed.push(match);
        continue;
      }
      if (resumeOnly) {
        if (!known.has(fp)) unmatched.push(f.name);
        continue;
      }
      if (taken.has(`${f.name}:${f.size}`)) {
        duplicates++;
        continue;
      }
      taken.add(`${f.name}:${f.size}`);
      const key = `${fp}#${++seq}`;
      files.set(key, f);
      if (handle) handles.set(key, handle);
      const error = f.size === 0 ? "The file is empty." : f.size > FILE_LIMIT ? `Larger than the ${FILE_LIMIT_LABEL} limit for one file.` : undefined;
      added.push({
        key,
        fingerprint: fp,
        name: f.name,
        size: f.size,
        type: f.type,
        lastModified: f.lastModified,
        kind: fileKindOf(f.name, f.type),
        entityId: newEntityId(),
        title: titleFromFilename(f.name),
        corpus,
        typeId,
        offset: 0,
        sent: 0,
        attempts: 0,
        ...(error ? { state: "failed" as const, error, refused: true } : { state: "queued" as const }),
      });
    }
    if (duplicates)
      say(set, `${plural(duplicates, "file")} left out`, `${duplicates === 1 ? "It has" : "They have"} the same name and size as a file already in the upload.`);
    // A file refused before sending gets no entity: there is nothing to keep.
    const sending = added.filter((i) => i.state === "queued");
    if (sending.length)
      set(addUploadedDocumentsAtom, {
        corpus,
        typeId,
        uploads: sending.map((i) => ({ id: i.entityId, title: i.title, file: fileOf(i, URL.createObjectURL(files.get(i.key)!)) })),
      });
    for (const i of resumed) attachUrl(set, i, URL.createObjectURL(files.get(i.key)!));
    if (!resumed.length && !added.length) return unmatched;
    const resumedKeys = new Set(resumed.map((i) => i.key));
    set(uploadQueueAtom, (prev) => ({
      id: prev?.id ?? `file-upload-${Date.now().toString(36)}`,
      paused: prev?.paused ?? false,
      ...(prev?.reportedReady !== undefined ? { reportedReady: prev.reportedReady } : {}),
      resumed: prev?.resumed || resumed.some((i) => i.offset > 0),
      ...(prev?.earlier ? { earlier: prev.earlier } : {}),
      items: [...(prev?.items ?? []).map((i) => (resumedKeys.has(i.key) ? { ...i, state: "queued" as const, attempts: 0 } : i)), ...added],
    }));
    return unmatched;
  },
);

/** A resumed file's entity gets its file back; its metadata stays as it is
 *  (the reader may have edited it while the upload waited). */
function attachUrl(set: Setter, i: UploadItem, url: string | undefined) {
  const built = buildRecord({ id: i.entityId, typeId: i.typeId, fieldsByLang: templateFields(i.typeId, i.corpus, { newEntity: true }), file: fileOf(i, url) });
  const was = overlayRecord(i.entityId);
  set(patchEntitiesAtom, { corpus: i.corpus, records: { [i.entityId]: was ? { ...built, metadata: was.metadata } : built } });
}

/** Queue files into the collection shown. */
export const uploadFilesAtom = atom(null, (get, set, picked: PickedFile[]) =>
  set(enqueueUploadsAtom, { corpus: get(dataSourceAtom), picked }),
);

/** Continue after a reload: files with a handle are read back after the
 *  browser's permission prompt; the rest are asked for again with a file
 *  input, matched by fingerprint. Files chosen that match nothing are named
 *  in a notification and not uploaded. */
export const continueUploadsAtom = atom(null, async (get, set) => {
  const q = get(uploadQueueAtom);
  if (!q) return;
  const waiting = q.items.filter((i) => i.state === "interrupted");
  const back: PickedFile[] = [];
  for (const i of waiting) {
    const h = handles.get(i.key) as (FileSystemFileHandle & { requestPermission?: (o: { mode: "read" }) => Promise<PermissionState> }) | undefined;
    if (!h?.requestPermission) continue;
    try {
      if ((await h.requestPermission({ mode: "read" })) !== "granted") continue;
      back.push({ file: await h.getFile(), handle: h });
    } catch {
      // Moved or deleted since: it is asked for below.
    }
  }
  if (back.length) set(enqueueUploadsAtom, { corpus: get(dataSourceAtom), picked: back, resumeOnly: true });
  const still = get(uploadQueueAtom)?.items.filter((i) => i.state === "interrupted") ?? [];
  if (!still.length) return;
  const picked = await inputPick();
  if (!picked) return;
  const unmatched = set(enqueueUploadsAtom, { corpus: get(dataSourceAtom), picked, resumeOnly: true });
  if (unmatched.length)
    say(
      set,
      `${plural(unmatched.length, "chosen file")} matched no interrupted upload`,
      `${unmatched.slice(0, 5).join(", ")}${unmatched.length > 5 ? ` and ${unmatched.length - 5} more` : ""}. A file continues only if its name, size and last-modified date are the same.`,
    );
});

/** Pause or resume the queue. A pause keeps each offset and drops only the
 *  chunk on the wire. */
export const pauseUploadsAtom = atom(null, (_get, set, paused: boolean) => {
  set(uploadQueueAtom, (q) => q && { ...q, paused, items: paused ? q.items.map((i) => ({ ...i, sent: i.offset })) : q.items });
});

/** Cancel files that are not uploaded yet (all of them without `keys`):
 *  their entities go, and they stay listed as cancelled. */
export const cancelUploadsAtom = atom(null, (get, set, keys?: string[]) => {
  const q = get(uploadQueueAtom);
  if (!q) return;
  const drop = q.items.filter((i) => [...UNFINISHED, "failed"].includes(i.state) && (!keys || keys.includes(i.key)));
  removeEntities(set, drop);
  const gone = new Set(drop.map((i) => i.key));
  // Cancel all with nothing finished: the task goes with the queue, with no
  // notification of an upload that did not happen.
  if (!keys && q.items.every((i) => gone.has(i.key) || i.state === "cancelled")) {
    set(tasksAtom, (prev) => prev.filter((t) => t.id !== q.id));
    set(uploadQueueAtom, null);
    return;
  }
  set(uploadQueueAtom, { ...q, items: q.items.map((i): UploadItem => (gone.has(i.key) ? { ...i, state: "cancelled", sent: i.offset } : i)) });
});

/** Dismiss failed files: they leave the list and their entities go. */
export const dismissFailedAtom = atom(null, (get, set, keys?: string[]) => {
  const q = get(uploadQueueAtom);
  if (!q) return;
  const drop = q.items.filter((i) => i.state === "failed" && (!keys || keys.includes(i.key)));
  removeEntities(set, drop);
  const gone = new Set(drop.map((i) => i.key));
  set(uploadQueueAtom, { ...q, items: q.items.filter((i) => !gone.has(i.key)) });
});

function removeEntities(set: Setter, items: UploadItem[]) {
  const byCorpus = new Map<Corpus, string[]>();
  for (const i of items) {
    byCorpus.set(i.corpus, [...(byCorpus.get(i.corpus) ?? []), i.entityId]);
    files.delete(i.key);
    handles.delete(i.key);
  }
  for (const [corpus, ids] of byCorpus) set(deleteEntitiesAtom, { corpus, ids });
}

/** Send failed files again (all of them without `keys`), from their offsets.
 *  A file refused before sending (empty, over the cap) cannot be retried. */
export const retryUploadsAtom = atom(null, (get, set, keys?: string[]) => {
  const q = get(uploadQueueAtom);
  if (!q) return;
  const again = q.items.filter((i) => canRetry(i) && (!keys || keys.includes(i.key)));
  const keySet = new Set(again.map((i) => i.key));
  set(uploadQueueAtom, { ...q, items: q.items.map((i): UploadItem => (keySet.has(i.key) ? { ...i, state: "queued", error: undefined, attempts: 0 } : i)) });
});

export const canRetry = (i: UploadItem) => i.state === "failed" && !i.refused && files.has(i.key);

/** Throughput, for the time left: bytes per second, smoothed. */
let rate = 0;

const tickAtom = atom(null, (get, set, dt: number) => {
  const q = get(uploadQueueAtom);
  if (!q) return;
  const online = get(uploadOnlineAtom);
  const failing = get(failUploadsAtom);
  const now = Date.now();
  let moved = 0;
  // The server's steps run whatever the connection: the bytes are there.
  let items = q.items.map((i): UploadItem => {
    if (i.state === "uploaded" && now >= (i.until ?? 0))
      return i.kind === "pdf" ? { ...i, state: "processing", until: now + PROCESSING_MS } : { ...i, state: "ready", until: undefined };
    if (i.state === "processing" && now >= (i.until ?? 0)) return { ...i, state: "ready", until: undefined };
    return i;
  });
  if (online && !q.paused) {
    let running = items.filter((i) => i.state === "uploading").length;
    items = items.map((i) => {
      if (i.state !== "queued" || running >= PARALLEL || now < (i.until ?? 0)) return i;
      running++;
      return { ...i, state: "uploading", until: undefined };
    });
    items = items.map((i): UploadItem => {
      if (i.state !== "uploading") return i;
      if (failing) {
        // The request failed: the chunk on the wire is lost, and the file
        // waits its turn's delay, or fails once the delays run out.
        if (i.attempts >= RETRY_DELAYS.length)
          return { ...i, state: "failed", sent: i.offset, error: "The server did not answer. Tried four times." };
        return { ...i, state: "queued", sent: i.offset, attempts: i.attempts + 1, until: now + RETRY_DELAYS[i.attempts] };
      }
      const sent = Math.min(i.size, i.sent + (RATE * dt) / 1000);
      moved += sent - i.sent;
      if (sent >= i.size) return { ...i, sent: i.size, offset: i.size, attempts: 0, state: "uploaded", until: now + UPLOADED_MS };
      return { ...i, sent, attempts: 0, offset: Math.floor(sent / CHUNK) * CHUNK };
    });
  } else if (items.some((i) => i.state === "uploading" || i.sent !== i.offset)) {
    // Offline or paused: what was on the wire is lost, and the files wait.
    items = items.map((i) => (i.state === "uploading" || i.sent !== i.offset ? { ...i, state: i.state === "uploading" ? "queued" : i.state, sent: i.offset } : i));
  }
  rate = rate ? rate * 0.9 + (moved / (dt / 1000)) * 0.1 : moved / (dt / 1000);
  const next = { ...q, items };
  set(uploadQueueAtom, next);
  syncTask(get, set, next, online);
});

function timeLeft(bytes: number): string | null {
  if (rate < 1) return null;
  const s = bytes / rate;
  if (s < 60) return "less than a minute left";
  const m = Math.round(s / 60);
  if (m < 60) return `about ${m} min left`;
  return `about ${Math.floor(m / 60)} h ${m % 60} min left`;
}

/** The queue as one Beacon task, and its notification when it ends. */
function syncTask(_get: Getter, set: Setter, q: UploadQueue, online: boolean) {
  const live = q.items.filter((i) => i.state !== "cancelled");
  const count = (...s: UploadItemState[]) => live.filter((i) => s.includes(i.state)).length;
  const before = q.earlier?.length ?? 0;
  const n = live.length + before;
  const ready = count("ready") + before;
  const failed = count("failed");
  const interrupted = count("interrupted");
  const sending = count(...SENDING);
  const serverSide = count("uploaded", "processing");
  const finished = count("uploaded", "processing", "ready") + before;
  const cancelled = q.items.length - n;
  const total = live.reduce((a, i) => a + i.size, 0) || 1;
  const current = live.reduce((a, i) => a + i.sent, 0);

  // Ended: nothing left to send or process.
  if (!sending && !serverSide && !interrupted) {
    const since = ready - (q.reportedReady ?? 0);
    if (!failed) {
      // The Beacon turns a finished task into its notification.
      const title = q.reportedReady !== undefined ? `${plural(since, "more file")} uploaded.` : `${plural(ready, "file")} uploaded.`;
      const extra = cancelled ? `${plural(cancelled, "file")} cancelled.` : undefined;
      if (q.reportedReady !== undefined && since === 0) set(tasksAtom, (prev) => prev.filter((t) => t.id !== q.id));
      else
        set(tasksAtom, (prev) => [
          ...prev.filter((t) => t.id !== q.id),
          { id: q.id, label: `Uploading ${plural(n, "file")}`, current: 1, total: 1, driven: true, uploads: true, done: { title, ...(extra ? { detail: extra } : {}) } },
        ]);
      set(uploadQueueAtom, null);
      return;
    }
    // Ended with failures: one notification for the batch, with the counts
    // and a way to the failed files; the task stays, listing them.
    if (q.reportedReady === undefined) {
      set(notificationsAtom, (prev) => [
        {
          id: `n-${q.id}`,
          kind: "warning",
          title: `${ready.toLocaleString()} uploaded, ${failed.toLocaleString()} failed`,
          detail: "The failed files are listed under Tasks with their reasons.",
          time: Date.now(),
          read: false,
          action: { label: "Show failed", kind: "uploads", ref: q.id },
        },
        ...prev,
      ]);
      set(uploadQueueAtom, { ...q, reportedReady: ready });
    }
  }

  let task: Omit<Task, "current" | "total">;
  const line = (verb: string) => `${verb} ${finished.toLocaleString()} of ${plural(n, "file")}${failed ? `, ${failed.toLocaleString()} failed` : ""}`;
  const left = sending + interrupted;
  if (sending && !q.paused && online) {
    const eta = timeLeft(live.filter((i) => SENDING.includes(i.state)).reduce((a, i) => a + i.size - i.sent, 0));
    task = { id: q.id, label: line("Uploading"), detail: [`${plural(left, "file")} left`, eta].filter(Boolean).join(" · ") };
  } else if (sending && !online) {
    task = { id: q.id, label: "Waiting for connection", detail: `${line("Uploaded")}. The rest continue when the connection is back.`, tone: "waiting" };
  } else if (sending && q.paused) {
    task = { id: q.id, label: "Uploads paused", detail: `${line("Uploaded")}. ${plural(left, "file")} left.`, tone: "paused" };
  } else if (interrupted) {
    task = { id: q.id, label: `Interrupted: ${plural(interrupted, "file")} to continue`, detail: line("Uploaded"), tone: "paused" };
  } else if (serverSide) {
    task = { id: q.id, label: `Processing ${plural(serverSide, "file")}`, detail: line("Uploaded") };
  } else {
    task = { id: q.id, label: `${plural(failed, "file")} failed to upload`, detail: `${plural(ready, "file")} uploaded`, tone: "failed" };
  }
  const full: Task = { ...task, current: Math.min(current, total - 1), total, driven: true, uploads: true };
  set(tasksAtom, (prev) => {
    const at = prev.findIndex((t) => t.id === q.id);
    if (at < 0) return [...prev, full];
    const was = prev[at];
    if (was.label === full.label && was.detail === full.detail && was.current === full.current && was.tone === full.tone) return prev;
    const copy = prev.slice();
    copy[at] = full;
    return copy;
  });
}

interface StoredManifest extends UploadQueue {
  handles?: Record<string, FileSystemFileHandle>;
}

/** Runs the queue while the app is open. Mounted once, by `App`: brings back
 *  an interrupted queue from the manifest (and the entities of its files),
 *  follows the connection, and asks before the page is left while bytes are
 *  being sent (not while the server is processing). */
export function useFileUploadRunner() {
  const store = useStore();
  useEffect(() => {
    let cancelled = false;
    void loadManifest<StoredManifest>().then((m) => {
      if (cancelled || !m || store.get(uploadQueueAtom)) return;
      // The change layer is not stored, so the ready files' entities are
      // gone with the reload. The server keeps what it had: uploaded and
      // processing files finish; unfinished ones wait for their files.
      const items = m.items
        .filter((i) => i.state !== "ready" && i.state !== "cancelled")
        .map((i): UploadItem =>
          i.state === "uploaded" || i.state === "processing"
            ? { ...i, until: Date.now() + UPLOADED_MS }
            : i.refused
              ? i
              : { ...i, state: "interrupted", sent: i.offset, error: undefined, until: undefined },
        );
      if (!items.length) {
        saveManifest(null);
        return;
      }
      for (const [k, h] of Object.entries(m.handles ?? {})) handles.set(k, h);
      const byCorpus = new Map<string, UploadItem[]>();
      for (const i of items.filter((x) => !x.refused))
        byCorpus.set(`${i.corpus}|${i.typeId}`, [...(byCorpus.get(`${i.corpus}|${i.typeId}`) ?? []), i]);
      for (const list of byCorpus.values())
        store.set(addUploadedDocumentsAtom, {
          corpus: list[0].corpus,
          typeId: list[0].typeId,
          uploads: list.map((i) => ({ id: i.entityId, title: i.title, file: fileOf(i) })),
        });
      const earlier = [...(m.earlier ?? []), ...m.items.filter((i) => i.state === "ready").map((i) => i.fingerprint)];
      store.set(uploadQueueAtom, {
        id: m.id,
        paused: m.paused,
        items,
        ...(earlier.length ? { earlier } : {}),
        ...(m.reportedReady !== undefined ? { reportedReady: m.reportedReady } : {}),
      });
    });
    const onLine = () => store.set(browserOnlineAtom, navigator.onLine);
    window.addEventListener("online", onLine);
    window.addEventListener("offline", onLine);
    const onUnload = (e: BeforeUnloadEvent) => {
      const q = store.get(uploadQueueAtom);
      if (!q || q.paused || !store.get(uploadOnlineAtom) || !q.items.some((i) => SENDING.includes(i.state))) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onUnload);
    let last = performance.now();
    const id = window.setInterval(() => {
      const t = performance.now();
      store.set(tickAtom, Math.min(1000, t - last));
      last = t;
    }, TICK_MS);
    if (import.meta.env.DEV)
      (window as unknown as { __uploads?: unknown }).__uploads = {
        drop: (on = true) => store.set(dropConnectionAtom, on),
        fail: (on = true) => store.set(failUploadsAtom, on),
        queue: () => store.get(uploadQueueAtom),
      };
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("online", onLine);
      window.removeEventListener("offline", onLine);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [store]);
}
