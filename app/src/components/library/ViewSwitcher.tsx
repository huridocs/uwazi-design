import type { LucideIcon } from "lucide-react";

export interface ViewOption {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface Props {
  value: string;
  options: ViewOption[];
  onChange: (id: string) => void;
  ariaLabel?: string;
}

/** The Library's view switcher: the app's bordered segmented group, except the
 *  ACTIVE segment says its name. Five icons alone made you decode a glyph to
 *  learn which of cards / list / map / timeline / results you were looking at —
 *  the one thing on this control you most want read back to you.
 *
 *  Two hard constraints, both from LibraryView's own toolbar:
 *    · every view stays reachable — no option is dropped or folded behind a
 *      menu. The views are the point of the Library, so they cost one click.
 *    · the width is CONSTANT across views. This row is Sort · View · Display ·
 *      Language, and anything here that resizes shoves every control beside it
 *      sideways the moment you switch view.
 *
 *  The second one is why the label sits in a grid stack rather than a plain
 *  span: ALL five labels are laid out in the same cell and only the active one
 *  is visible, so the cell measures the widest label as the browser actually
 *  renders it. A `ch`-count guess can't do that — it over-reserved by up to
 *  49px, parking a pocket of dead space inside the highlighted segment on every
 *  short label. Slack on the short labels is inherent to a control that refuses
 *  to resize; this is the least of it that still holds the width.
 *
 *  Below `sm` the labels drop out and it's the icon rail it always was — the
 *  toolbar is far tighter there, and the width only has to be constant across
 *  VIEWS, not across viewports. */
export function ViewSwitcher({ value, options, onChange, ariaLabel }: Props) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex w-fit items-center rounded-md overflow-hidden h-8"
      style={{ border: "1px solid var(--border-primary)" }}
    >
      {options.map((opt, i) => {
        const active = value === opt.id;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            aria-pressed={active}
            aria-label={opt.label}
            title={opt.label}
            className={`flex items-center justify-center gap-1.5 h-8 px-2 transition-colors cursor-pointer ${
              active ? "bg-vellum text-ink" : "text-ink-tertiary hover:text-ink-secondary"
            }`}
            style={{ borderInlineStart: i > 0 ? "1px solid var(--border-primary)" : "none" }}
          >
            <Icon size={14} className="shrink-0" />
            {/* Mounted on the active segment only — exactly one segment is
                active, so exactly one label slot exists and the group's width
                never moves. The button's own `aria-label` already names it,
                hence `aria-hidden` on the stack rather than five labels read
                out in a row. */}
            {active && (
              <span aria-hidden className="hidden sm:grid text-xs font-medium">
                {options.map((o) => (
                  <span
                    key={o.id}
                    className={`col-start-1 row-start-1 text-start ${
                      o.id === opt.id ? "" : "invisible"
                    }`}
                  >
                    {o.label}
                  </span>
                ))}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
