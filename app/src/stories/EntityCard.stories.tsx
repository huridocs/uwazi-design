import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EntityCard } from "../components/library/EntityCard";
import { entities } from "../data/entities";

/** Library entity card — cards + list layouts. Selection is the stretched
 *  primary-action button (the card container is not a button; the View button
 *  and connection badge stay independent). Selected = bg-parchment. In a grid,
 *  rows stretch so footers align (body flexes to fill). */

function CardsDemo() {
  const [selectedId, setSelectedId] = useState(entities[3]?.id ?? "");
  const shown = entities.slice(1, 4);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-w-4xl">
      {shown.map((e, i) => (
        <EntityCard
          key={e.id}
          entity={e}
          layout="cards"
          selected={selectedId === e.id}
          connections={3 + i * 5}
          onSelect={setSelectedId}
          onView={() => {}}
        />
      ))}
    </div>
  );
}

function ListDemo() {
  const [selectedId, setSelectedId] = useState("");
  return (
    <div className="flex flex-col gap-2 max-w-2xl">
      {entities.slice(1, 5).map((e, i) => (
        <EntityCard
          key={e.id}
          entity={e}
          layout="list"
          selected={selectedId === e.id}
          connections={2 + i}
          onSelect={setSelectedId}
          onView={() => {}}
        />
      ))}
    </div>
  );
}

const meta = {
  title: "Library/EntityCard",
  component: EntityCard,
  parameters: { layout: "padded" },
} satisfies Meta<typeof EntityCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CardsGrid: Story = {
  args: {
    entity: entities[1],
    layout: "cards",
    selected: false,
    onSelect: () => {},
    onView: () => {},
  },
  render: () => <CardsDemo />,
};

export const ListRows: Story = {
  args: {
    entity: entities[1],
    layout: "list",
    selected: false,
    onSelect: () => {},
    onView: () => {},
  },
  render: () => <ListDemo />,
};
