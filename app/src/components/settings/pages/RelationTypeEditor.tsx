import { useState } from "react";
import { useSetAtom } from "jotai";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Field, TextInput } from "../Field";
import { type SettingsRelationType } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

/** Relationship-type detail/editor — opened from the list (list → detail). */
export function RelationTypeEditor({
  relationType,
  onClose,
}: {
  relationType: SettingsRelationType | "new";
  onClose: () => void;
}) {
  const setToasts = useSetAtom(toastsAtom);
  const isNew = relationType === "new";
  const base = isNew ? undefined : relationType;

  const [name, setName] = useState(base?.name ?? "");

  const save = () => {
    setToasts((p) => [
      ...p,
      { id: Date.now().toString(), message: isNew ? "Relationship type created" : `${name || "Type"} saved`, type: "success" as const },
    ]);
    onClose();
  };

  return (
    <SettingsContent>
      <SettingsContent.Header path={["Relationship types"]} title={isNew ? "New relationship type" : base!.name} />
      <SettingsContent.Body>
        <div className="flex flex-col gap-4 max-w-sm">
          <Field label="Name" hint="The label shown when connecting two entities.">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Represented by" />
          </Field>
          {!isNew && (
            <p className="text-xs text-ink-tertiary">
              Used by <span className="font-semibold text-ink-secondary tabular-nums">{base!.usageCount}</span> connections.
            </p>
          )}
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="primary" size="sm" disabled={!name} onClick={save}>
          {isNew ? "Create type" : "Save"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
