import type { Meta, StoryObj } from "@storybook/react-vite";
import { SetPasswordView } from "../views/auth/SetPasswordView";

/** Set or reset a password from an emailed link. Save with the key "expired"
 *  to see the page for a link that no longer works. */
const meta = {
  title: "Screens/SetPasswordView",
  component: SetPasswordView,
  parameters: { layout: "fullscreen" },
  args: { linkKey: "expired", createAccount: false },
  render: (args) => (
    <div className="h-screen">
      <SetPasswordView {...args} />
    </div>
  ),
} satisfies Meta<typeof SetPasswordView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** From the welcome email: the note asking for a password. */
export const CreateAccount: Story = { args: { createAccount: true } };
