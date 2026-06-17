import { useState } from "react";
import { useSetAtom } from "jotai";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Field, TextInput } from "../Field";
import { Checkbox } from "../../shared/Checkbox";
import { seedUsers, type SettingsGroupRecord } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

/** Group detail/editor — name + membership, opened from the Groups tab. */
export function GroupEditor({
  group,
  onClose,
}: {
  group: SettingsGroupRecord | "new";
  onClose: () => void;
}) {
  const setToasts = useSetAtom(toastsAtom);
  const isNew = group === "new";
  const base = isNew ? undefined : group;

  const [name, setName] = useState(base?.name ?? "");
  const [members, setMembers] = useState<string[]>(
    isNew ? [] : seedUsers.filter((u) => u.groups.includes(base!.name)).map((u) => u.id),
  );

  const toggle = (id: string) =>
    setMembers((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));

  const save = () => {
    setToasts((p) => [
      ...p,
      { id: Date.now().toString(), message: isNew ? "Group created" : `${name || "Group"} saved`, type: "success" as const },
    ]);
    onClose();
  };

  return (
    <SettingsContent>
      <SettingsContent.Header path={["Users & Groups"]} title={isNew ? "New group" : base!.name} />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6">
          <section className="max-w-sm">
            <Field label="Group name">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Litigation" />
            </Field>
          </section>

          <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <h3 className="text-sm font-semibold text-ink mb-1">Members</h3>
            <p className="text-xs text-ink-tertiary mb-3">{members.length} of {seedUsers.length} users.</p>
            <div className="flex flex-col gap-2">
              {seedUsers.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-paper px-3 py-2.5 cursor-pointer hover:bg-warm transition-colors"
                >
                  <Checkbox checked={members.includes(u.id)} onChange={() => toggle(u.id)} ariaLabel={u.username} />
                  <span className="flex items-center justify-center w-7 h-7 rounded-md bg-vellum text-[11px] font-semibold text-ink-secondary uppercase shrink-0">
                    {u.username.slice(0, 2)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink truncate">{u.username}</span>
                    <span className="block text-xs text-ink-tertiary truncate">{u.email}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="primary" size="sm" disabled={!name} onClick={save}>
          {isNew ? "Create group" : "Save"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
