import type { useStore } from "jotai";
import { activitiesAtom, type Activity } from "../atoms/notifications";
import { addUploadedDocumentsAtom } from "../atoms/entityOverlay";
import type { Corpus } from "../data/entityOverlay";
import type { Entity } from "../data/entities";
import type { Language } from "../atoms/language";
import { downloadCsv, exportEntitiesCsv } from "./exportCsv";

/** The Library footer's background tasks, run against the jotai STORE rather
 *  than from component state: a task outlives the view that started it (leave
 *  the Library mid-upload and it still finishes), which is the point of showing
 *  it in the Beacon. Each is a `driven` Beacon activity — it reports its own
 *  progress, and its completion notification says what actually happened. */

type Store = ReturnType<typeof useStore>;

let seq = 0;
const taskId = (kind: string) => `${kind}-${Date.now().toString(36)}-${++seq}`;

function patch(store: Store, id: string, change: Partial<Activity>) {
  store.set(activitiesAtom, (prev) => prev.map((a) => (a.id === id ? { ...a, ...change } : a)));
}

export const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);

/** Upload a batch of PDFs as ONE Beacon task: an "Uploading" phase paced by
 *  the batch's real size, then "Processing" (mocked — there is no server to
 *  extract text), then one new entity per file, each of template `typeId` with
 *  its file as the primary document, and one notification naming them. The
 *  files stay in the browser as blob URLs, which the viewer and the card
 *  thumbnail read like any other PDF url. */
export function runPdfUploadBatch(
  store: Store,
  {
    corpus,
    typeId,
    uploads,
  }: { corpus: Corpus; typeId: string; uploads: { file: File; title: string }[] },
  onCreated?: (entityIds: string[]) => void,
): void {
  const id = taskId("upload");
  const n = uploads.length;
  const noun = n === 1 ? "document" : "documents";
  store.set(activitiesAtom, (prev) => [
    ...prev,
    {
      id,
      label: `Uploading ${n} ${noun}`,
      detail: n === 1 ? uploads[0].file.name : `${uploads[0].file.name} and ${n - 1} more`,
      current: 0,
      total: 100,
      driven: true,
    },
  ]);
  const bytes = uploads.reduce((sum, u) => sum + u.file.size, 0);
  // ~1s per MB, 1.2s to 8s: slow enough to see, fast enough not to wait on.
  const uploadMs = Math.max(1200, Math.min(8000, bytes / 1000));
  const processMs = 1000 + 300 * n;
  const started = performance.now();
  const tick = () => {
    const t = performance.now() - started;
    if (t < uploadMs) {
      patch(store, id, { current: Math.round((t / uploadMs) * 60) });
      window.setTimeout(tick, 150);
      return;
    }
    if (t < uploadMs + processMs) {
      patch(store, id, {
        label: `Processing ${n} ${noun}`,
        current: 60 + Math.round(((t - uploadMs) / processMs) * 39),
      });
      window.setTimeout(tick, 150);
      return;
    }
    const ids = store.set(addUploadedDocumentsAtom, {
      corpus,
      typeId,
      uploads: uploads.map(({ file, title }) => ({
        title,
        file: { name: file.name, size: file.size, url: URL.createObjectURL(file) },
      })),
    });
    patch(store, id, {
      current: 100,
      done: {
        title: `${n} ${noun} uploaded.`,
        detail: uploads.map((u) => u.title).join(" · "),
      },
    });
    onCreated?.(ids);
  };
  window.setTimeout(tick, 150);
}

/** Export entities as a CSV download, with the progress in the Beacon and the
 *  row count in its notification. The entity list is the caller's: the
 *  Library passes its current result set. */
export async function runCsvExport(
  store: Store,
  entities: readonly Entity[],
  language: Language,
  filename: string,
): Promise<void> {
  const id = taskId("export");
  // One step past the rows: the task is complete when the file is handed over,
  // not when the last row is built.
  const total = entities.length + 1;
  store.set(activitiesAtom, (prev) => [
    ...prev,
    {
      id,
      label: "Exporting CSV",
      detail: `${entities.length.toLocaleString()} ${entities.length === 1 ? "entity" : "entities"}`,
      current: 0,
      total,
      driven: true,
    },
  ]);
  const { csv, rows, columns } = await exportEntitiesCsv(entities, language, (done) =>
    patch(store, id, { current: done }),
  );
  downloadCsv(csv, filename);
  patch(store, id, {
    current: total,
    done: {
      title: `CSV exported — ${rows.toLocaleString()} ${rows === 1 ? "row" : "rows"}.`,
      detail: `${columns.length} columns · ${filename}`,
    },
  });
}
