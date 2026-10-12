import { Folio } from "../shared/Folio";
import { useFooterFold } from "./footerFold";
import { Select } from "../shared/Select";
import { LIBRARY_PAGE_SIZES, type LibraryPageSize } from "../../atoms/library";

const SIZE_OPTIONS = LIBRARY_PAGE_SIZES.map((n) => ({ value: String(n), label: `${n} per page` }));

/** The page group at the end of the Library's bottom bar, for Cards and List,
 *  as one line of caption type: the range of the filtered total this page
 *  shows ("31–60 of 4,398"), the page size, and the `Folio` stepper
 *  ("‹ 3 / 147 ›"). The total is the masthead readout's; this says which part
 *  of it is on screen.
 *
 *  As the bar folds (`footerFold.tsx`, after the actions lose their words)
 *  the page size shows its number only, then the range the total only, then
 *  the stepper stands alone. Each step keeps the range's full text for a
 *  screen reader while anything of it shows.
 *
 *  Phones (`compact`) keep the stepper only, with no field: the masthead has
 *  the total, and Display carries the page size. */
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
  const fold = useFooterFold();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const fmt = (n: number) => n.toLocaleString();
  const range = total === 0 ? "No results" : `${fmt(from)}–${fmt(to)} of ${fmt(total)}`;
  // The widest the range can read, laid in the same cell, so the slot keeps
  // its width from page to page and nothing beside it moves.
  const widest = `${fmt(total)}–${fmt(total)} of ${fmt(total)}`;
  const sizeShort = fold >= 2;
  const totalOnly = fold >= 3;
  return (
    <div data-component="LibraryPagination" data-fold={fold} className="shrink-0 flex items-center">
      <Folio
        page={page}
        pageCount={pageCount}
        onPage={onPage}
        compact={compact}
        editable={!compact}
        label={label}
        lead={
          fold < 4 && (
            <span className="flex items-center gap-1.5">
              {totalOnly ? (
                <span data-part="range" className="tabular-nums whitespace-nowrap">
                  <bdi aria-hidden>{total === 0 ? "No results" : fmt(total)}</bdi>
                  <span role="status" className="sr-only">{range}</span>
                </span>
              ) : (
                <span data-part="range" className="grid tabular-nums whitespace-nowrap">
                  <bdi aria-hidden className="col-start-1 row-start-1 invisible">{widest}</bdi>
                  <bdi role="status" className="col-start-1 row-start-1 text-end">{range}</bdi>
                </span>
              )}
              <span aria-hidden className="text-ink-muted">·</span>
              <Select
                value={String(pageSize)}
                options={SIZE_OPTIONS}
                onChange={(v) => onPageSize(Number(v) as LibraryPageSize)}
                ariaLabel="Results per page"
                variant="quiet"
                placement="top"
                align="end"
                steady
                triggerText={sizeShort ? (l) => l.replace(/\D+$/, "") : undefined}
              />
            </span>
          )
        }
      />
    </div>
  );
}

/** The same pager at the end of the Cards and List lane, under the last card
 *  or row: the `Folio` centred, the range under it in caption type. It drives
 *  the footer's page state, so both move together, and a new page starts the
 *  lane at the top as it does from the footer. The host leaves it out when
 *  there is only one page.
 *
 *  `sticky start-0`: in a List wider than the pane the lane scrolls sideways,
 *  and this stays on the gutter instead of travelling with the table. */
export function LibraryPageEnd({
  total,
  page,
  pageSize,
  onPage,
  compact = false,
  label = "Pages",
}: {
  total: number;
  page: number;
  pageSize: LibraryPageSize;
  onPage: (page: number) => void;
  compact?: boolean;
  /** The footer group's name; this one adds "end of results". */
  label?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const fmt = (n: number) => n.toLocaleString();
  return (
    <div data-component="LibraryPageEnd" className="sticky start-0 flex flex-col items-center gap-1 pt-6 pb-2">
      <Folio page={page} pageCount={pageCount} onPage={onPage} compact={compact} editable={!compact} label={`${label}, end of results`} />
      <bdi data-part="range" className="text-xs text-ink-tertiary tabular-nums whitespace-nowrap">
        {fmt(from)}–{fmt(to)} of {fmt(total)}
      </bdi>
    </div>
  );
}
