import type { Meta, StoryObj } from "@storybook/react-vite";
import { ProgressBar } from "../components/shared/ProgressBar";
import { AlertBanner } from "../components/shared/AlertBanner";

/** Status feedback primitives: the semantic-tinted progress bar (import flows)
 *  and the warning/error alert banner (role="alert"). */

function FeedbackSheet() {
  return (
    <div className="max-w-md space-y-6 bg-paper border border-border rounded-lg p-5">
      <div className="space-y-3">
        <ProgressBar value={72} color="blue" />
        <ProgressBar value={100} color="green" />
        <ProgressBar value={38} color="red" />
        <ProgressBar value={0} color="gray" />
      </div>
      <div className="space-y-2">
        <AlertBanner variant="warning">
          3 rows were truncated to 255 characters during import.
        </AlertBanner>
        <AlertBanner variant="error">
          The import failed — the template no longer exists.
        </AlertBanner>
      </div>
    </div>
  );
}

const meta = {
  title: "Shared/Feedback",
  component: FeedbackSheet,
  parameters: { layout: "padded" },
} satisfies Meta<typeof FeedbackSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ProgressAndAlerts: Story = {};
