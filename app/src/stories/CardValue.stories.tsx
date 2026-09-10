import type { Meta, StoryObj } from "@storybook/react-vite";
import { CardValue } from "../components/library/CardValue";
import type { EntityScalarField } from "../utils/entityFields";

/** ONE renderer for a property's value on a Library surface, switching on the
 *  property's KIND.
 *
 *  Before it, every value was a string in a truncating span whatever it was: a
 *  set of twelve terms printed its first label and "+11 more", and a date range
 *  printed nothing at all. Two things are worth looking at here — that a set is
 *  drawn as a set and stays on ONE line however many members it has, and that
 *  `compact` (the list row's middot line) falls back to running text, because a
 *  chip row inside a middot-separated sentence reads as neither. */
const meta: Meta<typeof CardValue> = {
  title: "Library/CardValue",
  component: CardValue,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof CardValue>;

const field = (f: Partial<EntityScalarField>): EntityScalarField => ({
  id: "f",
  label: "Property",
  value: "",
  ...f,
});

/** The width a card column actually gives a value, so the clipping is real. */
function Slot({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-[18rem] rounded-md border border-border/60 bg-paper p-3">
      <span className="block text-meta text-ink-tertiary leading-tight">Property</span>
      <span className="flex items-baseline gap-1 min-w-0 text-xs text-ink leading-snug">
        {children}
      </span>
    </div>
  );
}

export const Text: Story = {
  args: {
    query: "",
    field: field({ kind: "text", label: "Estado", value: "Activo" }),
  },
  render: (args) => (
    <Slot>
      <CardValue {...args} />
    </Slot>
  ),
};

export const Chips: Story = {
  args: {
    query: "",
    field: field({
      kind: "chips",
      label: "Tipo",
      value: "Medidas Provisionales",
      values: ["Medidas Provisionales", "Supervisión de cumplimiento", "Fondo", "Reparaciones"],
      more: 6,
    }),
  },
  render: (args) => (
    <Slot>
      <CardValue {...args} />
    </Slot>
  ),
};

export const DateSpan: Story = {
  args: {
    query: "",
    field: field({ kind: "dateSpan", label: "Mandatos", value: "1980–1985" }),
  },
  render: (args) => (
    <Slot>
      <CardValue {...args} />
    </Slot>
  ),
};

export const Place: Story = {
  args: {
    query: "",
    field: field({
      kind: "place",
      label: "Ubicación geográfica",
      value: `13° 41' 22" N, 89° 11' 14" W`,
    }),
  },
  render: (args) => (
    <Slot>
      <CardValue {...args} />
    </Slot>
  ),
};

/** Every kind at once, and the point of the component: same slot, same line
 *  count, different drawings. */
export const AllKinds: Story = {
  args: { query: "", field: field({ kind: "text", value: "Activo" }) },
  render: (args) => (
    <div className="flex flex-col gap-2">
      {(
        [
          field({ kind: "text", value: "Activo" }),
          field({ kind: "select", value: "Otros" }),
          field({ kind: "date", value: "2021" }),
          field({ kind: "dateSpan", value: "1993–2002" }),
          field({ kind: "place", value: `13° 41' 22" N, 89° 11' 14" W` }),
          field({
            kind: "chips",
            value: "Fondo",
            values: ["Fondo", "Reparaciones", "Excepciones Preliminares", "Otros"],
            more: 5,
          }),
          field({
            kind: "long",
            value:
              "Los hechos del caso se refieren a la detención ilegal y arbitraria del señor Velásquez.",
          }),
        ] as EntityScalarField[]
      ).map((f, i) => (
        <Slot key={i}>
          <CardValue {...args} field={f} />
        </Slot>
      ))}
    </div>
  ),
};

/** The list row's line: running text, no chips, no marks. */
export const Compact: Story = {
  args: {
    query: "",
    compact: true,
    field: field({
      kind: "chips",
      value: "Medidas Provisionales",
      values: ["Medidas Provisionales", "Supervisión de cumplimiento"],
      more: 1,
    }),
  },
  render: (args) => (
    <div className="flex items-center gap-1.5 text-meta text-ink-tertiary w-[24rem]">
      <span className="shrink-0">Resolución</span>
      <span className="shrink-0 text-ink-muted">·</span>
      <CardValue {...args} />
    </div>
  ),
};
