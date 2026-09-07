import { useEffect, useRef, useState } from "react";
import { ChevronRight, Languages, RotateCw, Sparkles } from "lucide-react";
import type { Language } from "../../atoms/language";
import { UwaziLoader } from "../shared/UwaziLoader";
import { LANGUAGE_NAMES, languageDir, mockTranslate } from "../../utils/mockTranslate";

/** One field, every language — the in-place translation control.
 *
 *  Uwazi stores a value per language, and the edit form has only ever shown the
 *  one the header picker is pointing at. So a title's other three languages
 *  were editable only by switching the whole form's reading language and coming
 *  back, and there was no way to see, from the field, that two of them were
 *  empty. This is that seam surfaced ON the field:
 *
 *  - The big input above stays the CURRENT language. This block never renders a
 *    second editor for it — two boxes holding one value, one of them scrolled
 *    out of view, is how a form teaches you not to trust it.
 *  - The summary row is ALWAYS MOUNTED, at a fixed height, whether the panel is
 *    open or shut and whether or not anything is translating. Opening the panel
 *    is a disclosure the user asked for; the summary appearing under them is
 *    not, and this sits directly above the next field.
 *  - Each row reserves its status slot at a fixed width, so the working loader,
 *    the "Auto" marker and the re-translate button swap inside it without the
 *    input beside them changing size.
 *
 *  Auto-translate fills EMPTY languages only. Overwriting a human's sentence
 *  from a button labelled with no target is the one move that would make people
 *  stop pressing it; re-translating a filled row is per-row, and says which row
 *  it is about. */

export interface MultiLanguageFieldProps {
  /** The field's name, for accessible labels ("Spanish title"). */
  label: string;
  /** `field-title` etc. — row inputs derive `${idPrefix}-lang-es` from it. */
  idPrefix: string;
  languages: Language[];
  current: Language;
  values: Record<Language, string>;
  /** Which languages hold a machine-written value not yet reviewed by a human. */
  machine: Partial<Record<Language, boolean>>;
  /** `machine` defaults false: any call that isn't the translator is a person. */
  onChange: (lang: Language, value: string, machine?: boolean) => void;
  /** Authored translations, when the data has real ones. See mockTranslate. */
  authored?: Partial<Record<Language, string>>;
}

export function MultiLanguageField({
  label, idPrefix, languages, current, values, machine, onChange, authored,
}: MultiLanguageFieldProps) {
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState<Language[]>([]);
  // Every stream in flight, so unmounting mid-translation doesn't setState on a
  // dead form — the trap `copyPreviewAtom` fell into (CLAUDE.md, click-to-fill).
  const timers = useRef<number[]>([]);
  useEffect(() => () => { timers.current.forEach(window.clearTimeout); }, []);

  const others = languages.filter((l) => l !== current);
  const source = values[current]?.trim() ?? "";
  const empties = others.filter((l) => !values[l]?.trim());
  const canTranslate = source.length > 0 && empties.length > 0 && working.length === 0;

  /** Stream one language in, word by word — the Bert idiom, because a value
   *  landing whole in a field the user isn't looking at reads as a glitch. */
  const translate = (lang: Language) => {
    const full = mockTranslate(source, lang, authored);
    setWorking((prev) => (prev.includes(lang) ? prev : [...prev, lang]));
    onChange(lang, "", true);
    const tokens = full.split(/(\s+)/);
    let i = 0;
    const step = () => {
      i += 2;
      onChange(lang, tokens.slice(0, i).join(""), true);
      if (i < tokens.length) timers.current.push(window.setTimeout(step, 26));
      else setWorking((prev) => prev.filter((l) => l !== lang));
    };
    timers.current.push(window.setTimeout(step, 120));
  };

  const translateEmpty = () => { setOpen(true); empties.forEach(translate); };

  const summary =
    empties.length === 0
      ? `${others.length} other languages set`
      : `${empties.length} of ${others.length} other languages empty`;

  return (
    <div>
      {/* Summary row — always mounted, fixed height, whatever the panel does. */}
      <div className="flex items-center gap-2 h-6">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={`${idPrefix}-langs`}
          className="inline-flex items-center gap-1.5 h-6 px-1.5 -ms-1.5 rounded-md
            text-meta text-ink-tertiary hover:text-ink-secondary hover:bg-warm
            transition-colors cursor-pointer focus:outline-none
            focus-visible:ring-2 focus-visible:ring-carbon/40"
        >
          <ChevronRight
            size={11}
            className={`transition-transform ${open ? "rotate-90" : ""}`}
            aria-hidden
          />
          <Languages size={11} aria-hidden />
          <span>Languages</span>
          <span className="text-ink-muted">·</span>
          <span className="text-ink-muted">{summary}</span>
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={translateEmpty}
          aria-disabled={!canTranslate || undefined}
          title={
            source.length === 0
              ? `Write the ${LANGUAGE_NAMES[current]} ${label.toLowerCase()} first`
              : empties.length === 0
                ? "Every language has a value — use the re-translate button on a row"
                : `Fill ${empties.map((l) => LANGUAGE_NAMES[l]).join(", ")} from ${LANGUAGE_NAMES[current]}`
          }
          className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-meta
            border transition-colors cursor-pointer focus:outline-none
            focus-visible:ring-2 focus-visible:ring-carbon/40 ${
              canTranslate
                ? "text-carbon border-carbon/30 bg-carbon-tint/40 hover:bg-carbon-tint"
                : "text-ink-muted border-border bg-paper cursor-default"
            }`}
        >
          <Sparkles size={11} aria-hidden />
          Auto-translate
        </button>
      </div>

      {/* The panel. Opened deliberately, so it may take its own height. */}
      {open && (
        <div id={`${idPrefix}-langs`} className="mt-1.5 space-y-1.5">
          {others.map((lang) => {
            const busy = working.includes(lang);
            const isMachine = !!machine[lang] && !busy;
            const value = values[lang] ?? "";
            return (
              <div key={lang} className="flex items-start gap-2">
                <label
                  htmlFor={`${idPrefix}-lang-${lang.toLowerCase()}`}
                  className="w-8 shrink-0 h-9 flex items-center text-meta font-medium text-ink-tertiary uppercase"
                  title={LANGUAGE_NAMES[lang]}
                >
                  {lang}
                </label>
                <input
                  id={`${idPrefix}-lang-${lang.toLowerCase()}`}
                  type="text"
                  dir={languageDir(lang)}
                  value={value}
                  onChange={(e) => onChange(lang, e.target.value)}
                  placeholder={`No ${LANGUAGE_NAMES[lang]} ${label.toLowerCase()} yet`}
                  aria-label={`${LANGUAGE_NAMES[lang]} ${label.toLowerCase()}`}
                  className={`flex-1 min-w-0 px-3 py-2 text-sm text-ink bg-paper rounded-md
                    border transition-shadow placeholder:text-ink-muted
                    focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40
                    ${isMachine ? "border-carbon/30" : "border-border"}`}
                />
                {/* Reserved status slot — the loader, the marker and the button
                    all live at this one width so the input never resizes. */}
                <div className="w-[5.5rem] shrink-0 flex items-center justify-end gap-1 h-9">
                  {busy ? (
                    <span className="inline-flex items-center gap-1 text-meta text-ink-tertiary">
                      <UwaziLoader size="xs" color="carbon" animate />
                      <span aria-live="polite">Translating</span>
                    </span>
                  ) : (
                    <>
                      {isMachine && (
                        <span
                          title="Machine translated — editing this row clears the marker"
                          className="inline-flex items-center h-4 px-1.5 rounded-md
                            bg-carbon-tint text-meta leading-none text-carbon"
                        >
                          Auto
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => translate(lang)}
                        aria-disabled={!source || undefined}
                        title={
                          source
                            ? `Re-translate ${LANGUAGE_NAMES[lang]} from ${LANGUAGE_NAMES[current]}${value ? " — replaces what is there" : ""}`
                            : `Write the ${LANGUAGE_NAMES[current]} ${label.toLowerCase()} first`
                        }
                        aria-label={`Re-translate ${LANGUAGE_NAMES[lang]} ${label.toLowerCase()}`}
                        className={`flex items-center justify-center w-6 h-6 rounded-md
                          transition-colors focus:outline-none focus-visible:ring-2
                          focus-visible:ring-carbon/40 ${
                            source
                              ? "text-ink-muted hover:text-ink hover:bg-warm cursor-pointer"
                              : "text-ink-muted/50 cursor-default"
                          }`}
                      >
                        <RotateCw size={11} aria-hidden />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
