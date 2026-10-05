import { useAtomValue } from "jotai";
import { AlertBanner } from "./AlertBanner";
import { settingsCorpusErrorAtom } from "../../hooks/useSettingsCorpus";

/** The collection's data did not load: Settings still works, but usage
 *  counts are unknown until it does. */
export function SettingsCorpusError({ onRetry }: { onRetry: () => void }) {
  const error = useAtomValue(settingsCorpusErrorAtom);
  if (!error) return null;
  return (
    <div data-component="SettingsCorpusError" className="px-4 pt-3">
      <AlertBanner variant="error">
        The collection's records did not load, so usage counts are unknown.{" "}
        <button type="button" onClick={onRetry} className="underline underline-offset-2 cursor-pointer">
          Try again
        </button>
      </AlertBanner>
    </div>
  );
}
