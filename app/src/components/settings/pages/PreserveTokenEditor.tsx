import { useState } from "react";
import { useSetAtom } from "jotai";
import { Copy } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Field, TextInput } from "../Field";
import { RadioGroup } from "../../shared/RadioGroup";
import { type SettingsPreserveToken } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

/** Preserve-token detail/editor — opened from the Preserve list. A token
 *  authenticates one capture source on a schedule (list → detail). */
export function PreserveTokenEditor({
  token,
  onClose,
}: {
  token: SettingsPreserveToken | "new";
  onClose: () => void;
}) {
  const setToasts = useSetAtom(toastsAtom);
  const isNew = token === "new";
  const base = isNew ? undefined : token;

  const [name, setName] = useState(base?.name ?? "");
  const [schedule, setSchedule] = useState("daily");

  const dirty = name !== (base?.name ?? "") || schedule !== "daily";

  const toast = (message: string) =>
    setToasts((p) => [...p, { id: Date.now().toString(), message, type: "success" as const }]);

  const save = () => {
    toast(isNew ? "Capture source added" : `${name || "Source"} saved`);
    onClose();
  };

  return (
    <SettingsContent>
      <SettingsContent.Header path={["Preserve"]} title={isNew ? "New capture source" : base!.name} onBack={onClose} />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6 max-w-lg">
          <Field label="Source name">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Court press releases" />
          </Field>

          <div>
            <h3 className="text-sm font-semibold text-ink mb-1">Capture schedule</h3>
            <p className="text-xs text-ink-tertiary mb-3">How often Preserve re-captures this source.</p>
            <RadioGroup
              name="preserve-schedule"
              ariaLabel="Capture schedule"
              inline
              value={schedule}
              onChange={setSchedule}
              options={[
                { id: "hourly", label: "Hourly" },
                { id: "daily", label: "Daily" },
                { id: "weekly", label: "Weekly" },
              ]}
            />
          </div>

          {!isNew && (
            <section className="pt-6 flex flex-col gap-3" style={{ borderTop: "1px solid var(--border-soft)" }}>
              <Field label="Token">
                <div className="flex items-center gap-2">
                  <code className="flex-1 min-w-0 truncate text-xs font-mono text-ink-secondary bg-vellum px-3 py-2 rounded-md" dir="ltr">
                    {base!.token}
                  </code>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Copy size={13} />}
                    onClick={() => toast("Token copied")}
                  >
                    Copy
                  </Button>
                </div>
              </Field>
              <p className="text-xs text-ink-tertiary">
                <span className="font-semibold text-ink-secondary tabular-nums">{base!.capturedCount}</span> captures ·
                last run <span dir="ltr" className="tabular-nums">{base!.lastRun}</span>
              </p>
            </section>
          )}
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="success" size="sm" disabled={!dirty || !name} onClick={save}>
          {isNew ? "Add source" : "Save"}
        </Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
