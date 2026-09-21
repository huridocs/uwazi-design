import type { Meta, StoryObj } from "@storybook/react-vite";
import { BulkFieldRow } from "../components/metadata/BulkFieldRow";
import { ThesaurusPicker } from "../components/metadata/ThesaurusPicker";
import { seedThesaurusValues } from "../data/settings";

/** One property in the bulk edit form. The label row says whether the
 *  selected entities agree (shared), differ (mixed, with how many values), or
 *  are about to be changed (will change, with Revert). The row is always
 *  mounted, so the state moves nothing. */
const meta = {
  title: "Metadata/BulkFieldRow",
  component: BulkFieldRow,
  parameters: { layout: "padded" },
  args: { label: "Case number", state: "shared", onRevert: () => {}, children: null },
  decorators: [(Story) => <div className="max-w-md">{Story()}</div>],
} satisfies Meta<typeof BulkFieldRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const input = "w-full px-3 py-2 text-sm text-ink bg-paper rounded-md border border-border placeholder:text-ink-muted";

export const Default: Story = {
  args: {
    htmlFor: "story-bulk-shared",
    children: <input id="story-bulk-shared" className={input} defaultValue="10.488" />,
  },
};

/** Shared, mixed and will-change, text and thesaurus, side by side. */
export const AllStates: Story = {
  render: () => (
    <div className="space-y-4">
      <BulkFieldRow label="Court" htmlFor="story-bulk-a" state="shared" onRevert={() => {}}>
        <input id="story-bulk-a" className={input} defaultValue="Inter-American Court" />
      </BulkFieldRow>
      <BulkFieldRow label="Case number" htmlFor="story-bulk-b" state="mixed" distinct={4} onRevert={() => {}}>
        <input id="story-bulk-b" className={input} placeholder="Mixed" />
      </BulkFieldRow>
      <BulkFieldRow label="Status" state="changed" onRevert={() => {}}>
        <ThesaurusPicker label="Status" values={seedThesaurusValues.t3} multiple={false} chosen={["Archived"]} onToggle={() => {}} />
      </BulkFieldRow>
      <BulkFieldRow label="Legal instruments" state="mixed" onRevert={() => {}}>
        <ThesaurusPicker
          label="Legal instruments"
          values={seedThesaurusValues.t2}
          multiple
          chosen={["American Convention on Human Rights"]}
          mixed={["ICCPR"]}
          coverage={{ counts: { "American Convention on Human Rights": 12, ICCPR: 4 }, of: 12 }}
          onToggle={() => {}}
        />
      </BulkFieldRow>
    </div>
  ),
};
