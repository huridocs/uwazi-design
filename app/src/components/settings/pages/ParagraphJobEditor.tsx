import { useState } from "react";
import { useSetAtom } from "jotai";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Field } from "../Field";
import { Select } from "../../shared/Select";
import { StatusPill } from "../StatusPill";
import { seedTemplates, type SettingsParagraphJob } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

const TEMPLATE_OPTIONS = seedTemplates.map((t) => ({ value: t.name, label: t.name }));

/** Paragraph-extraction detail — opened from the list. "new" configures a fresh
 *  extraction (pick a template, start it); an existing job shows its progress. */
export function ParagraphJobEditor({
  job,
  onClose,
}: {
  job: SettingsParagraphJob | "new";
  onClose: () => void;
}) {
  const setToasts = useSetAtom(toastsAtom);
  const isNew = job === "new";
  const base = isNew ? undefined : job;

  const [template, setTemplate] = useState(base?.template ?? TEMPLATE_OPTIONS[0].value);

  const save = () => {
    setToasts((p) => [
      ...p,
      { id: Date.now().toString(), message: isNew ? "Extraction started" : "Extraction re-run queued", type: "success" as const },
    ]);
    onClose();
  };

  return (
    <SettingsContent>
      <SettingsContent.Header path={["Paragraph Extraction"]} title={isNew ? "New extraction" : base!.template} />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6 max-w-lg">
          <p className="text-xs text-ink-tertiary">
            Split every document of a template into paragraph-level records for fine-grained search.
          </p>
          <Field label="Template">
            {isNew ? (
              <div className="w-fit">
                <Select value={template} options={TEMPLATE_OPTIONS} onChange={setTemplate} ariaLabel="Template" />
              </div>
            ) : (
              <span className="text-sm text-ink">{base!.template}</span>
            )}
          </Field>

          {!isNew && (
            <section className="pt-6 grid grid-cols-2 gap-3" style={{ borderTop: "1px solid var(--border-soft)" }}>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ink-secondary">Status</span>
                <StatusPill status={base!.status} />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-ink-secondary">Paragraphs</span>
                <span className="text-sm text-ink tabular-nums">{base!.paragraphs.toLocaleString()}</span>
              </div>
            </section>
          )}
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="primary" size="sm" onClick={save}>
          {isNew ? "Start extraction" : "Re-run"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
