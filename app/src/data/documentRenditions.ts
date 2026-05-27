// Plain-text and HTML renditions of the default primary document
// (Velásquez-Rodríguez v. Honduras — Judgment). The source is the full text
// extracted from the vendored PDF (app/public/docs/...EN.pdf), imported raw —
// the way Uwazi derives a text layer and an HTML version from the upload.
import rawText from "./velasquez-judgment-en.txt?raw";

export type HtmlBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "section"; text: string }
  | { type: "p"; text: string }
  | { type: "num"; n: string; text: string };

export interface DocRendition {
  /** Monospace extracted text — what the PDF text layer yields. */
  plainText: string;
  /** Structured blocks rendered as a styled article. */
  html: HtmlBlock[];
}

const ROMAN = /^(X{0,3})(IX|IV|V?I{0,3})$/;

/** Re-flow the wrapped extraction into article blocks. Lines wrap at the PDF's
 *  line breaks, so a paragraph spans several lines with no blank separators —
 *  the only reliable boundary is a line that opens with the next sequential
 *  paragraph number. Sub-points reset their numbering, so they fall below the
 *  expected counter and get folded back into the current paragraph. */
function parse(text: string): HtmlBlock[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const blocks: HtmlBlock[] = [];

  // Header: title / case / date / (Merits) before the first numbered paragraph.
  blocks.push({ type: "h1", text: lines[0] });
  blocks.push({ type: "h2", text: lines[1] });
  blocks.push({ type: "p", text: `${lines[2]} ${lines[3]}` });

  let expected = 1;
  let cur: { n?: string; parts: string[] } | null = { parts: [] };
  const flush = () => {
    if (!cur) return;
    const body = cur.parts.join(" ").trim();
    if (body) {
      if (cur.n) blocks.push({ type: "num", n: cur.n, text: body });
      else blocks.push({ type: "p", text: body });
    }
    cur = null;
  };

  for (let i = 4; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(\d{1,3})\.\s+(.*)$/);
    if (m && Number(m[1]) === expected) {
      flush();
      cur = { n: `${m[1]}.`, parts: [m[2]] };
      expected += 1;
      continue;
    }
    if (ROMAN.test(line) && line.length <= 4) {
      flush();
      blocks.push({ type: "section", text: line });
      cur = { parts: [] };
      continue;
    }
    if (!cur) cur = { parts: [] };
    cur.parts.push(line);
  }
  flush();
  return blocks;
}

export const defaultDocRendition: DocRendition = {
  plainText: rawText,
  html: parse(rawText),
};
