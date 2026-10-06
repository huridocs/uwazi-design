import { useEffect } from "react";
import { useStore } from "jotai";
import { applyLibrarySnapshotAtom, readViewHash } from "../atoms/savedViews";
import { useNotify } from "./useNotify";

/** Open the Library view a shared link carries (`#view=…`), on load and when
 *  a link is pasted into this tab. The hash is removed once applied, so a
 *  reload after further changes does not reopen the old state. */
export function useViewLink() {
  const store = useStore();
  const notify = useNotify();
  useEffect(() => {
    const open = () => {
      const view = readViewHash(window.location.hash);
      if (!window.location.hash.includes("view=")) return;
      const { pathname, search } = window.location;
      window.history.replaceState(null, "", `${pathname}${search}`);
      if (!view) {
        notify("This link's view could not be read.", "error");
        return;
      }
      store.set(applyLibrarySnapshotAtom, view.snapshot);
      notify(view.name ? `Opened the shared view “${view.name}”.` : "Opened a shared view.", "info");
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, [store, notify]);
}
