import { useAtom, useAtomValue } from "jotai";
import { Pin } from "lucide-react";
import { notebookOpenAtom, notebookPinCountAtom } from "../../atoms/notebook";
import { uiLanguageAtom } from "../../atoms/uiLanguage";
import { t } from "../../utils/i18n";
import { NotebookPanel } from "./NotebookPanel";

/** The navbar's way into the notebook: the pin mark, "Notebook" and how many
 *  records are pinned in this collection. The count is always drawn (0 included), so
 *  the first pin does not widen the button. Phones drop the word. */
export function NotebookButton({ rtl = false, compact = false }: { rtl?: boolean; compact?: boolean }) {
  const [open, setOpen] = useAtom(notebookOpenAtom);
  const count = useAtomValue(notebookPinCountAtom);
  useAtomValue(uiLanguageAtom); // re-render the label on a language switch
  const label = t("System", "Notebook");
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        data-component="NotebookButton"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}, ${count} pinned`}
        className="flex items-center gap-1.5 px-2.5 h-7 text-tab font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors"
      >
        <Pin size={13} aria-hidden fill={count ? "currentColor" : "none"} className={count ? "text-ink" : ""} />
        {!compact && label}
        <span data-part="count" className={`text-meta tabular-nums ${count ? "text-ink" : "text-ink-tertiary"}`}>
          {count}
        </span>
      </button>
      <NotebookPanel rtl={rtl} />
    </>
  );
}
