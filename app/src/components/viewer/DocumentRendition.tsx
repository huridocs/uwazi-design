import { defaultDocRendition } from "../../data/documentRenditions";
import type { DocumentFormat } from "../../atoms/selection";

/** Plain-text and HTML renditions of the default primary document, shown when
 *  the Document-tab format picker is set to something other than PDF. */
export function DocumentRendition({ format }: { format: DocumentFormat }) {
  if (format === "text") {
    return (
      <div className="absolute inset-0 overflow-auto flex justify-center items-start py-6 px-4 bg-vellum">
        <pre
          dir="ltr"
          className="w-full max-w-[44rem] whitespace-pre-wrap font-mono text-[12.5px] leading-relaxed text-ink-secondary bg-paper rounded-md p-6"
          style={{ border: "1px solid var(--border-primary)" }}
        >
          {defaultDocRendition.plainText}
        </pre>
      </div>
    );
  }

  // HTML — styled article rendering.
  return (
    <div className="absolute inset-0 overflow-auto flex justify-center py-6 px-4 bg-vellum">
      <article
        className="w-full max-w-[44rem] bg-paper rounded-md px-8 py-7"
        style={{ border: "1px solid var(--border-primary)" }}
      >
        {defaultDocRendition.html.map((block, i) => {
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
