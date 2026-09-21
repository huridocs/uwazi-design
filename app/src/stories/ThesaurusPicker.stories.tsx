import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { AddThesaurusValueModal, ThesaurusPicker } from "../components/metadata/ThesaurusPicker";
import { seedThesaurusValues } from "../data/settings";

/** The edit form's editor for `select` / `multiselect` properties — the
 *  thesaurus's values as an inline list on FacetSection's bare flavour. A dumb
 *  list: the host holds the value and decides what a click means. */
const meta = {
  title: "Metadata/ThesaurusPicker",
  component: ThesaurusPicker,
  parameters: { layout: "padded" },
  args: {
    label: "Violations",
    values: seedThesaurusValues.t1,
    multiple: true,
    chosen: ["Torture"],
    onToggle: () => {},
  },
  decorators: [(Story) => <div className="max-w-md">{Story()}</div>],
} satisfies Meta<typeof ThesaurusPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A single-value property: the same list as a radio group. */
export const Default: Story = {
  args: { label: "Status", values: seedThesaurusValues.t3, multiple: false, chosen: ["Decided"] },
};

/** Multiselect with nested groups; the chosen value floats to the top. */
export const Multi: Story = {
  render: (args) => {
    const [chosen, setChosen] = useState(args.chosen);
    return (
      <ThesaurusPicker
        {...args}
        chosen={chosen}
        onToggle={(l) => setChosen((p) => (p.includes(l) ? p.filter((x) => x !== l) : [...p, l]))}
      />
    );
  },
};

/** Bulk: rows tri-state with coverage beside them. */
export const Mixed: Story = {
  args: {
    values: seedThesaurusValues.t2,
    chosen: ["American Convention on Human Rights"],
    mixed: ["ICCPR"],
    coverage: { counts: { "American Convention on Human Rights": 12, ICCPR: 4 }, of: 12 },
  },
};

/** A value created in this edit carries a "New" tag. */
export const WithNewValue: Story = {
  args: {
    values: [...seedThesaurusValues.t3, { id: "x", label: "Withdrawn" }],
    multiple: false,
    chosen: ["Withdrawn"],
    fresh: new Set(["Withdrawn"]),
  },
};

/** The property is bound to no thesaurus: the list offers to create one. */
export const Empty: Story = {
  args: { label: "Type", values: null, chosen: [], onCreateThesaurus: () => {}, templateName: "Organization" },
};

/** "Add value": one field, Cancel / Save. */
export const AddValueModal: Story = {
  render: () => (
    <AddThesaurusValueModal
      thesaurusName="Case status"
      existing={seedThesaurusValues.t3.map((v) => v.label)}
      onSave={() => {}}
      onClose={() => {}}
    />
  ),
};
