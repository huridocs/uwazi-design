import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProvenanceLine } from "../components/shared/ProvenanceLine";
import { EntityPill } from "../components/shared/EntityPill";

/** The `↳ …` line — the app's ONE way of saying "what you are reading did not
 *  originate here".
 *
 *  Three surfaces make that statement about different things and must make it
 *  the same way, which is the whole reason this component exists: the library
 *  attributes a passage to the document it was quoted from, metadata names the
 *  hops an inherited value was reached through, and Copy From names the entity a
 *  staged value came off. Same corner glyph, same quiet 11px tertiary type, so a
 *  reader learns the mark once and it means the same thing everywhere.
 *
 *  Purely presentational: `label` is the verb, the children are whatever the
 *  surface points at — plain text where nothing is clickable, links where the
 *  overlay is mounted to receive the click. */
const meta = {
  title: "Shared/ProvenanceLine",
  component: ProvenanceLine,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ProvenanceLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "from", children: "Velásquez-Rodríguez v. Honduras" },
};

/** Every flavour in use, so drift between them is visible at a glance.
 *
 *  · `from` — the library's borrowed-document attribution. Plain text: the main
 *    pane doesn't mount the entity overlay, so a link there would be a control
 *    that does nothing.
 *  · `via` — metadata's inherited value, naming each intermediary. Clickable,
 *    because that surface CAN open them. The hop is ink with a carbon underline
 *    rather than carbon text: the accent is #00B4F0, which is ~1.9:1 on the warm
 *    backgrounds these sit on. The colour stays as the affordance, in the
 *    underline, where it is decoration rather than something to read.
 *  · `copied from` — Copy From's stamp, carrying an entity pill.
 *  · a shared prefix (`País via`) — used when one trail is hoisted above a
 *    table whose rows all share it. */
export const AllStates: Story = {
  args: { label: "via", children: null },
  render: () => (
    <div className="space-y-3 max-w-md">
      <ProvenanceLine label="from">Bámaca-Velásquez v. Guatemala</ProvenanceLine>

      <ProvenanceLine label="via">
        <button className="min-w-0 truncate text-ink-secondary underline decoration-carbon decoration-2 underline-offset-2 hover:text-ink cursor-pointer">
          Sentencia de 25 de noviembre de 2000
        </button>
        <span className="shrink-0 text-ink-muted" aria-hidden>
          →
        </span>
        <button className="min-w-0 truncate text-ink-secondary underline decoration-carbon decoration-2 underline-offset-2 hover:text-ink cursor-pointer">
          Corte Interamericana
        </button>
      </ProvenanceLine>

      <ProvenanceLine label="copied from">
        <EntityPill typeId="country" label="Argentina" />
      </ProvenanceLine>

      <ProvenanceLine label="País via">
        <button className="min-w-0 truncate text-ink-secondary underline decoration-carbon decoration-2 underline-offset-2 hover:text-ink cursor-pointer">
          Juez Ferrer Mac-Gregor
        </button>
      </ProvenanceLine>
    </div>
  ),
};

/** `inline` rides an existing line of text instead of occupying one — which is
 *  how the library uses it, because a line that appears and disappears with the
 *  data would shift the rows under the reader. */
export const Minimal: Story = {
  args: { label: "from", children: null },
  render: () => (
    <p className="max-w-md text-[11px] text-ink-tertiary">
      <span className="text-ink">3 of 41 pages</span>{" "}
      <ProvenanceLine inline label="from">
        Caso Gelman vs. Uruguay
      </ProvenanceLine>
    </p>
  ),
};
