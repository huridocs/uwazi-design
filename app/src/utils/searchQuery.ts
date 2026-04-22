// Boolean query matcher with AND / OR / NOT, "exact phrases", and * / ? wildcards.
// Grammar (case-insensitive operators):
//   expr   := or
//   or     := and (OR and)*
//   and    := not (not)*        (implicit AND between adjacent terms)
//   not    := NOT not | atom
//   atom   := "phrase" | term | ( expr )
// Terms may contain * (any chars) or ? (one char) wildcards.

type Node =
  | { t: "term"; value: string; exact: boolean }
  | { t: "not"; child: Node }
  | { t: "and"; left: Node; right: Node }
  | { t: "or"; left: Node; right: Node };

type Token =
  | { k: "op"; v: "AND" | "OR" | "NOT" }
  | { k: "lp" }
  | { k: "rp" }
  | { k: "term"; v: string; exact: boolean };

function tokenize(q: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < q.length) {
    const c = q[i];
    if (c === " " || c === "\t" || c === "\n") { i++; continue; }
    if (c === "(") { tokens.push({ k: "lp" }); i++; continue; }
    if (c === ")") { tokens.push({ k: "rp" }); i++; continue; }
    if (c === '"') {
      const end = q.indexOf('"', i + 1);
      const stop = end === -1 ? q.length : end;
      tokens.push({ k: "term", v: q.slice(i + 1, stop), exact: true });
      i = stop + 1;
      continue;
    }
    let j = i;
    while (j < q.length && !/[\s()"]/.test(q[j])) j++;
    const raw = q.slice(i, j);
    const up = raw.toUpperCase();
    if (up === "AND" || up === "OR" || up === "NOT") {
      tokens.push({ k: "op", v: up });
    } else if (raw.length > 0) {
      tokens.push({ k: "term", v: raw, exact: false });
    }
    i = j;
  }
  return tokens;
}

function parse(tokens: Token[]): Node | null {
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = () => tokens[pos++];

  function parseOr(): Node | null {
    let left = parseAnd();
    if (!left) return null;
    while (peek()?.k === "op" && (peek() as Token & { k: "op" }).v === "OR") {
      eat();
      const right = parseAnd();
      if (!right) break;
      left = { t: "or", left, right };
    }
    return left;
  }
  function parseAnd(): Node | null {
    let left = parseNot();
    if (!left) return null;
    while (pos < tokens.length) {
      const p = peek();
      if (!p) break;
      if (p.k === "rp") break;
      if (p.k === "op" && p.v === "OR") break;
      if (p.k === "op" && p.v === "AND") { eat(); }
      const right = parseNot();
      if (!right) break;
      left = { t: "and", left, right };
    }
    return left;
  }
  function parseNot(): Node | null {
    const p = peek();
    if (!p) return null;
    if (p.k === "op" && p.v === "NOT") {
      eat();
      const child = parseNot();
      if (!child) return null;
      return { t: "not", child };
    }
    return parseAtom();
  }
  function parseAtom(): Node | null {
    const p = peek();
    if (!p) return null;
    if (p.k === "lp") {
      eat();
      const inner = parseOr();
      if (peek()?.k === "rp") eat();
      return inner;
    }
    if (p.k === "term") {
      eat();
      return { t: "term", value: p.v, exact: p.exact };
    }
    // bare operator — skip it
    eat();
    return parseAtom();
  }

  return parseOr();
}

function termMatches(value: string, exact: boolean, text: string): boolean {
  const t = text.toLowerCase();
  const v = value.toLowerCase();
  if (v.length === 0) return true;
  if (exact) return t.includes(v);
  if (v.includes("*") || v.includes("?")) {
    const pattern = v.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
    try {
      return new RegExp(`\\b${pattern}\\b`, "i").test(t);
    } catch {
      return t.includes(v);
    }
  }
  return t.includes(v);
}

function evaluate(node: Node, text: string): boolean {
  switch (node.t) {
    case "term": return termMatches(node.value, node.exact, text);
    case "not": return !evaluate(node.child, text);
    case "and": return evaluate(node.left, text) && evaluate(node.right, text);
    case "or": return evaluate(node.left, text) || evaluate(node.right, text);
  }
}

export function buildMatcher(query: string): ((text: string) => boolean) | null {
  const q = query.trim();
  if (!q) return null;
  const ast = parse(tokenize(q));
  if (!ast) return null;
  return (text: string) => evaluate(ast, text);
}
