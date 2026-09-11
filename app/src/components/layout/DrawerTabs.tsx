import { useState } from "react";
import { Select } from "../shared/Select";
import { useResizeWidth } from "../../hooks/useResizeWidth";
interface DrawerTab {
  id: string;
  label: string;
  /** **Inventory.** How many things live behind this tab — Relationships 10,
   *  Files 2, Users 14. It rides in the tab's FLOW, so it must be a number the
   *  tab always has: a count that appears on first use widens its tab and shoves
   *  every tab after it sideways, which is the layout-shift rule with a badge on
   *  it. If the quantity can be absent, it is not a count. */
  count?: number;
  /** **Live state, out of view.** Something the USER set is still in effect
   *  behind this tab — an active filter, a running query. Rendered only while the
   *  tab is NOT active (on the active tab you can see the state itself, and a
   *  marker restating it is duplication), and positioned absolutely, so it costs
   *  no flow width and can come and go without moving the strip.
   *
   *  Keep it rare. It means "there is something here you set and can't see"; the
   *  moment it marks inventory, presence or novelty, every dot stops meaning
   *  anything. */
  dot?: boolean;
}

interface DrawerTabsProps {
  tabs: DrawerTab[];
  activeId: string;
  onChange: (id: string) => void;
  /** Wrapper padding — defaults to the drawer's `px-3 py-2`. Pass e.g. `""`
   *  to render flush within a page body that owns its own padding. */
  className?: string;
}

/** The app's tab strip, carrying two different signals that answer two different
 *  questions:
 *
 *  | | `count` | `dot` |
 *  |---|---|---|
 *  | answers | "how much is in there?" | "is something I set still on?" |
 *  | source | the data | the user |
 *  | when | always, for tabs that have one | only while that tab is unselected |
 *  | where | in the flow, beside the label | absolute, outside the corner |
 *  | may appear later? | **no** — it would resize its tab | yes — it costs no width |
 *
 *  The dot is the same mark the Display menu uses (6px, carbon, `-top-0.5
 *  -end-0.5` on a `relative` trigger, logical `-end-` so it mirrors under RTL),
 *  because they say the same thing in the same visual language. */
export function DrawerTabs({ tabs, activeId, onChange, className = "px-3 py-2" }: DrawerTabsProps) {
  /* FOLDS INTO A SELECTOR WHEN IT DOES NOT FIT.
     It used to SCROLL — `overflow-x-auto` with the scrollbar hidden — so every
     tab stayed reachable but the strip read as cut, with nothing saying it
     scrolled. The entity drawer's five tabs are ~441px, which is why its drawer
     could not come down to the Library's 360.

     A hidden PROBE draws the strip at its natural width; the available width is
     the wrapper's own inner box, a block spanning the pane, so what is measured
     does not depend on what is rendered into it. When the probe is wider, the
     strip becomes the shared `Select`: counts ride the options as hints, a dot
     behind an unselected tab rides the trigger with a spoken suffix, and
     `steady` sizes the trigger from the widest label so it never changes width
     between tabs. */
  const [availW, setAvailW] = useState(0);
  const [naturalW, setNaturalW] = useState(0);
  const availRef = useResizeWidth(setAvailW);
  const probeRef = useResizeWidth(setNaturalW);
  const folded = availW > 0 && naturalW > 0 && naturalW > availW;
  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];
  const hiddenDot = tabs.some((t) => t.dot && t.id !== activeId);

  return (
    <div className={`${className} shrink-0 relative`}>
      <div ref={availRef} className="w-full min-w-0">
        {folded ? (
          <Select
            value={activeTab?.id ?? ""}
            onChange={onChange}
            ariaLabel="Section"
            ariaSuffix={hiddenDot ? "another section has active filters or search" : undefined}
            steady
            triggerIcon={
              hiddenDot ? (
                <span
                  aria-hidden="true"
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "var(--accent-blue)" }}
                />
              ) : undefined
            }
            options={tabs.map((tab) => ({
              value: tab.id,
              label: tab.label,
              hint: tab.count !== undefined ? tab.count.toLocaleString() : undefined,
              dot: tab.dot && tab.id !== activeId,
            }))}
          />
        ) : (
          <Strip tabs={tabs} activeId={activeId} onChange={onChange} />
        )}
      </div>
      {/* THE PROBE — same renderer, laid out and never painted. `visibility:
          hidden`, not `display: none`, because a box that is not laid out has no
          width to measure; absolutely positioned, so it costs no layout. */}
      <div
        ref={probeRef}
        aria-hidden
        className="pointer-events-none absolute -z-10 w-max"
        style={{ visibility: "hidden", top: 0, insetInlineStart: 0 }}
      >
        <Strip tabs={tabs} activeId={activeId} onChange={onChange} probe />
      </div>
    </div>
  );
}

/** The strip, drawn once for real and once to be measured. ONE renderer for
 *  both — a second copy would drift and the fold would decide on a strip that
 *  no longer exists. */
function Strip({
  tabs,
  activeId,
  onChange,
  probe = false,
}: {
  tabs: DrawerTab[];
  activeId: string;
  onChange: (id: string) => void;
  probe?: boolean;
}) {
  return (
    /* No `overflow-hidden` here: it would clip the dots, which sit just outside
       their tab's corner. The end tabs round themselves logically instead, so the
       strip still reads as one frame under RTL. */
    <div
      className="flex items-stretch rounded-md w-fit"
      role={probe ? undefined : "tablist"}
      style={{ border: "1px solid var(--border-primary)" }}
    >
      {tabs.map((tab, i) => {
        const active = activeId === tab.id;
        return (
          <div key={tab.id} className="flex items-stretch">
            {i > 0 && <div className="w-px self-stretch bg-border" aria-hidden="true" />}
            <button
              role={probe ? undefined : "tab"}
              tabIndex={probe ? -1 : undefined}
              aria-selected={probe ? undefined : active}
              onClick={probe ? undefined : () => onChange(tab.id)}
              className={`relative flex items-center justify-center gap-1 w-full px-3 py-1.5 text-tab font-medium transition-colors ${
                i === 0 ? "rounded-s-md" : ""
              } ${i === tabs.length - 1 ? "rounded-e-md" : ""} ${
                active ? "bg-vellum text-ink" : "bg-paper text-ink-tertiary hover:text-ink-secondary"
              }`}
            >
              <span className="truncate">{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-xs font-semibold text-ink-tertiary bg-warm px-1 rounded shrink-0 tabular-nums">
                  {tab.count.toLocaleString()}
                </span>
              )}
              {/* Decorative — the state it points at is announced by the panel
                  it belongs to, so nothing depends on seeing it. */}
              {tab.dot && !active && (
                <span
                  aria-hidden="true"
                  className="absolute -top-0.5 -end-0.5 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: "var(--accent-blue)" }}
                />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
