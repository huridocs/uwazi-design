import { useState } from "react";
import { Provider, createStore } from "jotai";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { libraryCardLayoutAtom, libraryThumbFrameAtom, type ThumbFrame } from "../atoms/library";
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
          query=""
          selected={selectedId === e.id}
          connections={3 + i * 5}
          onSelect={setSelectedId}
          onView={() => {}}
        />
      ))}
    </div>
  );
}

/** The SIDE layout: the preview at the card's logical start, the text beside it,
 *  in fewer, wider columns. One store per story so the Display choice doesn't
 *  leak into the other stories. `query` marks matches the way a search does. */
function SideDemo({ frame, query = "", dir }: { frame: ThumbFrame; query?: string; dir?: "rtl" }) {
  const [store] = useState(() => {
    const st = createStore();
    st.set(libraryCardLayoutAtom, "side");
    st.set(libraryThumbFrameAtom, frame);
    return st;
  });
  const [selectedId, setSelectedId] = useState(entities[2]?.id ?? "");
  return (
    <Provider store={store}>
      <div dir={dir} className="grid grid-cols-1 lg:grid-cols-2 gap-3 max-w-5xl">
        {entities.slice(1, 5).map((e, i) => (
          <EntityCard
            key={e.id}
            entity={e}
            layout="cards"
            query={query}
            selected={selectedId === e.id}
            connections={3 + i * 5}
            onSelect={setSelectedId}
            onView={() => {}}
          />
        ))}
      </div>
    </Provider>
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
          query=""
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
    query: "",
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
    query: "",
    selected: false,
    onSelect: () => {},
    onView: () => {},
  },
  render: () => <ListDemo />,
};

const sideArgs = {
  entity: entities[1],
  layout: "cards" as const,
  query: "",
  selected: false,
  onSelect: () => {},
  onView: () => {},
};

/** Side layout, landscape frame: a 4:3 slot at the start of every card. */
export const Side: Story = { args: sideArgs, render: () => <SideDemo frame="landscape" /> };

/** Side layout, portrait frame: a 3:4 slot, where a document's first page fills. */
export const SidePortrait: Story = { args: sideArgs, render: () => <SideDemo frame="portrait" /> };

/** Side layout with a query: titles and values mark their matches. */
export const SideSearch: Story = { args: sideArgs, render: () => <SideDemo frame="landscape" query="case" /> };

/** Side layout under RTL: the slot moves to the right, the logical start. */
export const SideRtl: Story = { args: sideArgs, render: () => <SideDemo frame="landscape" dir="rtl" /> };
