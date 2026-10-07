import { atom } from "jotai";

/** The Sync view's state. The window, the playhead and the folded groups are
 *  per Library pane (`libraryPaneScopedAtoms`) and outlive the view, so a
 *  preview, a trip to the entity view or a view switch finds them as they
 *  were. Epoch seconds of the Las Vegas wall clock, as the corpus stores it. */

/** The visible stretch of the clock; null is the default window. */
export const syncWindowAtom = atom<{ from: number; to: number } | null>(null);

/** The instant the readout lists recordings for; null until the reader sets one. */
export const syncPlayheadAtom = atom<number | null>(null);

/** Lane groups the reader folded or opened, by group id. A group not listed
 *  takes its default (open, unless none of its lanes is on the clock). */
export const syncFoldedAtom = atom<Record<string, boolean>>({});

const NOTICE_KEY = "uwazi:sync-open-notice";
const readNotice = () => {
  try {
    return sessionStorage.getItem(NOTICE_KEY) === "1";
  } catch {
    return false;
  }
};
const noticeStateAtom = atom(readNotice());

/** The reader has read the content notice before opening a recording on its
 *  host; asked once per session. Shared by both Split panes. */
export const syncOpenNoticeSeenAtom = atom(
  (get) => get(noticeStateAtom),
  (_get, set, seen: boolean) => {
    set(noticeStateAtom, seen);
    try {
      if (seen) sessionStorage.setItem(NOTICE_KEY, "1");
      else sessionStorage.removeItem(NOTICE_KEY);
    } catch {
      // Private mode: the notice is asked again after a reload.
    }
  },
);
