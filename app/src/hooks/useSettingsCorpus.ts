import { useCallback, useEffect, useState } from "react";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { cejilReadyAtom, dataSourceAtom, travesiaReadyAtom } from "../atoms/dataSource";
import { loadTravesiaData } from "../data/travesia/load";
import { loadCejilData } from "../data/cejil/load";
import { effectiveSettingsSectionAtom } from "../atoms/settings";

/** True while the active corpus's Settings data is still on its way.
 *
 *  Only Travesía's Settings lists are lazy (its thesauri arrive with its
 *  entities). CEJIL's lists are bundled, so they never read as loading; its
 *  entities still load, for the usage counts (`atoms/settingsUsage.ts`). A
 *  list that reads this shows a loading state instead of its empty state, so
 *  an admin never reads "nothing here" for a corpus that has 98 thesauri. */
export function useSettingsCorpusLoading(): boolean {
  const source = useAtomValue(dataSourceAtom);
  const ready = useAtomValue(travesiaReadyAtom);
  return source === "travesia" && !ready;
}

/** Settings pages that count CEJIL entities for a usage line. */
const CEJIL_USAGE_SECTIONS = new Set(["templates", "thesauri"]);

/** Why the active corpus failed to load, or null. Set by
 *  `useLoadSettingsCorpus`; Retry clears it and loads again. */
export const settingsCorpusErrorAtom = atom<string | null>(null);

/** Fetches the active corpus's lazy data: Travesía's Settings lists, and
 *  CEJIL's and Travesía's entities, which the usage counts read. The Library
 *  loads them too, and Settings can be opened without passing through it (a
 *  reload restores the last view), so the Settings shell asks. The loaders
 *  cache their promise and do not cache a failure. A failure is reported, not
 *  swallowed: until the entities arrive, usage says its counts are pending. */
export function useLoadSettingsCorpus(): { retry: () => void } {
  const source = useAtomValue(dataSourceAtom);
  const [travesiaReady, setTravesiaReady] = useAtom(travesiaReadyAtom);
  const [cejilReady, setCejilReady] = useAtom(cejilReadyAtom);
  const setError = useSetAtom(settingsCorpusErrorAtom);
  // CEJIL's records are about 26 MB: fetched only on the pages whose usage
  // counts read them (template property removal, thesaurus and value
  // deletes), not for Account or the Activity log. Its type lists and the
  // template and relationship-type counts are bundled.
  const section = useAtomValue(effectiveSettingsSectionAtom);
  const needsCejil = CEJIL_USAGE_SECTIONS.has(section);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const load =
      source === "travesia" && !travesiaReady
        ? () => loadTravesiaData().then(() => setTravesiaReady(true))
        : source === "cejil" && !cejilReady && needsCejil
          ? () => loadCejilData().then(() => setCejilReady(true))
          : null;
    if (!load) return;
    let alive = true;
    setError(null);
    load().catch((err: unknown) => {
      if (alive) setError(err instanceof Error ? err.message : String(err));
    });
    return () => {
      alive = false;
    };
  }, [source, travesiaReady, cejilReady, needsCejil, setTravesiaReady, setCejilReady, setError, attempt]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { retry };
}
