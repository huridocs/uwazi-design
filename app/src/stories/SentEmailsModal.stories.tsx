import type { Meta, StoryObj } from "@storybook/react-vite";
import { SentEmailsModal } from "../components/auth/SentEmailsModal";

/** Prototype-only: the emails Uwazi would have sent this session. Opens on
 *  the seed's two (an invitation and a lock). */
const meta = {
  title: "Auth/SentEmailsModal",
  component: SentEmailsModal,
  args: { open: true, onClose: () => {} },
} satisfies Meta<typeof SentEmailsModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
