import type { HTMLAttributes, ReactNode } from "react";
import { useAtomValue } from "jotai";
import { CloudOff } from "lucide-react";
import { DataTable, type Column, type SortDir } from "../shared/DataTable";
import { breakpointAtom } from "../../atoms/viewport";
import { settingsCorpusErrorAtom, useSettingsCorpusLoading } from "../../hooks/useSettingsCorpus";
import { useAnnounceLoading } from "./SettingsContent";
import { slowLoadingAtom } from "../../atoms/devSwitches";
import { SettingsEmptyState } from "./SettingsEmptyState";
import { Checkbox } from "../shared/Checkbox";
import { Hint } from "../shared/Hint";

export type { Column };

interface SettingsTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Accessible name of a clickable row's primary-action button ("Edit Case").
   *  Pass it with `onRowClick`; without it every row is announced "Open row". */
  rowAriaLabel?: (row: T) => string;
  selectedId?: string | null;
  emptyState?: React.ReactNode;
  /** The rows belong to the active corpus (templates, thesauri, menu…), so
   *  while its lazy data loads the table shows loading rows, and an error
   *  if the load fails. Global tables (users, API keys, the
   *  activity log) leave it off and show their empty state. */
  corpusScoped?: boolean;
  rowProps?: (row: T, index: number) => HTMLAttributes<HTMLTableRowElement>;
  /** Row checkboxes for bulk actions (UX2). The header box covers the rows
   *  shown; the page's footer shows `SettingsSelectionBar` while any are
   *  ticked. */
  selection?: RowSelection<T>;
  /** Controlled column sort (`DataTable`'s): the page sorts its rows. */
  sort?: { key: string; dir: SortDir };
  onSort?: (key: string) => void;
}

export interface RowSelection<T> {
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
  /** The row's name, for its checkbox ("Select admin"). */
  label: (row: T) => string;
  /** Why a row cannot be ticked, if it cannot (the default template). Its box
   *  stays focusable and says why on hover and focus; Select all skips it. */
  disabledReason?: (row: T) => string | undefined;
}

/** The checkbox column `selection` adds. Ticking a box never opens the row:
 *  the click stops at the cell. */
function selectColumn<T>(sel: RowSelection<T>, data: T[], getRowId: (row: T) => string): Column<T> {
  const ids = data.filter((r) => !sel.disabledReason?.(r)).map(getRowId);
  const ticked = ids.filter((id) => sel.selected.has(id)).length;
  const all = ids.length > 0 && ticked === ids.length;
  const toggleAll = () => {
    const next = new Set(sel.selected);
    for (const id of ids) (all ? next.delete(id) : next.add(id));
    sel.onChange(next);
  };
  return {
    id: "select",
    width: "1.25rem",
    mobile: "hidden",
    header: (
      <Hint text={all ? "Deselect all shown" : `Select all ${ids.length.toLocaleString()} shown`} describe={false}>
        {(hint) => (
          <span {...hint} data-part="select" className="inline-flex normal-case">
            <Checkbox
              checked={all}
              indeterminate={ticked > 0 && !all}
              disabled={ids.length === 0}
              onChange={toggleAll}
              ariaLabel="Select all"
            />
          </span>
        )}
      </Hint>
    ),
    cell: (row) => <RowCheckbox sel={sel} row={row} id={getRowId(row)} />,
  };
}

function RowCheckbox<T>({ sel, row, id }: { sel: RowSelection<T>; row: T; id: string }) {
  const reason = sel.disabledReason?.(row);
  if (reason)
    return (
      <span data-part="select" className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
        <Hint text={reason}>
          {(hint) => (
            // aria-disabled, not disabled: a disabled box cannot take focus,
            // and the reason must be readable from the keyboard too.
            <input
              {...hint}
              type="checkbox"
              data-component="Checkbox"
              checked={false}
              aria-disabled="true"
              aria-label={`Select ${sel.label(row)}`}
              onChange={() => {}}
              onClick={(e) => e.preventDefault()}
              className="w-3.5 h-3.5 rounded shrink-0 accent-ink opacity-40 cursor-not-allowed"
            />
          )}
        </Hint>
      </span>
    );
  return (
    <span data-part="select" className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      <Checkbox
        checked={sel.selected.has(id)}
        onChange={() => {
          const next = new Set(sel.selected);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          sel.onChange(next);
        }}
        ariaLabel={`Select ${sel.label(row)}`}
      />
    </span>
  );
}

const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)";

/** Where a column goes in the phone list: the first column is the title, a
 *  column named `actions` trails the row, the rest are its meta line. A column
 *  overrides this with `mobile`. */
function slotOf<T>(col: Column<T>, index: number): NonNullable<Column<T>["mobile"]> {
  if (col.mobile) return col.mobile;
  if (index === 0) return "primary";
  if (col.id === "actions") return "actions";
  return "meta";
}

/** Settings list table — the shared `DataTable` (entity-view Files style) with
 *  a rem-based min-width so wide settings tables scroll horizontally on narrow
 *  panes instead of squishing. Kept as a thin wrapper so the many settings
 *  pages import `{ SettingsTable, Column }` from here.
 *
 *  Below `md` the same columns render as a list: one row per record with its
 *  title, a meta line of labelled values and the row's actions, so nothing
 *  sits off-screen behind a sideways scroll.
 *
 *  A `corpusScoped` table shows placeholder rows, not its empty state, while
 *  the active corpus's Settings data loads, and says so if the load fails
 *  (the shell's banner has the retry). */
export function SettingsTable<T>(props: SettingsTableProps<T>) {
  const { columns: given, data, getRowId, onRowClick, rowAriaLabel, selectedId, rowProps, corpusScoped = false } = props;
  const phone = useAtomValue(breakpointAtom) === "mobile";
  // Travesía's lists arrive with its data; a failed load is reported by the
  // Settings shell (`SettingsCorpusError`), which holds the retry.
  const lazy = useSettingsCorpusLoading();
  const failed = !!useAtomValue(settingsCorpusErrorAtom);
  // The Dev panel's slow load holds even a filled table as loading.
  const slow = useAtomValue(slowLoadingAtom);
  const waiting = corpusScoped && (slow || (data.length === 0 && lazy));
  const loading = waiting && !failed;
  const pageAnnounces = useAnnounceLoading(loading);
  const columns = props.selection ? [selectColumn(props.selection, data, getRowId), ...given] : given;

  if (loading) return <LoadingRows columns={columns} phone={phone} announce={!pageAnnounces} />;
  const emptyState =
    waiting && failed ? (
      <SettingsEmptyState
        icon={<CloudOff size={16} />}
        title="This collection's settings didn't load"
        hint="Check the connection, then use Try again above."
      />
    ) : (
      props.emptyState
    );
  if (phone) return <SettingsList {...props} columns={given} emptyState={emptyState} />;

  // Flexible columns counted at a ~9rem floor, + gaps + padding.
  const minWidthRem =
    columns.reduce((sum, c) => {
      const rem = c.width && c.width.endsWith("rem") ? parseFloat(c.width) : NaN;
      return sum + (Number.isNaN(rem) ? 9 : rem);
    }, 0) +
    (columns.length - 1) * 0.75 +
    2;

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={getRowId}
      onRowClick={onRowClick}
      rowAriaLabel={rowAriaLabel}
      isRowSelected={selectedId != null ? (row) => getRowId(row) === selectedId : undefined}
      emptyState={emptyState}
      minWidthRem={minWidthRem}
      rowProps={rowProps}
      sort={props.sort}
      onSort={props.onSort}
    />
  );
}

/** The phone layout. A clickable row follows the app's row pattern: a
 *  stretched invisible button is its primary action, and the content sits
 *  above it so a row's own controls (a delete) stay reachable. */
function SettingsList<T>({ columns, data, getRowId, onRowClick, rowAriaLabel, selectedId, emptyState, rowProps, selection }: SettingsTableProps<T>) {
  const slotted = columns.map((col, i) => ({ col, slot: slotOf(col, i) }));
  const primary = slotted.filter((c) => c.slot === "primary");
  const meta = slotted.filter((c) => c.slot === "meta");
  const actions = slotted.filter((c) => c.slot === "actions");
  const ticked = (id: string) => !!selection?.selected.has(id);

  return (
    <div
      data-component="SettingsTable"
      data-table
      data-layout="list"
      className="rounded-md bg-paper overflow-hidden"
      style={{ boxShadow: CARD_SHADOW }}
    >
      {data.length === 0 ? (
        <div data-part="empty" className="px-4 py-10 text-center text-xs text-ink-tertiary">
          {emptyState ?? "Nothing here yet."}
        </div>
      ) : (
        <ul data-part="body">
          {data.map((row, i) => {
            const id = getRowId(row);
            const selected = selectedId != null && id === selectedId;
            const { className: extraClass, style: extraStyle, ...extra } =
              (rowProps?.(row, i) ?? {}) as HTMLAttributes<HTMLElement>;
            return (
              <li
                key={id}
                {...(extra as HTMLAttributes<HTMLLIElement>)}
                data-part="row"
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`group relative flex items-center gap-3 px-4 py-2.5 min-h-11 text-sm border-b border-border last:border-b-0 transition-colors ${
                  onRowClick ? "cursor-pointer" : ""
                } ${selected || ticked(id) ? "bg-parchment" : "hover:bg-warm"} ${extraClass ?? ""}`}
                style={extraStyle}
              >
                {onRowClick && (
                  <button
                    type="button"
                    aria-pressed={selected}
                    aria-label={rowAriaLabel?.(row) ?? "Open row"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRowClick(row);
                    }}
                    data-part="primary-action"
                    className="absolute inset-0 w-full cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20"
                  />
                )}
                {selection && <RowCheckbox sel={selection} row={row} id={id} />}
                <div className="relative min-w-0 flex-1 flex flex-col gap-1">
                  {primary.map(({ col }) => (
                    <div key={col.id} data-part="primary" className="min-w-0 text-ink">
                      {col.cell(row, i)}
                    </div>
                  ))}
                  {meta.length > 0 && (
                    <dl data-part="meta" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-secondary">
                      {meta.map(({ col }) => (
                        <div key={col.id} className="flex items-center gap-1.5 min-w-0">
                          {col.header ? (
                            <dt className="text-meta text-ink-tertiary">{col.header}</dt>
                          ) : null}
                          <dd className="min-w-0 flex items-center">{col.cell(row, i)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
                {actions.length > 0 && (
                  <div data-part="actions" className="relative shrink-0 flex items-center gap-1">
                    {actions.map(({ col }) => (
                      <div key={col.id} className="flex items-center">
                        {col.cell(row, i)}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Placeholder rows at the table's row height, in the table's card, while the
 *  data is on its way. The bars are hidden from assistive tech. */
function LoadingRows<T>({ columns, phone, announce }: { columns: Column<T>[]; phone: boolean; announce: boolean }) {
  const widths = ["w-2/5", "w-1/3", "w-1/2", "w-1/4"];
  const bar = (w: string): ReactNode => <span className={`block h-2.5 rounded-sm bg-vellum ${w}`} />;
  return (
    <div
      data-component="SettingsTable"
      data-table
      data-state="loading"
      aria-busy="true"
      className="rounded-md bg-paper overflow-hidden"
      style={{ boxShadow: CARD_SHADOW }}
    >
      {/* Inside a page, the page's one live region says it. */}
      {announce && (
        <p role="status" className="sr-only">
          Loading…
        </p>
      )}
      {!phone && (
        <div
          aria-hidden
          className="grid items-center gap-3 px-4 h-10 text-meta font-semibold text-ink-tertiary uppercase tracking-wider"
          style={{
            gridTemplateColumns: columns.map((c) => c.width ?? "1fr").join(" "),
            backgroundColor: "var(--bg-warm)",
            borderBottom: "1px solid var(--border-primary)",
          }}
        >
          {columns.map((c) => (
            <span key={c.id} className="min-w-0 truncate">
              {c.header}
            </span>
          ))}
        </div>
      )}
      <div aria-hidden className="motion-safe:animate-pulse">
        {widths.map((w, i) => (
          <div key={i} className="flex items-center gap-3 px-4 h-11 border-b border-border last:border-b-0">
            {bar(w)}
          </div>
        ))}
      </div>
    </div>
  );
}
