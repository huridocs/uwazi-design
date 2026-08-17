import type { Meta, StoryObj } from "@storybook/react-vite";
import { ThesaurusValueLabel } from "../components/shared/ThesaurusValueLabel";

/** A thesaurus-backed value with its group as quiet context. Uwazi thesauri
 *  nest exactly one level — a value can live inside a group — and a child
 *  label alone ("Caribbean") loses that hierarchy everywhere the full
 *  checklist isn't visible. The treatment: group in tertiary ink, a muted ›,
 *  then the child in whatever the host row already styles.
 *
 *  The group resolves by label against every known thesaurus, so this wraps
 *  ANY value cell: top-level values and free text pass through untouched.
 *  Entity cards, the metadata record and inherited-value tags all render
 *  nested values through this one component. */
const meta = {
  title: "Shared/ThesaurusValueLabel",
  component: ThesaurusValueLabel,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ThesaurusValueLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A top-level (or free-text) value: no group resolves, so it renders exactly
 *  as the host row would have rendered it — the wrapper costs nothing. */
export const Default: Story = {
  args: { value: "Forced displacement" },
  render: (args) => (
    <span className="text-sm font-medium text-ink">
      <ThesaurusValueLabel {...args} />
    </span>
  ),
};

/** A nested child value: its group leads in quiet tertiary ink. "Central
 *  America" resolves against the seed Regions thesaurus; the explicit `parent`
 *  rows show the same treatment without a lookup. */
export const Nested: Story = {
  args: { value: "Central America" },
  render: () => (
    <div className="flex flex-col gap-2 text-sm font-medium text-ink">
      <ThesaurusValueLabel value="Central America" />
      <ThesaurusValueLabel value="Torture" />
      <ThesaurusValueLabel value="Honduras" parent="Americas" />
    </div>
  ),
};

/** The treatment inside its real hosts: a card field row (label over value,
 *  one truncating line) and a narrow column, where the child keeps priority
 *  and the ellipsis lands on it, not the group. */
export const AllStates: Story = {
  args: { value: "Central America" },
  render: () => (
    <div className="flex flex-col gap-4 max-w-xs">
      <div className="min-w-0">
        <span className="block text-meta text-ink-tertiary leading-tight">Region</span>
        <span className="flex items-baseline gap-1 min-w-0 text-xs text-ink leading-snug">
          <span className="truncate">
            <ThesaurusValueLabel value="Central America" />
          </span>
        </span>
      </div>
      <div className="min-w-0 w-40">
        <span className="block text-meta text-ink-tertiary leading-tight">Truncation</span>
        <span className="block truncate text-xs text-ink leading-snug">
          <ThesaurusValueLabel value="South America" />
        </span>
      </div>
    </div>
  ),
};
