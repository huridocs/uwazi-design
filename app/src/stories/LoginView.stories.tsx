import type { Meta, StoryObj } from "@storybook/react-vite";
import { Provider, createStore } from "jotai";
import { LoginView } from "../views/LoginView";
import { loginNoticeAtom, loginStartModeAtom } from "../atoms/auth";

/** The login screen and its modes. The art is one of six, chosen per page
 *  load. Resize below 768px for the phone layout (the art becomes a band above
 *  the form) and flip the toolbar theme: the art dims slightly in dark.
 *  Log in as admin / uwazi for the two-step verification step (code 246810). */
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

/** The screen as a finished flow leaves it: a note in the message line. */
export const WithNotice: Story = {
  decorators: [
    (S) => {
      const store = createStore();
      store.set(loginNoticeAtom, { tone: "note", text: "Your password is saved. Log in with it." });
      return (
        <Provider store={store}>
          <S />
        </Provider>
      );
    },
  ],
};

/** Forgot password: one email field and the same answer for any address. */
export const ForgotPassword: Story = {
  decorators: [
    (S) => {
      const store = createStore();
      store.set(loginStartModeAtom, "forgot");
      return (
        <Provider store={store}>
          <S />
        </Provider>
      );
    },
  ],
};
