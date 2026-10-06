import type { Meta, StoryObj } from "@storybook/react-vite";
import { createStore, Provider } from "jotai";
import { PinToggle } from "../components/shared/PinToggle";
import { togglePinAtom } from "../atoms/caseFile";

/** Pin a record to the collection's case. `icon` (card footer, relationship
 *  pill) and `label` (entity header). Each story starts from an empty case. */
function withCase(pinned: string[]) {
  return (Story: () => React.ReactNode) => {
    try {
      localStorage.removeItem("uwazi:cases");
    } catch {
      /* storage blocked */
    }
    const store = createStore();
    for (const id of pinned) store.set(togglePinAtom, id);
    return (
      <Provider store={store}>
        <div className="group flex items-center gap-3 p-3">{Story()}</div>
      </Provider>
    );
  };
}

const meta = {
  title: "Shared/PinToggle",
  component: PinToggle,
  parameters: { layout: "centered" },
  args: { entityId: "e1", title: "Juan Carlos Abella" },
} satisfies Meta<typeof PinToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { decorators: [withCase([])] };

export const AllStates: Story = {
  decorators: [withCase(["e3"])],
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="w-24 text-xs text-ink-tertiary">Not pinned</span>
        <PinToggle entityId="e1" title="Juan Carlos Abella" />
        <PinToggle entityId="e1" title="Juan Carlos Abella" variant="label" />
      </div>
      <div className="flex items-center gap-3">
        <span className="w-24 text-xs text-ink-tertiary">Pinned</span>
        <PinToggle entityId="e3" title="Abella v. Argentina" />
        <PinToggle entityId="e3" title="Abella v. Argentina" variant="label" />
      </div>
    </div>
  ),
};
