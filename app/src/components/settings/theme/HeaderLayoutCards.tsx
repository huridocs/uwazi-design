import type { CSSProperties, ReactNode } from "react";
import { Check } from "lucide-react";
import { HEADER_LAYOUTS, type HeaderLayout } from "../../../utils/theme/headerLayout";

/** The header's colours as the theme being edited paints them. */
export interface HeaderLayoutColors {
  bar: string;
  text: string;
  separator: string;
  page: string;
}

/** The four header layouts as cards, chosen like the presets: each draws its
 *  bar in the theme's header colours over a strip of page, and the chosen one
 *  carries the check. Local to Theme and branding: the drawings are of this
 *  app's bar and mean nothing elsewhere. */
export function HeaderLayoutCards({
  selected,
  colors,
  onSelect,
}: {
  selected: HeaderLayout;
  colors: HeaderLayoutColors;
  onSelect: (id: HeaderLayout) => void;
}) {
  return (
    <ul data-part="header-layouts" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {HEADER_LAYOUTS.map((layout) => {
        const on = layout.id === selected;
        return (
          <li key={layout.id} className="flex min-w-0">
            <button
              type="button"
              aria-pressed={on}
              title={layout.description}
              data-layout={layout.id}
              onClick={() => onSelect(layout.id)}
              className={`flex-1 min-w-0 flex flex-col gap-2 p-2 rounded-lg border text-start cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30 ${
                on ? "bg-parchment border-border-soft" : "bg-paper border-border hover:bg-warm"
              }`}
            >
              <Thumb id={layout.id} colors={colors} />
              <span className="flex items-center gap-1.5 min-w-0">
                <span className="sm:truncate flex-1 min-w-0 text-xs font-medium leading-tight text-ink">{layout.label}</span>
                {/* Always in the row, so the label does not move on selection. */}
                <Check size={14} aria-hidden className={`shrink-0 text-ink ${on ? "" : "invisible"}`} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* The drawing's marks, all in the header's text colour: the logo solid,
   navigation at half strength, utilities fainter. */
const Logo = ({ small = false }: { small?: boolean }) => (
  <span className={`${small ? "h-1 w-4" : "h-1.5 w-5"} shrink-0 rounded-[1px]`} style={{ backgroundColor: "currentColor" }} />
);
const Nav = ({ wide = false }: { wide?: boolean }) => (
  <span className={`h-1.5 ${wide ? "w-4" : "w-3"} shrink-0 rounded-[1px] opacity-50`} style={{ backgroundColor: "currentColor" }} />
);
const Utility = () => <span className="h-1.5 w-2.5 shrink-0 rounded-[1px] opacity-30" style={{ backgroundColor: "currentColor" }} />;
const Icon = () => <span className="h-1.5 w-1.5 shrink-0 rounded-[1px] opacity-30" style={{ backgroundColor: "currentColor" }} />;
const Group = ({ children, end = false }: { children: ReactNode; end?: boolean }) => (
  <span className={`flex items-center gap-1 min-w-0 ${end ? "justify-end" : ""}`}>{children}</span>
);

function Thumb({ id, colors }: { id: HeaderLayout; colors: HeaderLayoutColors }) {
  const bar: CSSProperties = { backgroundColor: colors.bar, color: colors.text, borderColor: colors.separator };
  const row = "flex items-center justify-between gap-1 px-1.5";
  return (
    <span aria-hidden className="flex flex-col h-14 overflow-hidden rounded-md border border-border-soft" style={{ backgroundColor: colors.page }}>
      {id === "standard" && (
        <span className={`${row} h-4 border-b`} style={bar}>
          <Group>
            <Logo />
            <Nav wide />
            <Nav />
          </Group>
          <Group end>
            <Utility />
            <Utility />
            <Icon />
          </Group>
        </span>
      )}
      {id === "centred" && (
        <span className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 px-1.5 h-4 border-b" style={bar}>
          <Group>
            <Nav wide />
            <Nav />
          </Group>
          <Logo />
          <Group end>
            <Utility />
            <Utility />
            <Icon />
          </Group>
        </span>
      )}
      {id === "two-rows" && (
        <span className="flex flex-col border-b" style={bar}>
          <span className={`${row} h-4`}>
            <Group>
              <Logo />
              <Nav wide />
            </Group>
            <Group end>
              <Utility />
              <Utility />
              <Icon />
            </Group>
          </span>
          <span className="flex items-center gap-1 px-1.5 h-3 border-t" style={{ borderColor: colors.separator }}>
            <Nav />
            <Nav />
            <Nav wide />
          </span>
        </span>
      )}
      {id === "compact" && (
        <span className={`${row} h-2.5 border-b`} style={bar}>
          <Group>
            <Logo small />
            <Nav wide />
            <Nav />
          </Group>
          <Group end>
            <Icon />
            <Icon />
            <Icon />
            <Icon />
          </Group>
        </span>
      )}
    </span>
  );
}
