import type { SettingsMenuLink, SettingsMenuSublink } from "../data/settings";

/** Pure operations on the navbar menu tree (Settings › Menu). A tree is a list
 *  of top-level items; a group holds links in `sublinks`; groups never nest
 *  and a link never holds sublinks (Uwazi's `menuItems` rules). Every function
 *  returns a new tree and leaves the input alone. */
export type MenuTree = SettingsMenuLink[];

export type MenuRow =
  | { kind: "top"; id: string; item: SettingsMenuLink; index: number }
  | { kind: "sub"; id: string; sub: SettingsMenuSublink; parent: SettingsMenuLink; index: number };

/** The rows in display order: each group followed by its links. */
export function flattenMenu(tree: MenuTree): MenuRow[] {
  const rows: MenuRow[] = [];
  tree.forEach((item, index) => {
    rows.push({ kind: "top", id: item.id, item, index });
    if (item.type === "group")
      item.sublinks.forEach((sub, i) => rows.push({ kind: "sub", id: sub.id, sub, parent: item, index: i }));
  });
  return rows;
}

const asSub = (l: SettingsMenuLink | SettingsMenuSublink): SettingsMenuSublink => ({ id: l.id, title: l.title, url: l.url });
const asTop = (s: SettingsMenuSublink): SettingsMenuLink => ({ ...asSub(s), type: "link", sublinks: [] });

/** Where an id sits: top-level index, or group index plus link index. */
function locate(tree: MenuTree, id: string): { t: number; s: number | null } | null {
  for (let t = 0; t < tree.length; t++) {
    if (tree[t].id === id) return { t, s: null };
    const s = tree[t].sublinks.findIndex((x) => x.id === id);
    if (s >= 0) return { t, s };
  }
  return null;
}

const withSublinks = (g: SettingsMenuLink, sublinks: SettingsMenuSublink[]): SettingsMenuLink => ({ ...g, sublinks });

/** One keyboard step. A link moving past a group goes into it (down: first
 *  link; up: last link); a group's first or last link steps out to the top
 *  level beside its group. A group moves with its links and stays top level. */
export function moveMenuStep(tree: MenuTree, id: string, dir: -1 | 1): MenuTree {
  const at = locate(tree, id);
  if (!at) return tree;
  const next = [...tree];
  if (at.s === null) {
    const item = tree[at.t];
    const n = at.t + dir;
    if (n < 0 || n >= tree.length) return tree;
    const neighbour = tree[n];
    if (item.type === "link" && neighbour.type === "group") {
      next.splice(at.t, 1);
      const gi = next.findIndex((x) => x.id === neighbour.id);
      const subs = dir === 1 ? [asSub(item), ...neighbour.sublinks] : [...neighbour.sublinks, asSub(item)];
      next[gi] = withSublinks(neighbour, subs);
      return next;
    }
    next[at.t] = neighbour;
    next[n] = item;
    return next;
  }
  const group = tree[at.t];
  const subs = [...group.sublinks];
  const n = at.s + dir;
  if (n >= 0 && n < subs.length) {
    [subs[at.s], subs[n]] = [subs[n], subs[at.s]];
    next[at.t] = withSublinks(group, subs);
    return next;
  }
  const [moved] = subs.splice(at.s, 1);
  next[at.t] = withSublinks(group, subs);
  next.splice(dir === 1 ? at.t + 1 : at.t, 0, asTop(moved));
  return next;
}

/** Whether a step would change anything (the Move buttons' disabled state). */
export const canMoveMenuStep = (tree: MenuTree, id: string, dir: -1 | 1) => moveMenuStep(tree, id, dir) !== tree;

/** A drag dropped `dragId` on the row `targetId`. Moving down places it after
 *  the target, moving up before it. A link dropped on a group goes into it as
 *  its first link; a group dropped on a group's link is ignored (groups do
 *  not nest). */
export function dropMenuItem(tree: MenuTree, dragId: string, targetId: string): MenuTree {
  if (dragId === targetId) return tree;
  const rows = flattenMenu(tree);
  const from = rows.findIndex((r) => r.id === dragId);
  const to = rows.findIndex((r) => r.id === targetId);
  if (from < 0 || to < 0) return tree;
  const drag = rows[from];
  const target = rows[to];
  const after = from < to;
  const isGroup = drag.kind === "top" && drag.item.type === "group";
  if (isGroup && target.kind === "sub") return tree;
  if (isGroup && target.kind === "top" && drag.kind === "top" && target.item.id === drag.item.id) return tree;

  // Take the dragged item out.
  const at = locate(tree, dragId)!;
  let next = [...tree];
  let moving: SettingsMenuLink;
  if (at.s === null) {
    moving = next[at.t];
    next.splice(at.t, 1);
  } else {
    const g = next[at.t];
    moving = asTop(g.sublinks[at.s]);
    next[at.t] = withSublinks(g, g.sublinks.filter((_, i) => i !== at.s));
  }

  const tAt = locate(next, targetId);
  if (!tAt) return tree;
  if (tAt.s === null) {
    const targetItem = next[tAt.t];
    if (moving.type === "link" && targetItem.type === "group") {
      next[tAt.t] = withSublinks(targetItem, [asSub(moving), ...targetItem.sublinks]);
      return next;
    }
    next.splice(after ? tAt.t + 1 : tAt.t, 0, moving);
    return next;
  }
  const g = next[tAt.t];
  const subs = [...g.sublinks];
  subs.splice(after ? tAt.s + 1 : tAt.s, 0, asSub(moving));
  next = [...next];
  next[tAt.t] = withSublinks(g, subs);
  return next;
}

/** Add or update a link and put it in `groupId` (null = top level). A new
 *  link goes last; an edited link keeps its place unless its group changed,
 *  then it goes last in the new place. */
export function placeMenuLink(
  tree: MenuTree,
  link: { id: string; title: string; url: string },
  groupId: string | null,
): MenuTree {
  const at = locate(tree, link.id);
  const currentGroup = at && at.s !== null ? tree[at.t].id : null;
  if (at && currentGroup === groupId) {
    const next = [...tree];
    if (at.s === null) next[at.t] = { ...next[at.t], title: link.title, url: link.url };
    else
      next[at.t] = withSublinks(
        next[at.t],
        next[at.t].sublinks.map((s) => (s.id === link.id ? asSub(link) : s)),
      );
    return next;
  }
  const next = at ? removeMenuItems(tree, new Set([link.id])) : [...tree];
  if (groupId === null) return [...next, { ...asSub(link), type: "link", sublinks: [] }];
  return next.map((g) => (g.id === groupId ? withSublinks(g, [...g.sublinks, asSub(link)]) : g));
}

/** Drop the ticked rows; a ticked group takes its links with it. */
export function removeMenuItems(tree: MenuTree, ids: ReadonlySet<string>): MenuTree {
  return tree
    .filter((i) => !ids.has(i.id))
    .map((i) => (i.type === "group" && i.sublinks.some((s) => ids.has(s.id)) ? withSublinks(i, i.sublinks.filter((s) => !ids.has(s.id))) : i));
}

/** What a removal took, to put it back where it was (the Beacon's Undo). */
export interface MenuRemoval {
  top: { index: number; item: SettingsMenuLink }[];
  subs: { groupId: string; index: number; sub: SettingsMenuSublink }[];
}

export function menuRemoval(tree: MenuTree, ids: ReadonlySet<string>): MenuRemoval {
  const top: MenuRemoval["top"] = [];
  const subs: MenuRemoval["subs"] = [];
  tree.forEach((item, index) => {
    if (ids.has(item.id)) top.push({ index, item });
    else item.sublinks.forEach((sub, i) => ids.has(sub.id) && subs.push({ groupId: item.id, index: i, sub }));
  });
  return { top, subs };
}

export function restoreMenuRemoval(tree: MenuTree, r: MenuRemoval): MenuTree {
  const next = [...tree];
  for (const { index, item } of r.top) if (!next.some((x) => x.id === item.id)) next.splice(Math.min(index, next.length), 0, item);
  return next.map((g) => {
    const mine = r.subs.filter((s) => s.groupId === g.id && !g.sublinks.some((x) => x.id === s.sub.id));
    if (!mine.length) return g;
    const subs = [...g.sublinks];
    for (const { index, sub } of mine) subs.splice(Math.min(index, subs.length), 0, sub);
    return withSublinks(g, subs);
  });
}
