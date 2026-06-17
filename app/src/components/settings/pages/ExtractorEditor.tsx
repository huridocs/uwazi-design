import { useState } from "react";
import { useSetAtom } from "jotai";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Field, TextInput } from "../Field";
import { Select } from "../../shared/Select";
import { StatusPill } from "../StatusPill";
import { seedTemplates, type SettingsExtractor } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

const TEMPLATE_OPTIONS = seedTemplates.map((t) => ({ value: t.name, label: t.name }));

/** Extractor detail/editor — opened from the Metadata Extraction list. Picks a
 *  template + property to train a value extractor on (list → detail). */
export function ExtractorEditor({
  extractor,
  onClose,
}: {
  extractor: SettingsExtractor | "new";
  onClose: () => void;
}) {
  const setToasts = useSetAtom(toastsAtom);
  const isNew = extractor === "new";
  const base = isNew ? undefined : extractor;

  const [template, setTemplate] = useState(base?.template ?? TEMPLATE_OPTIONS[0].value);
  const [property, setProperty] = useState(base?.property ?? "");

  const save = () => {
    setToasts((p) => [
      ...p,
      { id: Date.now().toString(), message: isNew ? "Extractor created" : `${property || "Extractor"} saved`, type: "success" as const },
    ]);
    onClose();
  };

  return (
    <SettingsContent>
      <SettingsContent.Header path={["Metadata Extraction"]} title={isNew ? "New extractor" : base!.property} />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6 max-w-lg">
          <section className="flex flex-col gap-3">
            <Field label="Template">
              {/* Select is a calm popover; wrap so it sizes to the field. */}
              <div className="w-fit">
                <Select value={template} options={TEMPLATE_OPTIONS} onChange={setTemplate} ariaLabel="Template" />
              </div>
            </Field>
            <Field label="Property" hint="The metadata property to suggest values for.">
              <TextInput value={property} onChange={(e) => setProperty(e.target.value)} placeholder="e.g. Date filed" />
            </Field>
          </section>

          {!isNew && (
            <section className="pt-6 grid grid-cols-3 gap-3" style={{ borderTop: "1px solid var(--border-soft)" }}>
              <Stat label="Status"><StatusPill status={base!.status} /></Stat>
              <Stat label="Documents"><span className="text-sm text-ink tabular-nums">{base!.documents}</span></Stat>
              <Stat label="Accuracy">
                <span className="text-sm text-ink tabular-nums">{base!.accuracy === null ? "—" : `${base!.accuracy}%`}</span>
              </Stat>
            </section>
          )}
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="primary" size="sm" disabled={!property} onClick={save}>
          {isNew ? "Create extractor" : "Save"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-ink-secondary">{label}</span>
      {children}
    </div>
  );
}
