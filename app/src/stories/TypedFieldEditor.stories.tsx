import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { TypedFieldEditor } from "../components/metadata/TypedFieldEditors";
import type { MetadataField } from "../data/metadata";

/** The editors for the property types with their own value shape: numeric,
 *  generated id, date list, date range, range list, link, place and image.
 *  Each writes its typed value and recomputes `value`. */
const meta = {
  title: "Metadata/TypedFieldEditor",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const INPUT =
  "w-full px-3 py-2 text-sm text-ink bg-paper rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40";

function Editor({ initial }: { initial: MetadataField }) {
  const [field, setField] = useState(initial);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`f-${field.id}`} className="text-xs font-medium text-ink-secondary">
        {field.label}
      </label>
      <TypedFieldEditor
        field={field}
        inputId={`f-${field.id}`}
        inputClass={INPUT}
        onPatch={(patch) => setField((f) => ({ ...f, ...patch }))}
        images={[{ id: "img1", name: "portrait.jpg", url: "artwork-images/1601708883168xwrh429c67.jpg" }]}
      />
      <span className="text-meta text-ink-tertiary">value: {field.value || "—"}</span>
    </div>
  );
}

const F = (id: string, label: string, propertyType: MetadataField["propertyType"], extra: Partial<MetadataField> = {}): MetadataField => ({
  id,
  label,
  type: "text",
  value: "",
  propertyType,
  ...extra,
});

export const AllStates: Story = {
  render: () => (
    <div className="grid gap-5 max-w-xl">
      <Editor initial={F("count", "Paintings in the dataset", "numeric", { value: "12" })} />
      <Editor initial={F("gid", "Reference", "generatedid", { value: "K3J9QX2A" })} />
      <Editor initial={F("dates", "Hearings", "multidate", { dates: ["12/05/2010", "03/11/2011"], value: "12/05/2010 · 03/11/2011", list: true })} />
      <Editor initial={F("range", "Mandate", "daterange", { ranges: [{ from: "01/02/2003", to: "" }], value: "01/02/2003 –" })} />
      <Editor initial={F("ranges", "Provisional measures", "multidaterange", { ranges: [{ from: "01/02/2003", to: "15/06/2004" }], value: "01/02/2003 – 15/06/2004", list: true })} />
      <Editor initial={F("link", "Wikipedia", "link", { value: "https://en.wikipedia.org/wiki/Inter-American_Court_of_Human_Rights", link: { label: "Inter-American Court", url: "https://en.wikipedia.org/wiki/Inter-American_Court_of_Human_Rights" } })} />
      <Editor initial={F("place", "Location", "geolocation", { geo: { lat: -34.6, lon: -58.38, label: "Buenos Aires" }, value: "Buenos Aires" })} />
      <Editor initial={F("image", "Image", "image")} />
    </div>
  ),
};
