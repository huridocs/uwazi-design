import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CopyFieldRow } from "../components/metadata/CopyFieldRow";
import { CopyFromPicker } from "../components/metadata/CopyFromPicker";
import { entities } from "../data/entities";
import { CopyPreviewSection } from "../components/metadata/CopyPreviewSection";
import type { CopyMatch, CopyPlan } from "../utils/copyFrom";

/** Copy From stages metadata off another entity into an open edit form. Two
 *  pieces carry the interaction: the preview (what would and would NOT come
 *  across, with a reason for every rejection) and the per-field row (incoming
 *  beside current, individually deselectable). Neither writes anything. */
const meta = {
  title: "Metadata/CopyFrom",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const match = (over: Partial<CopyMatch> = {}): CopyMatch => ({
  id: "region",
  label: "Region",
  type: "text",
  copies: "value",
  sourceValue: "South America",
  targetValue: "North America",
  emptyOnSource: false,
  unchanged: false,
  ...over,
});

function Row(props: { match: CopyMatch; initial?: boolean }) {
  const [checked, setChecked] = useState(props.initial ?? true);
  return <CopyFieldRow match={props.match} checked={checked} onChange={setChecked} />;
}

/** A plain overwrite: what is there, what would replace it. */
export const Default: Story = {
  render: () => (
    <div className="max-w-md">
      <Row match={match()} />
    </div>
  ),
};

/** Every row state at once — an overwrite, a copy that would CLEAR the field
 *  (defaulted off), one that changes nothing, a connection rather than a value,
 *  and an unchecked row. */
export const AllStates: Story = {
  render: () => (
    <div className="max-w-md space-y-1">
      <Row match={match()} />
      <Row match={match({ id: "b", label: "Ratified", sourceValue: "", emptyOnSource: true })} initial={false} />
      <Row match={match({ id: "c", label: "Accepts jurisdiction", sourceValue: "Yes", targetValue: "Yes", unchanged: true })} />
      <Row
        match={match({
          id: "d",
          label: "Signatories",
          type: "relationship",
          copies: "connection",
          sourceConnectedEntityIds: ["a", "b", "c"],
          targetConnectedEntityIds: ["a"],
        })}
      />
      <Row match={match({ id: "e", label: "Category", sourceValue: "Civil and political" })} initial={false} />
    </div>
  ),
};

const plan = (over: Partial<CopyPlan> = {}): CopyPlan => ({
  matches: [match(), match({ id: "b", label: "Ratified" })],
  skipped: [
    {
      id: "portrait",
      label: "Attachments",
      reason: "excluded-type",
      detail: "Files belong to the entity that holds them.",
      side: "both",
    },
    {
      id: "category",
      label: "Category",
      reason: "different-thesaurus",
      detail: "Both define Category, but they point at different vocabularies.",
      side: "both",
    },
    {
      id: "signed",
      label: "Signed by",
      reason: "different-inherit-spec",
      detail: "This one inherits Country; the field you are editing inherits Role.",
      side: "both",
    },
  ],
  matchCount: 2,
  ...over,
});

/** The preview: matches marked, near-misses greyed with the reason they were
 *  refused — the half Uwazi's version leaves blank. */
export const Preview: Story = {
  render: () => (
    <div className="max-w-md">
      <CopyPreviewSection plan={plan()} onUse={() => {}} onBack={() => {}} />
    </div>
  ),
};

/** A source with nothing to give still explains itself rather than showing an
 *  empty panel. */
export const Empty: Story = {
  render: () => (
    <div className="max-w-md">
      <CopyPreviewSection
        plan={plan({ matches: [], matchCount: 0 })}
        onUse={() => {}}
        onBack={() => {}}
      />
    </div>
  ),
};

/** The source picker.
 *
 *  Two things here answer Uwazi's version directly. It defaults to the target's
 *  OWN type — theirs searches the whole library by title with no filter, so
 *  editors routinely pick a source sharing zero properties and only find out
 *  after selecting it — with "Any type" beside it, because copying across types
 *  is a real thing to want. And every candidate is badged with how many fields
 *  it would actually bring across, before it is chosen; a source with nothing to
 *  give says so in the list rather than after two clicks and an empty preview.
 *
 *  Rendered here in a bounded box because it fills its positioned parent (in the
 *  app, the metadata pane). */
export const Picker: Story = {
  render: () => (
    <div className="relative h-[26rem] w-full max-w-2xl overflow-hidden rounded-lg bg-vellum">
      <CopyFromPicker
        target={entities.find((e) => e.typeId === "country") ?? entities[0]}
        onPreview={() => {}}
        onClose={() => {}}
      />
    </div>
  ),
};
