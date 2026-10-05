/* The thesaurus editor's value tree, as pure operations on ids.
 *
 * Uwazi thesauri nest one level: a root list of values and groups, each
 * group holding values. Every operation here addresses rows by id, never by
 * position, so a filtered view (search), a windowed view (2,443 values) and
 * an Undo issued after other edits all land on the right row. */

export interface TreeItem {
  id: string;
  label: string;
  /** Present on a group (possibly empty). */
  children?: TreeItem[];
}

export const isGroup = (it: TreeItem) => Array.isArray(it.children);

/** Where an item sits: its group's id (null at the root) and its index. */
export interface Place {
  parentId: string | null;
  index: number;
}

export function placeOf(items: TreeItem[], id: string): Place | null {
  const i = items.findIndex((x) => x.id === id);
  if (i >= 0) return { parentId: null, index: i };
  for (const g of items) {
    const j = g.children?.findIndex((c) => c.id === id) ?? -1;
    if (j >= 0) return { parentId: g.id, index: j };
  }
  return null;
}

export function findItem(items: TreeItem[], id: string): TreeItem | undefined {
  for (const it of items) {
    if (it.id === id) return it;
    const c = it.children?.find((x) => x.id === id);
    if (c) return c;
  }
  return undefined;
}

/** The list an item lives in (the root, or its group's children). */
export function siblingsOf(items: TreeItem[], parentId: string | null): TreeItem[] {
  return parentId === null ? items : (items.find((g) => g.id === parentId)?.children ?? []);
}

function withList(items: TreeItem[], parentId: string | null, change: (list: TreeItem[]) => TreeItem[]): TreeItem[] {
  if (parentId === null) return change(items);
  return items.map((g) => (g.id === parentId && g.children ? { ...g, children: change(g.children) } : g));
}

export function patchLabel(items: TreeItem[], id: string, label: string): TreeItem[] {
  const at = placeOf(items, id);
  if (!at) return items;
  return withList(items, at.parentId, (list) => list.map((x) => (x.id === id ? { ...x, label } : x)));
}

/** Insert `item` into `parentId`'s list, after `afterId` (null: first). A
 *  group never goes inside a group: it lands at the root. */
export function insertAfter(
  items: TreeItem[],
  parentId: string | null,
  afterId: string | null,
  item: TreeItem,
  /** Where to go if the anchor has gone: the anchor's old index. */
  fallback?: number,
): TreeItem[] {
  const parent = isGroup(item) || (parentId !== null && !items.some((g) => g.id === parentId && g.children)) ? null : parentId;
  return withList(items, parent, (list) => {
    const i = afterId === null ? -1 : list.findIndex((x) => x.id === afterId);
    // An anchor that has gone (removed since) puts the item where the anchor
    // was, else at the end.
    const at = afterId === null ? 0 : i >= 0 ? i + 1 : Math.min(fallback ?? list.length, list.length);
    return [...list.slice(0, at), item, ...list.slice(at)];
  });
}

/** Move an item to position `to` within its own list. */
export function moveWithin(items: TreeItem[], id: string, to: number): TreeItem[] {
  const at = placeOf(items, id);
  if (!at) return items;
  return withList(items, at.parentId, (list) => {
    if (to < 0 || to >= list.length || to === at.index) return list;
    const next = [...list];
    const [moved] = next.splice(at.index, 1);
    next.splice(to, 0, moved);
    return next;
  });
}

/** One removed row, with what puts it back where it was. */
export interface Removed {
  item: TreeItem;
  parentId: string | null;
  /** The sibling before it at removal time (null: it was first). */
  afterId: string | null;
}

/** Remove rows by id. A group goes with its values. Returns the removals in
 *  tree order, so restoring them in order rebuilds the same sequence. */
export function removeIds(items: TreeItem[], ids: ReadonlySet<string>): { items: TreeItem[]; removed: Removed[] } {
  const removed: Removed[] = [];
  const rootKeep: TreeItem[] = [];
  let prevRoot: string | null = null;
  for (const it of items) {
    if (ids.has(it.id)) {
      removed.push({ item: it, parentId: null, afterId: prevRoot });
      continue;
    }
    if (it.children) {
      const kids: TreeItem[] = [];
      let prev: string | null = null;
      for (const c of it.children) {
        if (ids.has(c.id)) removed.push({ item: c, parentId: it.id, afterId: prev });
        else {
          kids.push(c);
          prev = c.id;
        }
      }
      rootKeep.push(kids.length === it.children.length ? it : { ...it, children: kids });
    } else rootKeep.push(it);
    prevRoot = it.id;
  }
  return { items: rootKeep, removed };
}

/** Put removed rows back, skipping any that are present again. A value whose
 *  group has gone returns to the root. */
export function restore(items: TreeItem[], removed: Removed[]): TreeItem[] {
  let next = items;
  for (const r of removed) {
    if (findItem(next, r.item.id)) continue;
    const parentOk = r.parentId === null || next.some((g) => g.id === r.parentId);
    next = insertAfter(next, parentOk ? r.parentId : null, parentOk ? r.afterId : null, r.item);
  }
  return next;
}

/** Move values into a group (null: the root), appended at its end in tree
 *  order. Groups are not moved (one level only); they are returned as
 *  `skipped`. */
export function moveToGroup(
  items: TreeItem[],
  ids: ReadonlySet<string>,
  groupId: string | null,
): { items: TreeItem[]; moved: string[]; skipped: string[] } {
  const skipped: string[] = [];
  const movable = new Set<string>();
  for (const id of ids) {
    const it = findItem(items, id);
    if (!it) continue;
    if (isGroup(it)) skipped.push(id);
    else if (placeOf(items, id)?.parentId !== groupId) movable.add(id);
  }
  if (!movable.size) return { items, moved: [], skipped };
  const { items: without, removed } = removeIds(items, movable);
  const values = removed.map((r) => r.item);
  const next =
    groupId === null
      ? [...without, ...values]
      : without.map((g) => (g.id === groupId && g.children ? { ...g, children: [...g.children, ...values] } : g));
  return { items: next, moved: values.map((v) => v.id), skipped };
}

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

/** A–Z by the reader's locale (accents and case folded, numbers in order),
 *  the root and every group's values. Uwazi's Sort is code-point order. */
export function sortAZ(items: TreeItem[]): TreeItem[] {
  const by = (a: TreeItem, b: TreeItem) => collator.compare(a.label, b.label);
  return [...items]
    .map((it) => (it.children ? { ...it, children: [...it.children].sort(by) } : it))
    .sort(by);
}

/** Folded for matching and for the A–Z index: accents and case ignored. */
export const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** The letter a label files under in the A–Z index; "#" for anything that
 *  does not start with a Latin letter. */
export function initialOf(label: string): string {
  const c = fold(label.trim()).charAt(0).toUpperCase();
  return c >= "A" && c <= "Z" ? c : "#";
}

/** One rendered row of the tree. */
export type TreeRow =
  | { kind: "group"; item: TreeItem; index: number; count: number; open: boolean; childCount: number }
  | { kind: "value"; item: TreeItem; index: number; count: number; parentId: string | null }
  | { kind: "empty"; parentId: string };

/** The rows to draw: collapsed groups hide their values; a query keeps the
 *  values that match (and their groups, open), plus `keep` (the row being
 *  edited, so it never vanishes under the cursor). */
export function flatten(
  items: TreeItem[],
  { collapsed, query, keep }: { collapsed: ReadonlySet<string>; query: string; keep?: string | null },
): TreeRow[] {
  const q = fold(query.trim());
  const hit = (it: TreeItem) => !q || it.id === keep || fold(it.label).includes(q);
  const rows: TreeRow[] = [];
  items.forEach((it, index) => {
    if (it.children) {
      const kids = it.children;
      const shownKids = q ? kids.filter(hit) : kids;
      if (q && !hit(it) && shownKids.length === 0) return;
      const open = q ? true : !collapsed.has(it.id);
      rows.push({ kind: "group", item: it, index, count: items.length, open, childCount: kids.length });
      if (!open) return;
      // A group whose own name matched shows all its values.
      const list = q && hit(it) ? kids : shownKids;
      list.forEach((c) =>
        rows.push({ kind: "value", item: c, index: kids.indexOf(c), count: kids.length, parentId: it.id }),
      );
      if (!q && kids.length === 0) rows.push({ kind: "empty", parentId: it.id });
    } else if (hit(it)) rows.push({ kind: "value", item: it, index, count: items.length, parentId: null });
  });
  return rows;
}

/** Values and groups, groups counted beside their values (Settings' count). */
export const countTree = (items: TreeItem[]) => items.reduce((n, it) => n + 1 + (it.children?.length ?? 0), 0);
