import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { registerSettingsReset } from "./settingsReset";

/** Dev switches for demos and QA (the component catalog's Dev panel,
 *  acceptance SD-1): one-shot failure injection. The next action of the armed
 *  scope fails the way a server error would, with its reason, then the switch
 *  clears. Reset demo data clears it too. The zero-row switch (SD-5) arrives
 *  with the stores it acts on; the missing-id request (SD-6) is below, its
 *  button with the Dev panel. */
export type FailScope = "save" | "delete" | "import" | "install" | "run" | "read";

export const FAIL_SCOPES: { value: FailScope; label: string }[] = [
  { value: "save", label: "Save" },
  { value: "delete", label: "Delete" },
  { value: "import", label: "Import or Upload" },
  { value: "install", label: "Install or Uninstall" },
  { value: "run", label: "Run" },
  { value: "read", label: "Read" },
];

export const failNextAtom = atom<{ scope: FailScope; reason: string } | null>(null);
registerSettingsReset((set) => set(failNextAtom, null));

/** Called by an action before it writes: the armed failure's reason if the
 *  scope matches (and the switch clears), else null. */
export const consumeFailureAtom = atom(null, (get, set, scope: FailScope): string | null => {
  // Dev builds only: production never fails on purpose.
  if (!import.meta.env.DEV) return null;
  const armed = get(failNextAtom);
  if (!armed || armed.scope !== scope) return null;
  set(failNextAtom, null);
  return armed.reason;
});

/* ── Slow load (SD-4) ──────────────────────────────────────────────────── */

/** "Slow load (2 s)": while on, Settings holds its stores as loading for two
 *  seconds each time it opens, so the loading rows can be seen. Kept for the
 *  session, so a reload shows it too. */
export const slowLoadAtom = import.meta.env.DEV
  ? atomWithStorage<boolean>("uwazi:dev:slowLoad", false, createJSONStorage(() => sessionStorage), { getOnInit: true })
  : atom(false);
registerSettingsReset((set) => set(slowLoadAtom, false));
/** True during the two seconds. Set by the Settings shell on open; always
 *  false in a production build. */
const slowLoadingBaseAtom = atom(false);
export const slowLoadingAtom = atom(
  (get) => import.meta.env.DEV && get(slowLoadingBaseAtom),
  (_get, set, on: boolean) => {
    if (import.meta.env.DEV) set(slowLoadingBaseAtom, on);
  },
);

/* ── Missing id (SD-6) ─────────────────────────────────────────────────── */

/** A thesaurus id the Thesauri page opens its editor on, once, then clears:
 *  the Dev panel's "Open thesaurus editor with a missing id" (the app has no
 *  router, so a URL cannot be edited by hand). */
export const openThesaurusRequestAtom = atom<string | null>(null);
