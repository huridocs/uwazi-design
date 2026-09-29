/* The editor's state: the site document, plus undo/redo over the draft.
 * Every edit goes through `edit`; typing into one field coalesces into one
 * undo step. Publishing copies the draft and records a version. */
import { useCallback, useEffect, useReducer } from "react";
import type { Block, Page, SiteConfig } from "../model/config";
import { newId } from "../model/config";
import { BLOCKS } from "../model/blocks";
import { siteType } from "../model/templates";
import { saveDoc, type SiteDoc } from "../lib/store";

interface State {
  doc: SiteDoc | null;
  past: SiteConfig[];
  future: SiteConfig[];
  tag?: string;
  at: number;
}

type Action =
  | { type: "create"; config: SiteConfig }
  | { type: "edit"; fn: (c: SiteConfig) => SiteConfig; tag?: string }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "publish" }
  | { type: "restore"; versionId: string }
  | { type: "discard" }
  | { type: "reset" };

const CAP = 100;

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "create":
      return { doc: { draft: a.config, published: null, versions: [] }, past: [], future: [], at: 0 };
    case "reset":
      return { doc: null, past: [], future: [], at: 0 };
    case "edit": {
      if (!s.doc) return s;
      const next = a.fn(s.doc.draft);
      if (next === s.doc.draft) return s;
      const now = Date.now();
      // Same field, within a moment: one step, not one per keystroke.
      const coalesce = a.tag && a.tag === s.tag && now - s.at < 1200;
      return {
        doc: { ...s.doc, draft: next },
        past: coalesce ? s.past : [...s.past, s.doc.draft].slice(-CAP),
        future: [],
        tag: a.tag,
        at: now,
      };
    }
    case "undo": {
      if (!s.doc || !s.past.length) return s;
      const prev = s.past[s.past.length - 1];
      return { doc: { ...s.doc, draft: prev }, past: s.past.slice(0, -1), future: [s.doc.draft, ...s.future], tag: undefined, at: 0 };
    }
    case "redo": {
      if (!s.doc || !s.future.length) return s;
      const [next, ...rest] = s.future;
      return { doc: { ...s.doc, draft: next }, past: [...s.past, s.doc.draft], future: rest, tag: undefined, at: 0 };
    }
    case "publish": {
      if (!s.doc) return s;
      const changes = diff(s.doc.published, s.doc.draft);
      const v = { id: newId("v"), at: Date.now(), config: s.doc.draft, changes };
      return { ...s, doc: { ...s.doc, published: s.doc.draft, versions: [v, ...s.doc.versions].slice(0, 50) }, tag: undefined };
    }
    case "restore": {
      if (!s.doc) return s;
      const v = s.doc.versions.find((x) => x.id === a.versionId);
      if (!v) return s;
      return { ...s, doc: { ...s.doc, draft: v.config }, past: [...s.past, s.doc.draft], future: [], tag: undefined };
    }
    case "discard": {
      if (!s.doc?.published) return s;
      return { ...s, doc: { ...s.doc, draft: s.doc.published }, past: [...s.past, s.doc.draft], future: [], tag: undefined };
    }
  }
}

export function useEditor(initial: SiteDoc | null) {
  const [s, dispatch] = useReducer(reducer, { doc: initial, past: [], future: [], at: 0 });
  useEffect(() => {
    const t = setTimeout(() => saveDoc(s.doc), 300);
    return () => clearTimeout(t);
  }, [s.doc]);
  const edit = useCallback((fn: (c: SiteConfig) => SiteConfig, tag?: string) => dispatch({ type: "edit", fn, tag }), []);
  return {
    doc: s.doc,
    canUndo: s.past.length > 0,
    canRedo: s.future.length > 0,
    dispatch,
    edit,
  };
}
export type Editor = ReturnType<typeof useEditor>;

/* ── Edits on pages and blocks ───────────────────────────────────────── */

export const onPage = (pageId: string, fn: (p: Page) => Page) => (c: SiteConfig): SiteConfig => ({
  ...c,
  pages: c.pages.map((p) => (p.id === pageId ? fn(p) : p)),
});

export const onBlock = (pageId: string, blockId: string, fn: (b: Block) => Block) =>
  onPage(pageId, (p) => ({ ...p, blocks: p.blocks.map((b) => (b.id === blockId ? fn(b) : b)) }));

export function moveBlock(pageId: string, blockId: string, to: number) {
  return onPage(pageId, (p) => {
    const from = p.blocks.findIndex((b) => b.id === blockId);
    if (from < 0 || to < 0 || to >= p.blocks.length || from === to) return p;
    const blocks = [...p.blocks];
    const [b] = blocks.splice(from, 1);
    blocks.splice(to, 0, b);
    return { ...p, blocks };
  });
}

export function duplicateBlock(pageId: string, blockId: string, newBlockId: string) {
  return onPage(pageId, (p) => {
    const i = p.blocks.findIndex((b) => b.id === blockId);
    if (i < 0) return p;
    const copy = { ...structuredClone(p.blocks[i]), id: newBlockId };
    return { ...p, blocks: [...p.blocks.slice(0, i + 1), copy, ...p.blocks.slice(i + 1)] };
  });
}

/* ── What changed: the change list before Publish, and each version's notes ── */

export function diff(before: SiteConfig | null, after: SiteConfig): string[] {
  if (!before) return ["First publish"];
  const out: string[] = [];
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (before.template !== after.template) out.push(`Site type: ${siteType(before.template).label} → ${siteType(after.template).label}`);
  if (!same(before.name, after.name) || !same(before.tagline, after.tagline)) out.push("Site name");
  if (!same(before.theme, after.theme)) out.push("Theme");
  if (!same(before.menu, after.menu)) out.push("Menu");
  if (!same(before.footer, after.footer)) out.push("Footer");
  if (!same(before.seo, after.seo)) out.push("Search and sharing");
  if (!same(before.languages, after.languages)) out.push("Languages");
  if (!same(before.advanced, after.advanced)) out.push("Custom code");
  const title = (p: Page) => p.title.en ?? Object.values(p.title)[0] ?? p.slug;
  for (const p of after.pages) {
    const q = before.pages.find((x) => x.id === p.id);
    if (!q) {
      out.push(`${title(p)} · page added`);
      continue;
    }
    if (!same(p.title, q.title) || p.slug !== q.slug || !same(p.seo, q.seo)) out.push(`${title(p)} · page settings`);
    const was = new Map(q.blocks.map((b, i) => [b.id, { b, i }]));
    const oldOrder = q.blocks.map((b) => b.id).filter((id) => p.blocks.some((b) => b.id === id));
    const newOrder = p.blocks.map((b) => b.id).filter((id) => was.has(id));
    const moved = !same(oldOrder, newOrder);
    for (const b of p.blocks) {
      const w = was.get(b.id);
      const label = BLOCKS[b.type].label;
      if (!w) out.push(`${title(p)} · ${label} added`);
      else if (!!w.b.hidden !== !!b.hidden) out.push(`${title(p)} · ${label} ${b.hidden ? "hidden" : "shown"}`);
      else if (!same(w.b.props, b.props)) out.push(`${title(p)} · ${label} edited`);
    }
    for (const b of q.blocks) if (!p.blocks.some((x) => x.id === b.id)) out.push(`${title(p)} · ${BLOCKS[b.type].label} removed`);
    if (moved) out.push(`${title(p)} · blocks reordered`);
  }
  for (const q of before.pages) if (!after.pages.some((x) => x.id === q.id)) out.push(`${title(q)} · page removed`);
  return out;
}
