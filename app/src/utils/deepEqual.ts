/** Structural equality for plain data: objects, arrays, primitives, Dates,
 *  Maps and Sets. Key order does not matter, unlike comparing two
 *  `JSON.stringify` results. Dates compare by time; Map keys and Set members
 *  that are objects match structurally, not by identity. */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && Object.is(a.getTime(), b.getTime());
  }
  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map && b instanceof Map) || a.size !== b.size) return false;
    const rest = [...b.entries()];
    for (const [k, v] of a) {
      const i = b.has(k)
        ? rest.findIndex(([bk]) => Object.is(bk, k))
        : rest.findIndex(([bk]) => deepEqual(bk, k));
      if (i < 0 || !deepEqual(v, rest[i][1])) return false;
      rest.splice(i, 1);
    }
    return true;
  }
  if (a instanceof Set || b instanceof Set) {
    if (!(a instanceof Set && b instanceof Set) || a.size !== b.size) return false;
    const rest = [...b];
    for (const v of a) {
      const i = b.has(v) ? rest.findIndex((x) => Object.is(x, v)) : rest.findIndex((x) => deepEqual(x, v));
      if (i < 0) return false;
      rest.splice(i, 1);
    }
    return true;
  }
  if (Array.isArray(a)) {
    const bb = b as unknown[];
    return a.length === bb.length && a.every((v, i) => deepEqual(v, bb[i]));
  }
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  const ka = Object.keys(a as object).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const kb = Object.keys(b as object).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}
