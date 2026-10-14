// Reads a seed's data/hubs.json (Research's n-ary relations: one anchor
// record and the references that join it to two or more members, all of one
// relationship type) and checks it against the seed's references. Shared by
// build-nepal-corpus.mjs and build-vegas-corpus.mjs. The file is optional: a
// seed without it builds with no hubs.
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/** Returns `hubOf` (seed reference id → hub id) and the problems found. */
export function readSeedHubs(seedDir, seedRefs, isRecord) {
  const hubOf = new Map();
  const errors = [];
  const path = join(seedDir, "hubs.json");
  if (!existsSync(path)) return { hubOf, errors, hubs: 0 };
  const { hubs = [] } = JSON.parse(readFileSync(path, "utf8"));
  const refById = new Map(seedRefs.map((r) => [r.id, r]));
  const hubIds = new Set();
  for (const h of hubs) {
    const ctx = `hubs.json ${h.id}`;
    if (hubIds.has(h.id)) errors.push(`${ctx}: the id is used twice`);
    hubIds.add(h.id);
    if (!isRecord(h.anchor)) errors.push(`${ctx}: anchor ${h.anchor} is not a record`);
    const members = new Set(h.memberIds ?? []);
    if (members.size !== (h.memberIds ?? []).length) errors.push(`${ctx}: a member is listed twice`);
    if (members.size < 2) errors.push(`${ctx}: fewer than 2 members`);
    const reached = new Set();
    for (const id of h.refIds ?? []) {
      const r = refById.get(id);
      if (!r) {
        errors.push(`${ctx}: ${id} is not a reference`);
        continue;
      }
      if (hubOf.has(id)) errors.push(`${ctx}: ${id} is also in ${hubOf.get(id)}`);
      else hubOf.set(id, h.id);
      if (r.type !== h.relationType) errors.push(`${ctx}: ${id} is ${r.type}, not ${h.relationType}`);
      if (r.from !== h.anchor && r.to !== h.anchor) {
        errors.push(`${ctx}: ${id} does not have the anchor at either end`);
        continue;
      }
      const other = r.from === h.anchor ? r.to : r.from;
      if (!members.has(other)) errors.push(`${ctx}: ${id}'s other end ${other} is not a member`);
      reached.add(other);
    }
    for (const m of members) if (!reached.has(m)) errors.push(`${ctx}: member ${m} is the other end of none of its references`);
  }
  return { hubOf, errors, hubs: hubs.length };
}
