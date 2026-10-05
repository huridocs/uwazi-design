/** The Sample's relationship-type registry as changed in this visit, kept in
 *  sessionStorage like every other settings store: the whole type list, and
 *  the references whose type a delete moved (`refId → typeId`). Read once at
 *  load by `atoms/references.ts`; written by `atoms/relationTypes.ts`. No app
 *  imports: it is read while the module graph is loading. */

export interface SavedSampleRegistry {
  types: { id: string; label: string }[];
  moved: Record<string, string>;
}

const KEY = "uwazi:settings:v2:sampleRelationTypes";

function store(): Storage | undefined {
  try {
    return sessionStorage;
  } catch {
    return undefined;
  }
}

/** The saved registry, or null. Anything malformed reads as nothing saved. */
export function readSampleRegistry(): SavedSampleRegistry | null {
  try {
    const raw = store()?.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<SavedSampleRegistry>;
    const types = Array.isArray(v.types)
      ? v.types.filter((t) => !!t && typeof t.id === "string" && typeof t.label === "string")
      : null;
    if (!types) return null;
    const moved =
      v.moved && typeof v.moved === "object"
        ? Object.fromEntries(Object.entries(v.moved).filter(([, t]) => typeof t === "string"))
        : {};
    return { types, moved };
  } catch {
    return null;
  }
}

export function writeSampleRegistry(saved: SavedSampleRegistry | null) {
  try {
    if (saved) store()?.setItem(KEY, JSON.stringify(saved));
    else store()?.removeItem(KEY);
  } catch {
    // Storage blocked or full: the change still holds for this page's life.
  }
}
