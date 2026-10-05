import { useAtomValue, useSetAtom } from "jotai";
import { SettingsEditor } from "../SettingsEditor";
import { SettingsCheckList, SettingsCheckRow, SettingsSection } from "../SettingsSection";
import { SettingsField, TextInput } from "../SettingsField";
import { Checkbox } from "../../shared/Checkbox";
import { groupsAtom, saveGroupAtom, usersAtom } from "../../../atoms/users";
import { MissingRecord } from "../../shared/MissingRecord";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { LastSavedLine } from "../../shared/LastSavedLine";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";

/** Group detail/editor — name + membership, opened from the Groups tab.
 *  Membership is written onto the users (`saveGroupAtom`), by group id. */
export function GroupEditor({
  groupId,
  onClose,
}: {
  groupId: string | "new";
  onClose: () => void;
}) {
  const { record } = useSettingsNotify();
  const users = useAtomValue(usersAtom);
  const groups = useAtomValue(groupsAtom);
  const saveGroup = useSetAtom(saveGroupAtom);
  const isNew = groupId === "new";
  const base = isNew ? undefined : groups.find((g) => g.id === groupId);

  const { draft, update, dirty } = useSettingsDraft({
    id: `group:${groupId}`,
    label: "Group edits",
    // Members as a sorted set: unticking and re-ticking is no change.
    saved: { name: base?.name ?? "", memberIds: [...(base?.memberIds ?? [])].sort() },
  });
  /** The group was deleted (or the demo data reset) while this was open. */
  const missing = !isNew && !base;
  const { name, memberIds: members } = draft;

  const toggle = (id: string) =>
    update({ memberIds: (members.includes(id) ? members.filter((m) => m !== id) : [...members, id]).sort() });

  const save = () => {
    const id = saveGroup({ id: isNew ? null : groupId, name: name.trim(), memberIds: members });
    if (!id) return;
    record({
      method: isNew ? "CREATE" : "UPDATE",
      domain: "group",
      noun: "group",
      id,
      name: name.trim(),
      message: isNew ? "Group created" : undefined,
    });
    onClose();
  };

  return (
    <SettingsEditor
      component="GroupEditor"
      path={["Users & Groups"]}
      title={isNew ? "New group" : base?.name ?? ""}
      onBack={onClose}
      isNew={isNew}
      createLabel="Create group"
      dirty={dirty}
      valid={!!name.trim() && !missing}
      onSave={save}
      footerStart={<LastSavedLine domain="group" id={base?.id} />}
    >
      {missing && <MissingRecord noun="group" />}
      <SettingsSection>
        <div className="max-w-sm">
          <SettingsField label="Group name">
            <TextInput value={name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. Litigation" />
          </SettingsField>
        </div>
      </SettingsSection>

      <SettingsSection title="Members" description={`${members.length} of ${users.length} users.`}>
        <SettingsCheckList part="members">
          {users.map((u) => (
            <SettingsCheckRow key={u.id}>
              <Checkbox checked={members.includes(u.id)} onChange={() => toggle(u.id)} ariaLabel={u.username} />
              <span className="flex items-center justify-center w-7 h-7 rounded-md bg-vellum text-meta font-semibold text-ink-secondary uppercase shrink-0">
                {u.username.slice(0, 2)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink truncate">{u.username}</span>
                <span className="block text-xs text-ink-tertiary truncate">{u.email}</span>
              </span>
            </SettingsCheckRow>
          ))}
        </SettingsCheckList>
      </SettingsSection>
    </SettingsEditor>
  );
}
