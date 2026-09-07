import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { MultiLanguageField } from "../components/metadata/MultiLanguageField";
import { LANGUAGES, type Language } from "../atoms/language";

/** A field's other languages, edited in place.
 *
 *  The summary row is the whole point of the design: it is ALWAYS mounted, at a
 *  fixed height, so a field that turns out to have two empty translations says
 *  so without pushing the next field down the page. Open it and the rows appear
 *  — a disclosure the reader asked for.
 *
 *  Auto-translate fills EMPTY languages only, streaming each value in. A row
 *  filled that way is marked `Auto` until a human types in it; re-translating a
 *  row that already has a value is a per-row action, so the overwrite is always
 *  aimed at a named language. */
function Harness({
  initial,
  machine = {},
}: {
  initial: Record<Language, string>;
  machine?: Partial<Record<Language, boolean>>;
}) {
  const [values, setValues] = useState(initial);
  const [mt, setMt] = useState(machine);
  return (
    <div className="max-w-3xl space-y-1.5">
      <label htmlFor="story-title" className="text-xs font-medium text-ink-secondary">
        Title*
      </label>
      <textarea
        id="story-title"
        rows={2}
        value={values.EN}
        onChange={(e) => setValues((p) => ({ ...p, EN: e.target.value }))}
        className="w-full px-3 py-2 text-sm text-ink bg-paper rounded-md border border-border
          resize-none focus:outline-none focus:ring-2 focus:ring-carbon/20"
      />
      <MultiLanguageField
        label="Title"
        idPrefix="story-title"
        languages={LANGUAGES}
        current="EN"
        values={values}
        machine={mt}
        onChange={(lang, value, machineWritten = false) => {
          setValues((p) => ({ ...p, [lang]: value }));
          setMt((p) => ({ ...p, [lang]: machineWritten }));
        }}
        authored={TITLES}
      />
      <div className="pt-2 text-meta text-ink-muted">
        Everything below this line stays put whether the panel is open or shut.
      </div>
    </div>
  );
}

// Typed against the harness, not the component: the control is only meaningful
// with a parent holding the values it writes back, so every story renders one.
const meta = {
  title: "Metadata/MultiLanguageField",
  component: Harness,
  parameters: { layout: "padded" },
} satisfies Meta<typeof Harness>;

export default meta;
type Story = StoryObj<typeof meta>;

const TITLES = {
  EN: "Inter-American Court of Human Rights — Judgment of July 29, 1988",
  ES: "Corte Interamericana de Derechos Humanos — Sentencia de 29 de julio de 1988",
  FR: "Cour interaméricaine des droits de l'homme — Arrêt du 29 juillet 1988",
  AR: "محكمة البلدان الأمريكية لحقوق الإنسان — حكم 29 يوليو 1988",
};

/** Every language already written. Auto-translate is disabled — there is
 *  nothing empty to fill, and the header button never overwrites. */
export const Default: Story = { args: { initial: TITLES } };

/** Two languages missing. The summary counts them and the button turns on. */
export const Empty: Story = { args: { initial: { ...TITLES, FR: "", AR: "" } } };

/** After a translation: the machine-written rows carry the `Auto` marker and a
 *  carbon border until someone edits them. */
export const MachineTranslated: Story = {
  args: { initial: TITLES, machine: { FR: true, AR: true } },
};

/** The empty case with nothing to translate FROM — the button explains itself
 *  through its title rather than vanishing. */
export const Minimal: Story = { args: { initial: { EN: "", ES: "", FR: "", AR: "" } } };
