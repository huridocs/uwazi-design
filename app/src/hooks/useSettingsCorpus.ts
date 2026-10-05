import { useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { dataSourceAtom, travesiaReadyAtom } from "../atoms/dataSource";
import { loadTravesiaData } from "../data/travesia/load";

/** True while the active corpus's Settings data is still on its way.
 *
 *  Only Travesía's Settings data is lazy (its thesauri arrive with its
 *  entities). CEJIL's Settings data is bundled, and the mock and artworks
 *  corpora are present at start. A list that reads this shows a loading
 *  state instead of its empty state, so an admin never reads "nothing here"
 *  for a corpus that has 98 thesauri. */
export function useSettingsCorpusLoading(): boolean {
  const source = useAtomValue(dataSourceAtom);
  const ready = useAtomValue(travesiaReadyAtom);
  return source === "travesia" && !ready;
}

/** Fetches the active corpus's lazy Settings data. The Library is where the
 *  corpora load, and Settings can be opened without passing through it (a
 *  reload restores the last view), so the Settings shell asks too. The loader
 *  caches its promise; a second caller does not refetch. */
export function useLoadSettingsCorpus(): void {
  const source = useAtomValue(dataSourceAtom);
  const [ready, setReady] = useAtom(travesiaReadyAtom);
  useEffect(() => {
    if (source !== "travesia" || ready) return;
    let alive = true;
    loadTravesiaData().then(
      () => alive && setReady(true),
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [source, ready, setReady]);
}
