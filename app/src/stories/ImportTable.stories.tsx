import { useEffect, useState } from "react";
import { useSetAtom } from "jotai";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { ImportTable } from "../components/import-csv/ImportTable";
import { breakpointAtom, type Breakpoint } from "../atoms/viewport";
import { defaultImports } from "../data/imports";

/** Import CSV list rows — desktop grid + mobile card variants (the variant is
 *  driven by breakpointAtom, forced per story here). Both use the stretched
 *  primary-action pattern: the row container is not a button; select-row,
 *  checkbox, and View stay independent controls. */

function Demo({ breakpoint, width }: { breakpoint: Breakpoint; width: string }) {
  const setBreakpoint = useSetAtom(breakpointAtom);
  useEffect(() => {
    setBreakpoint(breakpoint);
    return () => setBreakpoint("desktop");
  }, [breakpoint, setBreakpoint]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  return (
    <div
      className="flex flex-col bg-paper border border-border rounded-lg overflow-hidden"
      style={{ width, maxWidth: "100%" }}
    >
      <ImportTable
        imports={defaultImports}
        selectedIds={selectedIds}
        onSelect={(id) =>
          setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
        onSelectAll={() => setSelectedIds(new Set(defaultImports.map((i) => i.id)))}
        onView={() => {}}
      />
    </div>
  );
}

const meta = {
  title: "Import CSV/ImportTable",
  component: ImportTable,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ImportTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  args: { imports: [], selectedIds: new Set(), onSelect: () => {}, onSelectAll: () => {}, onView: () => {} },
  render: () => <Demo breakpoint="desktop" width="56rem" />,
};

export const MobileCards: Story = {
  args: { imports: [], selectedIds: new Set(), onSelect: () => {}, onSelectAll: () => {}, onView: () => {} },
  render: () => <Demo breakpoint="mobile" width="24rem" />,
};
