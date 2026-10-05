import { useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { SettingsContent } from "./SettingsContent";
import { SettingsButton } from "./SettingsButton";
import { ModalSearchField } from "../shared/ModalParts";
import { SettingsSelectionBar, type SettingsSelection } from "./SettingsSelectionBar";

/** A list's search: the query and the rows it keeps. Matching is a
 *  case-insensitive substring over the text `textOf` returns for a row.
 *
 *  Not memoised: every caller passes a freshly filtered array and an inline
 *  `textOf`, and a memo keyed on the rows alone would go stale for a
 *  `textOf` that reads outside data (a group-name map). Settings lists are
 *  short; a long editor filters its own rows. */
export function useSettingsSearch<T>(rows: T[], textOf: (row: T) => string) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = q ? rows.filter((r) => textOf(r).toLowerCase().includes(q)) : rows;
  return { query, setQuery, rows: filtered, clear: () => setQuery("") };
}

/** The first line of a page body: what the page is for, in one place on
 *  every page. */
export function SettingsIntro({ children }: { children: ReactNode }) {
  return (
    <p data-part="intro" className="max-w-[40rem] text-xs text-ink-tertiary text-pretty mb-3">
      {children}
    </p>
  );
}

/** The row above a settings list: search on the start side, filters on the
 *  end side. Always mounted at one height, so a page with no filters lines
 *  up with one that has them, and wraps on a phone with the search first. */
export function SettingsToolbar({
  search,
  filters,
}: {
  search?: { value: string; onChange: (value: string) => void; label: string; placeholder?: string };
  filters?: ReactNode;
}) {
  return (
    <div data-component="SettingsToolbar" role={search ? "search" : undefined} className="flex flex-wrap items-center gap-2 min-h-8 mb-3">
      {search && (
        <div className="flex flex-1 min-w-[12rem] max-w-md">
          <ModalSearchField
            value={search.value}
            onChange={search.onChange}
            ariaLabel={search.label}
            placeholder={search.placeholder ?? `${search.label}…`}
          />
        </div>
      )}
      {filters && <div className="flex flex-wrap items-center gap-2 ms-auto">{filters}</div>}
    </div>
  );
}

/** The shell every Settings list page is built on:
 *
 *    Header (title, mobile back)
 *    Body:   intro line · tabs · toolbar (search, filters) · the table
 *    Footer: the lead create action (`BAR_LEAD`), then any secondary actions;
 *            while rows are ticked, the selection bar in their place
 *
 *  The table is `children`, usually a `SettingsTable` whose `emptyState` is a
 *  `SettingsEmptyState`. Dialogs the page opens go in `overlays`. */
export function SettingsListPage({
  component,
  title,
  intro,
  tabs,
  search,
  filters,
  lead,
  footer,
  selection,
  overlays,
  children,
}: {
  component: string;
  title: string;
  intro?: ReactNode;
  /** In-page tabs (`DrawerTabs`), above the toolbar. */
  tabs?: ReactNode;
  search?: { value: string; onChange: (value: string) => void; label: string; placeholder?: string };
  filters?: ReactNode;
  /** The create action on the start of the footer ("Add template"). */
  lead?: { label: string; onClick: () => void; icon?: ReactNode };
  /** Further footer actions, after the lead. */
  footer?: ReactNode;
  /** Bulk actions over ticked rows (`SettingsTable`'s `selection`). While
   *  `count` is above zero the footer shows `SettingsSelectionBar` in place
   *  of the lead and `footer`. */
  selection?: SettingsSelection;
  overlays?: ReactNode;
  children: ReactNode;
}) {
  const selecting = !!selection && selection.count > 0;
  return (
    <SettingsContent component={component}>
      <SettingsContent.Header title={title} />
      <SettingsContent.Body>
        {intro && <SettingsIntro>{intro}</SettingsIntro>}
        {tabs && <div className="mb-3">{tabs}</div>}
        <SettingsToolbar search={search} filters={filters} />
        {children}
      </SettingsContent.Body>
      {(lead || footer || selection) && (
        <SettingsContent.Footer>
          {selecting && selection ? (
            <SettingsSelectionBar {...selection} />
          ) : (
            <>
          {lead && (
            <SettingsButton
              variant="lead"
              size="sm"
              className="me-auto"
              icon={lead.icon ?? <Plus size={14} aria-hidden />}
              onClick={lead.onClick}
            >
              {lead.label}
            </SettingsButton>
          )}
          {footer}
            </>
          )}
        </SettingsContent.Footer>
      )}
      {overlays}
    </SettingsContent>
  );
}
