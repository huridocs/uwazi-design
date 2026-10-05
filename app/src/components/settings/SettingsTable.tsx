import type { HTMLAttributes, ReactNode } from "react";
import { useAtomValue } from "jotai";
import { CloudOff } from "lucide-react";
import { DataTable, type Column } from "../shared/DataTable";
import { breakpointAtom } from "../../atoms/viewport";
import { settingsCorpusErrorAtom, useSettingsCorpusLoading } from "../../hooks/useSettingsCorpus";
import { useAnnounceLoading } from "./SettingsContent";
import { SettingsEmptyState } from "./SettingsEmptyState";

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
  const { columns, data, getRowId, onRowClick, rowAriaLabel, selectedId, rowProps, corpusScoped = false } = props;
  const phone = useAtomValue(breakpointAtom) === "mobile";
  // Travesía's lists arrive with its data; a failed load is reported by the
  // Settings shell (`SettingsCorpusError`), which holds the retry.
  const lazy = useSettingsCorpusLoading();
  const failed = !!useAtomValue(settingsCorpusErrorAtom);
  const waiting = corpusScoped && data.length === 0 && lazy;
  const loading = waiting && !failed;
  const pageAnnounces = useAnnounceLoading(loading);

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
  if (phone) return <SettingsList {...props} emptyState={emptyState} />;

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
    />
  );
}

/** The phone layout. A clickable row follows the app's row pattern: a
 *  stretched invisible button is its primary action, and the content sits
 *  above it so a row's own controls (a delete) stay reachable. */
function SettingsList<T>({ columns, data, getRowId, onRowClick, rowAriaLabel, selectedId, emptyState, rowProps }: SettingsTableProps<T>) {
  const slotted = columns.map((col, i) => ({ col, slot: slotOf(col, i) }));
  const primary = slotted.filter((c) => c.slot === "primary");
  const meta = slotted.filter((c) => c.slot === "meta");
  const actions = slotted.filter((c) => c.slot === "actions");

  return (
    <div
      data-component="SettingsTable"
      data-layout="list"
      className="rounded-md bg-paper overflow-hidden"
      style={{ boxShadow: CARD_SHADOW }}
    >
      {data.length === 0 ? (
        <div data-part="empty" className="px-4 py-10 text-center text-xs text-ink-muted">
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
                } ${selected ? "bg-parchment" : "hover:bg-warm"} ${extraClass ?? ""}`}
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
