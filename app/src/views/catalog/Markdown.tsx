import { Fragment, type ReactNode } from "react";

/** Minimal markdown renderer for the `handoff/` docs — no npm dependency.
 *
 *  Supported subset (exactly what those docs use): ATX headings, paragraphs,
 *  pipe tables, fenced code, inline code, bold/italic/links, blockquotes,
 *  bullet + ordered lists, and `---` rules. Anything unrecognised falls
 *  through as a paragraph, so an unsupported construct degrades to plain
 *  text rather than disappearing.
 *
 *  Not supported (and not present in the docs): nested lists, images, raw
 *  HTML, setext headings, reference links, footnotes. */

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "code"; lang: string; code: string }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "quote"; blocks: Block[] }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "rule" };

const isTableRow = (line: string) => /^\s*\|/.test(line);
/** A table's delimiter row: `|---|:--:|` */
const isTableDelimiter = (line: string) =>
  /^\s*\|(\s*:?-{2,}:?\s*\|)+\s*$/.test(line);
const listMarker = (line: string) => /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(line);

/** Split a table row on `|`, ignoring pipes inside inline-code spans — the
 *  token tables are full of cells like `` `a|b` ``, which a naive split
 *  would tear in half. */
function splitRow(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let inCode = false;
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  for (const ch of trimmed) {
    if (ch === "`") inCode = !inCode;
    if (ch === "|" && !inCode) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code — the closing fence may be absent at EOF.
    const fence = /^```(\S*)\s*$/.exec(line.trim());
    if (fence) {
      const lang = fence[1];
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i].trim())) {
        body.push(lines[i]);
        i++;
      }
      i++; // consume the closing fence
      blocks.push({ kind: "code", lang, code: body.join("\n") });
      continue;
    }

    if (/^---+\s*$/.test(line.trim())) {
      blocks.push({ kind: "rule" });
      i++;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1].length,
        text: heading[2].trim(),
      });
      i++;
      continue;
    }

    // Table — needs a delimiter row directly under the header.
    if (isTableRow(line) && isTableDelimiter(lines[i + 1] ?? "")) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push({ kind: "table", header, rows });
      continue;
    }

    // Blockquote — strip the markers and re-parse, so fenced code inside a
    // quote (PR-BODY does this) still renders as code.
    if (/^\s*>/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        body.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "quote", blocks: parseBlocks(body.join("\n")) });
      continue;
    }

    const marker = listMarker(line);
    if (marker) {
      const ordered = /\d/.test(marker[2]);
      const items: string[] = [marker[3]];
      i++;
      while (i < lines.length && lines[i].trim()) {
        const next = listMarker(lines[i]);
        if (next) {
          items.push(next[3]);
        } else {
          // Lazy continuation — the docs hard-wrap long items.
          items[items.length - 1] += ` ${lines[i].trim()}`;
        }
        i++;
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    // Paragraph — consecutive non-blank lines that start no other block.
    const para: string[] = [line.trim()];
    i++;
    while (i < lines.length && lines[i].trim()) {
      const next = lines[i];
      if (
        /^```/.test(next.trim()) ||
        /^#{1,6}\s/.test(next) ||
        /^\s*>/.test(next) ||
        /^---+\s*$/.test(next.trim()) ||
        isTableRow(next) ||
        listMarker(next)
      ) {
        break;
      }
      para.push(next.trim());
      i++;
    }
    blocks.push({ kind: "paragraph", text: para.join(" ") });
  }

  return blocks;
}

/** Inline spans: code, bold, italic (asterisk or underscore), and links.
 *  Code wins over everything else so `**` inside a code span stays literal. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const pattern =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))|(\*[^*\s][^*]*\*)|(_[^_\s][^_]*_)/g;
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let n = 0;

  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${n++}`;

    if (token.startsWith("`")) {
      out.push(
        <code
          key={key}
          className="rounded-sm bg-vellum px-1 py-px font-mono text-[0.85em] text-ink"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      out.push(
        <strong key={key} className="font-semibold text-ink">
          {renderInline(token.slice(2, -2), key)}
        </strong>
      );
    } else if (token.startsWith("[")) {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)!;
      out.push(
        <a
          key={key}
          href={link[2]}
          target="_blank"
          rel="noreferrer"
          className="text-carbon underline decoration-carbon/30 underline-offset-2 hover:decoration-carbon"
        >
          {renderInline(link[1], key)}
        </a>
      );
    } else {
      out.push(
        <em key={key} className="italic">
          {renderInline(token.slice(1, -1), key)}
        </em>
      );
    }
    last = match.index + token.length;
  }

  if (last < text.length) out.push(text.slice(last));
  return out;
}

const HEADING_CLASS: Record<number, string> = {
  1: "text-[1.5rem] leading-snug font-bold text-ink mt-0 mb-3",
  2: "text-[1.125rem] font-bold text-ink mt-8 mb-3 pb-1.5 border-b border-border-soft",
  3: "text-[0.9375rem] font-semibold text-ink mt-6 mb-2",
  4: "text-[0.875rem] font-semibold text-ink-secondary mt-5 mb-2",
  5: "text-[0.8125rem] font-semibold text-ink-secondary mt-4 mb-1.5",
  6: "text-[0.8125rem] font-semibold text-ink-tertiary mt-4 mb-1.5",
};

function renderBlocks(blocks: Block[], keyPrefix: string): ReactNode[] {
  return blocks.map((block, idx) => {
    const key = `${keyPrefix}-${idx}`;

    switch (block.kind) {
      case "heading": {
        const Tag = `h${Math.min(block.level + 1, 6)}` as "h2";
        return (
          <Tag key={key} className={HEADING_CLASS[block.level]}>
            {renderInline(block.text, key)}
          </Tag>
        );
      }

      case "paragraph":
        return (
          <p
            key={key}
            className="my-3 text-[0.8125rem] leading-relaxed text-ink-secondary"
          >
            {renderInline(block.text, key)}
          </p>
        );

      case "code":
        return (
          <pre
            key={key}
            className="my-4 overflow-x-auto rounded-md bg-vellum p-3 text-[0.75rem] leading-relaxed"
          >
            <code className="font-mono text-ink">{block.code}</code>
          </pre>
        );

      case "rule":
        return <hr key={key} className="my-8 border-0 border-t border-border-soft" />;

      case "quote":
        return (
          <blockquote
            key={key}
            className="my-4 rounded-md bg-warm px-4 py-2 text-ink-tertiary"
          >
            {renderBlocks(block.blocks, key)}
          </blockquote>
        );

      case "list": {
        const Tag = block.ordered ? "ol" : "ul";
        return (
          <Tag
            key={key}
            className={`my-3 flex flex-col gap-1.5 ps-5 text-[0.8125rem] leading-relaxed text-ink-secondary ${
              block.ordered ? "list-decimal" : "list-disc"
            }`}
          >
            {block.items.map((item, n) => (
              <li key={n} className="ps-1 marker:text-ink-muted">
                {renderInline(item, `${key}-${n}`)}
              </li>
            ))}
          </Tag>
        );
      }

      case "table":
        // Grid-flavoured like the catalog's other tables; scrolls on its own
        // so a wide token table never scrolls the page sideways.
        return (
          <div
            key={key}
            className="my-4 overflow-x-auto rounded-md border border-border-soft"
          >
            <table className="w-full border-collapse text-[0.75rem]">
              <thead>
                <tr className="bg-warm">
                  {block.header.map((cell, n) => (
                    <th
                      key={n}
                      className="border-b border-border-soft px-3 py-2 text-start align-bottom font-semibold text-ink"
                    >
                      {renderInline(cell, `${key}-h-${n}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={r} className="border-b border-border-soft/60 last:border-0">
                    {block.header.map((_, c) => (
                      <td
                        key={c}
                        className="px-3 py-2 align-top text-ink-secondary"
                      >
                        {renderInline(row[c] ?? "", `${key}-${r}-${c}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  });
}

export function Markdown({ source }: { source: string }) {
  return <Fragment>{renderBlocks(parseBlocks(source), "md")}</Fragment>;
}
