import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import type { EntityType } from "../../data/entities";
import { BAR_GHOST, BAR_LEAD } from "../shared/warmButton";

/** The Library footer's Create entity, as a split button.
 *
 *  The main half creates AT ONCE: the draft opens in the drawer on the template
 *  the host presets (the one the Library is filtered to, else the last used in
 *  this corpus, else the corpus default). The template is chosen and changed
 *  in the form itself, as its first field — there is no dialog step.
 *
 *  The chevron opens the recent templates, for readers who switch between two
 *  or three, and "All templates…" for the searchable list. When the preset
 *  comes from a filter, the label says so ("Create Audiencia"). */
export function CreateEntityButton({
  preset,
  named,
  recent,
  types,
  onCreate,
  onAll,
  extra,
}: {
  /** The template the main half creates. */
  preset: string;
  /** Name the template on the button (the Library is filtered to it). */
  named: boolean;
  /** Recently used template ids, newest first. */
  recent: string[];
  types: EntityType[];
  onCreate: (typeId: string) => void;
  onAll: () => void;
  /** More entries at the end of the menu (the batch entry). */
  extra?: { label: string; onSelect: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const typeOf = (id: string) => types.find((t) => t.id === id);
  const presetName = typeOf(preset)?.name ?? "entity";
  const label = named ? `Create ${presetName}` : "Create entity";
  const listed = recent.filter((id) => typeOf(id));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = (fn: () => void) => {
    setOpen(false);
    // The menu item is about to unmount. Focus goes back to the chevron
    // FIRST, so a dialog the item opens (Batch entry) captures the chevron as
    // its trigger and returns focus there on close, not to <body>.
    triggerRef.current?.focus();
    fn();
  };

  return (
    <div ref={wrapRef} data-component="CreateEntityButton" className="relative hidden sm:flex shrink-0 items-center">
      <button
        type="button"
        onClick={() => onCreate(preset)}
        aria-label={label}
        title={named ? undefined : `New ${presetName}`}
        className={`flex items-center gap-1.5 ps-2.5 @[44rem]:ps-3 pe-1.5 py-1.5 text-xs font-medium ${BAR_LEAD} rounded-s-md transition-colors cursor-pointer`}
      >
        <Plus size={13} className="text-ink-tertiary" aria-hidden />
        <span className="hidden @[44rem]:inline">{label}</span>
      </button>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Choose a template to create"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center px-1 py-1.5 ${BAR_GHOST} aria-expanded:bg-warm rounded-e-md transition-colors cursor-pointer`}
      >
        <ChevronDown size={12} className="text-ink-tertiary" aria-hidden />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Create entity"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              triggerRef.current?.focus();
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
              const i = items.indexOf(document.activeElement as HTMLElement);
              items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
            }
          }}
          className="absolute bottom-full start-0 mb-1.5 z-30 w-60 p-1 bg-paper rounded-md border border-border shadow-lg"
        >
          {listed.length > 0 && (
            <p className="px-2.5 pt-1.5 pb-1 text-meta font-semibold uppercase tracking-wider text-ink-tertiary">Recent</p>
          )}
          {listed.map((id) => {
            const t = typeOf(id)!;
            return (
              <button
                key={id}
                type="button"
                role="menuitem"
                onClick={() => pick(() => onCreate(id))}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-start text-xs text-ink rounded-sm hover:bg-parchment focus:bg-parchment focus:outline-none cursor-pointer"
              >
                <span aria-hidden className="w-2 h-2 rounded-[2px] shrink-0" style={{ backgroundColor: t.color }} />
                <span className="truncate">{t.name}</span>
              </button>
            );
          })}
          {listed.length > 0 && <div className="my-1 h-px bg-border-soft" aria-hidden />}
          <button
            type="button"
            role="menuitem"
            onClick={() => pick(onAll)}
            className="w-full flex items-center px-2.5 py-1.5 text-start text-xs text-ink rounded-sm hover:bg-parchment focus:bg-parchment focus:outline-none cursor-pointer"
          >
            All templates…
          </button>
          {extra?.map((x) => (
            <button
              key={x.label}
              type="button"
              role="menuitem"
              onClick={() => pick(x.onSelect)}
              className="w-full flex items-center px-2.5 py-1.5 text-start text-xs text-ink rounded-sm hover:bg-parchment focus:bg-parchment focus:outline-none cursor-pointer"
            >
              {x.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
