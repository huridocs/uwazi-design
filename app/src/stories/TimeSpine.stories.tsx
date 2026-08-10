import type { Meta, StoryObj } from "@storybook/react-vite";
import { TimeSpine, SpineDate, type SpineRow } from "../components/library/TimeSpine";

/** The proportional chronology — ONE geometry, rendered by the Library's
 *  Timeline (Spine layout) and by its Results view.
 *
 *  It owns everything that must be identical between them and would otherwise
 *  drift on the next edit: the axis inset, the adaptive scale, the year marks,
 *  the elided silences, the collision push, the cluster marks and the leaders
 *  back to the true instant. Callers pass rows and what a row SAYS — never where
 *  it sits.
 *
 *  The two things to look at here are the two that dense data breaks:
 *   - **clusters** — entries whose marks would fuse share one capsule and one
 *     brace, instead of a bead of overlapping dots and a fan of identical curves;
 *   - **elided silences** — the "N later" label reads at the START of the row
 *     columns, clear of the column every row ends with and clear of the leader
 *     gutter it used to cross. */
// Typed, not `satisfies`: the component is generic over the row item, so there
// is no single args shape a story could be driven by. Every story renders.
const meta: Meta<typeof TimeSpine> = {
  title: "Library/TimeSpine",
  component: TimeSpine,
  parameters: { layout: "padded" },
};

export default meta;

interface Item {
  title: string;
  kind: string;
  color: string;
}

const CARMINE = "#B4472F";
const OLIVE = "#7A8B3C";
const CARBON = "#2563EB";

/** Rows in the shape both spines build them: a key, an instant, an item. */
const row = (date: string, title: string, kind: string, color: string): SpineRow<Item> => ({
  key: `${date}-${title}`,
  t: Date.parse(date),
  item: { title, kind, color },
});

/** One line, laid out the way both real callers lay it out: colour square, date
 *  gutter, title, and a trailing label — the column an elision label must stay
 *  out of.
 *
 *  The trailing label is `ink-tertiary` here. Both callers ship it as
 *  `ink-muted`, which at 10px is small text at 3.94:1 — under AA on parchment,
 *  and worse in dark, where muted is the darker of the two. The row body is the
 *  CALLER's to style, so this story shows the step it should take rather than
 *  reproducing the miss. */
const renderRow = (item: Item, { t }: { t: number }) => (
  <div className="flex items-center gap-2 h-[22px] px-2 rounded-md hover:bg-parchment transition-colors">
    <span className="shrink-0 w-1.5 h-1.5 rounded-[2px]" style={{ backgroundColor: item.color }} />
    <SpineDate t={t} />
    <span className="flex-1 min-w-0 truncate text-xs text-ink-secondary">{item.title}</span>
    <span className="shrink-0 text-[10px] text-ink-tertiary">{item.kind}</span>
  </div>
);

const frame = (rows: SpineRow<Item>[], selected?: string) => (
  <div className="w-[46rem] max-w-full">
    <TimeSpine
      rows={rows}
      dotColor={(i) => i.color}
      dotActive={(i) => i.title === selected}
      renderRow={renderRow}
    />
  </div>
);

type Story = StoryObj<typeof meta>;

/** Entries spread far enough apart that every one keeps its own mark and its own
 *  leader. This is the case the layout was designed around. */
export const Default: Story = {
  render: () =>
    frame([
      row("1986-04-24", "Velásquez Rodríguez", "Case", CARMINE),
      row("1987-06-26", "Sentencia de 26 de junio de 1987", "Judgment", OLIVE),
      row("1988-01-15", "Resolución de 15 de enero de 1988", "Resolution", CARBON),
      row("1988-07-29", "Sentencia de 29 de julio de 1988", "Judgment", OLIVE),
      row("1989-07-21", "Sentencia de 21 de julio de 1989", "Judgment", OLIVE),
    ]),
};

/** Thirteen documents filed on ONE day. The marks would land on top of each
 *  other, so they become a single capsule — a circle, because the instants are
 *  identical — and one brace down to the thirteen rows. */
export const Clustered: Story = {
  render: () =>
    frame([
      row("1998-01-09", "Cesti Hurtado", "Case", CARMINE),
      ...Array.from({ length: 13 }, (_, i) =>
        row("1998-06-19", `Resolución de 19 de junio de 1998 · ${i + 1}`, "Document", CARBON),
      ),
      row("1998-11-24", "Blake. Sentencia de 24 de noviembre", "Judgment", OLIVE),
    ]),
};

/** The same crowd spread across a fortnight instead of a single day. The capsule
 *  grows to exactly that span — the mark is measured, so a busy fortnight can't
 *  be mistaken for a busy afternoon — and the members no longer agree on a
 *  colour, so it goes neutral rather than picking a winner. */
export const ClusteredMixed: Story = {
  render: () =>
    frame([
      row("2019-05-14", "Comunidad Garífuna Trujillo", "Case", CARMINE),
      row("2019-05-24", "Buzos Miskitos. Informe de Fondo", "Report", OLIVE),
      row("2019-05-24", "Buzos Miskitos. Nota de envío", "Document", CARBON),
      row("2019-05-25", "Buzos Miskitos. Audiencia", "Hearing", CARMINE),
      row("2019-05-27", "Kawas Fernández. Resolución", "Resolution", CARBON),
      row("2019-05-28", "Deras García. Informe Nº 158/19", "Report", OLIVE),
      row("2020-03-09", "López Lone. Resolución de la CorteIDH", "Resolution", CARBON),
    ]),
};

/** A member of a cluster, selected. It surfaces from the capsule in its own
 *  colour at its own instant — the one thing a neutral group mark would
 *  otherwise swallow. */
export const ClusteredSelected: Story = {
  render: () =>
    frame(
      [
        row("2019-05-24", "Buzos Miskitos. Informe de Fondo", "Report", OLIVE),
        row("2019-05-24", "Buzos Miskitos. Nota de envío", "Document", CARBON),
        row("2019-05-25", "Buzos Miskitos. Audiencia", "Hearing", CARMINE),
        row("2019-05-28", "Deras García. Informe Nº 158/19", "Report", OLIVE),
      ],
      "Buzos Miskitos. Audiencia",
    ),
};

/** Long silences between dense bursts. Anything longer than the axis will spend
 *  on emptiness collapses to a labelled break — the phrase at the start of the
 *  row columns, the rule running toward the axis and stopping short of the
 *  leader gutter, which is where the next row's leader comes down. */
export const Elided: Story = {
  render: () =>
    frame([
      row("1986-04-24", "Velásquez Rodríguez", "Case", CARMINE),
      row("1986-04-24", "Godínez Cruz", "Case", CARMINE),
      row("1986-04-24", "Fairén Garbi y Solís Corrales", "Case", CARMINE),
      row("1987-06-26", "Sentencia de 26 de junio de 1987", "Judgment", OLIVE),
      row("1995-08-05", "Blake", "Case", CARMINE),
      row("1995-09-22", "Blake. Resolución de 22 de septiembre", "Resolution", CARBON),
      row("2008-02-04", "Servellón García. Supervisión", "Resolution", CARBON),
    ]),
};

/** One row. The axis still anchors itself with a mark and a date, so a single
 *  result doesn't read as a broken chart. */
export const Minimal: Story = {
  render: () => frame([row("2011-02-24", "Gelman Vs. Uruguay. Sentencia", "Judgment", OLIVE)]),
};

/** No rows at all. The spine draws NOTHING rather than an axis anchored to the
 *  epoch — a lone "1970" against an empty rail reads as a corpus dated 1970. The
 *  words belong to the caller, which is why one is shown here beside it. */
export const Empty: Story = {
  render: () => (
    <div className="w-[46rem] max-w-full">
      {frame([])}
      <p className="text-center text-xs text-ink-tertiary">
        None of these results carries a date, so there is no axis to place them on.
      </p>
    </div>
  ),
};
