import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Pager } from "../components/shared/Pager";
import { LibraryPagination } from "../components/library/LibraryPagination";
import type { LibraryPageSize } from "../atoms/library";

/** The page stepper at the end of a pane's bottom bar: Previous · "N / M" ·
 *  Next. The PDF viewer's bar draws it read-only; the Library's Cards and List
 *  draw it with the page as a field (Enter or blur goes, Escape reverts,
 *  ArrowUp / ArrowDown step). `compact` swaps the words for chevrons. */
const meta = {
  title: "Shared/Pager",
  component: Pager,
  parameters: { layout: "padded" },
  args: { page: 3, pageCount: 12, onPage: () => {} },
} satisfies Meta<typeof Pager>;

export default meta;
type Story = StoryObj<typeof meta>;

const Bar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-end h-12 px-3 bg-paper border-t border-border">{children}</div>
);

function Live({ editable, compact, pageCount = 147 }: { editable?: boolean; compact?: boolean; pageCount?: number }) {
  const [page, setPage] = useState(1);
  return (
    <Bar>
      <Pager page={page} pageCount={pageCount} onPage={setPage} editable={editable} compact={compact} />
    </Bar>
  );
}

function LibraryDemo({ total }: { total: number }) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<LibraryPageSize>(30);
  return (
    <Bar>
      <LibraryPagination
        total={total}
        page={page}
        pageSize={size}
        onPage={setPage}
        onPageSize={(n) => {
          setPage(Math.floor(((page - 1) * size) / n) + 1);
          setSize(n);
        }}
      />
    </Bar>
  );
}

export const Default: Story = { render: () => <Live /> };

export const Editable: Story = { render: () => <Live editable /> };

export const Minimal: Story = { render: () => <Live compact /> };

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Bar>
        <Pager page={1} pageCount={12} onPage={() => {}} />
      </Bar>
      <Bar>
        <Pager page={12} pageCount={12} onPage={() => {}} editable />
      </Bar>
      <Bar>
        <Pager page={1} pageCount={0} onPage={() => {}} />
      </Bar>
      <LibraryDemo total={4398} />
      <LibraryDemo total={18} />
    </div>
  ),
};

export const Empty: Story = { render: () => <LibraryDemo total={0} /> };
