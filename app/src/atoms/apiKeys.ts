import { atom } from "jotai";
import { createSettingsCollection, hasId } from "./settingsCollection";
import { signedInUserAtom } from "./users";

/** Settings › Account › API keys. Prototype-only (G4): Uwazi has none. Global,
 *  like the account. Only the last four characters are kept; the full key is
 *  shown once, at Generate, and never stored. */
export interface ApiKeyRecord {
  id: string;
  userId: string;
  name: string;
  last4: string;
  /** epoch ms */
  created: number;
}

const isKey = (r: unknown): boolean => {
  if (!hasId(r)) return false;
  const k = r as Partial<ApiKeyRecord>;
  return typeof k.userId === "string" && typeof k.name === "string" && typeof k.last4 === "string" && typeof k.created === "number";
};

const seedKeys: ApiKeyRecord[] = [
  { id: "k1", userId: "u1", name: "Nightly export", last4: "3f9a", created: Date.UTC(2026, 0, 12, 10) },
  { id: "k2", userId: "u1", name: "Website search", last4: "8c21", created: Date.UTC(2026, 2, 4, 15) },
];

export const apiKeys = createSettingsCollection<ApiKeyRecord>({
  name: "apikeys",
  idPrefix: "k",
  seedOf: () => seedKeys,
  corpusScoped: false,
  isRecord: isKey,
});

/** The signed-in user's keys, newest first. */
export const myApiKeysAtom = atom((get) => {
  const me = get(signedInUserAtom);
  return get(apiKeys.listAtom)
    .filter((k) => k.userId === me?.id)
    .sort((a, b) => b.created - a.created);
});

export const maskKey = (last4: string) => `uwz_live_••••${last4}`;

/** A new full key: `uwz_live_` and 32 hex characters. */
export function newApiKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `uwz_live_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
}
