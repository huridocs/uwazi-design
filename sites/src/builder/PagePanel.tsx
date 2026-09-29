/* The page being edited: its settings, then its blocks in order. A block
 * opens in place to edit; drag or arrow keys reorder it. */
import { useEffect, useRef, useState } from "react";
import { ChevronRight, Copy, Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
import type { Block, BlockType, Page } from "../model/config";
import { newId } from "../model/config";
import { BLOCKS, makeBlock, type BlockGroup } from "../model/blocks";
import { BlockForm, blockSummary } from "./BlockForm";
import { L10nField, TextField, useBuilder } from "./fields";
import { duplicateBlock, moveBlock, onBlock, onPage, type Editor } from "./state";
import { Disclosure, IconButton, Modal } from "./ui";
import { tr } from "../model/config";

export function PagePanel({ page, editor, selected, onSelect }: { page: Page; editor: Editor; selected?: string; onSelect: (id?: string) => void }) {
  const { config, lang, templates } = useBuilder();
  const t = (x: Parameters<typeof tr>[0]) => tr(x, lang, config.defaultLanguage);
  const [adding, setAdding] = useState(false);
  const [settings, setSettings] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [drag, setDrag] = useState<{ id: string; over: number } | null>(null);
  const list = useRef<HTMLOListElement>(null);
  const tname = (id?: string) => templates.find((x) => x.id === id)?.name ?? "";

  // Keep the selected block's row in view when it is picked in the preview.
  useEffect(() => {
    if (!selected) return;
    list.current?.querySelector(`[data-row="${selected}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  const move = (b: Block, to: number, focus = true) => {
    editor.edit(moveBlock(page.id, b.id, to));
    setAnnounce(`${BLOCKS[b.type].label} moved to position ${to + 1} of ${page.blocks.length}.`);
    if (focus) requestAnimationFrame(() => list.current?.querySelector<HTMLElement>(`[data-grip="${b.id}"]`)?.focus());
  };

  const insert = (type: BlockType) => {
    const main = page.template ?? config.pages.find((p) => p.kind === "list")?.template;
    const b = makeBlock(type, main);
    const at = selected ? page.blocks.findIndex((x) => x.id === selected) + 1 : page.blocks.length;
    editor.edit(onPage(page.id, (p) => ({ ...p, blocks: [...p.blocks.slice(0, at), b, ...p.blocks.slice(at)] })));
    setAdding(false);
    onSelect(b.id);
  };

  return (
    <div className="flex flex-col">
      <Disclosure title="Page settings" open={settings} onToggle={() => setSettings((o) => !o)} aside={page.kind === "home" ? "/" : page.kind === "entity" ? "/entity/…" : `/${page.slug}`}>
        <L10nField label="Title" value={page.title} onChange={(title) => editor.edit(onPage(page.id, (p) => ({ ...p, title })), `${page.id}:title`)} />
        {page.kind === "list" || page.kind === "about" || page.kind === "custom" ? (
          <TextField
            label="Address"
            value={page.slug}
            onChange={(v) => editor.edit(onPage(page.id, (p) => ({ ...p, slug: v.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+/, "") })), `${page.id}:slug`)}
            hint={`Shown as /${page.slug || "…"}`}
          />
        ) : null}
        <L10nField label="Search engine title" value={page.seo?.title ?? {}} onChange={(title) => editor.edit(onPage(page.id, (p) => ({ ...p, seo: { title, description: p.seo?.description ?? {}, image: p.seo?.image } })), `${page.id}:seo-title`)} hint="Leave empty to use the page title." />
        <L10nField label="Search engine description" long value={page.seo?.description ?? {}} onChange={(description) => editor.edit(onPage(page.id, (p) => ({ ...p, seo: { title: p.seo?.title ?? {}, description, image: p.seo?.image } })), `${page.id}:seo-desc`)} />
      </Disclosure>

      <div className="flex items-center h-10 mt-1">
        <h3 className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">Blocks</h3>
        {page.kind === "entity" ? <span className="ms-2 text-[0.6875rem] text-ink-muted">shown on every record</span> : null}
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {page.blocks.length ? (
        <ol ref={list} className="flex flex-col gap-0.5" onDragOver={(e) => e.preventDefault()}>
          {page.blocks.map((b, i) => {
            const open = selected === b.id;
            const def = BLOCKS[b.type];
            const summary = blockSummary(b, t, tname);
            return (
              <li
                key={b.id}
                data-row={b.id}
                onDragOver={(e) => {
                  if (!drag) return;
                  e.preventDefault();
                  const r = e.currentTarget.getBoundingClientRect();
                  const over = e.clientY < r.top + r.height / 2 ? i : i + 1;
                  if (over !== drag.over) setDrag({ ...drag, over });
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!drag) return;
                  const from = page.blocks.findIndex((x) => x.id === drag.id);
                  const to = drag.over > from ? drag.over - 1 : drag.over;
                  if (to !== from) move(page.blocks[from], to, false);
                  setDrag(null);
                }}
                className="relative"
              >
                {drag && drag.over === i ? <span aria-hidden className="absolute -top-[2px] inset-x-1 h-[3px] rounded-full bg-carbon" /> : null}
                {drag && drag.over === page.blocks.length && i === page.blocks.length - 1 ? <span aria-hidden className="absolute -bottom-[2px] inset-x-1 h-[3px] rounded-full bg-carbon" /> : null}
                <div className={`group flex items-center gap-0.5 rounded-md min-h-10 transition-colors ${open ? "bg-parchment" : "hover:bg-warm"} ${drag?.id === b.id ? "opacity-40" : ""}`}>
                  <button
                    type="button"
                    data-grip={b.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", b.id);
                      setDrag({ id: b.id, over: i });
                    }}
                    onDragEnd={() => setDrag(null)}
                    onKeyDown={(e) => {
                      if (e.key === "ArrowUp" && i > 0) {
                        e.preventDefault();
                        move(b, i - 1);
                      }
                      if (e.key === "ArrowDown" && i < page.blocks.length - 1) {
                        e.preventDefault();
                        move(b, i + 1);
                      }
                    }}
                    aria-label={`Move ${def.label}, ${i + 1} of ${page.blocks.length}. Use the up and down arrow keys.`}
                    className="w-6 h-8 grid place-items-center rounded text-ink-muted hover:text-ink cursor-grab active:cursor-grabbing shrink-0"
                  >
                    <GripVertical size={14} aria-hidden />
                  </button>
                  <button type="button" aria-expanded={open} onClick={() => onSelect(open ? undefined : b.id)} className="flex-1 min-w-0 flex items-center gap-2 text-start py-1.5">
                    <ChevronRight size={13} aria-hidden className={`shrink-0 text-ink-muted transition-transform ${open ? "rotate-90" : "rtl:rotate-180"}`} />
                    <span className="min-w-0 flex flex-col">
                      <span className={`text-sm ${b.hidden ? "text-ink-muted line-through decoration-ink-muted/60" : "text-ink"}`}>{def.label}</span>
                      {summary ? <span className="text-[0.6875rem] text-ink-tertiary truncate">{summary}</span> : null}
                    </span>
                  </button>
                  <span className={`flex items-center pe-1 ${b.hidden ? "" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"} ${open ? "opacity-100" : ""}`}>
                    <IconButton label={b.hidden ? `Show ${def.label}` : `Hide ${def.label}`} onClick={() => editor.edit(onBlock(page.id, b.id, (x) => ({ ...x, hidden: !x.hidden })))}>
                      {b.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                    </IconButton>
                    <IconButton
                      label={`Duplicate ${def.label}`}
                      onClick={() => {
                        const id = newId();
                        editor.edit(duplicateBlock(page.id, b.id, id));
                        onSelect(id);
                      }}
                    >
                      <Copy size={14} />
                    </IconButton>
                    <IconButton
                      label={`Delete ${def.label}`}
                      className="hover:text-seal-label"
                      onClick={() => {
                        editor.edit(onPage(page.id, (p) => ({ ...p, blocks: p.blocks.filter((x) => x.id !== b.id) })));
                        setAnnounce(`${def.label} deleted. Undo with Command Z.`);
                        if (open) onSelect(undefined);
                      }}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </span>
                </div>
                {open ? (
                  <div className="ps-7 pe-1 pt-2 pb-4">
                    <BlockForm block={b} onChange={(props, tag) => editor.edit(onBlock(page.id, b.id, (x) => ({ ...x, props }) as Block), tag)} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-ink-tertiary py-3">This page has no blocks yet. Add one to start.</p>
      )}

      <button type="button" onClick={() => setAdding(true)} className="mt-2 flex items-center justify-center gap-1.5 h-9 rounded-md border border-dashed border-border-soft text-sm text-ink-secondary hover:text-ink hover:border-ink/30 hover:bg-warm">
        <Plus size={14} aria-hidden /> Add block
      </button>

      {adding ? <AddBlock kind={page.kind} onPick={insert} onClose={() => setAdding(false)} /> : null}
    </div>
  );
}

const GROUPS: BlockGroup[] = ["Content", "Collection", "Action", "Entity"];

function AddBlock({ kind, onPick, onClose }: { kind: Page["kind"]; onPick: (t: BlockType) => void; onClose: () => void }) {
  const types = (Object.keys(BLOCKS) as BlockType[]).filter((t) => BLOCKS[t].on.includes(kind));
  return (
    <Modal title="Add a block" subtitle="It goes after the open block, or at the end." onClose={onClose} size="lg">
      <div className="flex flex-col gap-5">
        {GROUPS.map((g) => {
          const items = types.filter((t) => BLOCKS[t].group === g);
          if (!items.length) return null;
          return (
            <section key={g} className="flex flex-col gap-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-ink-tertiary">{g === "Entity" ? "The record" : g}</h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {items.map((t) => (
                  <li key={t}>
                    <button type="button" onClick={() => onPick(t)} className="w-full h-full text-start flex flex-col gap-0.5 rounded-md border border-border-soft bg-paper px-3 py-2.5 hover:bg-warm hover:border-ink/25">
                      <span className="text-sm font-medium text-ink">{BLOCKS[t].label}</span>
                      <span className="text-xs text-ink-tertiary">{BLOCKS[t].hint}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </Modal>
  );
}
