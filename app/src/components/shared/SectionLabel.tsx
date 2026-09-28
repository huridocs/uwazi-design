import type { ElementType, ReactNode } from "react";

/** The small uppercase label that introduces a group of content: "Properties"
 *  above a card's field hits, "Tasks · 3" above the drawer's running work.
 *
 *  Typography is fixed here; position is the caller's. `className` takes the box
 *  (padding, `sticky`, a background) and cannot change size, weight, tracking or
 *  colour. `text-ink-tertiary`, not `-muted`: at this size muted falls under AA
 *  on parchment. Renders an `h3` by default; pass another heading level, or a
 *  `span` where a heading is not allowed (inside a button, listbox or menu). */
/** `group` (11px): a label inside a panel. `section` (12px): a label heading a
 *  whole section of a view ("Primary documents", "File details"). */
const LEVEL = {
  group: "text-meta tracking-wide",
  section: "text-xs tracking-wider",
} as const;

export function SectionLabel({
  as: Tag = "h3",
  level = "group",
  icon,
  className = "",
  children,
}: {
  /** The element to render. `h3` by default; pass the heading level that fits
   *  the outline, or `span`/`p` where a heading can't go (inside a button, a
   *  listbox, a menu). */
  as?: ElementType;
  /** See `LEVEL`. `group` (11px) by default. */
  level?: keyof typeof LEVEL;
  /** Optional leading glyph (the Results view's Tag / FileText marks), drawn
   *  in `text-ink-muted`, one step quieter than the label. */
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    // `flex`, so this is block-level and a caller's `sticky` + background paints
    // the full width — the notification drawer's section headers depend on it.
    <Tag
      data-component="SectionLabel"
      data-level={level}
      className={`flex items-center gap-1.5 min-w-0 font-semibold uppercase
        text-ink-tertiary ${LEVEL[level]} ${className}`}
    >
      {icon && (
        <span data-part="icon" className="text-ink-muted shrink-0" aria-hidden>
          {icon}
        </span>
      )}
      {children}
    </Tag>
  );
}
