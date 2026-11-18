import { useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Languages, X } from "lucide-react";
import { liveTranslateAtom } from "../../atoms/liveTranslate";
import { layerStackAtom } from "../../atoms/layerStack";
import { t } from "../../utils/i18n";

/** While live translate is on: a strip under the navbar that says so and has
 *  the way out, which in Uwazi was only the pressed "Live translate" button
 *  (huridocs/uwazi issue 9973). Escape ends it too, unless an overlay holds
 *  Escape. The strip also marks the root (`data-live-translate`), which
 *  underlines translatable text (`index.css`); a click on it opens
 *  `LiveTranslateEditor`. */
export function LiveTranslateStrip() {
  const [on, setOn] = useAtom(liveTranslateAtom);
  const layers = useAtomValue(layerStackAtom);

  useEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute("data-live-translate", on);
    return () => root.removeAttribute("data-live-translate");
  }, [on]);

  useEffect(() => {
    if (!on) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || layers.length) return;
      setOn(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [on, layers.length, setOn]);

  if (!on) return null;
  return (
    <div
      data-component="LiveTranslateStrip"
      role="region"
      aria-label={t("System", "Live translate")}
      className="shrink-0 flex items-center gap-3 h-10 px-4 bg-warning-light text-warning-label"
    >
      <Languages size={14} aria-hidden className="shrink-0" />
      <p role="status" className="flex-1 min-w-0 truncate text-xs">
        <span className="font-semibold">{t("System", "Live translate is on.")}</span>{" "}
        {t("System", "Click underlined text to translate it.")}
      </p>
      <kbd className="hidden md:inline text-meta font-medium opacity-70">Esc</kbd>
      <button
        type="button"
        data-part="turn-off"
        onClick={() => setOn(false)}
        className="shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-semibold bg-paper text-ink hover:bg-warm transition-colors cursor-pointer"
      >
        <X size={13} aria-hidden />
        {t("System", "Turn off live translate")}
      </button>
    </div>
  );
}
