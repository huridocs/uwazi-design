import { useState } from "react";
import { useSetAtom } from "jotai";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Field, TextInput } from "../Field";
import { Checkbox } from "../../shared/Checkbox";
import { type SettingsPage } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

const SAMPLE_BODY = `# About this collection

This archive documents cases before the Inter-American human rights system.

Write the page content in Markdown.`;

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

        <Field label="Content">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            spellCheck={false}
            placeholder="Write the page content in Markdown…"
            className="w-full min-h-[16rem] p-4 text-sm font-mono text-ink bg-warm border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-carbon/20"
          />
        </Field>
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
