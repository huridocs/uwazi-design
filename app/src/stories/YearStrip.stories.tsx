import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { YearStrip, type YearCount } from "../components/relationships/when/YearStrip";

/** Events per year for the relationships When view. One bar per year across the
 *  span — empty years stay, so gaps read — and each bar is a button: click
 *  narrows to that year, Shift+click extends, the chip clears. */
const meta: Meta<typeof YearStrip> = {
  title: "Relationships/YearStrip",
  component: YearStrip,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof meta>;

const span = (from: number, counts: number[]): YearCount[] => counts.map((count, i) => ({ year: from + i, count }));
const Interactive = ({ years, initial = null }: { years: YearCount[]; initial?: [number, number] | null }) => {
  const [range, setRange] = useState<[number, number] | null>(initial);
  return (
    <div className="w-[36rem] max-w-full">
      <YearStrip years={years} range={range} onChange={setRange} />
    </div>
  );
};

export const Default: Story = {
  render: () => <Interactive years={span(1993, [1, 0, 3, 1, 0, 2, 2, 0, 0, 1, 0, 1, 0, 0, 1])} />,
};

export const WithRange: Story = {
  render: () => <Interactive years={span(1993, [1, 0, 3, 1, 0, 2, 2, 0, 0, 1, 0, 1])} initial={[1995, 1996]} />,
};

/** A long, dense span — the shape of a high-degree entity. */
export const Dense: Story = {
  render: () => <Interactive years={span(1987, Array.from({ length: 35 }, (_, i) => Math.round(3 + i * 1.4 + (i % 4) * 3)))} />,
};

export const Minimal: Story = {
  render: () => <Interactive years={span(2011, [2])} />,
};
