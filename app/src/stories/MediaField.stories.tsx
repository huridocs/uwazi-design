import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MediaFieldEditor } from "../components/metadata/MediaFieldEditor";
import { MediaFieldValue } from "../components/metadata/MediaFieldValue";

/** A media property: the in-record player with its chapter list, and the
 *  editor for the address and chapters. */
const meta = {
  title: "Metadata/MediaField",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const VALUE = 'https://youtu.be/R5bL2eheml0, {"timelinks":{"00:00:00":"Opening","00:12:30":"Testimony"}}';

export const Default: Story = {
  render: () => (
    <div className="max-w-xl">
      <MediaFieldValue raw={VALUE} />
    </div>
  ),
};

export const Editor: Story = {
  render: () => {
    const [value, setValue] = useState(VALUE);
    return (
      <div className="max-w-xl flex flex-col gap-1.5">
        <label htmlFor="media" className="text-xs font-medium text-ink-secondary">
          Media
        </label>
        <MediaFieldEditor inputId="media" label="Media" value={value} onChange={setValue} onIssue={() => {}} />
      </div>
    );
  },
};
