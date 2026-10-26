import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProvenanceLine } from "../components/shared/ProvenanceLine";
import { EntityPill } from "../components/shared/EntityPill";

/** The `↳ …` line — the app's ONE way of saying "what you are reading did not
 *  originate here".
 *
 *  Every surface that makes that statement makes it the same way, which is the
 *  whole reason this component exists: search results naming the other records a passage also appears under, and Copy From names the
 *  entity a staged value came off. Same corner glyph, same quiet 11px tertiary
 *  type, so a reader learns the mark once and it means the same thing
 *  everywhere. (Inherited metadata no longer draws a `↳ via` trail.)
 *
 *  Purely presentational: `label` is the verb, the children are whatever the
 *  surface points at. */
const meta = {
  title: "Shared/ProvenanceLine",
  component: ProvenanceLine,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProvenanceLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "also under", children: "Velásquez Rodríguez. Sentencia de 29 de julio de 1988" },
};

/** Every flavour in use, so drift between them is visible at a glance:
 *  `also under` with a plain title, and `copied from` carrying an entity pill. */
export const AllStates: Story = {
  args: { label: "also under", children: null },
  render: () => (
    <div className="space-y-3 max-w-md">
      <ProvenanceLine label="also under">
        <span className="min-w-0 truncate text-ink-secondary">Velásquez Rodríguez. Sentencia de 29 de julio de 1988</span>
      </ProvenanceLine>

      <ProvenanceLine label="copied from">
        <EntityPill typeId="country" label="Argentina" />
      </ProvenanceLine>
    </div>
  ),
};

/** `inline` rides an existing line of text instead of occupying one — which is
 *  how the library uses it, because a line that appears and disappears with the
 *  data would shift the rows under the reader. */
export const Minimal: Story = {
  args: { label: "also under", children: null },
  render: () => (
    <p className="max-w-md text-meta text-ink-tertiary">
      <span className="text-ink">3 of 41 pages</span>{" "}
      <ProvenanceLine inline label="also under">
        Caso Gelman vs. Uruguay
      </ProvenanceLine>
    </p>
  ),
};
