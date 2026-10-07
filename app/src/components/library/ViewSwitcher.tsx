import { Select } from "../shared/Select";
import { LIBRARY_VIEWS, OVERVIEW_VIEW } from "../../data/libraryDisplay";

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
// The list is `LIBRARY_VIEWS`, which the Display menu's View section reads when
// this select folds into it. Overview, the collection's landing page, leads
// where it is offered (Drawer and Full width, not Split's panes).
const VIEWS = [
  { value: OVERVIEW_VIEW.id, label: OVERVIEW_VIEW.label },
  ...LIBRARY_VIEWS.map((v) => ({ value: v.id, label: v.label })),
];


export function ViewSwitcher({
  value,
  onChange,
  evidence = true,
  sync = false,
  overview = false,
}: {
  value: string;
  onChange: (id: string) => void;
  /** Whether to list Evidence. */
  evidence?: boolean;
  /** Whether to list Sync. */
  sync?: boolean;
  /** Whether to list Overview. */
  overview?: boolean;
}) {
  const options = VIEWS.filter(
    (v) => (v.value !== "evidence" || evidence) && (v.value !== "sync" || sync) && (v.value !== "overview" || overview),
  );
  return (
    <Select
      value={value}
      options={options}
      onChange={onChange}
      ariaLabel="View"
      sheetTitle="View"
      steady
    />
  );
}
