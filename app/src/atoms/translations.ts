import { atom } from "jotai";
import {
  seedLanguages,
  seedTranslationKeys,
  type SettingsTranslationContext,
  type TranslationKey,
} from "../data/settings";
import { registerSettingsReset } from "./settingsCollection";

/** Saved translations per context, over the seed. Before it the editor's
 *  Save kept nothing, so progress could not move. In memory for the visit;
 *  Settings › Dashboard › "Reset demo data" clears it. */
const savedAtom = atom<Record<string, TranslationKey[]>>({});
registerSettingsReset((set) => set(savedAtom, {}));

/** A context's seed rows: the seeded keys when there are any, else a
 *  representative set from its key count with only the source filled. */
export function seedRows(context: SettingsTranslationContext): TranslationKey[] {
  const seeded = seedTranslationKeys[context.id];
  if (seeded) return seeded.map((r) => ({ key: r.key, values: { ...r.values } }));
  const n = Math.min(context.keyCount, 10);
  return Array.from({ length: n }, (_, i) => ({
    key: `${context.name} term ${i + 1}`,
    values: Object.fromEntries(seedLanguages.map((l) => [l.key, l.default ? `${context.name} term ${i + 1}` : ""])),
  }));
}

export const translationRowsAtom = atom((get) => {
  const saved = get(savedAtom);
  return (context: SettingsTranslationContext) => saved[context.id] ?? seedRows(context);
});

export const saveTranslationsAtom = atom(null, (_get, set, { id, rows }: { id: string; rows: TranslationKey[] }) =>
  set(savedAtom, (prev) => ({ ...prev, [id]: rows })),
);

/** Uwazi's status rule: a value that is empty or still equals the source
 *  language's text is untranslated. */
export function isUntranslated(row: TranslationKey, langKey: string, sourceKey: string): boolean {
  const v = (row.values[langKey] ?? "").trim();
  return !v || v === (row.values[sourceKey] ?? "").trim();
}

export interface LanguageProgress {
  key: string;
  label: string;
  done: number;
  total: number;
}

/** Translated keys per target language. */
export function progressOf(rows: TranslationKey[], languages = seedLanguages): LanguageProgress[] {
  const source = languages.find((l) => l.default)?.key ?? "en";
  return languages
    .filter((l) => !l.default)
    .map((l) => ({
      key: l.key,
      label: l.label,
      total: rows.length,
      done: rows.filter((r) => !isUntranslated(r, l.key, source)).length,
    }));
}
