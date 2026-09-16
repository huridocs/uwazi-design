import { getEntityType } from "../../data/entities";
import { typeLabelColor } from "../../utils/typeColor";
import { HighlightedText } from "./HighlightedText";

interface EntityPillProps {
  typeId: string;
  label?: string;
  size?: "sm" | "md";
  /** Search query whose hits get marked in the label. Opt-in: surfaces that
   *  filter on a query pass theirs so the pill SHOWS why it matched. Empty or
   *  omitted renders the label untouched. */
  highlight?: string;
  /** Makes the pill the control that opens the entity: it renders a `<button>`
   *  and stops the click from propagating, like `PageTag`, so a pill inside a
   *  row never fires the row as well. Omit for a pill that only names. */
  onClick?: (e: React.MouseEvent) => void;
  /** Makes the pill a link (`<a>`) instead. Ignored when `onClick` is given. */
  href?: string;
  /** Accessible name when the pill is a control ("Open Case 12.045"). Defaults
   *  to the entity's name. */
  ariaLabel?: string;
}

/** An entity reference: a tinted chip carrying the entity's title.
 *
 *  Without `onClick` or `href` it is a `<span>` — a reference that states the
 *  entity. A span with a click handler is not a control a keyboard or screen
 *  reader can reach, so a clickable pill is a real `<button>` (or `<a>`). */
export function EntityPill({
  typeId,
  label,
  size = "sm",
  highlight = "",
  onClick,
  href,
  ariaLabel,
}: EntityPillProps) {
  const type = getEntityType(typeId);
  const color = type?.color ?? "#6B7280";
  const resolved = label ?? type?.name ?? typeId;
  const isMissing = !resolved;
  const name = isMissing ? "Unknown entity" : resolved;

  // The label never uses the raw type colour: pale colours fall back to ink
  // entirely, and saturated ones are mixed ~30% toward ink so small text
  // clears WCAG contrast on the 12% tint (e.g. violet #8B5CF6 alone sits just
  // under 4.5:1). Mixing with var(--text-primary) is theme-aware — it darkens
  // labels in light mode and lightens them in dark. The dot keeps the true
  // colour, so the type hue stays recognisable.
  const textColor = typeLabelColor(color);

  const box = {
    "data-component": "EntityPill",
    title: name,
    className: `inline-flex items-center gap-1.5 rounded-md min-w-0 max-w-full align-middle ${
      isMissing ? "italic font-normal" : "font-medium"
    } ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm"}`,
    style: {
      backgroundColor: `${color}20`,
      color: textColor,
      border: `1px solid ${color}40`,
    },
  };
  const control = "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40";

  const body = (
    <>
      <span
        data-part="dot"
        aria-hidden
        className="rounded-[2px] shrink-0 ring-1 ring-inset ring-ink/20"
        style={{
          backgroundColor: color,
          width: size === "sm" ? 6 : 8,
          height: size === "sm" ? 6 : 8,
        }}
      />
      {/* The mark sets its own `text-ink`, overriding the tinted label colour
          above for the matched run only — which is the point, and `text-ink` is
          the contrast-safe colour the pale-colour branch already falls back to. */}
      <span data-part="label" className="truncate">
        <HighlightedText text={name} query={highlight} />
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        {...box}
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          onClick(e);
        }}
        className={`${box.className} ${control}`}
      >
        {body}
      </button>
    );
  }
  if (href) {
    return (
      <a {...box} href={href} aria-label={ariaLabel} className={`${box.className} ${control}`}>
        {body}
      </a>
    );
  }
  return <span {...box}>{body}</span>;
}
