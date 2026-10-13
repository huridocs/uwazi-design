/** The upload queue's manifest in IndexedDB, so an upload interrupted by a
 *  reload can continue: per file its name, size, last modified, type, state
 *  and offset, and on Chromium the `FileSystemFileHandle` it was picked or
 *  dropped with. Never the bytes. One record, replaced on every change. */

const DB = "uwazi-uploads";
const STORE = "manifest";
const KEY = "queue";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadManifest<T>(): Promise<T | null> {
  try {
    const db = await open();
    return await new Promise<T | null>((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** Writes are chained, so a slow write never lands after a newer one. */
let chain: Promise<void> = Promise.resolve();
export function saveManifest(value: unknown | null): void {
  chain = chain.then(async () => {
    try {
      const db = await open();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        if (value === null) tx.objectStore(STORE).delete(KEY);
        else tx.objectStore(STORE).put(value, KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Blocked or full: the queue still runs; it just will not continue
      // after a reload.
    }
  });
}
