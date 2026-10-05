import type { Meta, StoryObj } from "@storybook/react-vite";
import { Link2 } from "lucide-react";
import { RowActionButton, RowActions } from "../components/settings/RowActions";

/** The action cluster at the end of a settings row. It shows on hover and
 *  on keyboard focus inside the row, and always on phones and touch devices.
 *  A row that opens its editor carries no pencil; extra actions go before
 *  delete. The demo rows are `group`s, as table rows are. */
const meta = {
  title: "Settings/RowActions",
  component: RowActions,
  parameters: { layout: "padded" },
} satisfies Meta<typeof RowActions>;

export default meta;
type Story = StoryObj<typeof meta>;

function Row({ children, name }: { children: React.ReactNode; name: string }) {
  return (
    <div className="group flex items-center justify-between max-w-md bg-paper border border-border rounded-md px-3 py-2 hover:bg-warm">
      <span className="text-sm text-ink">{name}</span>
      {children}
    </div>
  );
}

export const Default: Story = {
  args: { label: "Court Case" },
  render: () => (
    <Row name="Court Case">
      <RowActions label="Court Case" onDelete={() => {}} />
    </Row>
  ),
};

export const AllStates: Story = {
  args: { label: "logo.svg" },
  render: () => (
    <div className="flex flex-col gap-2">
      <Row name="logo.svg (extra action)">
        <RowActions label="logo.svg" onDelete={() => {}}>
          <RowActionButton label="Copy URL for logo.svg" icon={<Link2 size={14} aria-hidden />} onClick={() => {}} />
        </RowActions>
      </Row>
      <Row name="Full name (no row target)">
        <RowActions label="Full name" onEdit={() => {}} onDelete={() => {}} />
      </Row>
      <Row name="Spanish (uninstall verb)">
        <RowActions label="Spanish" deleteLabel="Uninstall" onDelete={() => {}} />
      </Row>
    </div>
  ),
};
