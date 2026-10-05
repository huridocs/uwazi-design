import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Dropzone } from "../components/shared/Dropzone";

/** The Import CSV file picker: a dashed warm well that opens the chooser or
 *  takes a dropped file; once chosen, a row naming the file with Remove. */
const meta = {
  title: "Shared/Dropzone",
  component: Dropzone,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Dropzone>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [file, setFile] = useState<File | null>(null);
    return (
      <div className="max-w-md">
        <Dropzone
          onFile={setFile}
          file={file ? { name: file.name, detail: `${file.size.toLocaleString()} bytes` } : null}
          onRemove={() => setFile(null)}
        />
      </div>
    );
  },
};

export const Multiple: Story = {
  render: () => {
    const [files, setFiles] = useState<File[]>([]);
    return (
      <div className="max-w-md flex flex-col gap-2">
        <Dropzone
          multiple
          accept="*/*"
          onFiles={(more) => setFiles((prev) => [...prev, ...more])}
          title="Browse files to upload"
          hint="or drop your files here."
        />
        <ul className="text-xs text-ink-secondary">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`}>{f.name}</li>
          ))}
        </ul>
      </div>
    );
  },
};

export const Chosen: Story = {
  args: { file: { name: "estados.csv", detail: "Adds 3 values and 1 group." }, onRemove: () => {} },
  render: (args) => (
    <div className="max-w-md">
      <Dropzone {...args} />
    </div>
  ),
};
