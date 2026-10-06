import type { Meta, StoryObj } from "@storybook/react-vite";
import { createStore, Provider } from "jotai";
import { SavedViewsPanel } from "../components/library/SavedViewsMenu";
import { libraryTypeFiltersAtom, libraryQueryAtom } from "../atoms/library";
import { logSearchAtom, saveCurrentViewAtom } from "../atoms/savedViews";

/** The Library's Views menu body: saved views and the search history. Each
 *  story starts from empty storage. */
function withState(seed: boolean) {
  return (Story: () => React.ReactNode) => {
    try {
      localStorage.removeItem("uwazi:savedViews");
      sessionStorage.removeItem("uwazi:searchHistory:v2");
    } catch {
      /* storage blocked */
    }
    const store = createStore();
    if (seed) {
      store.set(libraryTypeFiltersAtom, { person: true });
      store.set(saveCurrentViewAtom, "People");
      store.set(libraryQueryAtom, "tablada");
      store.set(logSearchAtom, "tablada");
      store.set(saveCurrentViewAtom, "People named in La Tablada");
    }
    return (
      <Provider store={store}>
        <div className="w-80 rounded-md border border-border bg-paper p-1">{Story()}</div>
      </Provider>
    );
  };
}

const meta = {
  title: "Library/SavedViewsPanel",
  component: SavedViewsPanel,
  parameters: { layout: "centered" },
} satisfies Meta<typeof SavedViewsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { decorators: [withState(true)] };
export const Empty: Story = { decorators: [withState(false)] };
