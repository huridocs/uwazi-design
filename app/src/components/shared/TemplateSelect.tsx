import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import type { EntityType } from "../../data/entities";
import { typeLabelColor } from "../../utils/typeColor";

/** Case- and accent-insensitive: "resolucion" finds "Resolución". */
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const GAP = 4;
const MARGIN = 8;
const MAX_H = 320;

/** A template chooser: a trigger that shows the current template, and a list
 *  that opens OVER the form, never inside it.
 *
 *  The list is portalled to `body` and placed from the trigger's rect with
 *  fixed coordinates: the same width, below it when there is room and above
 *  it when there isn't, clamped to the viewport, re-placed on scroll and
 *  resize. Opening it moves nothing on the page. (It used to render inline
 *  and push every field below it down by the list's height.)
 *
 *  A search box leads the list and takes focus on open; typing on the trigger
 *  opens it with that character typed. The search box is the combobox and
 *  the list its listbox (`aria-activedescendant`): Arrow Up/Down move the
 *  active option, Enter picks it, Escape closes and puts focus back on the
 *  trigger, Tab closes. Matching folds case and accents. Recent templates, if
 *  the host passes them, lead the list under their own heading. */
export function TemplateSelect({
  value,
  onChange,
  types,
  recent = [],
  placeholder = "Select template…",
  id,
}: {
  value: string;
  onChange: (id: string) => void;
  types: EntityType[];
  /** Template ids used recently, newest first; listed first. */
  recent?: string[];
  placeholder?: string;
  /** The trigger's id, for a `<label htmlFor>`. */
  id?: string;
}) {
  const uid = useId();
  const listId = `${uid}-list`;
  const optId = (tid: string) => `${uid}-opt-${tid}`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const current = types.find((t) => t.id === value);

  // What the list shows: recents first (when not searching), then the rest.
  const { recentShown, rest } = useMemo(() => {
    const q = fold(query.trim());
    const match = (t: EntityType) => !q || fold(t.name).includes(q);
    const rec = q ? [] : recent.map((rid) => types.find((t) => t.id === rid)).filter((t): t is EntityType => !!t);
    const recIds = new Set(rec.map((t) => t.id));
    return { recentShown: rec, rest: types.filter((t) => match(t) && !recIds.has(t.id)) };
  }, [query, recent, types]);
  const flat = useMemo(() => [...recentShown, ...rest], [recentShown, rest]);

  const place = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = r.width;
    const left = Math.min(Math.max(MARGIN, r.left), window.innerWidth - width - MARGIN);
    const below = window.innerHeight - r.bottom - GAP - MARGIN;
    const above = r.top - GAP - MARGIN;
    const up = below < Math.min(MAX_H, 200) && above > below;
    const maxH = Math.min(MAX_H, up ? above : below);
    setPos(up ? { left, width, bottom: window.innerHeight - r.top + GAP, maxH } : { left, width, top: r.bottom + GAP, maxH });
  };

  useLayoutEffect(() => {
    if (!open) return;
    place();
    const onMove = () => place();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Focus the search once the panel exists: it renders only after its first
  // placement, one commit after `open`.
  const placed = !!pos;
  useEffect(() => {
    if (open && placed) searchRef.current?.focus();
  }, [open, placed]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // The active option follows the list: the current template on open, the
  // first match while searching.
  useEffect(() => {
    if (!open) return;
    if (!active || !flat.some((t) => t.id === active)) setActive(flat[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, flat]);
  useEffect(() => {
    if (open && active) document.getElementById(optId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  const openWith = (text = "") => {
    setQuery(text);
    setActive(text ? null : value || null);
    setOpen(true);
  };
  const close = (refocus: boolean) => {
    setOpen(false);
    setPos(null);
    setQuery("");
    if (refocus) triggerRef.current?.focus();
  };
  const pick = (tid: string) => {
    close(true);
    if (tid !== value) onChange(tid);
  };

  const onSearchKey = (e: KeyboardEvent<HTMLElement>) => {
    const i = flat.findIndex((t) => t.id === active);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!flat.length) return;
      const next = e.key === "ArrowDown" ? (i + 1) % flat.length : (i - 1 + flat.length) % flat.length;
      setActive(flat[next].id);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active) pick(active);
    } else if (e.key === "Escape") {
      // Handled here: the form, the drawer and a modal around it all listen
      // for Escape, and this one only closes the list.
      e.preventDefault();
      e.stopPropagation();
      close(true);
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  const option = (t: EntityType) => {
    const selected = t.id === value;
    return (
      <li
        key={t.id}
        id={optId(t.id)}
        role="option"
        aria-selected={selected}
        onMouseDown={(e) => e.preventDefault()}
        onMouseEnter={() => setActive(t.id)}
        onClick={() => pick(t.id)}
        className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer ${t.id === active ? "bg-warm" : ""}`}
      >
        <span
          aria-hidden
          className="rounded-[2px] shrink-0 ring-1 ring-inset ring-ink/20 w-[0.4375rem] h-[0.4375rem]"
          style={{ backgroundColor: t.color }}
        />
        <span className="min-w-0 truncate text-sm" style={{ color: typeLabelColor(t.color) }}>
          {t.name}
        </span>
        {selected && <Check size={13} aria-hidden className="ms-auto shrink-0 text-ink-tertiary" />}
      </li>
    );
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        data-part="template-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close(false) : openWith())}
        onKeyDown={(e) => {
          if (open) {
            // The search takes focus a frame after the list opens (it is
            // placed first). Keys typed in that frame land here: a character
            // goes into the search, the rest act on the list as it would.
            if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
              e.preventDefault();
              setQuery((q) => q + e.key);
              searchRef.current?.focus();
            } else onSearchKey(e);
            return;
          }
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openWith();
          } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey && e.key !== " ") {
            e.preventDefault();
            openWith(e.key);
          }
        }}
        className="w-full flex items-center gap-2 px-3 py-2 bg-paper border border-border rounded-md
          text-left hover:bg-warm transition-colors cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-carbon/20"
      >
        {current ? (
          <>
            <span
              aria-hidden
              className="rounded-[2px] shrink-0 ring-1 ring-inset ring-ink/20 w-[0.4375rem] h-[0.4375rem]"
              style={{ backgroundColor: current.color }}
            />
            <span className="text-sm font-medium" style={{ color: typeLabelColor(current.color) }}>
              {current.name}
            </span>
          </>
        ) : (
          <span className="text-sm text-ink-muted">{placeholder}</span>
        )}
        <ChevronDown size={14} aria-hidden className={`ms-auto text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            data-component="TemplateSelect"
            className="fixed z-[70] flex flex-col bg-paper border border-border rounded-md shadow-lg overflow-hidden"
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH }}
          >
            <div className="shrink-0 flex items-center gap-1.5 h-9 px-2.5 border-b border-border">
              <Search size={13} aria-hidden className="text-ink-muted shrink-0" />
              <input
                ref={searchRef}
                role="combobox"
                aria-expanded
                aria-controls={listId}
                aria-activedescendant={active ? optId(active) : undefined}
                aria-autocomplete="list"
                aria-label="Search templates"
                placeholder="Search templates"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKey}
                className="flex-1 min-w-0 bg-transparent text-xs text-ink placeholder:text-ink-muted focus:outline-none"
              />
            </div>
            <ul id={listId} role="listbox" aria-label="Templates" className="flex-1 min-h-0 overflow-auto py-1">
              {recentShown.length > 0 && (
                <li role="presentation" className="px-3 pt-1 pb-0.5 text-meta font-semibold uppercase tracking-wider text-ink-tertiary">
                  Recent
                </li>
              )}
              {recentShown.map(option)}
              {recentShown.length > 0 && rest.length > 0 && (
                <li role="presentation" className="px-3 pt-2 pb-0.5 text-meta font-semibold uppercase tracking-wider text-ink-tertiary">
                  All templates
                </li>
              )}
              {rest.map(option)}
              {flat.length === 0 && (
                <li role="presentation" className="px-3 py-3 text-xs text-ink-muted">
                  No templates match “{query.trim()}”.
                </li>
              )}
            </ul>
          </div>,
          document.body,
        )}
    </>
  );
}
