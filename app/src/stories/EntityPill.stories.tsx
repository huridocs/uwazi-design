import type { Meta, StoryObj } from "@storybook/react-vite";
import { EntityPill } from "../components/shared/EntityPill";

/** Entity-type pill: `rounded-md` shell, square `rounded-[2px]` dot, type colour
 *  at 12% as tint. Pale type colours auto-fall back to ink for the label (the
 *  dot keeps the true colour). Always `w-fit` — never stretches in flex/grid. */
const meta = {
  title: "Shared/EntityPill",
  component: EntityPill,
  parameters: { layout: "centered" },
  args: { typeId: "person", size: "sm" },
  argTypes: {
    typeId: {
      control: "select",
      options: ["person", "country", "court_case", "judgment", "violation", "right", "organization"],
    },
    size: { control: "inline-radio", options: ["sm", "md"] },
  },
} satisfies Meta<typeof EntityPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomLabel: Story = {
  args: { typeId: "court_case", label: "Case 12.250 (Bámaca Velásquez)" },
};

export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2 max-w-md">
      {["person", "country", "court_case", "judgment", "violation", "right", "organization"].map((t) => (
        <EntityPill key={t} typeId={t} />
      ))}
    </div>
  ),
};
