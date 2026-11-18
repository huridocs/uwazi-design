import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemberMark } from "../components/shared/MemberMark";

/** A user (initials) and a group (people icon) as the Permissions facet and
 *  the Permissions dialog draw them, beside their names. */
function MemberMarks() {
  const rows = [
    { name: "mlopez", group: false },
    { name: "afarah", group: false },
    { name: "Litigation", group: true },
    { name: "Research", group: true },
  ];
  return (
    <ul className="w-56 space-y-2 bg-paper border border-border rounded-lg p-3">
      {rows.map((r) => (
        <li key={r.name} className="flex items-center gap-2 text-sm text-ink">
          <MemberMark name={r.name} group={r.group} />
          {r.name}
        </li>
      ))}
    </ul>
  );
}

const meta = {
  title: "Shared/MemberMark",
  component: MemberMarks,
  parameters: { layout: "padded" },
} satisfies Meta<typeof MemberMarks>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
