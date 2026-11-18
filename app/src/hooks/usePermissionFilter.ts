import { useMemo } from "react";
import { useAtomValue } from "jotai";
import { libraryPermissionModeAtom, libraryPermissionPicksAtom } from "../atoms/library";
import { entityMembersAtom } from "../atoms/entityOverlay";
import type { LibraryFilterState } from "../utils/libraryFilter";

/** The Permissions facet's part of `LibraryFilterState`, one object while
 *  nothing it reads changes, so the full-corpus memos keyed on the state stay
 *  put. Shared by the Library view and the Filters panel. */
export function usePermissionFilter(): Pick<
  LibraryFilterState,
  "sharedRead" | "sharedWrite" | "permissionMode" | "membersOf"
> {
  const { read, write } = useAtomValue(libraryPermissionPicksAtom);
  const mode = useAtomValue(libraryPermissionModeAtom);
  const membersOf = useAtomValue(entityMembersAtom);
  const any = read.length + write.length > 0;
  return useMemo(
    () => ({ sharedRead: read, sharedWrite: write, permissionMode: mode, membersOf: any ? membersOf : null }),
    [read, write, mode, any, membersOf],
  );
}
