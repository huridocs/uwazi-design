import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ImageLightbox } from "../components/shared/ImageLightbox";
import type { EntityImage } from "../data/entities";

/** A picture at full size over the page, with its filename and Close. */
const meta = {
  title: "Shared/ImageLightbox",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const IMAGE: EntityImage = {
  url: "artwork-images/1601708883168xwrh429c67.jpg",
  width: 800,
  height: 1000,
  aspect: "portrait",
  alt: "A painting from the Best Artworks collection",
  filename: "1601708883168xwrh429c67.jpg",
};

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} className="px-3 py-1.5 text-xs rounded-md bg-warm text-ink-secondary cursor-pointer">
          View image
        </button>
        <ImageLightbox image={open ? IMAGE : null} onClose={() => setOpen(false)} />
      </>
    );
  },
};
