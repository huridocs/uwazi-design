import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Folio } from "../components/shared/Folio";
import { LibraryPagination } from "../components/library/LibraryPagination";
import type { LibraryPageSize } from "../atoms/library";

/** The quiet page stepper, "‹ 3 / 147 ›", in caption type. Ghost chevrons
 *  (Shift-click, Home or End for the first and last page), the page as a field
 *  when `editable` (Enter or blur goes, Escape restores, ArrowUp / ArrowDown
 *  step). The PDF viewer draws it alone; the Library's Cards and List draw it
 *  with the range and page size as its `lead` (`LibraryPagination`), and the
 *  viewer's search matches as a cycle (`onStep`, `noun="match"`). */
const meta = {
  title: "Shared/Folio",
  component: Folio,
  parameters: { layout: "padded" },
  args: { page: 3, pageCount: 147, onPage: () => {} },
} satisfies Meta<typeof Folio>;

export default meta;
type Story = StoryObj<typeof meta>;

const Bar = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-end h-12 px-3 bg-paper border-t border-border">{children}</div>
);

/** The PDF's search matches: a cycle that starts before the first match. */
function MatchesDemo({ count }: { count: number }) {
  const [index, setIndex] = useState(0);
  return (
    <Folio
      page={index}
      pageCount={count}
      onStep={(dir) => setIndex(index === 0 ? (dir > 0 ? 1 : count) : ((index - 1 + dir + count) % count) + 1)}
      noun="match"
      label="Search matches"
    />
  );
}

function LibraryDemo({ total, compact }: { total: number; compact?: boolean }) {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState<LibraryPageSize>(30);
  return (
    <Bar>
      <LibraryPagination
        total={total}
        page={page}
        pageSize={size}
        compact={compact}
        onPage={setPage}
        onPageSize={(n) => {
          setPage(Math.floor(((page - 1) * size) / n) + 1);
          setSize(n);
        }}
      />
    </Bar>
  );
}

export const Default: Story = { render: () => <LibraryDemo total={4398} /> };

export const Minimal: Story = {
  render: () => {
    const [page, setPage] = useState(1);
    return (
      <Bar>
        <Folio page={page} pageCount={147} onPage={setPage} compact />
      </Bar>
    );
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Bar>
        <Folio page={1} pageCount={12} onPage={() => {}} editable label="Pages, first" />
      </Bar>
      <Bar>
        <Folio page={6} pageCount={12} onPage={() => {}} label="Pages, read-only" />
      </Bar>
      <Bar>
        <Folio page={12} pageCount={12} onPage={() => {}} editable label="Pages, last" />
      </Bar>
      <Bar>
        <Folio page={1} pageCount={0} onPage={() => {}} label="Pages, unknown count" />
      </Bar>
      <Bar>
        <MatchesDemo count={101} />
      </Bar>
      <Bar>
        <MatchesDemo count={0} />
      </Bar>
      <LibraryDemo total={18} />
      <LibraryDemo total={4398} compact />
    </div>
  ),
};

export const Empty: Story = { render: () => <LibraryDemo total={0} /> };
