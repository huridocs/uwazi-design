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
  /** Where the record lives: a corpus for the collection's content, `global`
   *  for users and groups (CLAUDE.md › Settings stores). */
  scope?: string;
  /** What a save changed, field by field, read back by the log's detail row.
   *  Absent when the entry did not record it (seed rows, creates, deletes). */
  changes?: ActivityChange[];
}

export interface ActivityChange {
  field: string;
  before: string;
  after: string;
}

/** Entries kept in the session, newest first. */
const LOG_CAP = 500;

const storage = createJSONStorage<ActivityEntry[]>(() => {
  try {
    return sessionStorage;
  } catch {
    return undefined as unknown as Storage;
  }
});
const LOG_KEY = "uwazi:settings:activity";
const appendedAtom = atomWithStorage<ActivityEntry[]>(LOG_KEY, [], storage, { getOnInit: true });
registerSettingsReset((set) => set(appendedAtom, RESET));

const pad = (n: number) => String(n).padStart(2, "0");
/** "2026-06-15 18:42", the seed's form. */
export const logTime = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Seed rows that name a record are the Sample's.
const seeded: ActivityEntry[] = seedActivityLog.map((e) => ({
  ...e,
  at: new Date(e.time.replace(" ", "T")).getTime(),
  ...(e.domain ? { scope: "mock" } : {}),
}));

/** Whether an entry is one of the seed rows (whose request line is made up). */
export const isSeedEntry = (e: ActivityEntry) => seededIds.has(e.id);
const seededIds = new Set(seedActivityLog.map((e) => e.id));

/** Newest first. Whatever storage hands back that is not an entry is dropped. */
export const activityLogAtom = atom<ActivityEntry[]>((get) => {
  const raw = get(appendedAtom);
  const appended = Array.isArray(raw)
    ? raw.filter((e) => e && typeof e.id === "string" && typeof e.at === "number" && typeof e.summary === "string")
    : [];
  return [...appended, ...seeded].sort((a, b) => b.at - a.at);
});

/** Bumped by the page's Retry, so the check below reads storage again. */
export const activityLogRetryAtom = atom(0);

/** Why the stored log could not be read, or null. JSON storage reads an
 *  unparseable value as empty, which would show "no activity" for a log that
 *  is there but broken; the Activity log page says so instead and offers a
 *  retry. */
export const activityLogErrorAtom = atom<string | null>((get) => {
  get(activityLogRetryAtom);
  get(appendedAtom);
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(LOG_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  try {
    return Array.isArray(JSON.parse(raw)) ? null : "The stored activity log is not a list of entries.";
  } catch {
    return "The stored activity log could not be read.";
  }
});

let seq = 0;
/** Append one entry, signed by the signed-in user. */
export const appendActivityAtom = atom(
  null,
  (
    get,
    set,
    e: { method: LogMethod; summary: string; domain: string; targetId?: string; scope: string; changes?: ActivityChange[] },
  ) => {
    seq += 1;
    const at = Date.now();
    const entry: ActivityEntry = {
      ...e,
      id: `log-${at.toString(36)}-${seq}`,
      at,
      time: logTime(at),
      user: get(signedInUserAtom)?.username ?? "unknown",
    };
    set(appendedAtom, (prev) => [entry, ...(Array.isArray(prev) ? prev : [])].slice(0, LOG_CAP));
  },
);

/** The last save (create or update) of one record, for an editor footer.
 *  Keyed `scope:domain:targetId`, so Filters saved on the Sample is not
 *  "saved" on CEJIL. */
export const lastSavedAtom = atomFamily((key: string) =>
  atom((get) =>
    get(activityLogAtom).find(
      (e) => e.method !== "DELETE" && e.domain !== undefined && `${e.scope}:${e.domain}:${e.targetId}` === key,
    ),
  ),
);

/** Settings domains about the people who sign in, not a collection. */
export const GLOBAL_DOMAINS = new Set(["user", "group", "apikey"]);
export const scopeOfDomain = (domain: string, corpus: string) => (GLOBAL_DOMAINS.has(domain) ? "global" : corpus);
