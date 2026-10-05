import type { Meta, StoryObj } from "@storybook/react-vite";
import { MediaItemCard } from "../components/metadata/MediaItemCard";
import type { MediaItemView } from "../data/entityProfiles";
import { asset } from "../utils/asset";

/** A media item's record leads with the item: a bundled picture with its
 *  credit, a recording through the record's player, or the post it links to.
 *  A graphic or distressing item is covered until the reader chooses to see
 *  it; a misattributed one says so first. Demo values follow the Nepal
 *  collection's records. */
const meta = {
  title: "Metadata/MediaItemCard",
  component: MediaItemCard,
  parameters: { layout: "padded" },
  args: { onOpenImage: () => {} },
} satisfies Meta<typeof MediaItemCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const base: Pick<MediaItemView, "factChecks" | "covers"> = { factChecks: [], covers: [] };

const photo: MediaItemView = {
  ...base,
  kind: "photo",
  image: {
    url: asset("/nepal-data/media/sansad-bhavan-after-6053.jpg"),
    width: 1600,
    height: 900,
    aspect: "landscape",
    alt: "The Federal Parliament building on 20 September 2025",
    filename: "sansad-bhavan-after-6053.jpg",
  },
  attribution: "Photographer name, CC BY-SA 4.0, via Wikimedia Commons",
  licence: "CC BY-SA 4.0",
  licenceUrl: "https://creativecommons.org/licenses/by-sa/4.0",
  page: { url: "https://commons.wikimedia.org/", label: "Wikimedia Commons file page" },
  platform: "Wikimedia Commons",
};

const video: MediaItemView = {
  ...base,
  kind: "video",
  embed: "https://www.youtube.com/watch?v=vtq6jWMHq1A",
  segment: { start: 67 },
  page: { url: "https://www.tiktok.com/", label: "TikTok video of 17 September 2025" },
  platform: "TikTok",
};

const frame = (Story: React.ComponentType) => (
  <div className="max-w-2xl">
    <Story />
  </div>
);

export const Default: Story = { args: { item: photo }, decorators: [frame] };

export const AllStates: Story = {
  args: { item: photo },
  decorators: [frame],
  render: (args) => (
    <div className="flex flex-col gap-4">
      <MediaItemCard {...args} item={photo} />
      <MediaItemCard
        {...args}
        item={{
          ...video,
          verification: { value: "misattributed", label: "Misattributed or recycled" },
          factChecks: [
            { entityId: "fc-1", publisher: "Newschecker Nepal", title: "Oli interview clip is old", url: "https://newschecker.in/" },
          ],
        }}
      />
      <MediaItemCard
        {...args}
        item={{
          ...base,
          kind: "audio",
          embed: "https://podcasts.apple.com/us/podcast/id78995043",
          segment: { start: 82, end: 510 },
          page: { url: "https://www.abc.net.au/", label: "ABC episode page" },
        }}
      />
      <MediaItemCard
        {...args}
        item={{
          ...base,
          kind: "video",
          platform: "Facebook",
          page: { url: "https://www.facebook.com/", label: "Facebook video" },
          contentWarning: { value: "graphic", label: "Graphic" },
        }}
      />
    </div>
  ),
};
