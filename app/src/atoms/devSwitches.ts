import { atom } from "jotai";
import { registerSettingsReset } from "./settingsReset";

/** Dev switches for demos and QA (the component catalog's Dev panel,
 *  acceptance SD-1): one-shot failure injection. The next action of the armed
 *  scope fails the way a server error would, with its reason, then the switch
 *  clears. Reset demo data clears it too. */
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
  const armed = get(failNextAtom);
  if (!armed || armed.scope !== scope) return null;
  set(failNextAtom, null);
  return armed.reason;
});
