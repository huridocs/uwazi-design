import { useCallback } from "react";
import { useSetAtom } from "jotai";
import { toastsAtom, type NotificationAction } from "../atoms/notifications";
import { appendActivityAtom } from "../atoms/activityLog";
import type { LogMethod } from "../data/settings";

let seq = 0;

export interface SettingsEvent {
  method: Exclude<LogMethod, "MIGRATE">;
  /** The settings domain, also the `lastSavedAtom` key's first half. */
  domain: string;
  /** How the log names the record's kind: "template", "relationship type". */
  noun: string;
  id?: string;
  name: string;
  /** The Beacon line. Defaults to "<name> created / saved / deleted". */
  message?: string;
  detail?: string;
  action?: NotificationAction;
}

const VERB: Record<SettingsEvent["method"], [string, string]> = {
  CREATE: ["Created", "created"],
  UPDATE: ["Updated", "saved"],
  DELETE: ["Deleted", "deleted"],
};

/** Settings' one outcome path: a create, save or delete pushes its Beacon
 *  notification AND appends an Activity log entry (who, what, when, which
 *  record). `fail` reports an error and logs nothing, as nothing changed.
 *  Transient feedback that changes no record ("URL copied") stays on
 *  `useNotify`. */
export function useSettingsNotify() {
  const setToasts = useSetAtom(toastsAtom);
  const append = useSetAtom(appendActivityAtom);

  const record = useCallback(
    (e: SettingsEvent) => {
      const [past, done] = VERB[e.method];
      append({ method: e.method, summary: `${past} ${e.noun} “${e.name}”`, domain: e.domain, targetId: e.id });
      setToasts((p) => [
        ...p,
        {
          id: `s-${Date.now()}-${seq++}`,
          message: e.message ?? `${e.name} ${done}`,
          type: "success",
          ...(e.detail ? { detail: e.detail } : {}),
          ...(e.action ? { action: e.action } : {}),
        },
      ]);
    },
    [append, setToasts],
  );

  const fail = useCallback(
    (message: string, detail?: string) =>
      setToasts((p) => [...p, { id: `s-${Date.now()}-${seq++}`, message, type: "error", ...(detail ? { detail } : {}) }]),
    [setToasts],
  );

  return { record, fail };
}
