import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { libraryFacetMatchAtom, libraryPermissionPicksAtom, libraryPermissionsAllowedAtom } from "../atoms/library";
import { entityMembersAtom } from "../atoms/entityChanges";
import { facetActive, type LibraryFilterState } from "../utils/libraryFilter";

/** The Permissions facet's part of `LibraryFilterState`, one object while
 *  nothing it reads changes, so the full-corpus memos keyed on the state stay
 *  put; `key` is the same as a string, for `passKey`. Shared by the Library
 *  view and the Filters panel. */
export function usePermissionFilter(): {
  state: Pick<LibraryFilterState, "permissions" | "permissionMode" | "membersOf">;
  key: string;
} {
  const picks = useAtomValue(libraryPermissionPicksAtom);
  const allowed = useAtomValue(libraryPermissionsAllowedAtom);
  const stored = useAtomValue(libraryFacetMatchAtom).permissions ?? "any";
  const mode = allowed ? stored : "any";
  const membersOf = useAtomValue(entityMembersAtom);
  const active = facetActive(mode, picks.length);
  // A Share change gives `membersOf` a new identity; while the facet narrows,
  // the key must change with it. One number per identity, so both Split panes
  // build the same key.
  const version = versionOf(membersOf);
  return useMemo(
    () => ({
      state: { permissions: picks, permissionMode: mode, membersOf: active ? membersOf : null },
      key: active ? `${mode}:${picks.join(",")}:${version}` : "",
    }),
    [picks, mode, active, membersOf, version],
  );
}
const versions = new WeakMap<object, number>();
let nextVersion = 0;
function versionOf(fn: object): number {
  let v = versions.get(fn);
  if (v === undefined) versions.set(fn, (v = ++nextVersion));
  return v;
}
