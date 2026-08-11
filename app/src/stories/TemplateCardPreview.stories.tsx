import type { Meta, StoryObj } from "@storybook/react-vite";
import { TemplateCardPreview } from "../components/settings/TemplateCardPreview";
import type { TemplateProperty } from "../data/settings";

/** Settings → Template editor's live card preview: the REAL Library EntityCard
 *  rendered over a demo entity derived from the template being edited (name →
 *  type pill, colour → dot, properties → plausible demo values). The wrapper is
 *  inert + aria-hidden — a picture, not a control. */

const properties: TemplateProperty[] = [
  { id: "p1", label: "Case number", type: "text", required: true, filterable: true },
  { id: "p2", label: "Date filed", type: "date", required: true, filterable: true },
  { id: "p3", label: "Status", type: "select", required: false, filterable: true },
];

const manyProperties: TemplateProperty[] = [
  ...properties,
  { id: "p4", label: "Respondent state", type: "relationship", required: false, filterable: true },
  { id: "p5", label: "Summary", type: "markdown", required: false, filterable: false },
  { id: "p6", label: "Location", type: "geolocation", required: false, filterable: false },
  { id: "p7", label: "Paragraphs", type: "numeric", required: false, filterable: false },
];

const meta = {
  title: "Settings/TemplateCardPreview",
  component: TemplateCardPreview,
  parameters: { layout: "padded" },
} satisfies Meta<typeof TemplateCardPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "Court Case",
    color: "#0891B2",
    properties,
    config: { p3: { content: "Case status" } },
  },
};

export const Empty: Story = {
  args: {
    name: "",
    color: "#C03B22",
    properties: [],
  },
};

export const ManyFields: Story = {
  args: {
    name: "Judgment",
    color: "#7C3AED",
    properties: manyProperties,
  },
};
