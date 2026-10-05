import { useMemo, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { SettingsContent } from "./SettingsContent";
import { SettingsButton } from "./SettingsButton";
import { ModalSearchField } from "../shared/ModalParts";

/** A list's search: the query and the rows it keeps. Matching is a
 *  case-insensitive substring over the text `textOf` returns for a row. */
export function useSettingsSearch<T>(rows: T[], textOf: (row: T) => string) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? rows.filter((r) => textOf(r).toLowerCase().includes(q)) : rows),
    // `textOf` is an inline arrow at every call site; the rows and query are
    // what change the result.
    [rows, q],
  );
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
 *    Footer: the lead create action (`BAR_LEAD`), then any secondary actions
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
  overlays?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SettingsContent component={component}>
      <SettingsContent.Header title={title} />
      <SettingsContent.Body>
        {intro && <SettingsIntro>{intro}</SettingsIntro>}
        {tabs && <div className="mb-3">{tabs}</div>}
        <SettingsToolbar search={search} filters={filters} />
        {children}
      </SettingsContent.Body>
      {(lead || footer) && (
        <SettingsContent.Footer>
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
        </SettingsContent.Footer>
      )}
      {overlays}
    </SettingsContent>
  );
}
