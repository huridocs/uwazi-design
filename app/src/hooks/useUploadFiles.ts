import { useCallback } from "react";
import { useStore } from "jotai";
import { tasksAtom, toastsAtom, type Task } from "../atoms/notifications";
import { appendActivityAtom } from "../atoms/activityLog";
import { dataSourceAtom } from "../atoms/dataSource";
import { uploads, uploadsAtom } from "../atoms/uploads";
import type { SettingsUpload } from "../data/settings";
import type { Corpus } from "../data/entityChanges";

/** Settings › Uploads' upload path, shared with the Collection favicon picker.
 *
 *  Files go one at a time, as Uwazi's `UploadService('custom')` sends them, in
 *  ONE Beacon task whose line reads "Uploading... <file> N% (M remaining
 *  files)". Each file is in the store as soon as it finishes, so its row
 *  appears while the rest are still going. The run lives on the jotai store,
 *  not in a component: leaving the page mid-upload neither asks nor stops it.
 *
 *  A file over `UPLOAD_LIMIT` is refused before anything starts, with one
 *  "An error occurred" naming the file and the limit; the others still go.
 *  At the end: one "Uploaded custom file" notification and one Activity log
 *  entry per file. Mock only: the content is kept as a data URL in session
 *  storage, which is what caps the size. */

/** Per-file cap. Session storage holds the content, so a few MB in all. */
export const UPLOAD_LIMIT = 2 * 1024 * 1024;
export const UPLOAD_LIMIT_LABEL = "2 MB";

type Store = ReturnType<typeof useStore>;

const kindOf = (f: File): SettingsUpload["kind"] => {
  if (f.type.startsWith("image/")) return "image";
  if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) return "pdf";
  if (f.type.startsWith("font/") || /\.(woff2?|ttf|otf|eot)$/i.test(f.name)) return "font";
  return "other";
};

const readDataUrl = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("The file could not be read."));
    r.readAsDataURL(f);
  });

const imageSize = (src: string) =>
  new Promise<{ width: number; height: number } | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = src;
  });

/** A file's record before it has an id: its content as a data URL and its
 *  pixel size when it is an image. The favicon picker reads this to check
 *  the size before uploading. */
export async function readUploadFile(f: File): Promise<Omit<SettingsUpload, "id" | "filename">> {
  const kind = kindOf(f);
  const base = { name: f.name, mimetype: f.type || "application/octet-stream", kind, size: f.size };
  if (kind !== "image") return base;
  const src = await readDataUrl(f);
  const dims = await imageSize(src);
  return { ...base, src, ...(dims ?? {}) };
}

/** The stored name: the original, made unique among the corpus's files
 *  (`logo.png`, `logo-1.png`), since it is the URL. */
function uniqueFilename(name: string, taken: Set<string>) {
  if (!taken.has(name)) return name;
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 1;
  while (taken.has(`${stem}-${i}${ext}`)) i += 1;
  return `${stem}-${i}${ext}`;
}

let seq = 0;
const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const say = (store: Store, type: "success" | "error", message: string, detail?: string) =>
  store.set(toastsAtom, (p) => [...p, { id: `up-${Date.now()}-${++seq}`, message, type, ...(detail ? { detail } : {}) }]);

/** Upload `files` into `corpus`'s Uploads. Resolves with the ids created, in
 *  order, once the last file is in. */
export async function runUploads(store: Store, files: File[], corpus: Corpus): Promise<string[]> {
  const tooBig = files.filter((f) => f.size > UPLOAD_LIMIT);
  const queue = files.filter((f) => f.size <= UPLOAD_LIMIT);
  for (const f of tooBig)
    say(store, "error", "An error occurred", `“${f.name}” is larger than the ${UPLOAD_LIMIT_LABEL} limit for uploads. It was not uploaded.`);
  if (queue.length === 0) return [];

  const id = `upload-custom-${Date.now().toString(36)}-${++seq}`;
  const line = (name: string, pct: number, remaining: number) =>
    `Uploading... ${name} ${pct}% (${remaining} remaining files)`;
  const patch = (change: Partial<Task>) =>
    store.set(tasksAtom, (prev) => prev.map((a) => (a.id === id ? { ...a, ...change } : a)));
  store.set(tasksAtom, (prev) => [
    ...prev,
    { id, label: line(queue[0].name, 0, queue.length - 1), current: 0, total: queue.length * 100, driven: true },
  ]);

  const created: string[] = [];
  const failed: string[] = [];
  for (let i = 0; i < queue.length; i++) {
    const f = queue[i];
    const remaining = queue.length - 1 - i;
    // Paced by size so a progress line is visible: 0.6 s to 2 s a file.
    const ms = Math.max(600, Math.min(2000, f.size / 500));
    const steps = 5;
    for (let s = 1; s < steps; s++) {
      const pct = Math.round((s / steps) * 100);
      patch({ label: line(f.name, pct, remaining), current: i * 100 + pct });
      await sleep(ms / steps);
    }
    try {
      const value = await readUploadFile(f);
      const taken = new Set(store.get(uploads.listOfAtom(corpus)).map((u) => u.filename));
      const filename = uniqueFilename(f.name, taken);
      created.push(store.set(uploads.createAtom, { value: { ...value, filename }, corpus }));
      store.set(appendActivityAtom, {
        method: "CREATE",
        summary: `Uploaded custom file “${f.name}”`,
        domain: "upload",
        scope: corpus,
      });
    } catch (err) {
      failed.push(f.name);
      say(store, "error", "An error occurred", `“${f.name}” could not be uploaded: ${(err as Error)?.message ?? "storage is full"}`);
    }
    patch({ label: line(f.name, 100, remaining), current: (i + 1) * 100 - (i === queue.length - 1 ? 1 : 0) });
  }
  // Completing the task is what adds the notification (the Beacon reads
  // `done`); a run where nothing landed ends without a success.
  if (created.length === 0) {
    store.set(tasksAtom, (prev) => prev.filter((a) => a.id !== id));
    return created;
  }
  const names = store
    .get(uploadsAtom)
    .filter((u) => created.includes(u.id))
    .map((u) => u.name);
  patch({
    current: queue.length * 100,
    done: { title: "Uploaded custom file", detail: names.join(" · ") },
  });
  return created;
}

/** `upload(files)`, into the corpus the app is showing. */
export function useUploadFiles() {
  const store = useStore();
  return useCallback((files: File[]) => runUploads(store, files, store.get(dataSourceAtom)), [store]);
}
