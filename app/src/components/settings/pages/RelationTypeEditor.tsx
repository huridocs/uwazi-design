import { useAtomValue } from "jotai";
import { SettingsContent } from "../SettingsContent";
import { SettingsButton } from "../SettingsButton";
import { SettingsField, TextInput } from "../SettingsField";
import { type SettingsRelationType } from "../../../data/settings";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { relationTypeUsageAtom } from "../../../atoms/settingsUsage";
import { LastSavedLine } from "../../shared/LastSavedLine";

/** Relationship-type detail/editor — opened from the list (list → detail).
 *  A type has one name: Uwazi stores one `type` per relationship and no
 *  inverse label (CLAUDE.md › Known gaps). */
export function RelationTypeEditor({
  relationType,
  onClose,
  onSave,
}: {
  relationType: SettingsRelationType | "new";
  onClose: () => void;
  /** Write the name to the list; returns the record's id. */
  onSave: (name: string) => string;
}) {
  const { record } = useSettingsNotify();
  const isNew = relationType === "new";
  const base = isNew ? undefined : relationType;

  const { draft, setField, dirty } = useSettingsDraft({
    id: `relation-type:${base?.id ?? "new"}`,
    label: "Relationship type edits",
    saved: { name: base?.name ?? "" },
  });
  const { name } = draft;
  const setName = setField("name");

  const save = () => {
    const id = onSave(name.trim());
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
      <SettingsContent.Header path={["Relationship types"]} title={isNew ? "New relationship type" : base!.name} onBack={onClose} />
      <SettingsContent.Body>
        <div className="flex flex-col gap-4 max-w-lg">
          <section className="grid sm:grid-cols-2 gap-3">
            <SettingsField label="Name" hint="The label shown when connecting two entities.">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Appealed to" />
            </SettingsField>
          </section>
          {base && <UsageLine type={base} />}
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <LastSavedLine domain="relationType" id={base?.id} className="me-auto" />
        <SettingsButton variant="ghost" size="sm" onClick={onClose}>Cancel</SettingsButton>
        <SettingsButton variant={isNew ? "commit" : "success"} size="sm" disabled={!dirty || !name.trim()} onClick={save}>
          {isNew ? "Create type" : "Save"}
        </SettingsButton>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}

/** What uses the type: the same facts its delete dialog lists. */
function UsageLine({ type }: { type: SettingsRelationType }) {
  const usage = useAtomValue(relationTypeUsageAtom(type));
  return (
    <p className="text-xs text-ink-tertiary">
      {usage.lines.length ? usage.lines.join(" ") : "No references or relationship fields use it."}
    </p>
  );
}
