import { useCallback } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { dataSourceAtom } from "../atoms/dataSource";
import { toastsAtom, type NotificationAction } from "../atoms/notifications";
import { appendActivityAtom, scopeOfDomain, type ActivityChange } from "../atoms/activityLog";
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
  /** The log line, when "<Verb> <noun> “<name>”" does not say it (a restore). */
  summary?: string;
  /** The Beacon line. Defaults to "<name> created / saved / deleted". */
  message?: string;
  detail?: string;
  action?: NotificationAction;
  /** False for a change that does not persist yet (a page that keeps its list
   *  in its own state): the notification shows, the Activity log is not
   *  written, since an audit trail must not list edits that are gone after
   *  navigation. */
  log?: boolean;
  /** False to write the log entry without its own Beacon card: a bulk
   *  action logs each record and sends one summary card. */
  notify?: boolean;
  /** Field-by-field before and after, kept on the log entry. */
  changes?: ActivityChange[];
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
  const corpus = useAtomValue(dataSourceAtom);

  const record = useCallback(
    (e: SettingsEvent) => {
      const [past, done] = VERB[e.method];
      if (e.log !== false)
        append({
          method: e.method,
          summary: e.summary ?? `${past} ${e.noun} “${e.name}”`,
          domain: e.domain,
          targetId: e.id,
          scope: scopeOfDomain(e.domain, corpus),
          ...(e.changes?.length ? { changes: e.changes } : {}),
        });
      if (e.notify === false) return;
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
    [append, setToasts, corpus],
  );

  const fail = useCallback(
    (message: string, detail?: string) =>
      setToasts((p) => [...p, { id: `s-${Date.now()}-${seq++}`, message, type: "error", ...(detail ? { detail } : {}) }]),
    [setToasts],
  );

  return { record, fail };
}
