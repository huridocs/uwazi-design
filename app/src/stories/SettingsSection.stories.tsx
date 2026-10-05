import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus } from "lucide-react";
import {
  SettingsCheckList,
  SettingsCheckRow,
  SettingsFieldRow,
  SettingsForm,
  SettingsSection,
  SettingsStat,
} from "../components/settings/SettingsSection";
import { SettingsField, TextInput } from "../components/settings/SettingsField";
import { SettingsButton } from "../components/settings/SettingsButton";
import { Checkbox } from "../components/shared/Checkbox";

/** The blocks a settings form is built from. `SettingsForm` is the 40rem
 *  column; each `SettingsSection` is a heading, a one-line description, an
 *  optional action on the heading's line, and its content, with a soft rule
 *  between sections. `SettingsCheckList` is a fieldset named by the section
 *  heading; `SettingsStat` is one figure in a stats list. */
const meta = {
  title: "Settings/SettingsSection",
  component: SettingsSection,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="bg-paper rounded-md p-4 border border-border">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

function FormDemo() {
  const [groups, setGroups] = useState<string[]>(["lit"]);
  const toggle = (id: string) => setGroups((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id]));
  return (
    <SettingsForm>
      <SettingsSection>
        <SettingsFieldRow>
          <SettingsField label="Username">
            <TextInput defaultValue="mlopez" />
          </SettingsField>
          <SettingsField label="Email">
            <TextInput type="email" defaultValue="m.lopez@cejil.org" />
          </SettingsField>
        </SettingsFieldRow>
      </SettingsSection>
      <SettingsSection
        title="Groups"
        description="Groups share access to entities among several users."
        action={
          <SettingsButton variant="secondary" size="sm" icon={<Plus size={14} />}>
            Add group
          </SettingsButton>
        }
      >
        <SettingsCheckList>
          {[
            { id: "lit", name: "Litigation" },
            { id: "res", name: "Research" },
          ].map((g) => (
            <SettingsCheckRow key={g.id}>
              <Checkbox checked={groups.includes(g.id)} onChange={() => toggle(g.id)} ariaLabel={g.name} />
              <span className="text-sm font-medium text-ink flex-1">{g.name}</span>
            </SettingsCheckRow>
          ))}
        </SettingsCheckList>
      </SettingsSection>
      <SettingsSection title="Training">
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
          <SettingsStat label="Documents" value={142} />
          <SettingsStat label="Reviewed" value={37} />
          <SettingsStat label="Pending" value={5} />
          <SettingsStat label="Accuracy" value="58%" />
        </dl>
      </SettingsSection>
    </SettingsForm>
  );
}

export const Default: Story = { args: { children: null }, render: () => <FormDemo /> };
