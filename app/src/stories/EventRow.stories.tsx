import type { Meta, StoryObj } from "@storybook/react-vite";
import { EventRow } from "../components/relationships/when/EventRow";
import type { WhenEvent } from "../utils/entityDates";

/** One line of the relationships When spine. The entity's own dates print their
 *  label in ink; a connected entity's print its pill (which opens the preview),
 *  the date's label, and the relation that reached it. A span prints its years. */
const meta: Meta<typeof EventRow> = {
  title: "Relationships/EventRow",
  component: EventRow,
  parameters: { layout: "padded" },
  decorators: [(S) => <div className="w-[36rem] max-w-full"><S /></div>],
};
export default meta;
type Story = StoryObj<typeof meta>;

const ev = (entityId: string, own: boolean, label: string, iso: string, via: string[], end?: string): WhenEvent<string> => ({
  key: `${entityId}-${iso}`,
  entityId,
  own,
  via,
  date: { prop: label, label, t: Date.parse(`${iso}T00:00:00Z`), ...(end ? { end: Date.parse(`${end}T00:00:00Z`) } : {}) },
});

export const Default: Story = { args: { event: ev("e7", false, "Date", "1997-11-18", ["Judgment"]) } };
export const Own: Story = { args: { event: ev("e3", true, "Petition filed", "1989-03-15", []) } };
export const SeveralRelations: Story = { args: { event: ev("e53", false, "Adopted", "2003-05-10", ["Mentions", "Cites", "Refers to"]) } };
export const Span: Story = { args: { event: ev("e22", false, "Mandate", "1986-01-01", ["Signed by"], "1997-12-31") } };
export const Selected: Story = { args: { event: ev("e7", false, "Date", "1997-11-18", ["Judgment"]), selected: true } };
