import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsEditor, SettingsFormPage } from "../components/settings/SettingsEditor";
import { SettingsFieldRow, SettingsSection } from "../components/settings/SettingsSection";
import { SettingsField, TextInput } from "../components/settings/SettingsField";
import { useSettingsDraft } from "../hooks/useSettingsDraft";

/** The two form shells. `SettingsEditor` is the detail a list opens:
 *  breadcrumb and back arrow, the form, and Cancel then the commit (ink
 *  "Create …" for a new record, green "Save" for an existing one).
 *  `SettingsFormPage` is a top-level page that is one form: Discard changes
 *  then Save, both enabled only while the draft is dirty. Both read the
 *  draft from `useSettingsDraft`, which registers with the dirty guard. */
const meta = {
  title: "Settings/SettingsEditor",
  component: SettingsEditor,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="h-[26rem] rounded-md overflow-hidden border border-border">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SettingsEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

function EditorDemo({ isNew }: { isNew: boolean }) {
  const { draft, update, dirty } = useSettingsDraft({
    id: `story-editor-${isNew}`,
    label: "Story edits",
    saved: { name: isNew ? "" : "Appealed to", inverse: isNew ? "" : "Ruled on" },
  });
  return (
    <SettingsEditor
      component="DemoEditor"
      path={["Relationship types"]}
      title={isNew ? "New relationship type" : "Appealed to"}
      onBack={() => {}}
      isNew={isNew}
      createLabel="Create type"
      dirty={dirty}
      valid={!!draft.name.trim()}
      onSave={() => {}}
    >
      <SettingsSection>
        <SettingsFieldRow>
          <SettingsField label="Name" hint="The label shown when connecting two entities.">
            <TextInput value={draft.name} onChange={(e) => update({ name: e.target.value })} />
          </SettingsField>
          <SettingsField label="Inverse name" hint="Optional, for the reverse direction.">
            <TextInput value={draft.inverse} onChange={(e) => update({ inverse: e.target.value })} />
          </SettingsField>
        </SettingsFieldRow>
      </SettingsSection>
    </SettingsEditor>
  );
}

function FormPageDemo() {
  const { draft, update, dirty, discard, markSaved } = useSettingsDraft({
    id: "story-form-page",
    label: "Story edits",
    saved: { name: "Inter-American Human Rights Archive", landing: "/library" },
  });
  return (
    <SettingsFormPage
      component="DemoFormPage"
      title="Collection"
      intro="The collection's name, where visitors arrive, and who can see it."
      dirty={dirty}
      onSave={() => markSaved()}
      onDiscard={discard}
    >
      <SettingsSection>
        <SettingsFieldRow>
          <SettingsField label="Collection name">
            <TextInput value={draft.name} onChange={(e) => update({ name: e.target.value })} />
          </SettingsField>
          <SettingsField label="Custom landing page" hint="Where visitors land first.">
            <TextInput value={draft.landing} onChange={(e) => update({ landing: e.target.value })} />
          </SettingsField>
        </SettingsFieldRow>
      </SettingsSection>
    </SettingsFormPage>
  );
}

const args = { component: "Demo", path: [], title: "", onBack: () => {}, dirty: false, onSave: () => {}, children: null };

export const Default: Story = { args, render: () => <EditorDemo isNew={false} /> };
export const New: Story = { args, render: () => <EditorDemo isNew /> };
export const FormPage: Story = { args, render: () => <FormPageDemo /> };
