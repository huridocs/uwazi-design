import type { Meta, StoryObj } from "@storybook/react-vite";
import { EntityTypeChip } from "../components/shared/EntityTypeChip";
import { EntityPill } from "../components/shared/EntityPill";
import { entityTypes } from "../data/entities";

/** The compact type indicator for dense rows: a colour dot that expands into the
 *  full tinted pill on hover.
 *
 *  Its label does NOT use the raw type colour. Those colours are chosen to read
 *  as a set of hues at dot size; at 12px on their own 12.5% tint they fail WCAG
 *  — this chip shipped drawing them straight and measured 3.64:1 in light and
 *  3.21:1 in dark. `utils/typeColor.ts` now owns the rule for every surface that
 *  turns a type colour into text: pale types fall back to ink, saturated ones
 *  are pulled 65% of the way toward it, and the dot keeps the true colour
 *  because that is where the hue belongs and nothing has to be read.
 *
 *  Flip the toolbar theme on these stories — the treatment has to hold in both,
 *  and the one combination that forced 70% down to 65% (the blue, in dark) is
 *  only visible in one of them. */
const meta = {
  title: "Shared/EntityTypeChip",
  component: EntityTypeChip,
  parameters: { layout: "padded" },
} satisfies Meta<typeof EntityTypeChip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The collapsed chip — the dot, carrying the true colour. */
export const Default: Story = {
  args: { typeId: "court_case" },
};

/** Every type's dot, collapsed, as a dense row shows them. */
export const AllStates: Story = {
  args: { typeId: "court_case" },
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      {entityTypes.map((t) => (
        <EntityTypeChip key={t.id} typeId={t.id} />
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
  args: { typeId: "court_case" },
  render: () => (
    <table className="text-xs">
      <thead>
        <tr className="text-[10px] uppercase tracking-wide text-ink-tertiary">
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
              <EntityTypeChip typeId={t.id} />
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
