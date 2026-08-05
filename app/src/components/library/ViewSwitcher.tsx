import { Select } from "../shared/Select";

/** The Library's view switcher, folded into the same dropdown Sort and Language
 *  use so the toolbar reads as three of one control instead of two dropdowns
 *  flanking a segmented widget.
 *
 *  It is the compact end of a trade that has been round the houses. Five
 *  segments hold a fixed 156px whatever they show; one trigger holds the widest
 *  label once, and names the active view into the bargain — which bare icons
 *  never did. What it costs is the one-click switch: every view is still
 *  reachable, but through a menu.
 *
 *  `steady` is the part that makes it viable at all. Without it the trigger
 *  resizes with its value (measured on the Sort dropdown, which shares this
 *  component: 65.45px on "Title", 112.67px on "Connections"), and this row is
 *  Sort · View · Display · Language — anything that resizes shoves every control
 *  beside it sideways the moment you switch view. */
const VIEWS = [
  { value: "cards", label: "Cards" },
  { value: "list", label: "List" },
  { value: "map", label: "Map" },
  { value: "timeline", label: "Timeline" },
  // Always listed, query or not — the view renders its own "search to see where
  // terms match" state rather than appearing and disappearing from the menu.
  { value: "results", label: "Results" },
];

export function ViewSwitcher({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <Select
      value={value}
      options={VIEWS}
      onChange={onChange}
      ariaLabel="View"
      triggerPrefix="View:"
      steady
    />
  );
}
