import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { FILTER_RAIL, FilterCard, FilterListCard, SegmentRow } from "../components/shared/FilterCard";

/** The filter panel's card parts, shared by the Library's Filters and the
 *  Relationships filters (drawer tab, slide-over, phone sheet). Every story sits
 *  on the warm rail the cards ship on, so the a11y addon measures what renders.
 *  Check: a row at 0 is dimmed and cannot be ticked, a ticked row stays live,
 *  Clear shows only while the card narrows, and the Match line is a named group. */
const meta = {
  title: "Shared/FilterCard",
  component: FilterListCard,
  parameters: { layout: "padded" },
} satisfies Meta<typeof FilterListCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const COUNTRIES: [string, number][] = [
  ["Guatemala", 41],
  ["Perú", 37],
  ["Colombia", 29],
  ["México", 22],
  ["Chile", 14],
  ["Argentina", 9],
  ["Honduras", 6],
  ["Bolivia", 0],
];

function Rail({ children }: { children: React.ReactNode }) {
  return (
    <div data-gutter-host className="gutter-host w-80">
      <div className={FILTER_RAIL}>{children}</div>
    </div>
  );
}

function LiveList({ withMatch = false }: { withMatch?: boolean }) {
  const [selected, setSelected] = useState<Record<string, boolean>>({ Perú: true });
  const [mode, setMode] = useState<"any" | "all">("any");
  return (
    <FilterListCard
      title="Countries"
      entries={COUNTRIES}
      selected={selected}
      onToggle={(id) => setSelected((s) => ({ ...s, [id]: !s[id] }))}
      onClear={() => {
        setSelected({});
        setMode("any");
      }}
      narrowing={Object.values(selected).some(Boolean) || mode !== "any"}
      searchable
      match={
        withMatch ? (
          <SegmentRow
            component="FacetMatchRow"
            caption="Match"
            groupLabel="Match mode for Countries"
            options={[
              { value: "any", label: "any" },
              { value: "all", label: "all" },
            ]}
            value={mode}
            onChange={setMode}
          />
        ) : undefined
      }
    />
  );
}

/** A searchable list with one tick, as the Library's keyword cards and the
 *  Relationships country facet draw it. */
export const Default: Story = {
  args: { title: "Countries", entries: COUNTRIES, selected: {}, onToggle: () => {}, onClear: () => {} },
  render: () => (
    <Rail>
      <LiveList />
    </Rail>
  ),
};

/** Every state at once: Match line, a ticked row, a 0 row, markers, thesaurus
 *  groups, the pinned "No label" row, an inert list, and a card with its own
 *  body (the Relationships "As of"). */
export const AllStates: Story = {
  args: { title: "Countries", entries: COUNTRIES, selected: {}, onToggle: () => {}, onClear: () => {} },
  render: () => (
    <Rail>
      <LiveList withMatch />
      <FilterListCard
        title="Target entity type"
        entries={[
          ["case", 12],
          ["judgment", 4],
          ["unknown", 2],
        ]}
        selected={{ judgment: true }}
        onToggle={() => {}}
        onClear={() => {}}
        label={(id) => ({ case: "Case", judgment: "Judgment" })[id] ?? id}
        renderMarker={(id) => (
          <span
            aria-hidden
            className="w-1.5 h-1.5 rounded-[2px] shrink-0"
            style={{ backgroundColor: id === "case" ? "#c2410c" : "#2563eb" }}
          />
        )}
        noLabelId="unknown"
      />
      <FilterListCard
        title="Region"
        entries={[
          ["Bagmati", 8],
          ["Kathmandu", 6],
          ["Lalitpur", 3],
          ["Koshi", 2],
        ]}
        selected={{}}
        onToggle={() => {}}
        onClear={() => {}}
        groupOf={(id) => (id === "Kathmandu" || id === "Lalitpur" ? "Bagmati" : undefined)}
      />
      <FilterListCard
        title="Verification"
        entries={[
          ["Confirmed", 5],
          ["Disputed", 0],
        ]}
        selected={{ Disputed: true }}
        onToggle={() => {}}
        onClear={() => {}}
        inert
      />
      <FilterCard title="As of" stack>
        <p className="px-2 text-meta text-ink-tertiary">A card with its own body.</p>
      </FilterCard>
    </Rail>
  ),
};

/** A search that matches nothing. */
export const Empty: Story = {
  args: { title: "Countries", entries: [], selected: {}, onToggle: () => {}, onClear: () => {} },
  render: () => (
    <Rail>
      <FilterListCard title="Countries" entries={[]} selected={{}} onToggle={() => {}} onClear={() => {}} searchable />
    </Rail>
  ),
};
