import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DateInput } from "../components/shared/DateInput";

/** A date field in the collection's date format, with the browser's calendar
 *  on a button; yyyy-mm-dd in and out, like a native date input. */
const meta = {
  title: "Shared/DateInput",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [iso, setIso] = useState("2010-05-12");
    return (
      <div className="max-w-xs flex flex-col gap-1.5">
        <DateInput
          value={iso}
          onChange={setIso}
          aria-label="Date filed"
          className="w-full px-3 py-2 text-sm text-ink bg-paper rounded-md border border-border"
        />
        <span className="text-meta text-ink-tertiary">value: {iso || "—"}</span>
      </div>
    );
  },
};
