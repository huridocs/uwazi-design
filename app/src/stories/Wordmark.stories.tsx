import type { Meta, StoryObj } from "@storybook/react-vite";
import { Wordmark } from "../components/shared/Wordmark";

/** The Uwazi wordmark at the navbar's size. `.logo-img` inverts it in dark
 *  mode (flip the toolbar theme). */
const meta = {
  title: "Shared/Wordmark",
  component: Wordmark,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Wordmark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
