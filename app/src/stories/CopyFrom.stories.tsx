import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CopyFieldRow } from "../components/metadata/CopyFieldRow";
import { CopyFromPicker } from "../components/metadata/CopyFromPicker";
import { entities } from "../data/entities";
import { copyUnitsOneToOne, type CopyMatch } from "../utils/copyFrom";

/** Copy From writes metadata off another entity into an open edit form (never
 *  saves). One modal carries it in two steps: pick a source, then pick its
 *  properties — each a row of incoming beside current, deselectable, with the
 *  ones that won't copy listed with their reason. */
const meta = {
  title: "Metadata/CopyFrom",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const countries = entities.filter((e) => e.typeId === "country");
const countryA = countries[0] ?? entities[0];
const countryB = countries[1] ?? entities[1];

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

/** Every row state at once, which is the only way to see the thing that matters:
 *  the columns line up down the whole set. Label, current, arrow and incoming
 *  each sit at the same x in every row, so the set reads as a comparison rather
 *  than as five sentences.
 *
 *  Covers an ordinary overwrite, a value long enough to truncate, a copy that
 *  would CLEAR the field (defaulted off), one that changes nothing, a connection
 *  rather than a value, and an unchecked row. The note lines apply to some rows
 *  only — every row reserves the space either way, so nothing below them moves.
 */
export const AllStates: Story = {
  render: () => (
    <div className="max-w-lg rounded-md bg-paper p-2">
      {/* On bg-paper, like the edit pane: the checked tint is bg-parchment,
          which would be invisible against the preview's own parchment. */}
      <Row match={match()} />
      <Row
        match={match({
          id: "long",
          label: "Source instrument",
          targetValue: "American Convention on Human Rights",
          sourceValue:
            "Protocol of San Salvador — Additional Protocol to the American Convention on Human Rights in the Area of Economic, Social and Cultural Rights",
        })}
      />
      <Row
        match={match({ id: "b", label: "Ratified ACHR", sourceValue: "", emptyOnSource: true })}
        initial={false}
      />
      <Row
        match={match({
          id: "c",
          label: "Accepts jurisdiction",
          sourceValue: "Yes",
          targetValue: "Yes",
          unchanged: true,
        })}
      />
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
      <Row
        match={match({ id: "e", label: "Category", sourceValue: "Civil and political" })}
        initial={false}
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
        target={countryA}
        resolveUnits={copyUnitsOneToOne}
        onCopy={() => {}}
        onClose={() => {}}
      />
    </div>
  ),
};

/** Step 2, in the same panel at the same size: the chosen source's identity and
 *  Back, the matched properties as ticked rows (current struck, incoming beside
 *  it; a copy that would CLEAR a value starts unticked), select all/none, the
 *  properties that won't copy listed with the reason, and "Copy N properties". */
export const Properties: Story = {
  render: () => (
    <div className="relative h-[34rem] w-full max-w-2xl overflow-hidden rounded-lg bg-vellum">
      <CopyFromPicker
        target={countryA}
        initialSource={countryB}
        resolveUnits={copyUnitsOneToOne}
        onCopy={() => {}}
        onClose={() => {}}
      />
    </div>
  ),
};
