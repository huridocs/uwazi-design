import type { Meta, StoryObj } from "@storybook/react-vite";
import { PlayMark } from "../components/shared/PlayMark";

/** The play mark drawn over a video's still or its plain tile. One mark for
 *  the Library thumbnails and the record's player stage; the caller sizes it.
 *  Check it on a light ground, a dark ground and the warm tile, in both
 *  themes. */
const meta = {
  title: "Shared/PlayMark",
  component: PlayMark,
  parameters: { layout: "padded" },
} satisfies Meta<typeof PlayMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { className: "h-8" },
  render: (args) => (
    <span className="flex items-center justify-center w-48 h-28 rounded-md bg-warm">
      <PlayMark {...args} />
    </span>
  ),
};

/** The mark on the three grounds it meets: the warm tile, a bright still and
 *  a dark still (stood in for by flat fills), at the thumbnail's floor and the
 *  player's size. */
export const AllStates: Story = {
  args: {},
  render: () => (
    <div className="flex flex-col gap-3">
      {["h-5", "h-8", "h-10"].map((h) => (
        <div key={h} className="flex items-center gap-3">
          <span className="flex items-center justify-center w-40 h-24 rounded-md bg-warm">
            <PlayMark className={h} />
          </span>
          <span className="flex items-center justify-center w-40 h-24 rounded-md bg-[#e8e4dc]">
            <PlayMark className={h} />
          </span>
          <span className="flex items-center justify-center w-40 h-24 rounded-md bg-[#1c1712]">
            <PlayMark className={h} />
          </span>
        </div>
      ))}
    </div>
  ),
};
