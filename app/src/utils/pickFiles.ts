/** Files for the Library's Upload, with the `FileSystemFileHandle` where the
 *  browser gives one (Chromium), so an upload interrupted by a reload can get
 *  its file back after one permission prompt instead of a re-select. */

export interface PickedFile {
  file: File;
  handle?: FileSystemFileHandle;
}

type HandleWindow = Window & {
  showOpenFilePicker?: (o?: { multiple?: boolean }) => Promise<FileSystemFileHandle[]>;
};
type DirectoryHandle = FileSystemDirectoryHandle & { values: () => AsyncIterable<FileSystemHandle> };
type HandleItem = DataTransferItem & { getAsFileSystemHandle?: () => Promise<FileSystemHandle | null> };

/** Whether picked files come with handles (Chromium's file system access). */
export const pickerGivesHandles = () => typeof (window as HandleWindow).showOpenFilePicker === "function";

/** The system picker, any type, several at once. Null when the reader
 *  cancels. Without file system access, a plain file input. */
export async function pickFiles(): Promise<PickedFile[] | null> {
  const w = window as HandleWindow;
  if (w.showOpenFilePicker) {
    try {
      const handles = await w.showOpenFilePicker({ multiple: true });
      return Promise.all(handles.map(async (handle) => ({ file: await handle.getFile(), handle })));
    } catch (e) {
      if ((e as DOMException)?.name === "AbortError") return null;
      // Blocked (an iframe, a policy): fall through to the input.
    }
  }
  return inputPick();
}

/** A plain file input, for browsers without handles and for choosing files
 *  again after a reload. */
export function inputPick(): Promise<PickedFile[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = () => resolve(Array.from(input.files ?? []).map((file) => ({ file })));
    input.oncancel = () => resolve(null);
    input.click();
  });
}

async function fromDirectoryHandle(dir: DirectoryHandle, out: PickedFile[]) {
  for await (const h of dir.values()) {
    if (h.kind === "file") {
      const handle = h as FileSystemFileHandle;
      out.push({ file: await handle.getFile(), handle });
    } else await fromDirectoryHandle(h as DirectoryHandle, out);
  }
}

function readEntries(dir: FileSystemDirectoryEntry): Promise<FileSystemEntry[]> {
  const reader = dir.createReader();
  const all: FileSystemEntry[] = [];
  // readEntries returns at most 100 at a time: read until it returns none.
  return new Promise((resolve, reject) => {
    const next = () =>
      reader.readEntries((batch) => {
        if (!batch.length) return resolve(all);
        all.push(...batch);
        next();
      }, reject);
    next();
  });
}

async function fromEntry(entry: FileSystemEntry, out: PickedFile[]) {
  if (entry.isFile) {
    out.push({ file: await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej)) });
    return;
  }
  for (const child of await readEntries(entry as FileSystemDirectoryEntry)) await fromEntry(child, out);
}

/** Every file in a drop, folders walked. Handles and entries must be asked
 *  for while the drop event runs, so this reads them first and resolves
 *  after. */
export function droppedFiles(dt: DataTransfer): Promise<PickedFile[]> {
  const items = Array.from(dt.items).filter((i) => i.kind === "file") as HandleItem[];
  const loose = Array.from(dt.files);
  const pending = items.map((item) => ({
    handle: item.getAsFileSystemHandle?.() ?? null,
    entry: item.webkitGetAsEntry?.() ?? null,
    file: item.getAsFile(),
  }));
  return (async () => {
    if (!items.length) return loose.map((file) => ({ file }));
    const out: PickedFile[] = [];
    for (const p of pending) {
      const handle = p.handle ? await p.handle.catch(() => null) : null;
      if (handle?.kind === "file") out.push({ file: await (handle as FileSystemFileHandle).getFile(), handle: handle as FileSystemFileHandle });
      else if (handle?.kind === "directory") await fromDirectoryHandle(handle as DirectoryHandle, out);
      else if (p.entry?.isDirectory) await fromEntry(p.entry, out);
      else if (p.file) out.push({ file: p.file });
    }
    return out;
  })();
}

/** Whether a drag carries files (not text or a link from the page). */
export const dragHasFiles = (dt: DataTransfer | null) => !!dt && Array.from(dt.types).includes("Files");
