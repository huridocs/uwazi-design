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

/* The drawing's marks, all in the header's text colour: the logo solid, the
   app's navigation at half strength, menu links as short bars (the current
   one solid over its rule), utilities fainter. */
const fill = { backgroundColor: "currentColor" };
const Logo = ({ small = false }: { small?: boolean }) => (
  <span className={`${small ? "h-1 w-4" : "h-1.5 w-5"} shrink-0 rounded-[1px]`} style={fill} />
);
const Nav = ({ wide = false }: { wide?: boolean }) => (
  <span className={`h-1.5 ${wide ? "w-4" : "w-3"} shrink-0 rounded-[1px] opacity-50`} style={fill} />
);
const Utility = () => <span className="h-1.5 w-2.5 shrink-0 rounded-[1px] opacity-30" style={fill} />;
const Icon = () => <span className="h-1.5 w-1.5 shrink-0 rounded-[1px] opacity-30" style={fill} />;
/** The collection's menu: the first link is the current page. */
const Links = ({ small = false }: { small?: boolean }) => (
  <span className="flex items-center gap-[3px] shrink-0">
    {[0, 1, 2, 3].map((i) => (
      <span key={i} className="relative flex">
        <span className={`h-0.5 ${small ? "w-1.5" : "w-2"} rounded-[1px] ${i === 0 ? "" : "opacity-55"}`} style={fill} />
        {i === 0 && <span className="absolute inset-x-0 top-[3px] h-px" style={fill} />}
      </span>
    ))}
  </span>
);
/** The end of the bar, the same in every layout. */
const Utilities = () => (
  <Group end>
    <Utility />
    <Utility />
    <Icon />
  </Group>
);
const Group = ({ children, end = false }: { children: ReactNode; end?: boolean }) => (
  <span className={`flex items-center gap-1 min-w-0 ${end ? "justify-end" : ""}`}>{children}</span>
);

function Thumb({ id, colors }: { id: HeaderLayout; colors: HeaderLayoutColors }) {
  const bar: CSSProperties = { backgroundColor: colors.bar, color: colors.text, borderColor: colors.separator };
  const row = "relative flex items-center justify-between gap-1 px-1.5";
  return (
    <span aria-hidden className="flex flex-col h-14 overflow-hidden rounded-md border border-border-soft" style={{ backgroundColor: colors.page }}>
      {id === "standard" && (
        <span className={`${row} h-4 border-b`} style={bar}>
          <Group>
            <Logo />
            <Nav wide />
            <Nav />
          </Group>
          <Utilities />
        </span>
      )}
      {id === "menu-centred" && (
        <span className={`${row} h-4 border-b`} style={bar}>
          <Logo />
          {/* On the bar's centre, whatever the two sides measure. */}
          <span className="absolute inset-0 flex items-center justify-center">
            <Links />
          </span>
          <Utilities />
        </span>
      )}
      {id === "menu-end" && (
        <span className={`${row} h-4 border-b`} style={bar}>
          <Logo />
          <span className="flex items-center gap-1.5">
            <Links />
            <Utilities />
          </span>
        </span>
      )}
      {id === "compact" && (
        <span className={`${row} h-2.5 border-b`} style={bar}>
          <span className="flex items-center gap-1.5">
            <Logo small />
            <Links small />
          </span>
          <Utilities />
        </span>
      )}
    </span>
  );
}
