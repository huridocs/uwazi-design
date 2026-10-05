import { useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { ChevronDown } from "lucide-react";
import { menuSettings } from "../../atoms/siteMenu";
import type { SettingsMenuLink, SettingsMenuSublink } from "../../data/settings";

/** The collection's menu, as saved in Settings › Menu, in the navbar. The
 *  prototype has no router: a `/library` link opens the Library, any other
 *  link shows where it leads and goes nowhere. An unsaved draft never shows
 *  here. */
const isLibrary = (url: string) => /^\/(?:[a-z]{2}\/)?library\b/.test(url);

function useOpenLink(onLibrary: () => void) {
  return (l: SettingsMenuSublink) => {
    if (isLibrary(l.url)) onLibrary();
  };
}

export function NavMenuLinks({ onLibrary }: { onLibrary: () => void }) {
  const links = useAtomValue(menuSettings.valueAtom).links;
  const open = useOpenLink(onLibrary);
  if (!links.length) return null;
  return (
    <ul data-component="NavMenuLinks" aria-label="Collection menu" className="flex items-center gap-1 min-w-0">
      {links.map((l) =>
        l.type === "group" ? (
          <li key={l.id}>
            <NavGroup group={l} onOpen={open} />
          </li>
        ) : (
          <li key={l.id}>
            <NavLinkButton link={l} onOpen={open} className="px-2.5 py-1 rounded-md" />
          </li>
        ),
      )}
    </ul>
  );
}

function NavLinkButton({
  link,
  onOpen,
  className,
}: {
  link: SettingsMenuSublink;
  onOpen: (l: SettingsMenuSublink) => void;
  className: string;
}) {
  return (
    <a
      href={link.url || undefined}
      onClick={(e) => {
        e.preventDefault();
        onOpen(link);
      }}
      title={isLibrary(link.url) ? undefined : `${link.url} · opens on the public site`}
      className={`block text-tab font-medium text-ink-secondary hover:bg-warm hover:text-ink transition-colors whitespace-nowrap ${className}`}
    >
      {link.title}
    </a>
  );
}

function NavGroup({ group, onOpen }: { group: SettingsMenuLink; onOpen: (l: SettingsMenuSublink) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div
      ref={ref}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
          (ref.current?.querySelector("button") as HTMLElement | null)?.focus();
        }
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2.5 py-1 rounded-md text-tab font-medium text-ink-secondary hover:bg-warm hover:text-ink transition-colors whitespace-nowrap cursor-pointer"
      >
        {group.title}
        <ChevronDown size={13} aria-hidden className={`text-ink-tertiary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="absolute top-full mt-1.5 start-0 min-w-44 bg-paper border border-border rounded-lg shadow-lg overflow-hidden z-50 py-1">
          {group.sublinks.length === 0 ? (
            <li className="px-3 py-1.5 text-xs text-ink-tertiary">No links</li>
          ) : (
            group.sublinks.map((s) => (
              <li key={s.id}>
                <NavLinkButton
                  link={s}
                  onOpen={(l) => {
                    setOpen(false);
                    onOpen(l);
                  }}
                  className="px-3 py-1.5 text-xs"
                />
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

/** The same menu in the phone navigation sheet: groups as a label over their
 *  links. */
export function NavMenuLinksMobile({ onLibrary }: { onLibrary: () => void }) {
  const links = useAtomValue(menuSettings.valueAtom).links;
  const open = useOpenLink(onLibrary);
  if (!links.length) return null;
  const row = "block w-full px-4 py-3 text-sm font-medium text-ink-secondary hover:bg-warm text-start";
  return (
    <ul data-component="NavMenuLinks" aria-label="Collection menu" className="flex flex-col">
      {links.map((l) =>
        l.type === "group" ? (
          <li key={l.id}>
            <p className="px-4 pt-3 pb-1 text-meta font-semibold uppercase tracking-wider text-ink-tertiary">{l.title}</p>
            <ul>
              {l.sublinks.map((s) => (
                <li key={s.id}>
                  <NavLinkButton link={s} onOpen={open} className={`${row} ps-8`} />
                </li>
              ))}
            </ul>
          </li>
        ) : (
          <li key={l.id}>
            <NavLinkButton link={l} onOpen={open} className={row} />
          </li>
        ),
      )}
    </ul>
  );
}
