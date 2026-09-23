import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { Search, X } from "lucide-react";
import { SectionLabel } from "./SectionLabel";

/* ── The pieces a modal BODY is built from ─────────────────────────────────
   `Modal` owns the shell (scrim, panel, header, footer). These own what goes
   inside, so that a search box, a row, a label or an empty line reads the
   same in every dialog: one row height (2.25rem), one type size (`text-xs`,
   `text-meta` for secondary), one hover and selected ground (`bg-parchment`).
   Each strip or row is a `bleed` lane: it reaches the panel edge and keeps
   its content on the panel's gutter, so none of them carries `px-*`. */

/** A text input or select inside a modal. One height, one type size. */
export const MODAL_INPUT =
  "w-full h-8 px-2.5 text-xs text-ink bg-paper rounded-md border border-border placeholder:text-ink-muted " +
  "focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40 disabled:opacity-70";
/** A field's label, for a `<label>` that wraps its control (`ModalField`
 *  draws the same label for one that sits beside it). */
export const MODAL_LABEL = "block text-xs font-medium text-ink-secondary";
/** A textarea: `MODAL_INPUT` without the fixed height. */
export const MODAL_TEXTAREA =
  "w-full px-2.5 py-2 text-xs text-ink bg-paper rounded-md border border-border placeholder:text-ink-muted resize-y " +
  "focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40";

/** The search field on its own, for a search that lives inside something
 *  else (a dropdown). The X clears and returns focus to the field; it sits
 *  inside the field's box, so showing it moves nothing. */
export function ModalSearchField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  autoFocus = false,
  clearLabel = "Clear search",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  autoFocus?: boolean;
  clearLabel?: string;
}) {
  return (
    <div
      data-part="search-field"
      className="flex-1 min-w-0 flex items-center gap-1.5 h-8 px-2 bg-warm rounded-md
        focus-within:ring-2 focus-within:ring-carbon/20"
    >
      <Search size={13} className="text-ink-muted shrink-0" aria-hidden />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoFocus={autoFocus}
        className="flex-1 min-w-0 bg-transparent text-xs text-ink placeholder:text-ink-muted focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={(e) => {
            onChange("");
            (e.currentTarget.parentElement?.querySelector("input") as HTMLInputElement | null)?.focus();
          }}
          aria-label={clearLabel}
          className="shrink-0 p-0.5 rounded-full text-ink-muted hover:bg-parchment hover:text-ink cursor-pointer transition-colors"
        >
          <X size={12} aria-hidden />
        </button>
      )}
    </div>
  );
}

/** The search strip at the top of a picker: the field, then an optional
 *  trailing control (a scope `SegmentedControl`), over a rule. */
export function ModalSearchRow({
  trailing,
  ...field
}: Parameters<typeof ModalSearchField>[0] & { trailing?: ReactNode }) {
  return (
    <div data-part="search" role="search" className="bleed shrink-0 flex items-center gap-2 py-2 border-b border-border">
      <ModalSearchField {...field} />
      {trailing}
    </div>
  );
}

/** The scrolling list under a search strip. Rows are `ModalListRow`s; a
 *  grouped list puts a `ModalSectionLabel` (with `row`) between them.
 *  `atEdge`: the parent already reaches the panel edge (a column inside a
 *  `bleed-flush` split), so the list must not reach again — `bleed-flush`
 *  pulls by the full gutter wherever it sits. */
export function ModalList({
  children,
  className = "",
  atEdge = false,
  ...rest
}: { children: ReactNode; className?: string; atEdge?: boolean } & HTMLAttributes<HTMLUListElement> &
  Record<`data-${string}`, string | undefined>) {
  return (
    <ul {...rest} className={`${atEdge ? "" : "bleed-flush "}flex-1 min-h-0 overflow-auto py-1 ${className}`}>
      {children}
    </ul>
  );
}

/** A template's colour, as the square dot every row and pill uses. */
export function ModalTypeDot({ color }: { color?: string }) {
  return (
    <span aria-hidden className="w-2 h-2 rounded-[2px] shrink-0" style={{ backgroundColor: color ?? "#6B7280" }} />
  );
}

const ROW =
  "bleed w-full flex items-center gap-2 h-9 text-start text-xs transition-colors " +
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-carbon/40";

/** One row of a picker or list: a leading mark (a type dot, a radio, an
 *  icon), the title, an optional chip, and trailing meta at the far end.
 *  One height (2.25rem), one type size.
 *
 *  - `onClick`: the row is a button (a choice). `pressed` adds `aria-pressed`
 *    for a choice that stays selected on the same step.
 *  - `control`: the row is a `<label>` around that control (a radio or a
 *    checkbox), so the whole row toggles it.
 *  - neither: a static row, for a row whose actions are its own buttons
 *    (placed in `meta`). */
export function ModalListRow({
  title,
  leading,
  chip,
  meta,
  onClick,
  control,
  selected = false,
  pressed,
  disabled = false,
  titleClassName = "text-ink",
  part,
}: {
  title: ReactNode;
  leading?: ReactNode;
  chip?: ReactNode;
  meta?: ReactNode;
  onClick?: () => void;
  control?: ReactNode;
  selected?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  titleClassName?: string;
  /** `data-part` on the row's element. */
  part?: string;
}) {
  const ground = selected ? "bg-parchment" : disabled ? "" : "hover:bg-parchment";
  const cursor = disabled ? "opacity-55 cursor-not-allowed" : onClick || control ? "cursor-pointer" : "";
  const body = (
    <>
      {control}
      {leading}
      <span className={`min-w-0 flex-1 truncate ${titleClassName}`}>{title}</span>
      {chip && <span className="shrink-0 flex">{chip}</span>}
      {meta && (
        <span data-part="meta" className="ms-auto shrink-0 flex items-center gap-1.5 text-meta text-ink-tertiary">
          {meta}
        </span>
      )}
    </>
  );
  const cls = `${ROW} ${ground} ${cursor}`;
  return (
    <li className="flex flex-col">
      {onClick ? (
        <button type="button" data-part={part} onClick={onClick} disabled={disabled} aria-pressed={pressed} className={cls}>
          {body}
        </button>
      ) : control ? (
        <label data-part={part} className={cls}>
          {body}
        </label>
      ) : (
        <div data-part={part} className={cls}>
          {body}
        </div>
      )}
    </li>
  );
}

/** A section's label inside a modal body — the app's one `SectionLabel`
 *  at its `group` level. `row` renders it as a list item on the row lane,
 *  between the groups of a `ModalList`. */
export function ModalSectionLabel({
  children,
  as = "h3",
  id,
  row = false,
}: {
  children: ReactNode;
  as?: ElementType;
  id?: string;
  row?: boolean;
}) {
  const label = (
    <SectionLabel as={as}>
      {id ? <span id={id}>{children}</span> : children}
    </SectionLabel>
  );
  return row ? <li className="bleed pt-3 pb-1 first:pt-1">{label}</li> : label;
}

/** A labelled field: label, control, and an optional hint under it. The
 *  hint line is always mounted when `hint` is passed (even empty), so a note
 *  that appears as the user types moves nothing below it. */
export function ModalField({
  label,
  htmlFor,
  labelId,
  hint,
  hintId,
  children,
  className = "",
  part,
}: {
  label: ReactNode;
  /** The control's id: the label is a `<label>`. Without it the label is a
   *  `<span>` with `labelId`, for a group named by `aria-labelledby`. */
  htmlFor?: string;
  labelId?: string;
  hint?: ReactNode;
  hintId?: string;
  children: ReactNode;
  className?: string;
  part?: string;
}) {
  const cls = MODAL_LABEL;
  return (
    <div data-part={part} className={`space-y-1 ${className}`}>
      {htmlFor ? (
        <label htmlFor={htmlFor} className={cls}>
          {label}
        </label>
      ) : (
        <span id={labelId} className={cls}>
          {label}
        </span>
      )}
      {children}
      {hint !== undefined && (
        <p id={hintId} className="min-h-4 text-meta text-ink-tertiary">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Why a list is empty, or a one-line status in its place. `li` inside a
 *  `ModalList`, `p` elsewhere. */
export function ModalStatus({
  children,
  as: Tag = "p",
  part = "empty",
}: {
  children: ReactNode;
  as?: "p" | "li";
  part?: string;
}) {
  return (
    <Tag data-part={part} className="bleed py-6 text-center text-xs text-ink-tertiary">
      {children}
    </Tag>
  );
}
