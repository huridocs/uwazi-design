import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoginView } from "../views/LoginView";

/** The login screen. The art is one of six, chosen per page load. Resize
 *  below 768px for the phone layout (the art becomes a band above the form)
 *  and flip the toolbar theme: the art dims slightly in dark. */
const meta = {
  title: "Screens/LoginView",
  component: LoginView,
  parameters: { layout: "fullscreen" },
  args: { onLoggedIn: () => {} },
  render: (args) => (
    <div className="h-screen">
      <LoginView {...args} />
    </div>
  ),
} satisfies Meta<typeof LoginView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
