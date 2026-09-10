import { atomWithStorage, createJSONStorage } from "jotai/utils";

/** Session settings — preferences a reader sets just by USING the app (dragging a
 *  handle, not ticking a box in Settings), remembered for the visit.
 *
 *  Session storage, not local, for the reason `atoms/navigation.ts` gives for the
 *  app view: a reload should keep your place, but a new visit should start from
 *  the prototype's own defaults, not from whatever someone left behind days ago
 *  on a shared deploy.
 *
 *  Every setting here goes through `sessionSetting`, which VALIDATES what it
 *  reads back. Storage is outside the app's control — an older build's value, a
 *  hand edit in devtools, a blocked `sessionStorage` — and an unchecked value
 *  flows straight into layout. Anything that fails the guard reads as the
 *  setting's initial value. */
function sessionSetting<T>(
  key: string,
  initialValue: T,
  isValid: (value: unknown) => value is T,
) {
  const json = createJSONStorage<T>(() => {
    // Accessing `sessionStorage` itself throws where site data is blocked.
    try {
      return sessionStorage;
    } catch {
      // jotai treats a missing storage as "nothing stored"; its types don't say so.
      return undefined as unknown as Storage;
    }
  });
  const guard = (value: unknown, fallback: T): T => (isValid(value) ? value : fallback);
  return atomWithStorage<T>(
    `uwazi:${key}`,
    initialValue,
    {
      ...json,
      getItem: (k, init) => guard(json.getItem(k, init), init),
      subscribe: json.subscribe
        ? (k, callback, init) => json.subscribe!(k, (v) => callback(guard(v, init)), init)
        : undefined,
    },
    { getOnInit: true },
  );
}

/** The widest and narrowest right drawer a drag could plausibly have produced, in
 *  px. Only a sanity bound on what storage hands back — each host still clamps to
 *  its own minimum and to half its container. Below the smallest host minimum
 *  (360) or past half of an 8K-wide window, the value didn't come from a drag. */
const DRAWER_WIDTH_SANE = { min: 240, max: 4096 } as const;

/** The right drawer's width, ONE value for every `SplitView` host: drag it in the
 *  Library and an entity opens at the same width. `null` until the first drag, so
 *  each host shows its own default until then. Written on drag END only. */
export const drawerWidthAtom = sessionSetting<number | null>(
  "drawerWidth",
  null,
  (v): v is number | null =>
    v === null ||
    (typeof v === "number" &&
      Number.isFinite(v) &&
      v >= DRAWER_WIDTH_SANE.min &&
      v <= DRAWER_WIDTH_SANE.max),
);
