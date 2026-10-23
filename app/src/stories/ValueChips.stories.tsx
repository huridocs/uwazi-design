import type { Meta, StoryObj } from "@storybook/react-vite";
import { MetadataCard } from "../components/metadata/MetadataCard";
import { TemplateDot, ValueChips, sharedTemplate, type ChipValue } from "../components/metadata/ValueChips";

/** A list field's values in the record: a relationship field's records or a
 *  multiselect's labels, in natural order, folded past three lines. One
 *  template: its dot by the label and quiet chips. Mixed: entity pills. */
function Field({ label, values, unit }: { label: string; values: ChipValue[]; unit?: string }) {
  const typeId = sharedTemplate(values);
  return (
    <MetadataCard title={label} icon={typeId ? <TemplateDot typeId={typeId} /> : undefined}>
      <ValueChips label={label} values={values} unit={unit} />
    </MetadataCard>
  );
}

const meta = {
  title: "Metadata/ValueChips",
  component: Field,
  parameters: { layout: "padded" },
  args: { label: "Values", values: [] },
  decorators: [(Story) => <div className="max-w-sm">{Story()}</div>],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

const open = () => {};

/** 120 recommendation codes stored in no useful order (as a UPR record holds
 *  them). They print 131.1.1, 131.2 … 131.47 … 131.181. */
const CODES: ChipValue[] = Array.from({ length: 120 }, (_, i) => {
  const n = ((i * 37) % 120) + 1;
  const text = n % 15 === 0 ? `131.${n / 15}.1` : `131.${n + (n > 60 ? 61 : 0)}`;
  return { key: `rec-${i}`, text, typeId: "violation", onOpen: open };
});

export const LongValues: Story = {
  args: { label: "Related Recommendations", values: CODES, unit: "records" },
};

/** A few records of one template: no fold, no filter. */
export const Default: Story = {
  args: {
    label: "Countries",
    unit: "records",
    values: ["Peru", "Chile", "Argentina", "Guatemala"].map((t) => ({ key: t, text: t, typeId: "country", onOpen: open })),
  },
};

/** Records of several templates keep a dot on each pill. */
export const Mixed: Story = {
  args: {
    label: "Related",
    unit: "records",
    values: [
      { key: "a", text: "Case 12.250", typeId: "court_case", onOpen: open },
      { key: "b", text: "Judgment of 29 July 1988", typeId: "judgment", onOpen: open },
      { key: "c", text: "Enforced disappearance", typeId: "violation", onOpen: open },
      { key: "d", text: "Peru", typeId: "country", onOpen: open },
    ],
  },
};

/** A multiselect's labels: chips that only name. */
export const Multiselect: Story = {
  args: {
    label: "Tipo de audiencia",
    values: ["Fondo", "Excepciones Preliminares", "Reparaciones", "Costas"].map((t) => ({ key: t, text: t })),
  },
};
