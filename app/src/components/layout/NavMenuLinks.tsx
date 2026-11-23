import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { ChevronDown, ExternalLink } from "lucide-react";
import { menuSettings } from "../../atoms/siteMenu";
import { sitePagesAtom, type SitePage } from "../../atoms/sitePages";
import type { SettingsMenuLink, SettingsMenuSublink } from "../../data/settings";
import { SectionLabel } from "../shared/SectionLabel";

/** The collection's menu, as saved in Settings › Menu, drawn in the header
 *  layouts that carry it (Theme and branding › Header layout). An unsaved
 *  draft never shows here.
 *
 *  The prototype has no router. A `/library` link opens the Library; a
 *  `/page/<key>` link opens that page as visitors see it (`PageViewModal`,
 *  mounted by the Navbar); an absolute URL opens in a new tab. Anything else
 *  (an entity URL, a page that no longer exists) is drawn and goes nowhere. */
type MenuTarget =
  | { kind: "library"; plain: boolean }
  | { kind: "page"; page: SitePage }
  | { kind: "external" }
  | { kind: "none" };

function targetOf(url: string, pages: SitePage[]): MenuTarget {
  if (/^https?:\/\//.test(url)) return { kind: "external" };
  const library = url.match(/^\/(?:[a-z]{2}\/)?library\/?(.*)$/);
  if (library) return { kind: "library", plain: library[1] === "" };
  // The key is the page's id, its slug or an earlier URL key (`pageMenuLinks`).
  const key = url.match(/^(?:\/[a-z]{2})?\/page\/([^/?#]+)/)?.[1];
  const page = key && pages.find((p) => p.id === key || p.slug === key || p.aliases?.includes(key));
  return page ? { kind: "page", page } : { kind: "none" };
}

export interface NavMenuHandlers {
  /** The Library (or an entity read from it) is the open view. */
  libraryActive: boolean;
  /** The page open in the page view, if any. */
  activePageId: string | null;
  onLibrary: () => void;
  onPage: (page: SitePage) => void;
}

function useMenu({ libraryActive, activePageId, onLibrary, onPage }: NavMenuHandlers) {
  const links = useAtomValue(menuSettings.valueAtom).links;
  const pages = useAtomValue(sitePagesAtom);
  return useMemo(() => {
    const target = (l: SettingsMenuSublink) => targetOf(l.url, pages);
    /** A link is current when it names the open page, or is the plain
     *  Library link while the Library is open. A Library link with a query
     *  is never current: the prototype cannot tell which query is applied. */
    const isCurrent = (l: SettingsMenuSublink) => {
      const t = target(l);
      if (t.kind === "page") return t.page.id === activePageId;
      return t.kind === "library" && t.plain && libraryActive && !activePageId;
    };
    const open = (l: SettingsMenuSublink) => {
      const t = target(l);
      if (t.kind === "library") onLibrary();
      if (t.kind === "page") onPage(t.page);
    };
    return { links, target, isCurrent, open };
  }, [links, pages, libraryActive, activePageId, onLibrary, onPage]);
}
type Menu = ReturnType<typeof useMenu>;

/** One menu link. External links leave the app; every other click is handled
 *  here, since the URL would leave the prototype. */
function MenuAnchor({
  link,
  menu,
  className,
  onDone,
  children,
}: {
  link: SettingsMenuSublink;
  menu: Menu;
  className: string;
  onDone?: () => void;
  children?: ReactNode;
}) {
  const external = menu.target(link).kind === "external";
  return (
    <a
      href={link.url || "#"}
      data-part="menu-link"
      aria-current={menu.isCurrent(link) ? "page" : undefined}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      onClick={(e) => {
        if (!external) {
          e.preventDefault();
          menu.open(link);
        }
        onDone?.();
      }}
      className={className}
    >
      {link.title}
      {external && <ExternalLink size={12} aria-hidden className="shrink-0 text-ink-tertiary" />}
      {children}
    </a>
  );
}

/* ── The bar ─────────────────────────────────────────────────────────────── */

/** A top-level item's box: a 2rem target, the bar's control height. */
const item = (small: boolean) =>
  `relative flex items-center gap-1 h-8 rounded-md font-medium whitespace-nowrap transition-colors cursor-pointer ${
    small ? "px-2 text-xs" : "px-2.5 text-sm"
  }`;
const REST = "text-ink-secondary hover:bg-warm hover:text-ink";
/** The current page: the header's accent on the text, and a 2px rule under it. */
const CURRENT = "text-[var(--header-accent)] hover:bg-warm";
const Underline = ({ small }: { small: boolean }) => (
  <span aria-hidden data-part="current-rule" className={`absolute bottom-0.5 h-0.5 rounded-full bg-[var(--header-accent)] ${small ? "inset-x-2" : "inset-x-2.5"}`} />
);
const PANEL = "absolute top-full mt-1.5 min-w-44 bg-paper border border-border rounded-lg shadow-lg z-50 py-1";
const PANEL_LINK = "flex items-center justify-between gap-3 px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors";
const GAP = 4; // gap-1 between top-level items

/**
 * The menu in the bar. It takes the room the bar leaves between the logo and
 * the utilities; links that do not fit there fold into "More" at the end of
 * the row. The measure is that room, never the viewport: a wide logo or more
 * utilities fold the menu sooner at the same window width.
 *
 * `align="center"` centres the links on the bar itself, not on the room they
 * have: the narrower side is padded to match the wider one, as far as the
 * links still fit. When they do not, they keep every link they can and sit
 * off the centre.
 */
export function NavMenu({
  align,
  small = false,
  ...handlers
}: NavMenuHandlers & { align: "start" | "center" | "end"; small?: boolean }) {
  const menu = useMenu(handlers);
  const { links } = menu;
  const wrapRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ count: links.length, padLeft: 0, padRight: 0 });

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const measure = measureRef.current;
    if (!wrap || !measure) return;
    const compute = () => {
      const boxes = [...measure.children].map((c) => c.getBoundingClientRect().width);
      const more = boxes.pop() ?? 0;
      const room = wrap.getBoundingClientRect().width;
      const width = (n: number) => boxes.slice(0, n).reduce((sum, w) => sum + w, 0) + Math.max(0, n - 1) * GAP;
      /** How many links fit in `space`, and the width they take with "More". */
      const foldTo = (space: number) => {
        if (width(boxes.length) <= space) return { count: boxes.length, used: width(boxes.length) };
        let n = 0;
        while (n < boxes.length && width(n + 1) + GAP + more <= space) n++;
        return { count: n, used: width(n) + (n ? GAP : 0) + more };
      };
      let { count, used } = foldTo(room);
      let padLeft = 0;
      let padRight = 0;
      const bar = wrap.closest('[data-component="Navbar"]');
      if (align === "center" && bar) {
        const b = bar.getBoundingClientRect();
        const w = wrap.getBoundingClientRect();
        // Positive: the wrapper sits left of the bar's centre. Padding its
        // other side by this much leaves a window centred on the bar.
        const lean = Math.round(b.right - w.right - (w.left - b.left));
        const centred = foldTo(room - Math.abs(lean));
        // Centred on the bar while at least half the links stay in it;
        // below that the menu keeps every link it can and sits off the centre.
        const keep = centred.count * 2 >= boxes.length;
        if (keep) ({ count, used } = centred);
        const pad = keep ? Math.abs(lean) : Math.min(Math.abs(lean), Math.max(0, Math.floor(room - used)));
        if (lean > 0) padLeft = pad;
        else padRight = pad;
      }
      setFit((f) => (f.count === count && f.padLeft === padLeft && f.padRight === padRight ? f : { count, padLeft, padRight }));
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(wrap);
    observer.observe(measure);
    return () => observer.disconnect();
  }, [links, align, small]);

  const shown = links.slice(0, fit.count);
  const folded = links.slice(fit.count);
  const justify = align === "center" ? "justify-center" : align === "end" ? "justify-end" : "justify-start";

  return (
    <nav
      ref={wrapRef}
      data-component="NavMenu"
      data-part="primary-nav"
      aria-label="Primary"
      className={`relative flex-1 min-w-0 flex items-center ${justify}`}
      style={{ paddingLeft: fit.padLeft, paddingRight: fit.padRight }}
    >
      {/* Every item and "More" at their natural width, to measure the fold from. */}
      <div ref={measureRef} aria-hidden data-part="measure" className="absolute start-0 top-0 flex w-max invisible pointer-events-none">
        {links.map((l) => (
          <span key={l.id} className={`${item(small)} shrink-0`}>
            {l.title}
            {l.type === "group" && <ChevronDown size={13} />}
          </span>
        ))}
        <span className={`${item(small)} shrink-0`}>
          More
          <ChevronDown size={13} />
        </span>
      </div>
      {links.length > 0 && (
        <ul data-part="menu" className="flex items-center gap-1">
          {shown.map((l) => (
            <li key={l.id}>
              {l.type === "group" ? (
                <MenuGroup label={l.title} small={small} current={l.sublinks.some(menu.isCurrent)}>
                  {(close) => <GroupLinks group={l} menu={menu} onDone={close} />}
                </MenuGroup>
              ) : (
                <MenuAnchor link={l} menu={menu} className={`${item(small)} ${menu.isCurrent(l) ? CURRENT : REST}`}>
                  {menu.isCurrent(l) && <Underline small={small} />}
                </MenuAnchor>
              )}
            </li>
          ))}
          {folded.length > 0 && (
            <li>
              <MenuGroup
                label="More"
                part="more"
                small={small}
                panelEnd
                current={folded.some((l) => (l.type === "group" ? l.sublinks.some(menu.isCurrent) : menu.isCurrent(l)))}
              >
                {(close) =>
                  folded.map((l) =>
                    l.type === "group" ? (
                      // A folded group keeps its label and is ruled off from the links around it.
                      <li key={l.id} className="my-1 py-1 border-y border-border-soft first:mt-0 first:pt-0 first:border-t-0 last:mb-0 last:pb-0 last:border-b-0">
                        <SectionLabel as="p" className="px-3 pt-2 pb-1">
                          {l.title}
                        </SectionLabel>
                        <ul>
                          <GroupLinks group={l} menu={menu} onDone={close} />
                        </ul>
                      </li>
                    ) : (
                      <li key={l.id}>
                        <PanelLink link={l} menu={menu} onDone={close} />
                      </li>
                    ),
                  )
                }
              </MenuGroup>
            </li>
          )}
        </ul>
      )}
    </nav>
  );
}

const PanelLink = ({ link, menu, onDone }: { link: SettingsMenuSublink; menu: Menu; onDone: () => void }) => (
  <MenuAnchor
    link={link}
    menu={menu}
    onDone={onDone}
    className={`${PANEL_LINK} ${menu.isCurrent(link) ? "text-[var(--header-accent)] underline decoration-2 underline-offset-4 hover:bg-warm" : REST}`}
  />
);

function GroupLinks({ group, menu, onDone }: { group: SettingsMenuLink; menu: Menu; onDone: () => void }) {
  if (group.sublinks.length === 0) return <li className="px-3 py-1.5 text-xs text-ink-tertiary">No links</li>;
  return (
    <>
      {group.sublinks.map((s) => (
        <li key={s.id}>
          <PanelLink link={s} menu={menu} onDone={onDone} />
        </li>
      ))}
    </>
  );
}

/** A group, or "More": a button that opens a list of links under it.
 *  Enter, Space and ArrowDown open it (ArrowDown lands on the first link);
 *  the arrows move through the links; Escape closes it and returns focus to
 *  the button; a click or focus outside closes it. */
function MenuGroup({
  label,
  small,
  current,
  panelEnd = false,
  part = "group",
  children,
}: {
  label: string;
  small: boolean;
  current: boolean;
  /** Anchor the panel to the button's end: "More" sits last in the row. */
  panelEnd?: boolean;
  part?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const focusFirst = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (focusFirst.current) ref.current?.querySelector<HTMLElement>("[data-part='panel'] a")?.focus();
    focusFirst.current = false;
    const outside = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, [open]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape" && open) {
      // Consumed, so it does not also reach a window-level Escape.
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    if (!open) {
      focusFirst.current = true;
      setOpen(true);
      return;
    }
    const stops = [...(ref.current?.querySelectorAll<HTMLElement>("[data-part='panel'] a") ?? [])];
    const at = stops.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? at + 1 : at - 1;
    if (next < 0) buttonRef.current?.focus();
    else stops[Math.min(next, stops.length - 1)]?.focus();
  };

  return (
    <div
      ref={ref}
      data-part={part}
      className="relative"
      onKeyDown={onKeyDown}
      onBlur={(e) => {
        if (e.relatedTarget && !ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        data-part="group-trigger"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${item(small)} ${current ? CURRENT : open ? "text-ink bg-warm" : REST}`}
      >
        {label}
        <ChevronDown size={13} aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`} />
        {current && <Underline small={small} />}
      </button>
      {open && (
        <ul data-part="panel" className={`${PANEL} ${panelEnd ? "end-0" : "start-0"}`}>
          {children(() => setOpen(false))}
        </ul>
      )}
    </div>
  );
}

/* ── The phone menu sheet ────────────────────────────────────────────────── */

/** The same menu as a section of the phone menu sheet: a group is a label
 *  over its links. */
export function NavMenuSheetSection({ onDone, ...handlers }: NavMenuHandlers & { onDone: () => void }) {
  const menu = useMenu(handlers);
  if (!menu.links.length) return null;
  const row = (l: SettingsMenuSublink, indent: boolean) =>
    `flex items-center justify-between gap-3 w-full py-3 pe-4 text-sm font-medium transition-colors ${indent ? "ps-8" : "ps-4"} ${
      menu.isCurrent(l) ? "bg-vellum text-ink" : "text-ink-secondary hover:bg-warm"
    }`;
  return (
    <>
      <SectionLabel className="px-4 pt-4 pb-1">Menu</SectionLabel>
      <ul data-component="NavMenu" data-part="sheet-menu">
        {menu.links.map((l) =>
          l.type === "group" ? (
            <li key={l.id}>
              <SectionLabel as="p" className="px-4 pt-3 pb-1">
                {l.title}
              </SectionLabel>
              <ul>
                {l.sublinks.map((s) => (
                  <li key={s.id}>
                    <MenuAnchor link={s} menu={menu} onDone={onDone} className={row(s, true)} />
                  </li>
                ))}
              </ul>
            </li>
          ) : (
            <li key={l.id}>
              <MenuAnchor link={l} menu={menu} onDone={onDone} className={row(l, false)} />
            </li>
          ),
        )}
      </ul>
    </>
  );
}
