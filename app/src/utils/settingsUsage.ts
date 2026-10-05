/** What a settings delete would touch, as plain functions over the stores'
 *  data (the atoms are in `atoms/settingsUsage.ts`). This stage carries the
 *  users and groups part; templates, properties, thesauri, relationship types
 *  and languages join with their stores. */

/** "1 entity", "412 entities". */
export const count = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** "A", "A and B", "A, B and 3 more". */
export function nameList(names: string[], max = 3): string {
  const u = [...new Set(names)];
  if (u.length <= 1) return u[0] ?? "";
  if (u.length <= max) return `${u.slice(0, -1).join(", ")} and ${u[u.length - 1]}`;
  return `${u.slice(0, max).join(", ")} and ${u.length - max} more`;
}

/** What a delete would touch, and whether Uwazi refuses it. `lines` are the
 *  facts the dialog lists; `block` is the rule that stops the delete. */
export interface Impact {
  lines: string[];
  block: string | null;
}

/* ── Users and groups ──────────────────────────────────────────────────── */

export function groupUsage({ members, shares }: { members: string[]; shares: number }): Impact {
  const lines: string[] = [];
  if (members.length) lines.push(`${count(members.length, "member loses", "members lose")} this group: ${nameList(members)}.`);
  if (shares) lines.push(`Shared with ${count(shares, "entity", "entities")}. That access is removed.`);
  return { lines, block: null };
}

export function userUsage({ block, groups, shares }: { block: string | null; groups: string[]; shares: number }): Impact {
  const lines: string[] = [];
  if (groups.length) lines.push(`Member of ${nameList(groups)}.`);
  if (shares) lines.push(`Shared with ${count(shares, "entity", "entities")}. That access is removed.`);
  return { lines, block };
}
