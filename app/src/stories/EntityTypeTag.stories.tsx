import type { Meta, StoryObj } from "@storybook/react-vite";
import { EntityTypeTag } from "../components/shared/EntityTypeTag";
import { EntityPill } from "../components/shared/EntityPill";
import { entityTypes } from "../data/entities";

/** The template tag. Its `swatch` variant is the compact form for dense rows: a
 *  colour dot that expands into the full tinted pill on hover.
 *
 *  The label never uses the raw type colour: `utils/typeColor.ts` sends pale
 *  types to ink and mixes saturated ones toward it by `--label-mix`; the dot
 *  keeps the true colour. Check both themes with the toolbar. */
const meta = {
  title: "Shared/EntityTypeTag",
  component: EntityTypeTag,
  parameters: { layout: "padded" },
} satisfies Meta<typeof EntityTypeTag>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The collapsed chip — the dot, carrying the true colour. */
export const Default: Story = {
  args: { typeId: "court_case", variant: "swatch" },
};

/** Every type's dot, collapsed, as a dense row shows them. */
export const AllStates: Story = {
  args: { typeId: "court_case", variant: "swatch" },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {entityTypes.map((t) => (
        <EntityTypeTag variant="swatch" key={t.id} typeId={t.id} />
      ))}
    </div>
  ),
};

/** The LABEL treatment, which is the part that failed contrast — every type,
 *  pale and saturated, with the dot beside it for comparison.
 *
 *  `EntityPill` is the same rule made permanent (it always shows its label), so
 *  it stands in here for the chip's hover-revealed pill rather than this story
 *  faking a hover state the component doesn't expose. Both read from
 *  `typeLabelColor`, so if one drifts this row shows it.
 *
 *  No "before" swatch: rendering the raw colour to prove it fails would put a
 *  real contrast violation in a story whose job is to be violation-free. The
 *  numbers are 3.64:1 light / 3.21:1 dark before, 5.63:1 / 5.46:1 after. */
export const Minimal: Story = {
  args: { typeId: "court_case", variant: "swatch" },
  render: () => (
    <table className="text-xs">
      <thead>
        <tr className="text-meta uppercase tracking-wide text-ink-tertiary">
          <th className="pe-4 pb-2 text-start font-semibold">Type</th>
          <th className="pe-4 pb-2 text-start font-semibold">Dot</th>
          <th className="pb-2 text-start font-semibold">Label on its own tint</th>
        </tr>
      </thead>
      <tbody>
        {entityTypes.map((t) => (
          <tr key={t.id}>
            <td className="pe-4 py-1 text-ink-secondary">{t.name}</td>
            <td className="pe-4 py-1">
              <EntityTypeTag variant="swatch" typeId={t.id} />
            </td>
            <td className="py-1">
              <EntityPill typeId={t.id} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
};
