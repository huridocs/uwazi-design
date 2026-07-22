import { useState, type ReactNode } from "react";
import { useAtom, useAtomValue } from "jotai";
import { SlidersHorizontal } from "lucide-react";
import {
  viewAtom,
  groupByAtom,
  subGroupByAtom,
  sortOrderAtom,
  zoomAtom,
  DEFAULT_GROUP_BY,
  DEFAULT_SUB_GROUP_BY,
  DEFAULT_SORT_ORDER,
  DEFAULT_ZOOM,
  type GroupBy,
  type SortOrder,
} from "../../atoms/filters";
import { groupingOptions } from "../../utils/connectionGrouping";
import { Select } from "../shared/Select";
import { ZoomControl } from "./ZoomControl";

const SORTS: { id: SortOrder; label: string }[] = [
  { id: "appearance", label: "Appearance" },
  { id: "asc", label: "A → Z" },
  { id: "desc", label: "Z → A" },
  { id: "none", label: "None" },
];

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-1.5 py-1">
      <span className="text-[11px] font-medium text-ink-secondary shrink-0">{label}</span>
      {children}
    </div>
  );
}

/** How the connections are ARRANGED — grouping, sort, density — behind one
 *  icon-only trigger, matching the Library's Display menu.
 *
 *  These four controls used to sit open in the toolbar: "Group by: None",
 *  "Then by: None", "Sort: Appearance" and a 3-button density switch, plus the
 *  view segmented and Filters — six controls across a second row, most of them
 *  reading "None". They're refinements you set once, not things you steer with;
 *  spending the widest row in the panel on them (and shoving the rest sideways
 *  as they appear and disappear per view) is backwards.
 *
 *  Inside a popover they can also be HONEST about relevance — "Then by" only
 *  exists once you've grouped, density only where rows have density — without
 *  costing the toolbar a pixel of shift. The trigger carries a dot when anything
 *  is off its default, so a collapsed control is never a hidden one. */
export function DisplayMenu({ size = "md" }: { size?: "sm" | "md" }) {
  const view = useAtomValue(viewAtom);
  const [groupBy, setGroupBy] = useAtom(groupByAtom);
  const [subGroupBy, setSubGroupBy] = useAtom(subGroupByAtom);
  const [sortOrder, setSortOrder] = useAtom(sortOrderAtom);
  const zoom = useAtomValue(zoomAtom);
  const [open, setOpen] = useState(false);

  const isGraph = view === "graph";
  const grouped = groupBy !== "none";
  const showThenBy = grouped && !isGraph;
  const showDensity = !isGraph;

  // "Off its DEFAULT", not "off some notional zero". `groupBy` starts at
  // `relation-type`, so testing `grouped` (i.e. `!== "none"`) lit the dot on
  // every fresh panel — advertising a change the menu couldn't show, because
  // opening it revealed nothing but the defaults. Each term is also gated by
  // the same condition that RENDERS its row, so the dot never points at a
  // control this view mode hides.
  const modified =
    groupBy !== DEFAULT_GROUP_BY ||
    (showThenBy && subGroupBy !== DEFAULT_SUB_GROUP_BY) ||
    sortOrder !== DEFAULT_SORT_ORDER ||
    (showDensity && zoom !== DEFAULT_ZOOM);

  const box = size === "sm" ? "w-6 h-6" : "w-8 h-8";

  // "None" plus every axis not already spoken for on the other level — the two
  // levels can't group by the same thing.
  const groupOptions = (exclude: GroupBy) =>
    groupingOptions
      .filter((o) => o.id === "none" || o.id !== exclude)
      .map((o) => ({ value: o.id, label: o.label }));

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Display options"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`relative inline-flex items-center justify-center ${box} rounded-md transition-colors cursor-pointer ${
          open || modified
            ? "bg-vellum text-ink"
            : "bg-warm text-ink-secondary hover:bg-parchment hover:text-ink"
        }`}
      >
        <SlidersHorizontal size={size === "sm" ? 12 : 14} />
        {modified && (
          <span
            className="absolute -top-0.5 -end-0.5 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "var(--accent-blue)" }}
          />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" aria-hidden onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute end-0 mt-1 z-40 w-[17rem] rounded-md bg-paper p-1.5 animate-fade-in-up"
            style={{ border: "1px solid var(--border-primary)", boxShadow: "0 6px 18px rgba(0,0,0,0.12)" }}
          >
            <Row label="Group by">
              <Select
                value={groupBy}
                onChange={(v) => {
                  setGroupBy(v as GroupBy);
                  if (v === subGroupBy) setSubGroupBy("none");
                }}
                ariaLabel="Group by"
                align="end"
                options={groupOptions(subGroupBy)}
              />
            </Row>

            {showThenBy && (
              <Row label="Then by">
                <Select
                  value={subGroupBy}
                  onChange={(v) => setSubGroupBy(v as GroupBy)}
                  ariaLabel="Then by"
                  align="end"
                  options={groupOptions(groupBy)}
                />
              </Row>
            )}

            <Row label="Sort">
              <Select
                value={sortOrder}
                onChange={(v) => setSortOrder(v as SortOrder)}
                ariaLabel="Sort"
                align="end"
                options={SORTS.map((s) => ({ value: s.id, label: s.label }))}
              />
            </Row>

            {showDensity && (
              <Row label="Density">
                <ZoomControl size="sm" />
              </Row>
            )}
          </div>
        </>
      )}
    </div>
  );
}
