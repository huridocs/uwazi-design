import { useState, type ReactNode } from "react";
import { useSetAtom } from "jotai";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Field, TextInput } from "../Field";
import { Checkbox } from "../../shared/Checkbox";
import { SegmentedControl } from "../../shared/SegmentedControl";
import { type SettingsPage } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

const SAMPLE_BODY = `# About this collection

This archive documents cases before the Inter-American human rights system.

## What you'll find

- Judgments, orders, and admissibility decisions
- Connected entities — courts, states, and petitioners

Write the page content in Markdown.`;

/** Minimal inline Markdown renderer — no npm dependency. Handles `#`/`##`/`###`
 *  headings, blank-line-separated paragraphs, and `- ` bullet lists. Deliberately
 *  small: enough to preview the page body, not a full CommonMark engine. */
function MarkdownPreview({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  const lines = source.split("\n");
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line — skip.
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Headings.
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      const text = h[2].trim();
      if (level === 1) blocks.push(<h1 key={key++} className="text-xl font-semibold text-ink mt-5 first:mt-0 mb-2">{text}</h1>);
      else if (level === 2) blocks.push(<h2 key={key++} className="text-lg font-semibold text-ink mt-5 first:mt-0 mb-2">{text}</h2>);
      else blocks.push(<h3 key={key++} className="text-base font-semibold text-ink mt-4 first:mt-0 mb-1.5">{text}</h3>);
      i += 1;
      continue;
    }

    // Bullet list — consume consecutive `- ` lines.
    if (/^\s*-\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s+/, "").trim());
        i += 1;
      }
      blocks.push(
        <ul key={key++} className="list-disc ps-5 my-2 flex flex-col gap-1 text-sm text-ink leading-relaxed">
          {items.map((it, n) => (
            <li key={n}>{it}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Paragraph — gather lines until a blank line or a block starter.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,3})\s+/.test(lines[i]) &&
      !/^\s*-\s+/.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push(
      <p key={key++} className="text-sm text-ink leading-relaxed my-2">
        {para.join(" ")}
      </p>,
    );
  }

  return <div className="max-w-[44rem]">{blocks}</div>;
}

/** Page detail/editor — title, slug, publish state, and Markdown content.
 *  Opened from the Pages list (list → detail). */
export function PageEditor({
  page,
  onClose,
}: {
  page: SettingsPage | "new";
  onClose: () => void;
}) {
  const setToasts = useSetAtom(toastsAtom);
  const isNew = page === "new";
  const base = isNew ? undefined : page;

  const [title, setTitle] = useState(base?.title ?? "");
  const [slug, setSlug] = useState(base?.slug ?? "");
  const [published, setPublished] = useState(base?.published ?? false);
  const [body, setBody] = useState(isNew ? "" : SAMPLE_BODY);
  const [mode, setMode] = useState<"edit" | "preview">("edit");

  const dirty =
    title !== (base?.title ?? "") ||
    slug !== (base?.slug ?? "") ||
    published !== (base?.published ?? false) ||
    body !== (isNew ? "" : SAMPLE_BODY);

  const save = () => {
    setToasts((p) => [
      ...p,
      { id: Date.now().toString(), message: isNew ? "Page created" : `${title || "Page"} saved`, type: "success" as const },
    ]);
    onClose();
  };

  return (
    <SettingsContent>
      <SettingsContent.Header path={["Pages"]} title={isNew ? "New page" : base!.title} onBack={onClose} />
      <SettingsContent.Body className="flex flex-col min-h-0">
        <section className="grid sm:grid-cols-2 gap-3 mb-4">
          <Field label="Title">
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Methodology" />
          </Field>
          <Field label="URL slug" hint={`/page/${slug || "…"}`}>
            <TextInput value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="methodology" />
          </Field>
        </section>

        <label className="flex items-center gap-2.5 mb-4 cursor-pointer w-fit">
          <Checkbox checked={published} onChange={(e) => setPublished(e.target.checked)} ariaLabel="Published" />
          <span className="text-sm text-ink">Published</span>
          <span className="text-xs text-ink-tertiary">— visible to readers</span>
        </label>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-ink-secondary">Content</span>
            <SegmentedControl
              size="sm"
              ariaLabel="Content view"
              value={mode}
              onChange={(v) => setMode(v as "edit" | "preview")}
              options={[
                { id: "edit", label: "Edit" },
                { id: "preview", label: "Preview" },
              ]}
            />
          </div>

          {mode === "edit" ? (
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              spellCheck={false}
              placeholder="Write the page content in Markdown…"
              className="w-full min-h-[16rem] p-4 text-sm font-mono text-ink bg-warm border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-carbon/20"
            />
          ) : (
            <div className="w-full min-h-[16rem] p-4 bg-paper border border-border rounded-md overflow-y-auto">
              {body.trim() === "" ? (
                <p className="text-sm text-ink-muted">Nothing to preview yet.</p>
              ) : (
                <MarkdownPreview source={body} />
              )}
            </div>
          )}
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="success" size="sm" disabled={!dirty || !title} onClick={save}>
          {isNew ? "Create page" : "Save"}
        </Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
