import { useSetAtom } from "jotai";
import { SettingsContent } from "../SettingsContent";
import { SettingsButton } from "../SettingsButton";
import { SettingsField, TextInput } from "../SettingsField";
import { type SettingsRelationType } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/notifications";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";

/** A relationship type may optionally carry a label for its reverse direction
 *  (forward "appealed to" / inverse "ruled on"). The shared SettingsRelationType
 *  stays minimal, so this seam lives locally. */
type WithInverse = SettingsRelationType & { inverseName?: string };

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
  const base = isNew ? undefined : (relationType as WithInverse);

  const { draft, setField, dirty } = useSettingsDraft({
    id: `relation-type:${base?.id ?? "new"}`,
    label: "Relationship type edits",
    saved: { name: base?.name ?? "", inverseName: base?.inverseName ?? "" },
  });
  const { name, inverseName } = draft;
  const setName = setField("name");
  const setInverseName = setField("inverseName");

  // Show the usage stat only when the record actually carries a count.
  const usageCount = typeof base?.usageCount === "number" ? base.usageCount : undefined;

  const save = () => {
    setToasts((p) => [
      ...p,
      { id: Date.now().toString(), message: isNew ? "Relationship type created" : `${name || "Type"} saved`, type: "success" as const },
    ]);
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
            <SettingsField label="Inverse name" hint="Optional — the label for the reverse direction.">
              <TextInput value={inverseName} onChange={(e) => setInverseName(e.target.value)} placeholder="e.g. Ruled on" />
            </SettingsField>
          </section>
          {usageCount !== undefined && (
            <p className="text-xs text-ink-tertiary">
              Used by <span className="font-semibold text-ink-secondary tabular-nums">{usageCount}</span> connections.
            </p>
          )}
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <SettingsButton variant="ghost" size="sm" onClick={onClose}>Cancel</SettingsButton>
        <SettingsButton variant={isNew ? "commit" : "success"} size="sm" disabled={!dirty || !name.trim()} onClick={save}>
          {isNew ? "Create type" : "Save"}
        </SettingsButton>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
