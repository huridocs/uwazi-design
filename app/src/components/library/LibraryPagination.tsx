import { Pager } from "../shared/Pager";
import { Select } from "../shared/Select";
import { LIBRARY_PAGE_SIZES, type LibraryPageSize } from "../../atoms/library";

const SIZE_OPTIONS = LIBRARY_PAGE_SIZES.map((n) => ({ value: String(n), label: `${n} per page` }));

/** The page group at the end of the Library's bottom bar, for Cards and List:
 *  the range of the filtered total this page shows ("31–60 of 4,398"), the
 *  page size, and the `Pager` the PDF viewer's bar draws. The total is the
 *  masthead readout's; this says which part of it is on screen.
 *
 *  Phones (`compact`) keep the stepper only, with chevrons and no field: the
 *  masthead has the total, and Display carries the page size. */
export function LibraryPagination({
  total,
  page,
  pageSize,
  onPage,
  onPageSize,
  compact = false,
  label = "Pages",
}: {
  total: number;
  page: number;
  pageSize: LibraryPageSize;
  onPage: (page: number) => void;
  onPageSize: (size: LibraryPageSize) => void;
  compact?: boolean;
  /** The group's accessible name ("Pages, left pane" in Split). */
  label?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const fmt = (n: number) => n.toLocaleString();
  const range = `${fmt(from)}–${fmt(to)} of ${fmt(total)}`;
  // The widest the range can read, laid in the same cell, so the slot keeps
  // its width from page to page and nothing beside it moves.
  const widest = `${fmt(total)}–${fmt(total)} of ${fmt(total)}`;
  return (
    <div data-component="LibraryPagination" className="shrink-0 flex items-center gap-3">
      {!compact && (
        <>
          <span data-part="range" className="grid text-xs text-ink-tertiary tabular-nums whitespace-nowrap">
            <bdi aria-hidden className="col-start-1 row-start-1 invisible">{widest}</bdi>
            <bdi role="status" className="col-start-1 row-start-1 text-end">{range}</bdi>
          </span>
          <Select
            value={String(pageSize)}
            options={SIZE_OPTIONS}
            onChange={(v) => onPageSize(Number(v) as LibraryPageSize)}
            ariaLabel="Results per page"
            variant="bar"
            placement="top"
            align="end"
            steady
          />
        </>
      )}
      <Pager page={page} pageCount={pageCount} onPage={onPage} compact={compact} editable={!compact} label={label} />
    </div>
  );
}
