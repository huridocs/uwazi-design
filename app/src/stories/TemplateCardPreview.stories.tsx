import type { Meta, StoryObj } from "@storybook/react-vite";
import { TemplateCardPreview } from "../components/settings/TemplateCardPreview";
import type { PropertyDef } from "../data/templates/types";
import { seedThesaurusValues } from "../data/settings";

/** Settings → Template editor's live card preview: the REAL Library EntityCard
 *  rendered over a demo entity derived from the template being edited (name →
 *  type pill, colour → dot, Show in cards properties → plausible demo values).
 *  The wrapper is inert + aria-hidden — a picture, not a control. */

const properties: PropertyDef[] = [
  { id: "p1", name: "case_number", label: "Case number", type: "text", required: true, filter: true, showInCard: true },
  { id: "p2", name: "date_filed", label: "Date filed", type: "date", required: true, filter: true, showInCard: true },
  { id: "p3", name: "status", label: "Status", type: "select", content: "t3", filter: true, showInCard: true },
];

const manyProperties: PropertyDef[] = [
  ...properties,
  { id: "p4", name: "respondent", label: "Respondent state", type: "relationship", filter: true, showInCard: true },
  { id: "p5", name: "summary", label: "Summary", type: "markdown" },
  { id: "p6", name: "location", label: "Location", type: "geolocation", showInCard: true },
  { id: "p7", name: "paragraphs", label: "Paragraphs", type: "numeric", showInCard: true },
];

const valuesOf = (id: string) => seedThesaurusValues[id];

const meta = {
  title: "Settings/TemplateCardPreview",
  component: TemplateCardPreview,
  parameters: { layout: "padded" },
} satisfies Meta<typeof TemplateCardPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { name: "Court Case", color: "#0891B2", properties, valuesOf },
};

export const Empty: Story = {
  args: { name: "", color: "#C03B22", properties: [], valuesOf },
};

export const ManyFields: Story = {
  args: { name: "Judgment", color: "#7C3AED", properties: manyProperties, valuesOf, highlight: "p2" },
};
