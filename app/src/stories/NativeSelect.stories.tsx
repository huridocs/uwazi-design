import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { NativeSelect, type NativeSelectSize } from "../components/shared/NativeSelect";
import { MODAL_INPUT } from "../components/shared/ModalParts";

/** A native `<select>` with the app's caret: inset from the end as far as the
 *  text is from the start, logical sides. `size` sets the padding; the
 *  caller's class sets height, type, ground and border. */
const meta = {
  title: "Shared/NativeSelect",
  component: NativeSelect,
  parameters: { layout: "padded" },
} satisfies Meta<typeof NativeSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

const FILTER = "h-8 bg-warm border border-border rounded-md text-xs font-medium text-ink-secondary";
const FIELD = "w-full px-3 py-2 text-sm text-ink bg-paper rounded-md border border-border";
const GRID = "h-7 text-xs text-ink bg-paper border border-border rounded-md";
const CLASS: Record<NativeSelectSize, string> = { xs: GRID, sm: FILTER, md: MODAL_INPUT, lg: FIELD };
const OPTIONS = ["Mecanismo", "País", "Descriptores", "Tipo de documento"];

function Demo({ size, label, initial = "", disabled }: { size: NativeSelectSize; label: string; initial?: string; disabled?: boolean }) {
  const [v, setV] = useState(initial);
  return (
    <NativeSelect size={size} aria-label={label} value={v} onChange={(e) => setV(e.target.value)} className={CLASS[size]} disabled={disabled}>
      <option value="">Choose a filter</option>
      {OPTIONS.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </NativeSelect>
  );
}

const Column = ({ children }: { children: React.ReactNode }) => <div className="flex flex-col gap-2 max-w-xs">{children}</div>;

export const Default: Story = { render: () => <Column><Demo size="sm" label="Facet" initial="Mecanismo" /></Column> };

export const Minimal: Story = { render: () => <Column><Demo size="xs" label="Column property" /></Column> };

export const AllStates: Story = {
  render: () => (
    <Column>
      <Demo size="xs" label="Extra small" initial="País" />
      <Demo size="sm" label="Small" initial="Mecanismo" />
      <Demo size="md" label="Medium" initial="Descriptores" />
      <Demo size="lg" label="Large" />
      <Demo size="md" label="Disabled" initial="Tipo de documento" disabled />
      <div dir="rtl">
        <Demo size="sm" label="Right to left" initial="Mecanismo" />
      </div>
    </Column>
  ),
};

export const Empty: Story = {
  render: () => (
    <Column>
      <NativeSelect size="sm" aria-label="No facets" value="" onChange={() => {}} className={FILTER}>
        <option value="">Set a filter above first</option>
      </NativeSelect>
    </Column>
  ),
};
