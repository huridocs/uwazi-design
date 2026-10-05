import { useId } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { SettingsContent } from "../SettingsContent";
import { SettingsButton } from "../SettingsButton";
import { SettingsField, TextInput } from "../SettingsField";
import { Checkbox } from "../../shared/Checkbox";
import { groupsAtom, saveGroupAtom, usersAtom } from "../../../atoms/users";
import { useNotify } from "../../../hooks/useNotify";
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
  const notify = useNotify();
  const users = useAtomValue(usersAtom);
  const groups = useAtomValue(groupsAtom);
  const saveGroup = useSetAtom(saveGroupAtom);
  const isNew = groupId === "new";
  const base = isNew ? undefined : groups.find((g) => g.id === groupId);

  const { draft, update, dirty } = useSettingsDraft({
    id: `group:${groupId}`,
    label: "Group edits",
    saved: { name: base?.name ?? "", memberIds: base?.memberIds ?? [] },
  });
  const { name, memberIds: members } = draft;
  const membersHeadingId = useId();

  const toggle = (id: string) =>
    update({ memberIds: members.includes(id) ? members.filter((m) => m !== id) : [...members, id] });

  const save = () => {
    saveGroup({ id: base?.id ?? null, name: name.trim(), memberIds: members });
    notify(isNew ? "Group created" : `${name.trim()} saved`, "success");
    onClose();
  };

  return (
    <SettingsContent component="GroupEditor">
      <SettingsContent.Header path={["Users & Groups"]} title={isNew ? "New group" : base?.name ?? ""} onBack={onClose} />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6">
          <section className="max-w-sm">
            <SettingsField label="Group name">
              <TextInput value={name} onChange={(e) => update({ name: e.target.value })} placeholder="e.g. Litigation" />
            </SettingsField>
          </section>

          <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <h3 id={membersHeadingId} className="text-sm font-semibold text-ink mb-1">Members</h3>
            <p className="text-xs text-ink-tertiary mb-3">{members.length} of {users.length} users.</p>
            {/* A set of checkboxes answering one question: a fieldset, named by the
                section heading above it (a legend would draw into the rule). */}
            <fieldset aria-labelledby={membersHeadingId} data-part="members" className="flex flex-col gap-2 min-w-0">
              {users.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-paper px-3 py-2.5 cursor-pointer hover:bg-warm transition-colors"
                >
                  <Checkbox checked={members.includes(u.id)} onChange={() => toggle(u.id)} ariaLabel={u.username} />
                  <span className="flex items-center justify-center w-7 h-7 rounded-md bg-vellum text-meta font-semibold text-ink-secondary uppercase shrink-0">
                    {u.username.slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink truncate">{u.username}</span>
                    <span className="block text-xs text-ink-tertiary truncate">{u.email}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </section>
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <SettingsButton variant="ghost" size="sm" onClick={onClose}>Cancel</SettingsButton>
        <SettingsButton variant="success" size="sm" disabled={!dirty || !name.trim()} onClick={save}>
          {isNew ? "Create group" : "Save"}
        </SettingsButton>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
