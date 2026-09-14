/** `window.__gutter()` — is the drawer's side gutter ONE value, measured?
 *
 *  The drawer's layout owns its horizontal spacing: the host sets the gutter
 *  once (`gutter-host`, see index.css) and the rows inside stop carrying their
 *  own side padding. Whether that holds is a pixel question a screenshot answers
 *  badly — a 2px step between a tab selector and a search box is exactly what
 *  the eye misses — so this reads the rects.
 *
 *  It walks the host's content top to bottom and stops at each ROW: an element
 *  that draws a side edge (a card border, a filled control), holds text, or lays
 *  its children out side by side. Wrappers that only stack rows vertically are
 *  passed through. For every row it records
 *
 *  - `start` — where the row's visible ink starts: its box when it draws one,
 *    else the first text or icon inside it. A padded button can declare that its
 *    BOX, not its text, is the edge (`data-gutter-align="box"`), and a field can
 *    declare the opposite — its text, not its focus box (`data-gutter-align="text"`).
 *  - `end` — the end edge of the box the row is laid out in. A row whose ink
 *    stops short of it (a tab selector sized to its widest label) is still
 *    inside the gutter; ink past it is reported as overflow.
 *
 *  Both are LOGICAL insets, read in the host's computed `direction`: start is
 *  the left edge in LTR and the right edge in RTL. And both are measured from
 *  INSIDE the host's border. A host that draws its own `border-inline-start`
 *  (the notifications drawer's `border-l`) otherwise reads one pixel more on
 *  that side than the other — 17 against 16 — for a layout that is symmetric.
 *
 *  Rows marked `data-gutter-bleed` (a graph canvas, a document page) run edge to
 *  edge on purpose and are listed but not asserted. Absolutely positioned boxes
 *  (tab dots, the fold probe, closed slide-overs) are not rows.
 *
 *  Passes when every asserted row shares one `start` inset and one `end` inset
 *  and nothing overflows. `gaps` lists the vertical distance between successive
 *  visual lines — the lines of a toolbar that wraps count separately, and a row
 *  with a rule (header, footer) is measured from the rule — so the stack's
 *  rhythm can be read off as numbers too. */

interface Box {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface GutterRow {
  row: string;
  start: number;
  end: number;
  inkEnd: number;
  bleed: boolean;
}

export interface GutterReport {
  /** `null` while the page is hidden: rendering is paused, so the reading is not
   *  a result either way. */
  pass: boolean | null;
  /** `document.hidden` when the reading was taken. */
  hidden: boolean;
  dir: "ltr" | "rtl";
  hostWidth: number;
  starts: number[];
  ends: number[];
  overflow: string[];
  gaps: string[];
  rows: GutterRow[];
}

const EPS = 0.5;
const round = (n: number) => Math.round(n * 2) / 2;

function alpha(color: string) {
  if (!color || color === "transparent") return 0;
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return 1;
  const parts = m[1].split(/[ ,/]+/).filter(Boolean);
  return parts.length > 3 ? parseFloat(parts[3]) : 1;
}

function inheritedBg(el: Element | null): string {
  for (let n = el; n; n = n.parentElement) {
    const bg = getComputedStyle(n).backgroundColor;
    if (alpha(bg) > 0) return bg;
  }
  return "";
}

const hasRule = (width: string, style: string, color: string) =>
  parseFloat(width) > 0 && style !== "none" && alpha(color) > 0;

/** Draws a vertical edge of its own: a side border, or a fill that differs from
 *  what is behind it. A top/bottom rule alone (a header divider) is not an edge. */
function drawsSide(el: Element) {
  const cs = getComputedStyle(el);
  if (hasRule(cs.borderLeftWidth, cs.borderLeftStyle, cs.borderLeftColor)) return true;
  if (hasRule(cs.borderRightWidth, cs.borderRightStyle, cs.borderRightColor)) return true;
  // A ring or a shadow draws the edge as surely as a border does.
  if (cs.boxShadow && cs.boxShadow !== "none") return true;
  return alpha(cs.backgroundColor) > 0 && cs.backgroundColor !== inheritedBg(el.parentElement);
}

const GRAPHIC = new Set(["svg", "img", "canvas", "video", "input", "select", "textarea"]);
const isGraphic = (el: Element) => GRAPHIC.has(el.tagName.toLowerCase());
const boxAligned = (el: Element) => el.getAttribute("data-gutter-align") === "box";

function hasOwnText(el: Element) {
  return Array.from(el.childNodes).some(
    (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "",
  );
}

function visibleIn(el: Element, clip: DOMRect) {
  const cs = getComputedStyle(el);
  if (cs.display === "none" || cs.visibility === "hidden") return false;
  if (cs.position === "absolute" || cs.position === "fixed") return false;
  if (el.closest("[inert]")) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > clip.top && r.top < clip.bottom;
}

function toBox(r: DOMRect): Box {
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
}

function contentBox(el: Element): Box {
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const px = (v: string) => parseFloat(v) || 0;
  return {
    left: r.left + px(cs.borderLeftWidth) + px(cs.paddingLeft),
    right: r.right - px(cs.borderRightWidth) - px(cs.paddingRight),
    top: r.top,
    bottom: r.bottom,
  };
}

/** Spans its frame — so its own padding is part of what places its children.
 *  A box sized to its content (a `w-fit` selector wrapper) is placed BY the
 *  frame, and measuring against its own edges would hide the frame's gutter. */
function stretches(el: Element, frame: Box) {
  return el.getBoundingClientRect().width >= frame.right - frame.left - EPS;
}

/** Content centred in its box (an empty state, a "Show more" button) cannot sit
 *  off the gutter — only past it — so it is checked for overflow, not for a start. */
function isCentred(cs: CSSStyleDeclaration) {
  if (cs.textAlign === "center") return true;
  if (!cs.display.includes("flex")) return false;
  return cs.flexDirection.startsWith("column")
    ? cs.alignItems === "center"
    : cs.justifyContent === "center";
}

/** A `bleed` box: its negative inline margin is given back as padding. It spans
 *  the pane on purpose, so its own fill is ground, not an edge. */
function isLane(el: Element) {
  const cs = getComputedStyle(el);
  const ml = parseFloat(cs.marginLeft);
  return ml < 0 && Math.abs(ml + parseFloat(cs.paddingLeft)) < EPS;
}

function stackedVertically(kids: Element[]) {
  for (let i = 1; i < kids.length; i++) {
    if (kids[i].getBoundingClientRect().top < kids[i - 1].getBoundingClientRect().bottom - 1)
      return false;
  }
  return true;
}

/** The painted extent inside a row: boxes that draw an edge, graphics, text. */
function ink(el: Element, clip: DOMRect): Box | null {
  if (el.getAttribute("data-gutter-align") === "text") return contentBox(el);
  if (boxAligned(el) || (!isLane(el) && drawsSide(el)) || isGraphic(el))
    return toBox(el.getBoundingClientRect());
  const r = el.getBoundingClientRect();
  let box: Box | null = null;
  const add = (b: Box) => {
    box = box
      ? {
          left: Math.min(box.left, b.left),
          right: Math.max(box.right, b.right),
          top: Math.min(box.top, b.top),
          bottom: Math.max(box.bottom, b.bottom),
        }
      : b;
  };
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim()) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const t = range.getBoundingClientRect();
      // Truncated text reports its full run; clip it to its element.
      if (t.width > 0)
        add({ left: Math.max(t.left, r.left), right: Math.min(t.right, r.right), top: t.top, bottom: t.bottom });
    } else if (node instanceof Element && visibleIn(node, clip)) {
      const b = ink(node, clip);
      if (b) add(b);
    }
  }
  return box;
}

function describe(el: Element) {
  const label =
    el.getAttribute("aria-label") ||
    el.getAttribute("placeholder") ||
    (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 28);
  return `${el.tagName.toLowerCase()}${label ? ` “${label}”` : ""}`;
}

function findHost(target?: Element | string): Element | null {
  if (target instanceof Element) return target;
  if (typeof target === "string") return document.querySelector(target);
  // The topmost open host wins: an overlay stacked on a drawer is the one in view.
  const hosts = Array.from(document.querySelectorAll("[data-gutter-host]")).filter((h) => {
    const r = h.getBoundingClientRect();
    return r.width > 0 && !h.closest("[inert]");
  });
  return hosts[hosts.length - 1] ?? null;
}

export function gutter(target?: Element | string, { maxRows = 14 } = {}): GutterReport | null {
  const host = findHost(target);
  if (!host) {
    console.warn("__gutter: no open [data-gutter-host]");
    return null;
  }
  const clip = host.getBoundingClientRect();
  const hostCs = getComputedStyle(host);
  const rtl = hostCs.direction === "rtl";
  // The host's inner edges: insets are counted from inside its own border.
  const innerLeft = clip.left + (parseFloat(hostCs.borderLeftWidth) || 0);
  const innerRight = clip.right - (parseFloat(hostCs.borderRightWidth) || 0);
  type Found = { el: Element; frame: Box; bleed: boolean; centred?: boolean };
  const found: Found[] = [];
  const kidsOf = (el: Element) => Array.from(el.children).filter((k) => visibleIn(k, clip));

  const walk = (el: Element, frame: Box) => {
    if (found.length >= maxRows) return;
    const cs = getComputedStyle(el);
    // An indented block (a tree's children) is structure INSIDE the content,
    // not a gutter: it is left out rather than asserted.
    if (parseFloat(cs.marginInlineStart) > 0) return;
    const bleed = el.hasAttribute("data-gutter-bleed");
    // A `bleed` lane (negative inline margin given back as padding) spans the
    // pane on purpose and may paint a ground of its own; what is asserted is the
    // content it puts back on the gutter, so it is walked like a wrapper.
    const lane = isLane(el);
    const kids = kidsOf(el);
    const centred = isCentred(cs);
    const isRow =
      bleed ||
      centred ||
      (!lane && drawsSide(el)) ||
      isGraphic(el) ||
      hasOwnText(el) ||
      boxAligned(el) ||
      kids.length === 0 ||
      !stackedVertically(kids);
    const own = stretches(el, frame) ? contentBox(el) : frame;
    if (isRow) {
      // A row whose BOX is its edge (a card, a filled or box-aligned control, a
      // graphic) is measured against the frame it sits in; its own padding is
      // inside it. So is centred content.
      const boxEdge = !lane && (drawsSide(el) || boxAligned(el) || isGraphic(el));
      found.push({ el, frame: boxEdge || centred ? frame : own, bleed, centred });
      return;
    }
    for (const k of kids) walk(k, own);
  };
  for (const k of kidsOf(host)) walk(k, contentBox(host));

  const rows: GutterRow[] = [];
  const lines: { name: string; top: number; bottom: number }[] = [];
  /** Where a row's content STARTS. A row that paints or holds text starts at its
   *  ink. A row of children starts at its first child's ink — or, when that
   *  child paints nothing (the `flex-1` spacer before a footer's end-aligned
   *  buttons), at that child's box, which is where the layout put the start. */
  const startOf = (b: { left: number; right: number }) => (rtl ? b.right : b.left);
  const rowStart = (el: Element, box: Box, frame: Box, centred?: boolean) => {
    if (centred) return startOf(frame);
    if (boxAligned(el) || (!isLane(el) && drawsSide(el)) || isGraphic(el) || hasOwnText(el)) return startOf(box);
    // Children by LAYOUT, not by visibility: a `flex-1` spacer has no height, and
    // the empty `<div />` that opens a `justify-between` row has no width, and
    // each is exactly the child that says where the row starts.
    const first = Array.from(el.children).find((k) => {
      const kcs = getComputedStyle(k);
      return kcs.display !== "none" && kcs.position !== "absolute" && kcs.position !== "fixed";
    });
    // DOM order is start order: a flex row runs from the start edge in RTL too.
    if (!first) return startOf(box);
    return startOf(ink(first, clip) ?? first.getBoundingClientRect());
  };

  for (const { el, frame, bleed, centred } of found) {
    const rect = el.getBoundingClientRect();
    const box = ink(el, clip) ?? frame;
    const name = describe(el);
    const startX = rowStart(el, box, frame, centred);
    rows.push({
      row: name,
      start: round(rtl ? innerRight - startX : startX - innerLeft),
      end: round(rtl ? frame.left - innerLeft : innerRight - frame.right),
      inkEnd: round(rtl ? box.left - innerLeft : innerRight - box.right),
      bleed,
    });

    // A header or footer is bounded by its rule, not by the text inside it.
    const cs = getComputedStyle(el);
    const top = hasRule(cs.borderTopWidth, cs.borderTopStyle, cs.borderTopColor) ? rect.top : box.top;
    const bottom = hasRule(cs.borderBottomWidth, cs.borderBottomStyle, cs.borderBottomColor)
      ? rect.bottom
      : box.bottom;

    // A toolbar that wraps is several visual lines; group its children by
    // vertical overlap. Only wrapping flex rows — a card's header and body are
    // one row, not two lines.
    const wraps = cs.display.includes("flex") && cs.flexWrap === "wrap";
    const groups: { top: number; bottom: number }[] = [];
    if (wraps) {
      for (const r of kidsOf(el).map((k) => k.getBoundingClientRect()).sort((a, b) => a.top - b.top)) {
        const cur = groups[groups.length - 1];
        if (cur && r.top < cur.bottom - 1) cur.bottom = Math.max(cur.bottom, r.bottom);
        else groups.push({ top: r.top, bottom: r.bottom });
      }
    }
    if (groups.length > 1) groups.forEach((g, i) => lines.push({ name: `${name} [line ${i + 1}]`, ...g }));
    else lines.push({ name, top, bottom });
  }

  lines.sort((a, b) => a.top - b.top);
  const gaps: string[] = [];
  let prev = lines[0];
  for (const line of lines.slice(1)) {
    if (line.top < prev.bottom - EPS) {
      if (line.bottom > prev.bottom) prev = line;
      continue;
    }
    gaps.push(`${prev.name} → ${line.name}: ${round(line.top - prev.bottom)}`);
    prev = line;
  }

  const asserted = rows.filter((r) => !r.bleed);
  const starts = Array.from(new Set(asserted.map((r) => r.start))).sort((a, b) => a - b);
  const ends = Array.from(new Set(asserted.map((r) => r.end))).sort((a, b) => a - b);
  const overflow = asserted.filter((r) => r.inkEnd < r.end - EPS).map((r) => r.row);
  // A hidden page gets no ResizeObserver callbacks and paused rendering, so what
  // the layout says then is not a result. Report the numbers, but no verdict.
  const hidden = document.hidden;
  if (hidden) console.warn("__gutter: page is hidden; pass is null because rendering is paused");
  const report: GutterReport = {
    pass: hidden ? null : starts.length === 1 && ends.length === 1 && overflow.length === 0,
    hidden,
    dir: rtl ? "rtl" : "ltr",
    hostWidth: round(clip.width),
    starts,
    ends,
    overflow,
    gaps,
    rows,
  };
  console.table(rows);
  return report;
}

declare global {
  interface Window {
    __gutter?: typeof gutter;
  }
}

export function installGutterCheck() {
  window.__gutter = gutter;
}
