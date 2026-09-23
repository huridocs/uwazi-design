import { createContext, useContext, useId, type HTMLAttributes, type KeyboardEvent, type MutableRefObject, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFocusTrap } from "../../hooks/useFocusTrap";

/** Width tiers. A modal picks the narrowest that holds its content; there is
 *  no fifth width. */
export type ModalSize = "sm" | "md" | "lg" | "xl";

const WIDTH: Record<ModalSize, string> = {
  sm: "md:max-w-[28rem]",
  md: "md:max-w-[32rem]",
  lg: "md:max-w-[40rem]",
  xl: "md:max-w-[48rem]",
};

/** The element a `scope="pane"` modal covers, when it is called from deeper
 *  than the pane it belongs to.
 *
 *  A pane modal is `absolute inset-0`: it covers its nearest positioned
 *  ancestor. Copy From is called from the metadata edit body, which sits
 *  BELOW the pane's header and tab strip, so the scrim stopped at the tabs
 *  and left the entity's title, its close X and the tab strip live above it.
 *  A pane that must be covered top to bottom names its root here and the
 *  modal portals into it (the `FiltersHostProvider` idiom). No provider: the
 *  nearest positioned ancestor, as before. */
const ModalHostContext = createContext<HTMLElement | null>(null);

export function ModalHostProvider({ host, children }: { host: HTMLElement | null; children: ReactNode }) {
  return <ModalHostContext.Provider value={host}>{children}</ModalHostContext.Provider>;
}

/** The app's one modal: scrim, panel, header, body, footer.
 *
 *  - Scrim: `bg-overlay` (the token, both themes). A click on it closes,
 *    unless `dismissOnScrim` is false.
 *  - Panel: `bg-paper`, `rounded-lg`, a `border` hairline and `shadow-xl`.
 *    The hairline is what separates the panel from the scrim in dark mode.
 *    Below `md` an `sm` modal stays a centred card; every wider tier fills
 *    the screen, since a form at 28rem+ has no room to float on a phone.
 *  - The panel is a gutter host on the MAIN tier (16px). Header, body and
 *    footer are `bleed` lanes: their rules reach the panel edge, their content
 *    sits on the gutter. A row inside the body that must reach the edge (a
 *    toolbar strip, a hoverable list row) takes `bleed` itself and carries no
 *    `px-*` of its own.
 *  - Header: 3rem in every modal. Title `text-sm font-semibold`; a subtitle
 *    runs INLINE after it (`text-meta`, truncating), never on a second line,
 *    so no header is taller than another. A leading slot (an icon) and an
 *    actions slot before the close X.
 *  - Footer: a 3rem bar on the bar ladder (`warmButton.ts`) — one commit
 *    (ink, or seal for a destructive confirm, or the success fill on a Save),
 *    everything else `BAR_GHOST`. No borders on its buttons.
 *  - A11y: `role="dialog"`, `aria-modal`, `aria-labelledby` the title, focus
 *    trapped in the panel and restored to the trigger on close, Escape closes.
 *    Escape stops at the modal, so the drawer or overlay under it stays open.
 *    A control inside that handles Escape itself (an open list) calls
 *    `preventDefault()` and the modal leaves it alone.
 *
 *  `scope="viewport"` portals to `document.body` (or renders in place with
 *  `portal={false}` when a host above it must still see clicks inside it as
 *  its own); `scope="pane"` fills the nearest positioned ancestor instead. */
export function Modal({
  onClose,
  title,
  titleId: titleIdProp,
  subtitle,
  leading,
  headerActions,
  hideTitle = false,
  header,
  footer,
  children,
  size = "md",
  height,
  maxHeight,
  scope = "viewport",
  portal = true,
  dismissOnScrim = true,
  closeLabel = "Close",
  describedBy,
  component,
  bodyClassName = "py-4",
  flush = false,
  panelProps,
  scrimProps,
  panelRef: panelRefProp,
  titleRef,
  z = "z-50",
}: {
  onClose: () => void;
  title: ReactNode;
  /** When the title id is referenced elsewhere (a fieldset's `aria-labelledby`). */
  titleId?: string;
  subtitle?: ReactNode;
  leading?: ReactNode;
  headerActions?: ReactNode;
  /** Keep the title for `aria-labelledby` but show `header` in its place. */
  hideTitle?: boolean;
  /** Replaces the title block (the title stays, visually hidden, when `hideTitle`). */
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  size?: ModalSize;
  /** A fixed panel height, as a literal class (e.g. `md:h-[min(34rem,100%)]`),
   *  for a modal whose body filters a list or swaps steps: the panel must not
   *  resize as rows come and go. Default `md:h-auto`. */
  height?: string;
  /** The panel's height cap, as a literal class. Default `md:max-h-[min(90vh,100%)]`. */
  maxHeight?: string;
  scope?: "viewport" | "pane";
  portal?: boolean;
  dismissOnScrim?: boolean;
  closeLabel?: string;
  describedBy?: string;
  /** `data-component` on the scrim, for tests and the catalog. */
  component?: string;
  bodyClassName?: string;
  /** The body is not a padded lane: its children lay out their own strips
   *  (each a `bleed` row). The body still scrolls as one when `flush` is off. */
  flush?: boolean;
  panelProps?: Record<string, string | undefined>;
  /** Extra attributes and handlers on the scrim (a drop target, a `data-mode`). */
  scrimProps?: HTMLAttributes<HTMLDivElement> & Record<`data-${string}`, string | undefined>;
  /** The panel element, for a modal that places its own first focus. */
  panelRef?: MutableRefObject<HTMLDivElement | null>;
  /** The title, for a modal that moves focus to it (a step change). The
   *  title is then focusable programmatically (`tabIndex={-1}`), and paints
   *  no ring: it is where a screen reader starts reading, not a control, and
   *  Chrome matches `:focus-visible` on a scripted focus after a keypress, so
   *  the ring showed on every open from the keyboard. */
  titleRef?: MutableRefObject<HTMLHeadingElement | null>;
  z?: string;
}) {
  const autoId = useId();
  const titleId = titleIdProp ?? `modal-${autoId}`;
  const panelRef = useFocusTrap<HTMLDivElement>(true);
  const fullOnPhone = size !== "sm";
  const paneHost = useContext(ModalHostContext);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    e.stopPropagation();
    onClose();
  };

  const node = (
    <div
      data-component={component}
      {...scrimProps}
      className={`${scope === "pane" ? "absolute" : "fixed"} inset-0 ${z} flex bg-overlay ${
        fullOnPhone ? "md:items-center md:justify-center md:p-4" : "items-center justify-center p-4"
      }`}
      onMouseDown={(e) => {
        if (dismissOnScrim && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={(el) => {
          panelRef.current = el;
          if (panelRefProp) panelRefProp.current = el;
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        data-part="panel"
        data-gutter-host
        onKeyDown={onKeyDown}
        {...panelProps}
        className={`gutter-host-main w-full ${WIDTH[size]} flex flex-col bg-paper shadow-xl overflow-hidden animate-fade-in-up ${
          fullOnPhone
            ? "h-full md:rounded-lg md:border md:border-border"
            : "max-h-full rounded-lg border border-border"
        } ${height ?? "md:h-auto"} ${maxHeight ?? "md:max-h-[min(90vh,100%)]"}`}
      >
        <header
          data-part="header"
          className="bleed shrink-0 flex items-center gap-2 h-12 border-b border-border"
        >
          {leading}
          <div className="min-w-0 flex-1 flex items-baseline gap-2">
            <h2
              id={titleId}
              ref={titleRef}
              tabIndex={titleRef ? -1 : undefined}
              data-part="title"
              className={
                hideTitle
                  ? "sr-only"
                  : "shrink-0 max-w-full text-sm font-semibold text-ink truncate focus:outline-none"
              }
            >
              {title}
            </h2>
            {header}
            {subtitle && (
              <p data-part="subtitle" className="min-w-0 text-meta text-ink-tertiary truncate">
                {subtitle}
              </p>
            )}
          </div>
          {headerActions}
          <button
            type="button"
            data-part="close"
            data-gutter-align="box"
            onClick={onClose}
            aria-label={closeLabel}
            className="shrink-0 p-1 rounded-md text-ink-muted hover:bg-warm hover:text-ink transition-colors cursor-pointer"
          >
            <X size={16} aria-hidden />
          </button>
        </header>
        {flush ? (
          <div data-part="body" className="bleed flex-1 min-h-0 flex flex-col">
            {children}
          </div>
        ) : (
          <div data-part="body" className={`bleed flex-1 min-h-0 overflow-auto ${bodyClassName}`}>
            {children}
          </div>
        )}
        {footer && (
          <footer
            data-part="footer"
            className="bleed shrink-0 flex items-center justify-end gap-2 h-12 border-t border-border"
          >
            {footer}
          </footer>
        )}
      </div>
    </div>
  );

  if (scope === "pane") return paneHost ? createPortal(node, paneHost) : node;
  return portal ? createPortal(node, document.body) : node;
}

/** Footer buttons: the modal's commit and its ghosts. Same metrics as the
 *  action bars' buttons. */
export const MODAL_BUTTON = "px-3 py-1.5 text-xs font-medium rounded-md transition-colors";
export const MODAL_COMMIT = `${MODAL_BUTTON} bg-ink text-paper hover:bg-ink/90 cursor-pointer`;
export const MODAL_COMMIT_DISABLED = `${MODAL_BUTTON} bg-ink/40 text-paper cursor-not-allowed`;
export const MODAL_DANGER = `${MODAL_BUTTON} bg-seal-fill text-white hover:bg-seal-fill/90 cursor-pointer`;
