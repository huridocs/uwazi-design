import type { Meta, StoryObj } from "@storybook/react-vite";
import { EntityMetadataSummary } from "../components/metadata/EntityMetadataSummary";
import { MAIN_ENTITY_ID } from "../data/entityProfiles";
import { entities } from "../data/entities";

/** The condensed metadata body shared by every drawer/preview: long-form
 *  fields as titled cards, scalar rows in one "Details" card, then the
 *  relationship/inherited cards — all on the MetadataCard shell so the drawer
 *  reads as one card system. Reads the same entity profile the main Metadata
 *  view uses. */
const meta = {
  title: "Metadata/EntityMetadataSummary",
  component: EntityMetadataSummary,
  parameters: { layout: "padded" },
} satisfies Meta<typeof EntityMetadataSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

const drawerFrame = (Story: React.ComponentType) => (
  <div className="max-w-md h-[36rem] bg-warm border border-border rounded-lg overflow-hidden">
    <Story />
  </div>
);

export const Default: Story = {
  args: { entityId: MAIN_ENTITY_ID },
  decorators: [drawerFrame],
};

// An entity whose profile has only scalar fields — exercises the summary
// without relationship cards.
export const Minimal: Story = {
  args: { entityId: entities.find((e) => e.typeId === "person")?.id ?? "e1" },
  decorators: [drawerFrame],
};
