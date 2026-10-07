import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { otherEnd, type NetworkGraph } from "../../data/network/graph";
import type { Community, NetworkPlacement } from "../../data/network/layout";
import type { FocusLayout } from "../../data/network/focus";
import type { PairEvidence } from "../../data/network/graph";
import { ChevronDown, ChevronUp } from "lucide-react";
import { RefStatus } from "../relationships/rows/RefStatus";
import { buildQuadtree } from "../../utils/quadtree";
import { typeLabelColor } from "../../utils/typeColor";

/** A whole-collection graph on one canvas.
 *
 *  Canvas 2D, not SVG: CEJIL is 4,398 nodes and 16,585 edges, eight times what
 *  the SVG graph holds. Per frame, edges are bucketed by style and width and
 *  stroked as one path per bucket; nodes are filled as one path per template
 *  and strength. Nothing is laid out here: positions come in `placement`, and
 *  in `focus` while a filter's matches are laid out on their own.
 *
 *  Zoomed out, a large collection draws one mark per community (sized by its
 *  record count, coloured by its main template) and the marks open into nodes
 *  as you zoom. While filtering (`strength`: 2 match, 1 neighbour, 0 rest),
 *  each mark carries an arc for the share of its records that match, and a
 *  community with none fades to an outline. At node level matches draw full,
 *  neighbours small and muted, the rest as faint points; an edge draws only
 *  with a matching end. When the match set changes (`fitKey`), positions move
 *  to the new layout and the camera fits the matches in one ≤400 ms move.
 *
 *  Keyboard: the canvas is not a control. A visually hidden list of buttons
 *  (matches first, then the best-connected records) comes after it; focusing
 *  one pans to its node and draws a focus ring there. */

export interface NetworkCanvasProps {
  graph: NetworkGraph;
  placement: NetworkPlacement;
  /** The raw template colour, for dots. */
  colorOf: (typeId: string) => string;
  typeNameOf: (typeId: string) => string;
  titleOf: (index: number) => string;
  /** Per node, 0 hides it (and its edges). */
  nodeOn: Uint8Array;
  /** Per edge, 0 hides it (its types are off, or an end is hidden). */
  edgeOn: Uint8Array;
  /** Per node: 2 match, 1 neighbour of a match, 0 the rest. Null: no filter. */
  strength: Uint8Array | null;
  /** Edges touching a record with at least this many neighbours. */
  hubDegree: number;
  hubEdges: "faint" | "full" | "off";
  /** Draw community marks when zoomed out. Off for small collections, where
   *  every node fits. */
  overview: boolean;
  /** The matches' own layout. Non-members fade out while it is shown. */
  focus?: FocusLayout | null;
  /** Changes when the match set or the layout changes: positions move and the
   *  camera fits the matches. Null holds both (a focus layout is on its way). */
  fitKey?: string | null;
  /** The Focus / Whole collection switch, shown while filtering. */
  layoutSwitch?: {
    focus: boolean;
    available: boolean;
    /** Why Focus is unavailable, for its tooltip. */
    reason: string;
    pending: boolean;
    onChange: (focus: boolean) => void;
  } | null;
  selected: number;
  onSelect: (index: number, e: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => void;
  /** The search's find cursor: the node it is on, a key that changes with
   *  every step, and the stepper's position. Null without a search. */
  find?: {
    node: number;
    key: string;
    index: number;
    count: number;
    onStep: (dir: 1 | -1) => void;
  } | null;
  /** Escape or a click on empty canvas: the selection ends. */
  onClear: () => void;
  /** Matches a Display switch hides, for the canvas's note. */
  hiddenMatches?: number;
  /** What an edge carries, for its tooltip: relationship types, reference
   *  count, and (Nepal) quotes with their status. */
  edgeInfo: (edge: number) => EdgeInfo;
  /** Accessible name of the drawing and of its keyboard list. */
  label: string;
}

export interface EdgeInfo {
  types: string[];
  refs: number;
  evidence: PairEvidence[];
}

/** Zoom, relative to the first fit, over which community marks give way to nodes. */
const OPEN_FROM = 1.7;
const OPEN_TO = 2.8;
const MIN_REL = 0.5;
const MAX_REL = 60;
const KEYBOARD_LIST = 60;
/** Length of a filter move: positions and camera together. */
const MOVE_MS = 380;
/** Two taps within this long (and 12px) are a double-click. */
const DOUBLE_TAP_MS = 320;
/** Pixels kept clear around a fit, for marks, names and the controls. */
const FIT_PAD = 96;

type Box = [number, number, number, number];

/** Label boxes on screen, hashed into 64px cells so a collision check reads
 *  a few cells rather than every label placed. */
class LabelBoxes {
  private cells = new Map<number, Box[]>();
  private static readonly CELL = 64;
  private keys(b: Box, fn: (key: number) => boolean | void) {
    const c = LabelBoxes.CELL;
    for (let cx = Math.floor(b[0] / c); cx <= Math.floor(b[2] / c); cx++)
      for (let cy = Math.floor(b[1] / c); cy <= Math.floor(b[3] / c); cy++) if (fn(cx * 4096 + cy)) return true;
    return false;
  }
  /** Whether `b` overlaps a box already placed, other than `ignore`. */
  hits(b: Box, ignore?: Box) {
    return this.keys(b, (key) =>
      this.cells.get(key)?.some((o) => o !== ignore && o[0] < b[2] && b[0] < o[2] && o[1] < b[3] && b[1] < o[3]),
    );
  }
  add(b: Box) {
    this.keys(b, (key) => {
      const list = this.cells.get(key);
      if (list) list.push(b);
      else this.cells.set(key, [b]);
    });
  }
}

/** What the pointer is over. An edge keeps the world point it was hovered
 *  at, which its tooltip is anchored to. */
interface Hover {
  kind: "node" | "community" | "edge";
  i: number;
  wx: number;
  wy: number;
}

/** Time constant of a glide's slowing after a flick. */
const GLIDE_MS = 325;

/** Length of the lift fading in or out. */
const LIFT_MS = 140;

interface Camera {
  k: number;
  tx: number;
  ty: number;
}

type Extent = { minX: number; maxX: number; minY: number; maxY: number };

interface Tokens {
  bg: string;
  ink: string;
  inkSecondary: string;
  inkTertiary: string;
  carbon: string;
  font: string;
}

/** Canvas cannot read `var()` or (in every engine) `color-mix()`: resolve a CSS
 *  colour expression through a probe element. */
function resolver() {
  const probe = document.createElement("span");
  probe.style.display = "none";
  document.body.appendChild(probe);
  const cache = new Map<string, string>();
  return {
    color(expr: string) {
      const hit = cache.get(expr);
      if (hit) return hit;
      probe.style.color = "";
      probe.style.color = expr;
      const v = getComputedStyle(probe).color || expr;
      cache.set(expr, v);
      return v;
    },
    dispose() {
      probe.remove();
    },
  };
}

function readTokens(color: (expr: string) => string): Tokens {
  return {
    bg: color("var(--bg-warm)"),
    ink: color("var(--text-primary)"),
    inkSecondary: color("var(--text-secondary)"),
    inkTertiary: color("var(--text-tertiary)"),
    carbon: color("var(--accent-blue)"),
    font: getComputedStyle(document.body).fontFamily,
  };
}

/** Bumps when the theme changes (`:root.dark`), so colours are re-read. */
function useThemeVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const mo = new MutationObserver(() => setV((n) => n + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    return () => mo.disconnect();
  }, []);
  return v;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const truncate = (s: string, n = 34) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);
const reducedMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Bounds of `nodes` in `pos`; from 50 nodes, the 1st to 99th percentile on
 *  each axis, so a few far-out records do not shrink the rest to a corner. */
function boundsOf(pos: Float32Array, nodes: number[]): Extent | null {
  if (!nodes.length) return null;
  const xs = new Float32Array(nodes.length);
  const ys = new Float32Array(nodes.length);
  nodes.forEach((i, k) => {
    xs[k] = pos[i * 2];
    ys[k] = pos[i * 2 + 1];
  });
  xs.sort();
  ys.sort();
  const lo = nodes.length >= 50 ? Math.floor(nodes.length * 0.01) : 0;
  const hi = nodes.length >= 50 ? Math.ceil(nodes.length * 0.99) - 1 : nodes.length - 1;
  return { minX: xs[lo], maxX: xs[hi], minY: ys[lo], maxY: ys[hi] };
}

export function NetworkCanvas({
  graph,
  placement,
  colorOf,
  typeNameOf,
  titleOf,
  nodeOn: nodeOnIn,
  edgeOn: edgeOnIn,
  strength,
  hubDegree,
  hubEdges,
  overview,
  focus = null,
  fitKey,
  layoutSwitch,
  selected,
  onSelect,
  onClear,
  edgeInfo,
  find = null,
  hiddenMatches = 0,
  label,
}: NetworkCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const cam = useRef<Camera>({ k: 1, tx: 0, ty: 0 });
  const fitK = useRef(1);
  const frame = useRef(0);
  const [hover, setHover] = useState<Hover | null>(null);
  const hoverRef = useRef(hover);
  hoverRef.current = hover;
  /* An edge clicked open: its tooltip stays until Escape or another click. */
  const [pinned, setPinned] = useState<Hover | null>(null);
  const pinnedRef = useRef(pinned);
  pinnedRef.current = pinned;
  /* The neighbourhood drawn lifted, and how far it has come in (0–1). */
  const liftNode = useRef(-1);
  const liftAmt = useRef(0);
  const liftAt = useRef(0);
  const [focused, setFocused] = useState(-1);
  const [focusedCommunity, setFocusedCommunity] = useState(-1);
  const [rel, setRel] = useState(1);
  const themeVersion = useThemeVersion();
  const helpId = useId();
  const painted = useRef(false);
  /** Boxes of the controls laid over the canvas, which labels keep clear of. */
  const overlays = useRef<Box[]>([]);

  const n = graph.ids.length;
  const { communities } = placement;

  /* The legend's templates: hidden ones leave the drawing (and hit testing)
     where they are; nothing is laid out again. */
  const [hiddenTypes, setHiddenTypes] = useState<ReadonlySet<string>>(() => new Set());
  useEffect(() => setHiddenTypes(new Set()), [graph]);
  const nodeOn = useMemo(() => {
    if (!hiddenTypes.size) return nodeOnIn;
    const out = new Uint8Array(nodeOnIn);
    for (let i = 0; i < n; i++) if (hiddenTypes.has(graph.typeIds[i])) out[i] = 0;
    return out;
  }, [nodeOnIn, hiddenTypes, graph, n]);
  const edgeOn = useMemo(() => {
    if (!hiddenTypes.size) return edgeOnIn;
    const out = new Uint8Array(edgeOnIn.length);
    for (let e = 0; e < out.length; e++) out[e] = edgeOnIn[e] && nodeOn[graph.a[e]] && nodeOn[graph.b[e]] ? 1 : 0;
    return out;
  }, [edgeOnIn, nodeOn, hiddenTypes, graph]);
  /* Per template in the drawing (Display switches applied): its records. */
  const legend = useMemo(() => {
    const counts = new Map<string, number>();
    for (let i = 0; i < n; i++) if (nodeOnIn[i]) counts.set(graph.typeIds[i], (counts.get(graph.typeIds[i]) ?? 0) + 1);
    return [...counts.entries()].sort((x, y) => y[1] - x[1]).map(([typeId, count]) => ({ typeId, count }));
  }, [nodeOnIn, graph, n]);
  /* Where nodes are going (`target`) and where they are drawn now (`shown`),
     which a move interpolates between. `fade` is 1 while non-members of a
     focus layout are hidden. */
  const target = focus?.pos ?? placement.pos;
  const baseExtent = focus?.extent ?? placement.extent;
  const shown = useRef<Float32Array>(new Float32Array(target));
  if (shown.current.length !== target.length) shown.current = new Float32Array(target);
  const fade = useRef(focus ? 1 : 0);
  const member = focus?.member ?? null;
  const quad = useMemo(() => buildQuadtree(target, n), [target, n]);
  /* Colours, re-read on a theme change. Community marks use the label colour
     of their template (`typeLabelColor`); dots keep the raw colour. */
  const colors = useMemo(() => {
    void themeVersion;
    const r = resolver();
    const tokens = readTokens(r.color);
    const dot = new Map<string, string>();
    const mark = new Map<string, string>();
    for (const t of new Set(graph.typeIds)) {
      const raw = colorOf(t);
      dot.set(t, r.color(raw));
      mark.set(t, r.color(typeLabelColor(raw)));
    }
    r.dispose();
    return { tokens, dot, mark };
  }, [graph, colorOf, themeVersion]);

  /* Per community: its records drawn now (Display switches and the legend
     applied). A mark is sized by them, and is not drawn when none are. */
  const shownCount = useMemo(() => {
    const out = new Map<Community, number>();
    for (const c of communities) out.set(c, c.members.reduce((k, i) => k + (nodeOn[i] ? 1 : 0), 0));
    return out;
  }, [communities, nodeOn]);

  /* Node order for labels: most neighbours first. */
  const byDegree = useMemo(() => {
    const order = Array.from({ length: n }, (_, i) => i);
    order.sort((x, y) => graph.degree[y] - graph.degree[x]);
    return order;
  }, [graph, n]);

  /* While filtering: the matches, best-connected first. Labels go to them only. */
  const matchOrder = useMemo(
    () => (strength ? byDegree.filter((i) => strength[i] === 2 && nodeOn[i]) : null),
    [byDegree, strength, nodeOn],
  );

  /* Per community: how many of its members match, for the overview. */
  const communityMatch = useMemo(() => {
    if (!strength) return null;
    return communities.map((c) => c.members.reduce((s, i) => s + (strength[i] === 2 ? 1 : 0), 0));
  }, [communities, strength]);

  /* Links between communities, counted once per edge drawn, for the overview.
     While filtering, only edges with a matching end count, as at node level. */
  const communityLinks = useMemo(() => {
    if (!overview) return [];
    const at = new Map<number, number>();
    communities.forEach((c, k) => at.set(c.id, k));
    const counts = new Map<number, number>();
    const m = graph.a.length;
    const C = communities.length;
    for (let e = 0; e < m; e++) {
      if (!edgeOn[e]) continue;
      const ca = placement.community[graph.a[e]];
      const cb = placement.community[graph.b[e]];
      if (ca === cb || ca < 0 || cb < 0) continue;
      if (strength && strength[graph.a[e]] !== 2 && strength[graph.b[e]] !== 2) continue;
      if (hubEdges !== "full" && (graph.degree[graph.a[e]] >= hubDegree || graph.degree[graph.b[e]] >= hubDegree)) continue;
      const x = at.get(ca)!;
      const y = at.get(cb)!;
      const key = x < y ? x * C + y : y * C + x;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].map(([key, count]) => ({ x: Math.floor(key / C), y: key % C, count }));
  }, [overview, communities, graph, edgeOn, placement.community, hubEdges, hubDegree, strength]);

  // A focus layout is drawn as nodes at every zoom: its communities are the
  // global layout's and mean nothing there.
  const marksOn = overview && !focus;
  const mix = (r: number) => (marksOn ? Math.max(fade.current, clamp((r - OPEN_FROM) / (OPEN_TO - OPEN_FROM), 0, 1)) : 1);
  // Marks scale with the pane, so a phone's overview is not one overlapping heap.
  const markScale = clamp(Math.min(size.w, size.h) / 760, 0.4, 1);
  const markRadius = (c: Community) => clamp((3 + Math.sqrt(shownCount.get(c) ?? c.members.length) * 1.5) * markScale, 3, 56);
  const nodeRadius = (i: number, r: number) =>
    clamp((1.6 + 0.55 * Math.sqrt(graph.degree[i])) * clamp(Math.sqrt(r / 2), 0.75, 1.8), 1.4, 16);
  /* Node size and strength while filtering: a neighbour is small, the rest a point. */
  const radiusAt = (i: number, r: number) =>
    !strength ? nodeRadius(i, r) : strength[i] === 2 ? Math.max(3, nodeRadius(i, r)) : strength[i] === 1 ? Math.max(1.2, nodeRadius(i, r) * 0.55) : 1.1;

  /* One-hop neighbourhood of a node over drawn edges, best-connected first.
     Kept for the last node asked about. */
  const hoodCache = useRef<{ i: number; key: unknown[]; node: Uint8Array; list: number[] } | null>(null);
  const hoodOf = (i: number) => {
    const c = hoodCache.current;
    if (c && c.i === i && c.key[0] === edgeOn && c.key[1] === nodeOn && c.key[2] === member) return c;
    const node = new Uint8Array(n);
    const list = [i];
    node[i] = 1;
    for (let j = graph.adjStart[i]; j < graph.adjStart[i + 1]; j++) {
      const e = graph.adjEdge[j];
      if (!edgeOn[e]) continue;
      const o = otherEnd(graph, e, i);
      if (node[o] || !nodeOn[o] || (member && !member[o])) continue;
      node[o] = 1;
      list.push(o);
    }
    list.sort((x, y) => (x === i ? -1 : y === i ? 1 : graph.degree[y] - graph.degree[x]));
    hoodCache.current = { i, key: [edgeOn, nodeOn, member], node, list };
    return hoodCache.current;
  };

  /** The find cursor was moved more recently than the selection. */
  const findWins = useRef(true);
  /** The node to lift: the hovered one, else the selection or the find
   *  cursor, whichever moved last. */
  const liftWanted = () => {
    const hv = hoverRef.current;
    if (hv?.kind === "node") return hv.i;
    const sel = selected >= 0 && nodeOn[selected] ? selected : -1;
    const cur = find && nodeOn[find.node] ? find.node : -1;
    return findWins.current ? (cur >= 0 ? cur : sel) : sel >= 0 ? sel : cur;
  };

  /** Moves the lift one frame toward what is wanted; true while it moves. */
  const stepLift = () => {
    const want = liftWanted();
    const now = performance.now();
    const dt = liftAt.current ? now - liftAt.current : 16;
    liftAt.current = now;
    if (want >= 0 && want !== liftNode.current) {
      // From one lifted node straight to another: no fade between them.
      if (liftAmt.current < 0.05) liftAmt.current = 0;
      liftNode.current = want;
    }
    const goal = want >= 0 ? 1 : 0;
    if (reducedMotion()) liftAmt.current = goal;
    else if (goal > liftAmt.current) liftAmt.current = Math.min(goal, liftAmt.current + dt / LIFT_MS);
    else if (goal < liftAmt.current) liftAmt.current = Math.max(goal, liftAmt.current - dt / LIFT_MS);
    if (liftAmt.current === 0) liftNode.current = -1;
    const moving = liftAmt.current !== goal;
    if (!moving) liftAt.current = 0;
    return moving;
  };

  /** The edge drawn highlighted: hovered, else pinned. */
  const edgeTarget = () => {
    const hv = hoverRef.current;
    if (hv?.kind === "edge") return hv.i;
    if (hv) return -1;
    return pinnedRef.current?.kind === "edge" ? pinnedRef.current.i : -1;
  };

  /* ── Drawing ─────────────────────────────────────────────────────────── */

  const draw = useCallback(() => {
    frame.current = 0;
    const canvas = canvasRef.current;
    if (!canvas || !size.w || !size.h) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const { k, tx, ty } = cam.current;
    const r = k / fitK.current;
    const t = colors.tokens;
    const pos = shown.current;
    const nodesAlpha = mix(r);
    const marksAlpha = 1 - nodesAlpha;
    // Non-members of a focus layout fade as it comes in.
    const restAlpha = 1 - fade.current;
    const W = size.w;
    const H = size.h;
    const lifting = stepLift();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const sx = (i: number) => pos[i * 2] * k + tx;
    const sy = (i: number) => pos[i * 2 + 1] * k + ty;
    const pad = 40;

    /* The lifted neighbourhood (hover, else selection, else the find cursor):
       it and its links draw full, the rest recede by `recede`. */
    const liftI = liftNode.current;
    const la = liftI >= 0 ? liftAmt.current : 0;
    const hood = la > 0 ? hoodOf(liftI) : null;
    const recede = 1 - 0.7 * la;
    const lifted = (i: number) => !!hood && hood.node[i] === 1;
    const rad = (i: number) => {
      const base = radiusAt(i, r);
      if (!lifted(i)) return base;
      const full = Math.max(2.5, nodeRadius(i, r));
      return full > base ? base + (full - base) * la : base;
    };
    const edgeHi = edgeTarget();

    /* Edges, one stroke per (style, width) bucket. */
    if (nodesAlpha > 0.01) {
      const buckets = new Map<string, number[]>();
      const push = (key: string, x1: number, y1: number, x2: number, y2: number) => {
        let b = buckets.get(key);
        if (!b) buckets.set(key, (b = []));
        b.push(x1, y1, x2, y2);
      };
      const m = graph.a.length;
      for (let e = 0; e < m; e++) {
        if (!edgeOn[e]) continue;
        const i = graph.a[e];
        const j = graph.b[e];
        const sel = selected >= 0 && (i === selected || j === selected);
        const lift = !!hood && liftI !== selected && (i === liftI || j === liftI);
        const incident = sel || lift;
        // An edge needs a matching end while filtering.
        if (!incident && strength && strength[i] !== 2 && strength[j] !== 2) continue;
        if (member && !incident && (!member[i] || !member[j])) continue;
        const x1 = sx(i), y1 = sy(i), x2 = sx(j), y2 = sy(j);
        if ((x1 < -pad && x2 < -pad) || (x1 > W + pad && x2 > W + pad) || (y1 < -pad && y2 < -pad) || (y1 > H + pad && y2 > H + pad)) continue;
        const hub = graph.degree[i] >= hubDegree || graph.degree[j] >= hubDegree;
        if (!incident && hub && hubEdges === "off") continue;
        const refs = graph.refs[e];
        const w = refs >= 4 ? 2 : refs >= 2 ? 1.3 : 0.8;
        const style = sel
          ? "sel"
          : lift
            ? "lift"
            : hub && hubEdges === "faint"
              ? "hub"
              : !strength
                ? "base"
                : strength[i] === 2 && strength[j] === 2
                  ? "strong"
                  : "light";
        push(`${style}|${w}`, x1, y1, x2, y2);
      }
      ctx.lineCap = "round";
      // A selected or lifted hub's thousands of edges would cover the canvas:
      // they lighten as its degree grows.
      const thin = (i: number, top: number) => clamp(top * Math.sqrt(40 / Math.max(1, graph.degree[i])), 0.12, top);
      const selAlpha = selected >= 0 ? thin(selected, 0.85) * (hood && liftI !== selected ? recede : 1) : 0;
      const liftAlpha = hood ? thin(liftI, 0.8) * la : 0;
      const styleAlpha: Record<string, number> = {
        sel: selAlpha,
        lift: liftAlpha,
        hub: 0.07 * recede,
        base: 0.28 * recede,
        strong: 0.6 * recede,
        light: 0.2 * recede,
      };
      for (const [key, pts] of buckets) {
        const [style, w] = key.split("|");
        ctx.globalAlpha = nodesAlpha * styleAlpha[style];
        ctx.strokeStyle = style === "sel" ? t.carbon : style === "strong" || style === "lift" ? t.inkSecondary : t.inkTertiary;
        ctx.lineWidth = Number(w) * (style === "sel" || style === "lift" ? 1.3 : style === "strong" ? 1.15 : 1);
        ctx.beginPath();
        for (let p = 0; p < pts.length; p += 4) {
          ctx.moveTo(pts[p], pts[p + 1]);
          ctx.lineTo(pts[p + 2], pts[p + 3]);
        }
        ctx.stroke();
      }

      /* Nodes, one fill per (template, strength). The rest first, as faint
         points in one colour; then neighbours; matches last, on top; the
         lifted neighbourhood over all of them. */
      const baseAlpha = (level: number) => (level === 2 ? 1 : level === 1 ? 0.45 : 0.22 * (member ? restAlpha : 1));
      const levels = strength ? [0, 1, 2] : [2];
      for (const level of levels) {
        const alpha = baseAlpha(level) * recede;
        if (alpha < 0.01) continue;
        const groups = new Map<string, number[]>();
        for (let i = 0; i < n; i++) {
          if (!nodeOn[i] || lifted(i)) continue;
          if (strength && strength[i] !== level) continue;
          const x = sx(i), y = sy(i);
          if (x < -pad || x > W + pad || y < -pad || y > H + pad) continue;
          const tId = level === 0 ? "" : graph.typeIds[i];
          let g = groups.get(tId);
          if (!g) groups.set(tId, (g = []));
          g.push(i);
        }
        ctx.globalAlpha = nodesAlpha * alpha;
        for (const [tId, list] of groups) {
          ctx.fillStyle = level === 0 ? t.inkTertiary : colors.dot.get(tId) ?? t.inkTertiary;
          ctx.beginPath();
          for (const i of list) {
            const rd = radiusAt(i, r);
            const x = sx(i), y = sy(i);
            ctx.moveTo(x + rd, y);
            ctx.arc(x, y, rd, 0, Math.PI * 2);
          }
          ctx.fill();
          if (level === 2 && r > 1.5) {
            ctx.strokeStyle = t.bg;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      if (hood) {
        const groups = new Map<string, number[]>();
        for (const i of hood.list) {
          const x = sx(i), y = sy(i);
          if (x < -pad || x > W + pad || y < -pad || y > H + pad) continue;
          const level = strength ? strength[i] : 2;
          const key = `${graph.typeIds[i]}|${level}`;
          let g = groups.get(key);
          if (!g) groups.set(key, (g = []));
          g.push(i);
        }
        for (const [key, list] of groups) {
          const [tId, level] = key.split("|");
          const a0 = baseAlpha(Number(level));
          ctx.globalAlpha = nodesAlpha * (a0 + (1 - a0) * la);
          ctx.fillStyle = colors.dot.get(tId) ?? t.inkTertiary;
          ctx.beginPath();
          for (const i of list) {
            const rd = rad(i);
            const x = sx(i), y = sy(i);
            ctx.moveTo(x + rd, y);
            ctx.arc(x, y, rd, 0, Math.PI * 2);
          }
          ctx.fill();
          ctx.strokeStyle = t.bg;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      /* The hovered or pinned edge: carbon, over the nodes it joins. */
      if (edgeHi >= 0) {
        const i = graph.a[edgeHi];
        const j = graph.b[edgeHi];
        ctx.globalAlpha = nodesAlpha;
        ctx.strokeStyle = t.carbon;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sx(i), sy(i));
        ctx.lineTo(sx(j), sy(j));
        ctx.stroke();
      }

      /* Rings: selected (carbon), keyboard focus (carbon, wider), hover (ink). */
      const ring = (i: number, color: string, width: number, gap: number) => {
        if (i < 0 || !nodeOn[i]) return;
        ctx.globalAlpha = Math.max(nodesAlpha, 0.6);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.arc(sx(i), sy(i), rad(i) + gap, 0, Math.PI * 2);
        ctx.stroke();
      };
      if (find && find.node !== selected) ring(find.node, t.ink, 2, 3);
      ring(selected, t.carbon, 2, 2.5);
      ring(focused, t.carbon, 2.5, 5);
      const hv = hoverRef.current;
      if (hv?.kind === "node") ring(hv.i, t.ink, 1.5, 2);
      if (edgeHi >= 0) {
        ring(graph.a[edgeHi], t.carbon, 1.5, 2);
        ring(graph.b[edgeHi], t.carbon, 1.5, 2);
      }

      /* Labels: the selected, hovered, lifted and find nodes always; then the
         lifted neighbourhood; then the best-connected (only matches while
         filtering). Each tries right, left, above and below its node and is
         drawn only where it overlaps no other label and no always-labelled
         node. How many depends on the canvas area and the zoom. Text is the
         template's label colour (`typeLabelColor`). */
      // One label set at a time: node labels once nodes are the stronger layer.
      if (nodesAlpha >= 0.5) {
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        const boxes = new LabelBoxes();
        // The controls over the canvas (legend, breadcrumb, stepper, zoom).
        for (const b of overlays.current) boxes.add(b);
        const density = clamp(0.15 + 0.25 * Math.log2(Math.max(1, r)), 0.15, 1);
        const budget = Math.round(clamp(((W * H) / 16000) * density, 8, 120));
        const want = [
          selected,
          focused,
          ...(hv?.kind === "node" ? [hv.i] : []),
          ...(hood ? [liftI] : []),
          ...(find ? [find.node] : []),
          ...(edgeHi >= 0 ? [graph.a[edgeHi], graph.b[edgeHi]] : []),
        ].filter((i, k, all) => i >= 0 && nodeOn[i] && all.indexOf(i) === k);
        // Their dots are kept clear of other labels.
        for (const i of want) {
          const rd = rad(i) + 2;
          boxes.add([sx(i) - rd, sy(i) - rd, sx(i) + rd, sy(i) + rd]);
        }
        let placed = 0;
        const place = (i: number, force: boolean) => {
          if (!nodeOn[i]) return;
          const x = sx(i);
          const y = sy(i);
          if (x < 0 || x > W || y < 0 || y > H) return;
          const text = truncate(titleOf(i));
          ctx.font = `${force ? 600 : 500} 11px ${t.font}`;
          const tw = ctx.measureText(text).width;
          const rd = rad(i);
          const spots: [number, number][] = [
            [x + rd + 4, y],
            [x - rd - 4 - tw, y],
            [x - tw / 2, y - rd - 9],
            [x - tw / 2, y + rd + 9],
          ];
          let at: [number, number] | null = null;
          for (const [lx, ly] of spots) {
            const box: Box = [lx - 2, ly - 7, lx + tw + 2, ly + 7];
            // A label cut by the pane's edge reads as a different name.
            if (box[0] < 0 || box[2] > W || box[1] < 0 || box[3] > H) continue;
            if (boxes.hits(box)) continue;
            at = [lx, ly];
            boxes.add(box);
            break;
          }
          if (!at) {
            if (!force) return;
            // Always labelled: on its right, even where it overlaps.
            at = spots[0];
            boxes.add([at[0] - 2, at[1] - 7, at[0] + tw + 2, at[1] + 7]);
          }
          ctx.globalAlpha = nodesAlpha * (force || lifted(i) ? 1 : recede);
          ctx.strokeStyle = t.bg;
          ctx.lineWidth = 3;
          ctx.strokeText(text, at[0], at[1]);
          ctx.fillStyle = colors.mark.get(graph.typeIds[i]) ?? t.inkSecondary;
          ctx.fillText(text, at[0], at[1]);
          placed++;
        };
        for (const i of want) place(i, true);
        if (hood && la > 0.5) {
          for (const i of hood.list) {
            if (placed >= budget) break;
            if (!want.includes(i)) place(i, false);
          }
        }
        for (const i of matchOrder ?? byDegree) {
          if (placed >= budget) break;
          if (want.includes(i) || lifted(i)) continue;
          place(i, false);
        }
      }
    }

    /* Overview: links between communities, then one mark per community. */
    if (marksAlpha > 0.01) {
      const cx = (c: Community) => c.x * k + tx;
      const cy = (c: Community) => c.y * k + ty;
      const maxLink = communityLinks.reduce((mx, l) => Math.max(mx, l.count), 1);
      ctx.strokeStyle = t.inkTertiary;
      for (const l of communityLinks) {
        const a = communities[l.x];
        const b = communities[l.y];
        ctx.globalAlpha = marksAlpha * (0.08 + 0.3 * (l.count / maxLink));
        ctx.lineWidth = 0.6 + 4 * Math.sqrt(l.count / maxLink);
        ctx.beginPath();
        ctx.moveTo(cx(a), cy(a));
        ctx.lineTo(cx(b), cy(b));
        ctx.stroke();
      }
      communities.forEach((c, idx) => {
        if (!shownCount.get(c)) return;
        const x = cx(c), y = cy(c);
        const rad = markRadius(c);
        const color = colors.mark.get(c.typeId) ?? t.inkTertiary;
        const hovered = hoverRef.current?.kind === "community" && hoverRef.current.i === idx;
        const matched = communityMatch ? communityMatch[idx] : -1;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.globalAlpha = marksAlpha;
        ctx.fillStyle = t.bg;
        ctx.fill();
        // No match: an outline only.
        if (matched === 0) {
          ctx.globalAlpha = marksAlpha * (hovered ? 0.5 : 0.22);
          ctx.strokeStyle = t.inkTertiary;
          ctx.lineWidth = 1;
          ctx.stroke();
          return;
        }
        ctx.globalAlpha = marksAlpha * 0.2;
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = marksAlpha * 0.75;
        ctx.strokeStyle = color;
        ctx.lineWidth = hovered ? 2.5 : 1.25;
        ctx.stroke();
        // While filtering: the matching share as an arc around the mark, from
        // twelve o'clock, on a faint track. One match still shows.
        if (matched > 0) {
          const share = matched / c.members.length;
          const ar = rad + 4;
          ctx.lineCap = "butt";
          ctx.lineWidth = 3;
          ctx.globalAlpha = marksAlpha * 0.18;
          ctx.strokeStyle = t.inkTertiary;
          ctx.beginPath();
          ctx.arc(x, y, ar, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = marksAlpha;
          ctx.strokeStyle = t.ink;
          ctx.beginPath();
          ctx.arc(x, y, ar, -Math.PI / 2, -Math.PI / 2 + Math.max(0.14, share * Math.PI * 2));
          ctx.stroke();
          ctx.lineCap = "round";
        }
      });
      // Names: each community's best-connected record, largest first, where
      // they fit inside the canvas and clear of other names and marks; only
      // while the marks are the stronger layer.
      if (marksAlpha > 0.5) {
        ctx.font = `500 11px ${t.font}`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        const boxes = new LabelBoxes();
        for (const b of overlays.current) boxes.add(b);
        const markBox = communities.map((c): Box => {
          const rd = markRadius(c) + (communityMatch ? 7 : 1);
          return [cx(c) - rd, cy(c) - rd, cx(c) + rd, cy(c) + rd];
        });
        markBox.forEach((b) => boxes.add(b));
        const own = new LabelBoxes();
        communities.forEach((c, idx) => {
          if ((shownCount.get(c) ?? 0) < 8 || (communityMatch && communityMatch[idx] === 0)) return;
          const text = truncate(titleOf(c.top), 28);
          const x = cx(c);
          const y = cy(c) + markRadius(c) + (communityMatch ? 13 : 9);
          const tw = ctx.measureText(text).width;
          const box: Box = [x - tw / 2 - 2, y - 7, x + tw / 2 + 2, y + 7];
          if (box[0] < 0 || box[2] > W || box[1] < 0 || box[3] > H) return;
          // Clear of other names and of every mark but its own.
          if (own.hits(box) || boxes.hits(box, markBox[idx])) return;
          own.add(box);
          ctx.globalAlpha = marksAlpha;
          ctx.strokeStyle = t.bg;
          ctx.lineWidth = 3;
          ctx.strokeText(text, x, y);
          ctx.fillStyle = colors.mark.get(c.typeId) ?? t.inkSecondary;
          ctx.fillText(text, x, y);
        });
        ctx.textAlign = "start";
      }
    }
    /* Keyboard focus on a community: a carbon ring at its mark. */
    const fc = communities[focusedCommunity];
    if (fc) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = t.carbon;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(fc.x * k + tx, fc.y * k + ty, marksAlpha > 0.5 ? markRadius(fc) + 9 : 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    placeTip();
    if (!painted.current) {
      painted.current = true;
      performance.mark("network-first-paint");
    }
    if (lifting) frame.current = requestAnimationFrame(() => drawRef.current());
    // `mix`, `markRadius` and `radiusAt` close over props only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, colors, graph, n, edgeOn, nodeOn, strength, member, hubDegree, hubEdges, selected, find, focused, focusedCommunity, matchOrder, byDegree, titleOf, communities, communityLinks, communityMatch, marksOn, shownCount]);

  const drawRef = useRef(draw);
  drawRef.current = draw;
  const request = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(draw);
  }, [draw]);

  /* ── Tooltip placement ───────────────────────────────────────────────── */

  const tipRef = useRef<HTMLDivElement>(null);
  /** Where a tooltip's target is on screen, and the radius it must keep clear. */
  const anchorOf = (h: Hover) => {
    const { k, tx, ty } = cam.current;
    const r = k / fitK.current;
    if (h.kind === "node") {
      const pos = shown.current;
      return { x: pos[h.i * 2] * k + tx, y: pos[h.i * 2 + 1] * k + ty, r: Math.max(radiusAt(h.i, r), nodeRadius(h.i, r)) + 4 };
    }
    if (h.kind === "community") {
      const c = communities[h.i];
      return c ? { x: c.x * k + tx, y: c.y * k + ty, r: markRadius(c) + (communityMatch ? 7 : 3) } : null;
    }
    return { x: h.wx * k + tx, y: h.wy * k + ty, r: 6 };
  };
  /** Next to its target, never over it or its label (which sits to its
   *  right): above it, else below, else right, else left, kept inside the
   *  canvas. Set on the element, not in state, so a zoom or pan under a hover
   *  moves it with the frame. */
  const placeTip = () => {
    const el = tipRef.current;
    if (!el) return;
    const target = hoverRef.current ?? pinnedRef.current;
    const a = target ? anchorOf(target) : null;
    const W = size.w;
    const H = size.h;
    if (!a || a.x < 0 || a.y < 0 || a.x > W || a.y > H) {
      el.style.visibility = "hidden";
      return;
    }
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const gap = 8;
    const edge = 4;
    let x = clamp(a.x - w / 2, edge, Math.max(edge, W - w - edge));
    let y = a.y - a.r - gap - h;
    if (y < edge) y = a.y + a.r + gap;
    if (y + h > H - edge) {
      y = clamp(a.y - h / 2, edge, Math.max(edge, H - h - edge));
      x = a.x + a.r + gap;
      if (x + w > W - edge) x = Math.max(edge, a.x - a.r - gap - w);
    }
    el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    el.style.visibility = "visible";
  };
  useEffect(() => {
    request();
  }, [request]);
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      cancelAnimationFrame(anim.current);
    },
    [],
  );

  /* ── Size, dpr, fits ─────────────────────────────────────────────────── */

  // A move to a screen with another pixel ratio, or a browser zoom, leaves
  // the CSS size alone: the backing store is resized on the ratio's change.
  const [dprVersion, setDprVersion] = useState(0);
  useEffect(() => {
    let mq: MediaQueryList | null = null;
    const onChange = () => {
      setDprVersion((v) => v + 1);
      watch();
    };
    const watch = () => {
      mq?.removeEventListener("change", onChange);
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mq.addEventListener("change", onChange);
    };
    watch();
    return () => mq?.removeEventListener("change", onChange);
  }, []);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  /** The camera that frames `ext`. */
  const frameOf = useCallback(
    (ext: Extent): Camera => {
      const w = ext.maxX - ext.minX || 1;
      const h = ext.maxY - ext.minY || 1;
      const k = Math.min(Math.max(1, size.w - FIT_PAD) / w, Math.max(1, size.h - FIT_PAD) / h);
      return { k, tx: size.w / 2 - ((ext.minX + ext.maxX) / 2) * k, ty: size.h / 2 - ((ext.minY + ext.maxY) / 2) * k };
    },
    [size],
  );

  // The base zoom every relative measure (marks opening, labels, zoom limits)
  // is taken from: the layout on screen, framed whole. A resize updates it
  // below, with the camera.
  useLayoutEffect(() => {
    if (size.w && size.h) fitK.current = frameOf(baseExtent).k;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseExtent]);

  /** The camera for the Fit button and a filter move: the matches with a
   *  margin while filtering, the whole layout otherwise. */
  const fitCamera = useCallback((): Camera => {
    const base = frameOf(baseExtent);
    if (!strength) return base;
    const ext = boundsOf(target, matchOrder ?? []);
    if (!ext) return base;
    const mx = (ext.maxX - ext.minX) * 0.08;
    const my = (ext.maxY - ext.minY) * 0.08;
    const f = frameOf({ minX: ext.minX - mx, maxX: ext.maxX + mx, minY: ext.minY - my, maxY: ext.maxY + my });
    // A single match, or a tight few, would zoom to the limit: stop where
    // nodes are drawn with room around them.
    const k = clamp(f.k, base.k, base.k * (focus ? 4 : OPEN_TO * 2.5));
    const wx = (size.w / 2 - f.tx) / f.k;
    const wy = (size.h / 2 - f.ty) / f.k;
    return { k, tx: size.w / 2 - wx * k, ty: size.h / 2 - wy * k };
  }, [frameOf, baseExtent, strength, target, matchOrder, focus, size]);

  // Fit on first size and whenever the collection changes; a resize keeps the
  // centre and the relative zoom.
  const fitted = useRef<{ extent: Extent; w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.w || !size.h) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    const prev = fitted.current;
    const relNow = cam.current.k / fitK.current;
    fitK.current = frameOf(baseExtent).k;
    if (!prev || prev.extent !== placement.extent) {
      cam.current = fitCamera();
    } else {
      const cxw = (prev.w / 2 - cam.current.tx) / cam.current.k;
      const cyw = (prev.h / 2 - cam.current.ty) / cam.current.k;
      const k = fitK.current * relNow;
      cam.current = { k, tx: size.w / 2 - cxw * k, ty: size.h / 2 - cyw * k };
    }
    fitted.current = { extent: placement.extent, w: size.w, h: size.h };
    draw();
    sync.current();
    // Only a size or collection change refits here; filter moves are below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, placement.extent, dprVersion]);

  /* ── Moves ───────────────────────────────────────────────────────────── */

  const anim = useRef(0);
  /** An inertial pan in progress. */
  const glide = useRef(0);
  /** Tests hover again at the pointer (set below, once hit testing exists). */
  const rehover = useRef<() => void>(() => {});
  /** After the camera rests: the relative zoom, the breadcrumb, the keyboard
   *  list and the hover (set below). */
  const sync = useRef<() => void>(() => {});
  const syncTimer = useRef(0);
  /** Sync once a continuous gesture (wheel, pinch) has paused. */
  const syncSoon = () => {
    window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => sync.current(), 120);
  };
  /** Positions and fade of the move in progress, so another move can finish it. */
  const moving = useRef<{ to: Float32Array; fade: number } | null>(null);
  const settle = () => {
    const mv = moving.current;
    if (!mv) return;
    shown.current.set(mv.to);
    fade.current = mv.fade;
    moving.current = null;
  };

  /** One move: positions to `to`, non-members to `toFade`, camera to `next`.
   *  Positions and fade only change when given. */
  const move = useCallback(
    (next: Camera, animate: boolean, to?: Float32Array, toFade?: number, ms = MOVE_MS) => {
      cancelAnimationFrame(anim.current);
      cancelAnimationFrame(glide.current);
      settle();
      const from = { ...cam.current };
      const fromPos = to ? new Float32Array(shown.current) : null;
      const fromFade = fade.current;
      const endFade = toFade ?? fromFade;
      const finish = () => {
        cam.current = next;
        if (to) shown.current.set(to);
        fade.current = endFade;
        moving.current = null;
        draw();
        sync.current();
      };
      if (!animate || reducedMotion()) return finish();
      if (to) moving.current = { to, fade: endFade };
      const start = performance.now();
      let frames = 0;
      const step = (now: number) => {
        frames++;
        const p = Math.min(1, (now - start) / ms);
        const e = ease(p);
        // Interpolate the zoom geometrically so the centre path stays straight.
        const k = from.k * (next.k / from.k) ** e;
        const fx = (size.w / 2 - from.tx) / from.k;
        const fy = (size.h / 2 - from.ty) / from.k;
        const nx = (size.w / 2 - next.tx) / next.k;
        const ny = (size.h / 2 - next.ty) / next.k;
        const wx = fx + (nx - fx) * e;
        const wy = fy + (ny - fy) * e;
        cam.current = { k, tx: size.w / 2 - wx * k, ty: size.h / 2 - wy * k };
        if (to && fromPos) {
          const s = shown.current;
          for (let q = 0; q < s.length; q++) s[q] = fromPos[q] + (to[q] - fromPos[q]) * e;
        }
        fade.current = fromFade + (endFade - fromFade) * e;
        draw();
        if (p < 1) {
          anim.current = requestAnimationFrame(step);
          return;
        }
        finish();
        if (import.meta.env.DEV && to) {
          const ms = performance.now() - start;
          (window as unknown as { __networkMove?: object }).__networkMove = { ms: Math.round(ms), frames, fps: Math.round((frames / ms) * 1000) };
        }
      };
      anim.current = requestAnimationFrame(step);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draw, size],
  );

  const setCamera = useCallback(
    (next: Camera, animate = false, ms?: number) => move(next, animate, undefined, undefined, ms),
    [move],
  );

  /** A camera change from a continuous gesture (wheel, pinch, a held arrow
   *  key): drawn on the next frame, synced once the gesture rests. Many
   *  events in one frame draw once. */
  const nudge = useCallback(
    (next: Camera) => {
      cancelAnimationFrame(anim.current);
      cancelAnimationFrame(glide.current);
      settle();
      cam.current = next;
      request();
      syncSoon();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [request],
  );

  // A new match set or layout: move nodes and camera together, to the
  // matches (or, with a search, to its best match). The first one (the view
  // opening on a filter) jumps. A find step alone flies to the next match.
  const lastFit = useRef<string | null | undefined>(undefined);
  const lastFind = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!size.w || !size.h || fitKey === undefined || fitKey === null) return;
    const findKey = find?.key ?? null;
    if (lastFit.current !== fitKey) {
      const first = lastFit.current === undefined;
      lastFit.current = fitKey;
      lastFind.current = findKey;
      if (find) findWins.current = true;
      // Opening on a record selected in another view: centred on it, at node level.
      const next = find
        ? nodeCamera(find.node)
        : first && selected >= 0 && nodeOn[selected]
          ? nodeCamera(selected)
          : fitCamera();
      move(next, !first, target, focus ? 1 : 0);
      return;
    }
    if (findKey === lastFind.current) return;
    lastFind.current = findKey;
    if (!find) return;
    findWins.current = true;
    setCamera(nodeCamera(find.node, cam.current), true);
    // `fitKey` and the find key name everything a move depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, find?.key, size.w > 0 && size.h > 0]);

  /** A camera centred on node `i`, close enough to draw it as a node. */
  const nodeCamera = (i: number, from: Camera | null = null): Camera => {
    const k = Math.max(from?.k ?? 0, fitK.current * (marksOn ? OPEN_TO * 1.25 : 2));
    return { k, tx: size.w / 2 - target[i * 2] * k, ty: size.h / 2 - target[i * 2 + 1] * k };
  };

  // A record selected elsewhere (the drawer's links, a list behind it) is
  // brought into view when it is off screen or inside a community mark. A
  // node selected here stays where it is.
  const selfSelect = useRef(false);
  useEffect(() => {
    if (selected >= 0) findWins.current = false;
    if (selfSelect.current) {
      selfSelect.current = false;
      return;
    }
    if (selected < 0 || !nodeOn[selected] || !size.w || lastFit.current === undefined) return;
    const c = cam.current;
    const x = target[selected * 2] * c.k + c.tx;
    const y = target[selected * 2 + 1] * c.k + c.ty;
    const inView = x > FIT_PAD / 2 && x < size.w - FIT_PAD / 2 && y > FIT_PAD / 2 && y < size.h - FIT_PAD / 2;
    if (!inView || mix(c.k / fitK.current) < 0.5) setCamera(nodeCamera(selected, c), true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Dev only: screen positions for the scripted checks in dev/results.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as { __network?: object }).__network = {
      /** Visible nodes at node level, best-connected first: [index, x, y, id]. */
      visible: (limit = 20) => {
        const c = cam.current;
        const out: [number, number, number, string][] = [];
        for (const i of byDegree) {
          if (!nodeOn[i] || (member && !member[i])) continue;
          const x = shown.current[i * 2] * c.k + c.tx;
          const y = shown.current[i * 2 + 1] * c.k + c.ty;
          if (x > 60 && x < size.w - 60 && y > 60 && y < size.h - 60) out.push([i, x, y, graph.ids[i]]);
          if (out.length >= limit) break;
        }
        return out;
      },
      rel: () => cam.current.k / fitK.current,
      lift: () => [liftNode.current, liftAmt.current],
    };
  });

  // An open edge belongs to the edges drawn when it was opened.
  useEffect(() => {
    setPinned(null);
  }, [edgeOn]);

  const zoomAt = useCallback(
    (factor: number, x: number, y: number, animate = false) => {
      settle();
      const c = cam.current;
      const k = clamp(c.k * factor, fitK.current * MIN_REL, fitK.current * MAX_REL);
      const f = k / c.k;
      const next = { k, tx: x - (x - c.tx) * f, ty: y - (y - c.ty) * f };
      if (animate) setCamera(next, true, 220);
      else nudge(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setCamera, nudge],
  );

  const panBy = useCallback(
    (dx: number, dy: number, animate = false) => {
      settle();
      const c = cam.current;
      const next = { k: c.k, tx: c.tx + dx, ty: c.ty + dy };
      if (animate) setCamera(next, true, 180);
      else nudge(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setCamera, nudge],
  );

  const centreOn = useCallback(
    (wx: number, wy: number, k: number, animate = true) =>
      setCamera({ k, tx: size.w / 2 - wx * k, ty: size.h / 2 - wy * k }, animate),
    [setCamera, size],
  );

  // The wheel needs a native listener: React's is passive and cannot
  // preventDefault the page scroll. A trackpad's two-finger swipe pans; its
  // pinch (ctrlKey), ⌘ + wheel and a mouse wheel's notches zoom.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1;
      // A mouse wheel moves in whole notches (lines, or 100-odd pixels) on one
      // axis; a trackpad sends small, often fractional, deltas on both.
      const notch = e.deltaMode !== 0 || (e.deltaX === 0 && Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY));
      if (e.ctrlKey || e.metaKey || notch) {
        const factor = Math.exp(-e.deltaY * scale * (e.ctrlKey ? 0.01 : 0.0018));
        zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top);
      } else {
        panBy(-e.deltaX * scale, -e.deltaY * scale);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt, panBy]);

  /* ── Hit testing ─────────────────────────────────────────────────────── */

  const hitAt = useCallback(
    (x: number, y: number): { kind: "node" | "community"; i: number } | null => {
      const c = cam.current;
      const r = c.k / fitK.current;
      const wx = (x - c.tx) / c.k;
      const wy = (y - c.ty) / c.k;
      if (mix(r) < 0.5) {
        let best = -1;
        let bestD = Infinity;
        communities.forEach((cm, idx) => {
          if (!shownCount.get(cm)) return;
          const d = Math.hypot(cm.x * c.k + c.tx - x, cm.y * c.k + c.ty - y);
          if (d <= markRadius(cm) + 3 && d < bestD) {
            bestD = d;
            best = idx;
          }
        });
        return best >= 0 ? { kind: "community", i: best } : null;
      }
      const i = quad.nearest(wx, wy, 18 / c.k, (j) => nodeOn[j] === 1 && (!member || member[j] === 1));
      if (i < 0) return null;
      const d = Math.hypot(target[i * 2] * c.k + c.tx - x, target[i * 2 + 1] * c.k + c.ty - y);
      return d <= radiusAt(i, r) + 5 ? { kind: "node", i } : null;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [communities, quad, nodeOn, member, target, marksOn, size, strength, shownCount],
  );

  /** The drawn edge within 5px of a point, at node level. While a node is
   *  lifted, only its own edges answer; faint hub edges never do. */
  const edgeAt = (x: number, y: number): number => {
    const c = cam.current;
    if (mix(c.k / fitK.current) < 0.5) return -1;
    const pos = shown.current;
    const liftI = liftNode.current >= 0 && liftAmt.current > 0.5 ? liftNode.current : -1;
    let best = -1;
    let bestD = 5;
    const m = graph.a.length;
    for (let e = 0; e < m; e++) {
      if (!edgeOn[e]) continue;
      const i = graph.a[e];
      const j = graph.b[e];
      const incident = (selected >= 0 && (i === selected || j === selected)) || (liftI >= 0 && (i === liftI || j === liftI));
      if (liftI >= 0 && !incident) continue;
      if (!incident && strength && strength[i] !== 2 && strength[j] !== 2) continue;
      if (member && !incident && (!member[i] || !member[j])) continue;
      if (!incident && hubEdges !== "full" && (graph.degree[i] >= hubDegree || graph.degree[j] >= hubDegree)) continue;
      const x1 = pos[i * 2] * c.k + c.tx;
      const y1 = pos[i * 2 + 1] * c.k + c.ty;
      const x2 = pos[j * 2] * c.k + c.tx;
      const y2 = pos[j * 2 + 1] * c.k + c.ty;
      if (x < Math.min(x1, x2) - bestD || x > Math.max(x1, x2) + bestD || y < Math.min(y1, y2) - bestD || y > Math.max(y1, y2) + bestD) continue;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = dx * dx + dy * dy || 1;
      const u = clamp(((x - x1) * dx + (y - y1) * dy) / len, 0, 1);
      const d = Math.hypot(x - (x1 + u * dx), y - (y1 + u * dy));
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  };

  /** The mouse's last position over the canvas, for testing hover again
   *  when the drawing moves under it. */
  const pointerAt = useRef<{ x: number; y: number } | null>(null);
  const hoverAt = (x: number, y: number) => {
    const c = cam.current;
    const wx = (x - c.tx) / c.k;
    const wy = (y - c.ty) / c.k;
    const node = hitAt(x, y);
    const edge = node ? -1 : edgeAt(x, y);
    const hit: Hover | null = node ? { ...node, wx, wy } : edge >= 0 ? { kind: "edge", i: edge, wx, wy } : null;
    const prev = hoverRef.current;
    if (hit?.kind !== prev?.kind || hit?.i !== prev?.i) {
      hoverRef.current = hit;
      setHover(hit);
      request();
    }
  };
  rehover.current = () => {
    const p = pointerAt.current;
    if (p && !gesture.current) hoverAt(p.x, p.y);
  };

  /** Escape, or a click on empty canvas: no selection, no open edge. */
  const clearAll = () => {
    if (pinnedRef.current) {
      pinnedRef.current = null;
      setPinned(null);
    }
    if (selected >= 0) onClear();
    request();
  };

  /* ── After the camera rests ──────────────────────────────────────────── */

  // The community the camera is inside (for the breadcrumb), and the records
  // in view (for the keyboard list), recomputed when a gesture or move ends.
  const [openCommunity, setOpenCommunity] = useState(-1);
  const [viewNodes, setViewNodes] = useState<number[] | null>(null);
  sync.current = () => {
    window.clearTimeout(syncTimer.current);
    const c = cam.current;
    const r = c.k / fitK.current;
    setRel(r);
    const atNodes = mix(r) >= 0.5;
    if (marksOn && atNodes) {
      const i = quad.nearest((size.w / 2 - c.tx) / c.k, (size.h / 2 - c.ty) / c.k, Math.max(size.w, size.h) / c.k, (j) => nodeOn[j] === 1);
      setOpenCommunity(i >= 0 ? communityIndex.get(placement.community[i]) ?? -1 : -1);
    } else setOpenCommunity(-1);
    if (atNodes) {
      const inView: number[] = [];
      for (const i of byDegree) {
        if (!nodeOn[i] || (member && !member[i])) continue;
        const x = target[i * 2] * c.k + c.tx;
        const y = target[i * 2 + 1] * c.k + c.ty;
        if (x >= 0 && x <= size.w && y >= 0 && y <= size.h) inView.push(i);
      }
      // Matches first, then their neighbours, then the rest; best-connected
      // first within each.
      const rank = (i: number) => (!strength ? 0 : strength[i] === 2 ? 0 : strength[i] === 1 ? 1 : 2);
      const list = inView
        .map((i, k) => [i, rank(i) * n + k] as const)
        .sort((x, y) => x[1] - y[1])
        .slice(0, KEYBOARD_LIST)
        .map(([i]) => i);
      setViewNodes((prev) => (prev && prev.length === list.length && prev.every((x, k) => x === list[k]) ? prev : list));
    } else setViewNodes(null);
    rehover.current();
  };

  /* ── Pointer: pan, pinch, hover, click ───────────────────────────────── */

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const communityIndex = useMemo(() => new Map(communities.map((c, idx) => [c.id, idx])), [communities]);
  const gesture = useRef<{ moved: boolean; x: number; y: number; dist: number; mx: number; my: number } | null>(null);

  const local = (e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  /** Pan velocity in px/ms, smoothed over the last moves of a drag. */
  const velocity = useRef({ vx: 0, vy: 0, t: 0 });

  /** After a flick, the camera keeps moving and slows to a stop. */
  const startGlide = () => {
    const v = velocity.current;
    if (reducedMotion() || performance.now() - v.t > 60 || Math.hypot(v.vx, v.vy) < 0.25) return;
    let { vx, vy } = v;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(32, now - last);
      last = now;
      const c = cam.current;
      cam.current = { ...c, tx: c.tx + vx * dt, ty: c.ty + vy * dt };
      const decay = Math.exp(-dt / GLIDE_MS);
      vx *= decay;
      vy *= decay;
      drawRef.current();
      if (Math.hypot(vx, vy) > 0.02) glide.current = requestAnimationFrame(step);
      else sync.current();
    };
    glide.current = requestAnimationFrame(step);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    // A press stops a glide, and takes the keyboard to the canvas.
    cancelAnimationFrame(glide.current);
    velocity.current = { vx: 0, vy: 0, t: 0 };
    hostRef.current?.focus({ preventScroll: true });
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const pts = [...pointers.current.values()];
    gesture.current = {
      moved: pointers.current.size > 1,
      x: p.x,
      y: p.y,
      dist: pts.length > 1 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0,
      mx: pts.length > 1 ? (pts[0].x + pts[1].x) / 2 : p.x,
      my: pts.length > 1 ? (pts[0].y + pts[1].y) / 2 : p.y,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = local(e);
    const g = gesture.current;
    if (!g || !pointers.current.has(e.pointerId)) {
      if (e.pointerType !== "mouse") return;
      pointerAt.current = p;
      hoverAt(p.x, p.y);
      return;
    }
    const before = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      // Two fingers: the midpoint pans, the spread zooms about it.
      if (g.dist > 0) {
        const c = cam.current;
        cam.current = { ...c, tx: c.tx + mx - g.mx, ty: c.ty + my - g.my };
        zoomAt(dist / g.dist, mx, my);
      }
      g.dist = dist;
      g.mx = mx;
      g.my = my;
      g.moved = true;
      return;
    }
    if (!g.moved && Math.hypot(p.x - g.x, p.y - g.y) < 4) return;
    if (!g.moved) {
      // A drag takes over from a move in progress.
      cancelAnimationFrame(anim.current);
      settle();
    }
    g.moved = true;
    if (hoverRef.current) {
      hoverRef.current = null;
      setHover(null);
    }
    const c = cam.current;
    cam.current = { ...c, tx: c.tx + p.x - before.x, ty: c.ty + p.y - before.y };
    const now = performance.now();
    const v = velocity.current;
    const dt = Math.max(1, now - (v.t || now - 16));
    velocity.current = {
      vx: 0.7 * ((p.x - before.x) / dt) + 0.3 * v.vx,
      vy: 0.7 * ((p.y - before.y) / dt) + 0.3 * v.vy,
      t: now,
    };
    request();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size === 0) {
      gesture.current = null;
      if (g?.moved && g.dist === 0) startGlide();
      sync.current();
    } else if (g) {
      // One finger left a pinch: it pans from where it is now.
      g.dist = 0;
      const [rest] = [...pointers.current.values()];
      g.mx = rest.x;
      g.my = rest.y;
    }
    if (!g || g.moved || pointers.current.size) return;
    const p = local(e);
    const c = cam.current;
    const wx = (p.x - c.tx) / c.k;
    const wy = (p.y - c.ty) / c.k;
    // A second tap close in time and place is a double-click (or a phone's
    // double-tap): it centres the community under it. The first tap has
    // already done its own thing (selected a node, began opening a mark);
    // the second does not repeat it.
    const now = performance.now();
    const last = lastTap.current;
    lastTap.current = { t: now, x: p.x, y: p.y };
    if (last && now - last.t < DOUBLE_TAP_MS && Math.hypot(p.x - last.x, p.y - last.y) < 12) {
      lastTap.current = null;
      const idx = communityAt(p.x, p.y);
      if (idx >= 0) centreCommunity(idx);
      return;
    }
    const hit = hitAt(p.x, p.y);
    if (!hit) {
      // An edge opens its tooltip and keeps it; empty canvas ends the
      // selection and any open edge.
      const edge = edgeAt(p.x, p.y);
      if (edge >= 0) {
        setPinned({ kind: "edge", i: edge, wx, wy });
        request();
        return;
      }
      clearAll();
      return;
    }
    if (pinnedRef.current) setPinned(null);
    if (hit.kind === "node") {
      selfSelect.current = true;
      onSelect(hit.i, e);
      return;
    }
    // A community opens: zoom in until it is drawn as nodes.
    const cm = communities[hit.i];
    const k = Math.max(fitK.current * OPEN_TO * 1.1, Math.min(size.w, size.h) / Math.max(1, cm.spread * 4.5));
    centreOn(cm.x, cm.y, Math.min(k, fitK.current * MAX_REL));
  };

  /** The community at a point: the mark under it (or near it) on the
   *  overview, the community of the nearest node at node level; -1 for none
   *  within reach or a record with no relationships. */
  const communityAt = (x: number, y: number): number => {
    const c = cam.current;
    if (mix(c.k / fitK.current) < 0.5) {
      let best = -1;
      let bestD = Infinity;
      communities.forEach((cm, idx) => {
        if (!shownCount.get(cm)) return;
        const d = Math.hypot(cm.x * c.k + c.tx - x, cm.y * c.k + c.ty - y) - markRadius(cm);
        if (d <= 16 && d < bestD) {
          bestD = d;
          best = idx;
        }
      });
      return best;
    }
    const i = quad.nearest((x - c.tx) / c.k, (y - c.ty) / c.k, 40 / c.k, (j) => nodeOn[j] === 1 && (!member || member[j] === 1));
    return i < 0 ? -1 : communityIndex.get(placement.community[i]) ?? -1;
  };

  /** Centre community `idx` and zoom until it fills the view with a margin:
   *  its matches while filtering, when it has any. On the overview the zoom
   *  goes far enough to open it into nodes. */
  const centreCommunity = (idx: number) => {
    const cm = communities[idx];
    if (!cm) return;
    settle();
    const on = (i: number) => nodeOn[i] === 1 && (!member || member[i] === 1);
    const matched = strength ? cm.members.filter((i) => strength[i] === 2 && on(i)) : [];
    const nodes = matched.length ? matched : cm.members.filter(on);
    const ext = boundsOf(target, nodes);
    if (!ext) return;
    const mx = Math.max((ext.maxX - ext.minX) * 0.1, 1);
    const my = Math.max((ext.maxY - ext.minY) * 0.1, 1);
    const f = frameOf({ minX: ext.minX - mx, maxX: ext.maxX + mx, minY: ext.minY - my, maxY: ext.maxY + my });
    const k = clamp(f.k, fitK.current * (marksOn ? OPEN_TO * 1.1 : 1), fitK.current * Math.min(MAX_REL, 12));
    centreOn((ext.minX + ext.maxX) / 2, (ext.minY + ext.maxY) / 2, k);
  };

  const onPointerLeave = () => {
    pointerAt.current = null;
    if (hoverRef.current) {
      hoverRef.current = null;
      setHover(null);
      request();
    }
  };

  /* ── Keyboard list ───────────────────────────────────────────────────── */

  // Matches first, then their neighbours, then the best-connected rest.
  const bestNodes = useMemo(() => {
    const on = byDegree.filter((i) => nodeOn[i] && (!member || member[i]));
    if (!strength) return on.slice(0, KEYBOARD_LIST);
    const rank = (i: number) => (strength[i] === 2 ? 0 : strength[i] === 1 ? 1 : 2);
    return on
      .map((i, k) => [i, rank(i) * n + k] as const)
      .sort((x, y) => x[1] - y[1])
      .slice(0, KEYBOARD_LIST)
      .map(([i]) => i);
  }, [byDegree, strength, nodeOn, member, n]);
  // At node level the list is the records in view, so Tab reaches what the
  // camera shows (Review #3); on the overview, the best-connected.
  const keyboardNodes = viewNodes ?? bestNodes;

  const focusNode = (i: number) => {
    setFocused(i);
    settle();
    const k = Math.max(cam.current.k, fitK.current * (marksOn ? OPEN_TO * 1.2 : 1.5));
    centreOn(target[i * 2], target[i * 2 + 1], k);
  };

  /* ── Tooltip ─────────────────────────────────────────────────────────── */

  const tipOf = hover ?? pinned;
  const tip = useMemo(() => {
    if (!tipOf) return null;
    if (tipOf.kind === "node") {
      const i = tipOf.i;
      const d = graph.degree[i];
      const what = strength ? (strength[i] === 2 ? "Match" : strength[i] === 1 ? "Linked to a match" : "") : "";
      const links = `${d.toLocaleString()} ${d === 1 ? "link" : "links"}`;
      return { title: titleOf(i), sub: [typeNameOf(graph.typeIds[i]), links, what].filter(Boolean).join(" · ") };
    }
    if (tipOf.kind === "edge") {
      const info = edgeInfo(tipOf.i);
      return {
        title: info.types.join(", ") || "Related",
        ends: [titleOf(graph.a[tipOf.i]), titleOf(graph.b[tipOf.i])] as const,
        sub: `${info.refs.toLocaleString()} ${info.refs === 1 ? "reference" : "references"}`,
        evidence: info.evidence,
        hint: tipOf === hover && !pinned ? "Click to keep open" : undefined,
      };
    }
    const c = communities[tipOf.i];
    if (!c) return null;
    const count = c.members.length;
    const records = `${count.toLocaleString()} ${count === 1 ? "record" : "records"}`;
    if (communityMatch) {
      const m = communityMatch[tipOf.i];
      return {
        title: titleOf(c.top),
        sub: `${m.toLocaleString()} of ${records} ${m === 1 ? "matches" : "match"}, mostly ${typeNameOf(c.typeId)}`,
        hint: "Double-click to centre",
      };
    }
    return { title: titleOf(c.top), sub: `${records}, mostly ${typeNameOf(c.typeId)}`, hint: "Double-click to centre" };
  }, [tipOf, hover, pinned, graph, strength, titleOf, typeNameOf, edgeInfo, communities, communityMatch]);
  useLayoutEffect(() => {
    placeTip();
    const host = hostRef.current;
    if (!host) return;
    const origin = host.getBoundingClientRect();
    const next: Box[] = [];
    host.querySelectorAll<HTMLElement>("[data-overlay]").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width) next.push([r.left - origin.left - 4, r.top - origin.top - 4, r.right - origin.left + 4, r.bottom - origin.top + 4]);
    });
    const prev = overlays.current;
    if (next.length !== prev.length || next.some((b, k) => b.some((v, j) => Math.abs(v - prev[k][j]) > 0.5))) {
      overlays.current = next;
      request();
    }
  });

  /* Communities for the keyboard: by match count while filtering (those with
     a match only), by size otherwise. Enter centres one. */
  const keyboardCommunities = useMemo(() => {
    if (!marksOn) return [];
    return communities
      .map((c, idx) => ({ c, idx, m: communityMatch ? communityMatch[idx] : -1 }))
      .filter((x) => x.m !== 0 && (shownCount.get(x.c) ?? 0) > 0)
      .sort((p, q) => q.m - p.m || q.c.members.length - p.c.members.length)
      .slice(0, 20);
  }, [marksOn, communities, communityMatch, shownCount]);

  /* While filtering, the chip counts matches with no relationship (never
     inside a community mark), or says nothing matches. */
  const isolatedMatches = useMemo(() => {
    if (!matchOrder) return 0;
    let k = 0;
    for (const i of matchOrder) if (graph.degree[i] === 0) k++;
    return k;
  }, [matchOrder, graph]);
  const chip = !strength
    ? overview && placement.isolated > 0 && rel < OPEN_TO
      ? `${placement.isolated.toLocaleString()} ${placement.isolated === 1 ? "record has" : "records have"} no relationships`
      : null
    : matchOrder && matchOrder.length === 0
      ? hiddenMatches > 0
        ? `${hiddenMatches.toLocaleString()} ${hiddenMatches === 1 ? "match is" : "matches are"} hidden by Display options`
        : "No records match"
      : isolatedMatches > 0 && marksOn && rel < OPEN_TO
        ? `${isolatedMatches.toLocaleString()} ${isolatedMatches === 1 ? "match has" : "matches have"} no relationships`
        : null;

  const zoomButton =
    "h-6 min-w-6 px-1 text-sm text-ink-secondary hover:text-ink rounded-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40";
  const switchButton = (on: boolean) =>
    `h-6 px-1.5 text-meta font-medium rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40 ${
      on ? "bg-parchment text-ink" : "text-ink-secondary hover:text-ink cursor-pointer"
    }`;
  const centre = () => ({ x: size.w / 2, y: size.h / 2 });
  // Open where it is short and there is room; a long list starts closed.
  const [legendOpen, setLegendOpen] = useState<boolean | null>(null);
  const legendShown = legendOpen ?? (legend.length <= 8 && size.w >= 640);
  const crumb = communities[openCommunity];

  return (
    <div
      ref={hostRef}
      data-component="NetworkCanvas"
      className="relative w-full h-full min-h-0 overflow-hidden rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-carbon/40"
      // The canvas region takes the keyboard: arrows pan (Shift: farther),
      // + and − zoom, 0 fits, Escape ends the selection. Keys pressed on the
      // controls inside it are theirs, except Escape.
      tabIndex={0}
      role="group"
      aria-roledescription="network"
      aria-label={label}
      aria-describedby={helpId}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          if (selected >= 0 || pinnedRef.current) {
            e.preventDefault();
            clearAll();
          }
          return;
        }
        if (e.target !== e.currentTarget || e.metaKey || e.ctrlKey || e.altKey) return;
        const stepPx = e.shiftKey ? 240 : 80;
        const c = centre();
        const keys: Record<string, () => void> = {
          ArrowLeft: () => panBy(stepPx, 0, !e.repeat),
          ArrowRight: () => panBy(-stepPx, 0, !e.repeat),
          ArrowUp: () => panBy(0, stepPx, !e.repeat),
          ArrowDown: () => panBy(0, -stepPx, !e.repeat),
          "+": () => zoomAt(1.4, c.x, c.y, !e.repeat),
          "=": () => zoomAt(1.4, c.x, c.y, !e.repeat),
          "-": () => zoomAt(1 / 1.4, c.x, c.y, !e.repeat),
          _: () => zoomAt(1 / 1.4, c.x, c.y, !e.repeat),
          "0": () => setCamera(fitCamera(), true),
        };
        const run = keys[e.key];
        if (!run) return;
        e.preventDefault();
        run();
      }}
    >
      <p id={helpId} className="sr-only">
        Arrow keys pan, plus and minus zoom, 0 fits, Escape clears the selection. Tab reaches the records in view.
      </p>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
        // Taps here are the canvas's own: the Library's ground click must not
        // clear the selection a node tap just made.
        onClick={(e) => e.stopPropagation()}
        style={{ width: size.w, height: size.h, touchAction: "none" }}
        className={`block ${hover ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
      />
      {tip && (
        <div
          ref={tipRef}
          role="presentation"
          data-part="tooltip"
          className="pointer-events-none absolute left-0 top-0 z-10 w-max max-w-[18rem] px-2 py-1.5 rounded-md bg-paper shadow-md border border-border-soft"
          style={{ visibility: "hidden" }}
        >
          <p className="text-xs font-medium text-ink truncate">{tip.title}</p>
          {"ends" in tip && tip.ends && (
            <>
              <p className="text-meta text-ink-secondary truncate">Between {tip.ends[0]}</p>
              <p className="text-meta text-ink-secondary truncate">and {tip.ends[1]}</p>
            </>
          )}
          <p className="text-meta text-ink-tertiary truncate">{tip.sub}</p>
          {"evidence" in tip &&
            tip.evidence?.map((ev, k) => (
              <div key={k} className="mt-1.5 flex flex-col items-start gap-0.5">
                <RefStatus verification={ev.verification} />
                {ev.quote && <p className="text-xs text-ink-secondary line-clamp-3">“{ev.quote}”</p>}
              </div>
            ))}
          {"hint" in tip && tip.hint && <p className="text-meta text-ink-tertiary">{tip.hint}</p>}
        </div>
      )}
      {/* Where the camera is, once a community has opened into nodes. The
          slot is kept on collections with an overview, so the legend under
          it does not move. */}
      {marksOn && crumb && (
        <nav
          aria-label="Where you are"
          data-part="breadcrumb" data-overlay
          className="absolute top-0 left-0 h-6 max-w-[calc(100%-9rem)] flex items-center gap-1 px-1 bg-paper border border-border-soft rounded-md shadow-sm text-meta"
        >
          <button
            type="button"
            className="h-5 px-1 rounded-sm text-ink-secondary hover:text-ink hover:bg-parchment cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
            onClick={() => setCamera(frameOf(baseExtent), true)}
          >
            Collection
          </button>
          <span aria-hidden className="text-ink-muted">
            ›
          </span>
          <span aria-current="location" className="min-w-0 truncate font-medium text-ink">
            Around {titleOf(crumb.top)}
          </span>
          <span className="shrink-0 pe-1 text-ink-tertiary tabular-nums">{crumb.members.length.toLocaleString()}</span>
        </nav>
      )}
      {legend.length > 1 && (
        <div
          data-part="legend" data-overlay
          className={`absolute left-0 ${marksOn ? "top-8" : "top-0"} w-fit max-w-[16rem] bg-paper border border-border-soft rounded-md shadow-sm`}
        >
          <button
            type="button"
            aria-expanded={legendShown}
            className="w-full h-6 flex items-center gap-1 px-2 rounded-md text-meta font-semibold uppercase tracking-wider text-ink-tertiary hover:text-ink cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
            onClick={() => setLegendOpen(!legendShown)}
          >
            Templates
            {hiddenTypes.size > 0 && <span className="normal-case tracking-normal font-medium">· {hiddenTypes.size} hidden</span>}
            {legendShown ? <ChevronUp size={12} aria-hidden className="ms-auto" /> : <ChevronDown size={12} aria-hidden className="ms-auto" />}
          </button>
          {legendShown && (
            <ul className="pb-1 px-1 overflow-y-auto" style={{ maxHeight: clamp(size.h - (marksOn ? 112 : 80), 96, 244) }}>
              {legend.map(({ typeId, count }) => {
                const on = !hiddenTypes.has(typeId);
                const name = typeNameOf(typeId);
                return (
                  <li key={typeId}>
                    <button
                      type="button"
                      aria-pressed={on}
                      title={on ? `Hide ${name}` : `Show ${name}`}
                      className="w-full h-6 flex items-center gap-1.5 px-1 rounded-sm text-meta hover:bg-parchment cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
                      onClick={() =>
                        setHiddenTypes((prev) => {
                          const next = new Set(prev);
                          if (on) next.add(typeId);
                          else next.delete(typeId);
                          return next;
                        })
                      }
                    >
                      <span
                        aria-hidden
                        className="w-2 h-2 rounded-[2px] shrink-0 border"
                        style={{ backgroundColor: on ? colors.dot.get(typeId) : "transparent", borderColor: colors.dot.get(typeId) }}
                      />
                      <span className={`min-w-0 truncate ${on ? "text-ink-secondary" : "text-ink-tertiary line-through"}`}>{name}</span>
                      <span className="ms-auto ps-2 text-ink-tertiary tabular-nums">{count.toLocaleString()}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
      {find && (
        <div
          data-part="find" data-overlay
          role="group"
          aria-label="Matches"
          // `--rail-reserve`: the Library's Full width rail sits at this corner.
          className="absolute top-0 right-[var(--rail-reserve,0px)] flex items-center gap-0.5 bg-paper border border-border rounded-md shadow-sm px-1 py-0.5"
        >
          <button
            type="button"
            aria-label="Previous match"
            title="Previous match (Shift+Enter in the search)"
            className={zoomButton}
            onClick={() => find.onStep(-1)}
          >
            <ChevronUp size={14} aria-hidden className="mx-auto" />
          </button>
          <span role="status" className="px-1 text-meta text-ink-secondary tabular-nums whitespace-nowrap">
            {find.index + 1} of {find.count.toLocaleString()}
            <span className="sr-only">: {titleOf(find.node)}</span>
          </span>
          <button
            type="button"
            aria-label="Next match"
            title="Next match (Enter in the search)"
            className={zoomButton}
            onClick={() => find.onStep(1)}
          >
            <ChevronDown size={14} aria-hidden className="mx-auto" />
          </button>
        </div>
      )}
      {chip && (
        <p
          data-part="isolated" data-overlay
          className="absolute left-0 bottom-0 w-fit px-2 h-6 flex items-center rounded-md bg-paper border border-border-soft text-meta text-ink-tertiary"
        >
          {chip}
        </p>
      )}
      <div className="absolute bottom-0 right-0 flex flex-wrap-reverse justify-end items-center gap-1.5 max-w-full">
        {layoutSwitch && (
          <div
            data-part="layout" data-overlay
            role="group"
            aria-label="Layout"
            className="flex items-center gap-0.5 bg-paper border border-border rounded-md shadow-sm px-1 py-0.5"
          >
            <span role="status" className="sr-only">
              {layoutSwitch.pending ? "Arranging the matches" : ""}
            </span>
            <button
              type="button"
              aria-pressed={layoutSwitch.focus}
              aria-disabled={!layoutSwitch.available}
              title={layoutSwitch.available ? "The matches and their links, laid out on their own" : layoutSwitch.reason}
              className={`${switchButton(layoutSwitch.focus)} ${layoutSwitch.available ? "" : "opacity-50 cursor-not-allowed"}`}
              onClick={() => layoutSwitch.available && layoutSwitch.onChange(true)}
            >
              {layoutSwitch.pending ? "Arranging…" : "Focus"}
            </button>
            <button
              type="button"
              aria-pressed={!layoutSwitch.focus}
              title="The matches in place in the whole collection"
              className={switchButton(!layoutSwitch.focus)}
              onClick={() => layoutSwitch.onChange(false)}
            >
              Whole collection
            </button>
          </div>
        )}
        <div
          data-part="zoom" data-overlay
          role="group"
          aria-label="Zoom"
          className="flex items-center gap-0.5 bg-paper border border-border rounded-md shadow-sm px-1 py-0.5"
        >
          <button type="button" aria-label="Zoom out" className={zoomButton} onClick={() => zoomAt(1 / 1.6, centre().x, centre().y, true)}>
            −
          </button>
          <button type="button" aria-label="Zoom in" className={zoomButton} onClick={() => zoomAt(1.6, centre().x, centre().y, true)}>
            +
          </button>
          <button
            type="button"
            title={strength ? "Fit the matches" : "Fit the collection"}
            className={`${zoomButton} text-meta`}
            onClick={() => setCamera(fitCamera(), true)}
          >
            Fit
          </button>
        </div>
      </div>
      {keyboardCommunities.length > 0 && (
        <ul aria-label={communityMatch ? "Where the matches are" : "Groups"} className="sr-only">
          {keyboardCommunities.map(({ c, idx, m }) => (
            <li key={c.id}>
              <button
                type="button"
                onFocus={() => {
                  setFocusedCommunity(idx);
                  request();
                }}
                onBlur={() => setFocusedCommunity((f) => (f === idx ? -1 : f))}
                onClick={() => centreCommunity(idx)}
              >
                Group around {titleOf(c.top)}:{" "}
                {m >= 0
                  ? `${m.toLocaleString()} of ${c.members.length.toLocaleString()} records match`
                  : `${c.members.length.toLocaleString()} records`}
                . Press Enter to centre it.
              </button>
            </li>
          ))}
        </ul>
      )}
      <ul aria-label={label} className="sr-only">
        {keyboardNodes.map((i) => (
          <li key={graph.ids[i]}>
            <button
              type="button"
              aria-pressed={i === selected}
              onFocus={() => focusNode(i)}
              onBlur={() => setFocused((f) => (f === i ? -1 : f))}
              onClick={(e) => onSelect(i, e)}
            >
              {titleOf(i)}, {typeNameOf(graph.typeIds[i])}
              {strength ? (strength[i] === 2 ? ", match" : strength[i] === 1 ? ", linked to a match" : "") : ""}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
