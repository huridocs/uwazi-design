import type { Meta, StoryObj } from "@storybook/react-vite";
import { FieldMessage, issueBorderClass } from "../components/shared/FieldMessage";
import type { ValidationIssue } from "../utils/validation";

/** The ONE per-field validation line — both the entity metadata edit form and
 *  the settings forms speak through it, so an error reads the same everywhere:
 *  seal message + seal-tinted input border for errors (block save), amber pair
 *  for warnings (save allowed). Severities come from `utils/validation`.
 *
 *  `reserve` keeps the line mounted at its height while empty so a message
 *  landing on blur never shoves the fields below it. No `role="alert"` here —
 *  the save-attempt summary is the alert; inputs point at this line with
 *  `aria-describedby` and carry `aria-invalid` on errors. */
const meta = {
  title: "Shared/FieldMessage",
  component: FieldMessage,
  parameters: { layout: "padded" },
} satisfies Meta<typeof FieldMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

const errorIssue: ValidationIssue = { severity: "error", message: "Title is required." };
const warningIssue: ValidationIssue = {
  severity: "warning",
  message: "Date filed is more than a year in the future.",
};

/** Empty but reserved — the resting state under a clean input. */
export const Default: Story = {
  args: { issue: null, hint: "Shown when there is nothing to complain about.", reserve: true },
};

export const Error: Story = {
  args: { issue: errorIssue, reserve: true },
};

export const Warning: Story = {
  args: { issue: warningIssue, reserve: true },
};

/** The full idiom on real inputs: message + matching border tint via
 *  `issueBorderClass`, with every slot reserved so severities toggling
 *  cannot shift the column. */
export const Mixed: Story = {
  args: { issue: null },
  render: () => (
    <div className="max-w-sm space-y-3">
      {(
        [
          { label: "Title", value: "", issue: errorIssue },
          { label: "Date filed", value: "2031-01-01", issue: warningIssue },
          { label: "Country", value: "Honduras", issue: null },
        ] as const
      ).map(({ label, value, issue }) => (
        <div key={label} className="space-y-1.5">
          <label className="text-sm font-bold text-ink">{label}</label>
          <input
            type="text"
            defaultValue={value}
            aria-invalid={issue?.severity === "error" || undefined}
            className={`w-full px-3 py-2 text-sm text-ink bg-paper border ${issueBorderClass(issue)} rounded-md
              focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40`}
          />
          <FieldMessage issue={issue} reserve />
        </div>
      ))}
    </div>
  ),
};
