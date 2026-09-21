import type { useStore } from "jotai";
import { activitiesAtom, type Activity } from "../atoms/notifications";
import { addCreatedEntityAtom } from "../atoms/createEntity";
import type { CreatedCorpus } from "../data/createdEntities";
import type { Entity } from "../data/entities";
import type { Language } from "../atoms/language";
import { uploadTemplateId } from "./createEntity";
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

/** Upload one PDF: an "Uploading" phase paced by the file's real size, then a
 *  "Processing" phase (mocked — there is no server to OCR or extract), then a
 *  new entity of the corpus's upload template, carrying the file as its
 *  primary document. The file stays in the browser as a blob URL, which both
 *  the viewer and the card thumbnail read like any other PDF url. */
export function runPdfUpload(
  store: Store,
  file: File,
  corpus: CreatedCorpus,
  onCreated?: (entityId: string) => void,
): void {
  const id = taskId("upload");
  store.set(activitiesAtom, (prev) => [
    ...prev,
    { id, label: "Uploading PDF", detail: file.name, current: 0, total: 100, driven: true },
  ]);
  // ~1s per MB, at least 1.2s: slow enough to see, fast enough not to wait on.
  const uploadMs = Math.max(1200, Math.min(6000, file.size / 1000));
  const started = performance.now();
  const tick = () => {
    const t = performance.now() - started;
    if (t < uploadMs) {
      patch(store, id, { current: Math.round((t / uploadMs) * 60) });
      window.setTimeout(tick, 150);
      return;
    }
    if (t < uploadMs + 1400) {
      patch(store, id, { label: "Processing PDF", current: 60 + Math.round(((t - uploadMs) / 1400) * 39) });
      window.setTimeout(tick, 150);
      return;
    }
    const entityId = store.set(addCreatedEntityAtom, {
      typeId: uploadTemplateId(corpus),
      corpus,
      title: file.name.replace(/\.pdf$/i, ""),
      file: { name: file.name, size: file.size, url: URL.createObjectURL(file) },
    });
    patch(store, id, {
      current: 100,
      done: { title: `${file.name} uploaded.`, detail: "Added to the library as a new document." },
    });
    onCreated?.(entityId);
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
