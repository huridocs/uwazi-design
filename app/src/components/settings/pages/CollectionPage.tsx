import { useId, useState } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { SettingsContent } from "../SettingsContent";
import { SettingsButton } from "../SettingsButton";
import { SettingsField, TextInput } from "../SettingsField";
import { RadioGroup } from "../../shared/RadioGroup";
import { Checkbox } from "../../shared/Checkbox";
import { LayoutGrid, Table2, Map } from "lucide-react";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { cejilCollection } from "../../../data/cejil/settingsAdapt";
import { toastsAtom } from "../../../atoms/references";

interface ToggleRowProps {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, hint, checked, onChange }: ToggleRowProps) {
  return (
    <label data-part="toggle" className="flex items-start gap-3 rounded-lg border border-border bg-paper px-4 py-3 cursor-pointer">
      <span className="pt-0.5">
        <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} ariaLabel={label} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-xs text-ink-tertiary">{hint}</span>
      </span>
    </label>
  );
}

export function CollectionPage() {
  const setToasts = useSetAtom(toastsAtom);
  const dataSource = useAtomValue(dataSourceAtom);
  const init =
    dataSource === "cejil"
      ? { name: cejilCollection.name, view: cejilCollection.defaultView }
      : { name: "Inter-American Human Rights Archive", view: "cards" };
  const [name, setName] = useState(init.name);
  const accessHeadingId = useId();
  const [landing, setLanding] = useState("/library");
  const [defaultView, setDefaultView] = useState(init.view);
  const [privateInstance, setPrivateInstance] = useState(false);
  const [cookiePolicy, setCookiePolicy] = useState(true);
  const [publicSharing, setPublicSharing] = useState(true);

  const dirty =
    name !== init.name ||
    landing !== "/library" ||
    defaultView !== init.view ||
    privateInstance !== false ||
    cookiePolicy !== true ||
    publicSharing !== true;

  const save = () =>
    setToasts((p) => [...p, { id: Date.now().toString(), message: "Collection settings saved", type: "success" as const }]);

  return (
    <SettingsContent component="CollectionPage">
      <SettingsContent.Header title="Collection" />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6">
          <section className="grid sm:grid-cols-2 gap-3">
            <SettingsField label="Collection name">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} />
            </SettingsField>
            <SettingsField label="Custom landing page" hint="Where visitors land first.">
              <TextInput value={landing} onChange={(e) => setLanding(e.target.value)} />
            </SettingsField>
          </section>

          <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <h3 className="text-sm font-semibold text-ink mb-1">Default library view</h3>
            <p className="text-xs text-ink-tertiary mb-3">How the library shows results by default.</p>
            <RadioGroup
              name="default-view"
              ariaLabel="Default library view"
              inline
              value={defaultView}
              onChange={setDefaultView}
              options={[
                { id: "cards", label: "Cards", hint: "Visual entity cards", icon: <LayoutGrid size={14} className="text-ink-tertiary" /> },
                { id: "table", label: "Table", hint: "Dense rows", icon: <Table2 size={14} className="text-ink-tertiary" /> },
                { id: "map", label: "Map", hint: "Geographic", icon: <Map size={14} className="text-ink-tertiary" /> },
              ]}
            />
          </section>

          <section className="pt-6 flex flex-col gap-2" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <h3 id={accessHeadingId} className="text-sm font-semibold text-ink mb-1">Access</h3>
            {/* A set of checkboxes answering one question: a fieldset, named by the
                section heading above it (a legend would draw into the rule). */}
            <fieldset aria-labelledby={accessHeadingId} data-part="access" className="flex flex-col gap-2 min-w-0">
              <ToggleRow
                label="Private instance"
                hint="Only logged-in users can see the collection."
                checked={privateInstance}
                onChange={setPrivateInstance}
              />
              <ToggleRow
                label="Show cookie policy"
                hint="Display a cookie consent banner to visitors."
                checked={cookiePolicy}
                onChange={setCookiePolicy}
              />
              <ToggleRow
                label="Allow public sharing"
                hint="Let visitors share entity links on social media."
                checked={publicSharing}
                onChange={setPublicSharing}
              />
            </fieldset>
          </section>
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <SettingsButton variant="success" size="sm" disabled={!dirty} onClick={save}>
          Save
        </SettingsButton>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
