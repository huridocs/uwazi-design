import { useAtomValue } from "jotai";
import { renditionsByLanguage } from "../../data/documentRenditions";
import { languageAtom } from "../../atoms/language";
import type { DocumentFormat } from "../../atoms/selection";

/** Plain-text and HTML renditions of the default primary document, shown when
 *  the Document-tab format picker is set to something other than PDF. Renders
 *  on a paper surface that fills the pane (like the PDF area) with the text in
 *  a centred readable column. Language-aware: the content follows the active
 *  language tab, and Arabic flows right-to-left. */
export function DocumentRendition({ format }: { format: DocumentFormat }) {
  const language = useAtomValue(languageAtom);
  const rendition = renditionsByLanguage[language] ?? renditionsByLanguage.EN;
  const rtl = language === "AR";

  if (format === "text") {
    return (
      <div className="absolute inset-0 overflow-auto bg-paper">
        <pre
          dir={rtl ? "rtl" : "ltr"}
          className="mx-auto max-w-[44rem] whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-ink-secondary px-6 py-8"
        >
          {rendition.plainText}
        </pre>
      </div>
    );
  }

  // HTML — styled article rendering.
  return (
    <div className="absolute inset-0 overflow-auto bg-paper">
      <article dir={rtl ? "rtl" : "ltr"} className="mx-auto max-w-[44rem] px-6 py-8">
        {rendition.html.map((block, i) => {
          switch (block.type) {
            case "h1":
              return (
                <h1 key={i} className="text-lg font-bold text-ink text-center leading-snug">
                  {block.text}
                </h1>
              );
            case "h2":
              return (
                <h2 key={i} className="text-sm font-semibold text-ink mt-5 mb-2 first:mt-2">
                  {block.text}
                </h2>
              );
            case "section":
              return (
                <h2
                  key={i}
                  className="text-[13px] font-semibold uppercase tracking-wider text-ink-secondary text-center mt-7 mb-4"
                >
                  {block.text}
                </h2>
              );
            case "num":
              return (
                <p key={i} className="flex gap-2 text-sm text-ink-secondary leading-relaxed mb-3">
                  <span className="font-semibold text-ink shrink-0 tabular-nums">{block.n}</span>
                  <span>{block.text}</span>
                </p>
              );
            default:
              return (
                <p key={i} className="text-sm text-ink-secondary leading-relaxed mb-3">
                  {block.text}
                </p>
              );
          }
        })}
      </article>
    </div>
  );
}
