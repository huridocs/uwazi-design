import { atom } from "jotai";
import { createSettingsCollection, hasId } from "./settingsCollection";
import { signedInUserAtom } from "./users";

/** Settings › Preserve: one extension token per user (Uwazi keeps them in the
 *  collection's `features.preserve.config`, so per corpus). Decision G9: the
 *  page is the token card only; there are no capture sources. */
export interface PreserveTokenRecord {
  id: string;
  userId: string;
  token: string;
  /** epoch ms */
  created: number;
}

const isToken = (r: unknown): boolean => {
  if (!hasId(r)) return false;
  const t = r as Partial<PreserveTokenRecord>;
  return typeof t.userId === "string" && typeof t.token === "string" && typeof t.created === "number";
};

export const preserveTokens = createSettingsCollection<PreserveTokenRecord>({
  name: "preserve",
  idPrefix: "pt",
  seedOf: () => [],
  corpusScoped: true,
  isRecord: isToken,
});

/** The signed-in user's token in the collection shown, if requested. */
export const myPreserveTokenAtom = atom((get) => {
  const me = get(signedInUserAtom);
  return get(preserveTokens.listAtom).find((t) => t.userId === me?.id) ?? null;
});

/** A new token as the Preserve host hands it out: 40 hex characters. */
export function newPreserveToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
