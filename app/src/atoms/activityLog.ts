import { atom } from "jotai";
import { atomFamily, atomWithStorage, createJSONStorage, RESET } from "jotai/utils";
import { seedActivityLog, type LogMethod, type SettingsLogEntry } from "../data/settings";
import { registerSettingsReset } from "./settingsCollection";
import { signedInUserAtom } from "./users";

/** The Activity log: the seed, plus an entry for every Settings create,
 *  update and delete made in this session (`useSettingsNotify`). Settings ›
 *  Activity log lists it; editor footers read "Saved N min ago by <user>"
 *  from it (`lastSavedAtom`). Domain events, not HTTP requests: an entry
 *  says who did what to which record, never a request body. */
export interface ActivityEntry extends SettingsLogEntry {
  /** epoch ms */
  at: number;
  /** The settings domain ("template", "thesaurus", …). Seed rows have none. */
  domain?: string;
  targetId?: string;
}

const storage = createJSONStorage<ActivityEntry[]>(() => {
  try {
    return sessionStorage;
  } catch {
    return undefined as unknown as Storage;
  }
});
const appendedAtom = atomWithStorage<ActivityEntry[]>("uwazi:settings:activity", [], storage, { getOnInit: true });
registerSettingsReset((set) => set(appendedAtom, RESET));

const pad = (n: number) => String(n).padStart(2, "0");
/** "2026-06-15 18:42", the seed's form. */
export const logTime = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const seeded: ActivityEntry[] = seedActivityLog.map((e) => ({ ...e, at: new Date(e.time.replace(" ", "T")).getTime() }));

/** Newest first. Whatever storage hands back that is not an entry is dropped. */
export const activityLogAtom = atom<ActivityEntry[]>((get) => {
  const raw = get(appendedAtom);
  const appended = Array.isArray(raw)
    ? raw.filter((e) => e && typeof e.id === "string" && typeof e.at === "number" && typeof e.summary === "string")
    : [];
  return [...appended, ...seeded].sort((a, b) => b.at - a.at);
});

let seq = 0;
/** Append one entry, signed by the signed-in user. */
export const appendActivityAtom = atom(
  null,
  (get, set, e: { method: LogMethod; summary: string; domain: string; targetId?: string }) => {
    seq += 1;
    const at = Date.now();
    const entry: ActivityEntry = {
      ...e,
      id: `log-${at.toString(36)}-${seq}`,
      at,
      time: logTime(at),
      user: get(signedInUserAtom)?.username ?? "unknown",
    };
    set(appendedAtom, (prev) => [entry, ...(Array.isArray(prev) ? prev : [])]);
  },
);

/** The last save (create or update) of one record, for an editor footer.
 *  Keyed `domain:targetId`. */
export const lastSavedAtom = atomFamily((key: string) =>
  atom((get) =>
    get(activityLogAtom).find(
      (e) => e.method !== "DELETE" && e.domain !== undefined && `${e.domain}:${e.targetId}` === key,
    ),
  ),
);
