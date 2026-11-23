import type { Meta, StoryObj } from "@storybook/react-vite";
import { ColorFieldDemo } from "../views/catalog/collectionDemos";

/** A colour value as a control: a swatch with its hex, opening a panel with
 *  swatches (one may be marked as suggested), the system colour picker and a
 *  hex field. Settings › Theme and branding uses one per colour. */
const meta = {
  title: "Shared/ColorField",
  component: ColorFieldDemo,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ColorFieldDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Swatches, with the suggested one marked. */
export const Default: Story = {};
/** No swatches: the system picker and the hex field only. */
export const Minimal: Story = { args: { swatches: false, suggested: false } };
export const Disabled: Story = { args: { disabled: true } };
