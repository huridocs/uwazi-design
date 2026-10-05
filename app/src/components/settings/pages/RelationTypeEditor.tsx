import { useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { SettingsContent } from "../SettingsContent";
import { SettingsButton } from "../SettingsButton";
import { SettingsField, TextInput } from "../SettingsField";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { relationTypeUsageAtom } from "../../../atoms/settingsUsage";
import {
  relationTypeNameIssue,
  saveRelationTypeAtom,
  settingsRelationTypesAtom,
} from "../../../atoms/relationTypes";
import { LastSavedLine } from "../../shared/LastSavedLine";
import { MissingRecord } from "../../shared/MissingRecord";

/** Relationship-type detail/editor — opened from the list (list → detail).
 *  A type is a name and nothing else: Uwazi stores one `type` per
 *  relationship, with no inverse label (CLAUDE.md › Known gaps). Saves go to
 *  the registry by id, so a rename reaches every reference and field. */
export function RelationTypeEditor({ typeId, onClose }: { typeId: string | "new"; onClose: () => void }) {
  const { record } = useSettingsNotify();
  const types = useAtomValue(settingsRelationTypesAtom);
  const saveType = useSetAtom(saveRelationTypeAtom);
  const isNew = typeId === "new";
  const base = isNew ? undefined : types.find((t) => t.id === typeId);
  const missing = !isNew && !base;

  const { draft, setField, dirty } = useSettingsDraft({
    id: `relation-type:${typeId}`,
    label: "Relationship type edits",
    saved: { name: base?.label ?? "" },
  });
  const { name } = draft;
  const setName = setField("name");
  // Uwazi validates on Save (`mode: 'onSubmit'`); after a refused Save the
  // message follows the input.
  const [attempted, setAttempted] = useState(false);
  const issue = relationTypeNameIssue(types, isNew ? null : typeId, name);

  const save = () => {
    setAttempted(true);
    if (issue || missing) return;
    const id = saveType({ id: isNew ? null : typeId, name });
    if (!id) return;
    record({
      method: isNew ? "CREATE" : "UPDATE",
      domain: "relationType",
      noun: "relationship type",
      id,
      name: name.trim(),
      message: isNew ? "Relationship type created" : undefined,
    });
    onClose();
  };

  return (
    <SettingsContent component="RelationTypeEditor">
      <SettingsContent.Header
        path={["Relationship types"]}
        title={isNew ? "Add relationship type" : base?.label ?? ""}
        onBack={onClose}
      />
      <SettingsContent.Body>
        <div className="flex flex-col gap-4 max-w-lg">
          {missing && <MissingRecord noun="relationship type" />}
          <section className="max-w-sm">
            <SettingsField label="Name" issue={attempted && issue ? { severity: "error", message: issue } : null}>
              <TextInput id="relationship-type-name" value={name} onChange={(e) => setName(e.target.value)} />
            </SettingsField>
          </section>
          {base && <UsageLine id={base.id} />}
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <LastSavedLine domain="relationType" id={base?.id} className="me-auto" />
        <SettingsButton variant="ghost" size="sm" onClick={onClose}>Cancel</SettingsButton>
        <SettingsButton variant="commit" size="sm" disabled={!dirty || missing} onClick={save}>
          Save
        </SettingsButton>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}

/** What uses the type: the same facts its delete dialog lists. */
function UsageLine({ id }: { id: string }) {
  const usage = useAtomValue(relationTypeUsageAtom(id));
  return (
    <p className="text-xs text-ink-tertiary">
      {usage.lines.length ? usage.lines.join(" ") : "No references or relationship fields use it."}
    </p>
  );
}
