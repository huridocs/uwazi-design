import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { registerSettingsReset } from "./settingsReset";

/** Uwazi's feature switches that hide Settings sections for every role
 *  (inventory Part 0.8): metadata extraction, paragraph extraction, Preserve
 *  (`preserve.host`) and custom JS. Set from the Dev panel; all on by default;
 *  kept for the session; Reset demo data turns them back on. */
export interface FeatureFlags {
  metadataExtraction: boolean;
  paragraphExtraction: boolean;
  preserve: boolean;
  customJs: boolean;
}

export const FEATURE_LABELS: Record<keyof FeatureFlags, string> = {
  metadataExtraction: "metadata-extraction",
  paragraphExtraction: "paragraphExtraction",
  preserve: "preserve.host",
  customJs: "custom JS",
};

const ALL_ON: FeatureFlags = { metadataExtraction: true, paragraphExtraction: true, preserve: true, customJs: true };

/** Dev builds only: a production build has every feature on, reads no
 *  storage, and drops the switch code. */
export const featureFlagsAtom = import.meta.env.DEV
  ? atomWithStorage<FeatureFlags>("uwazi:dev:features", ALL_ON, createJSONStorage(() => sessionStorage), { getOnInit: true })
  : atom<FeatureFlags>(ALL_ON);
registerSettingsReset((set) => set(featureFlagsAtom, ALL_ON));

/** The flag a Settings section depends on, if any. */
export const SECTION_FLAG: Record<string, keyof FeatureFlags> = {
  "metadata-extraction": "metadataExtraction",
  "paragraph-extraction": "paragraphExtraction",
  preserve: "preserve",
};

/** The flag that hides a section right now, or null. */
export const sectionFlagOffAtom = atom((get) => {
  if (!import.meta.env.DEV) return (): keyof FeatureFlags | null => null;
  const flags = { ...ALL_ON, ...get(featureFlagsAtom) };
  return (section: string): keyof FeatureFlags | null => {
    const flag = SECTION_FLAG[section];
    return flag && !flags[flag] ? flag : null;
  };
});
