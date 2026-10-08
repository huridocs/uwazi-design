import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { otherEnd, type NetworkGraph } from "../../data/network/graph";
import type { Community, NetworkPlacement } from "../../data/network/layout";
import type { FocusLayout } from "../../data/network/focus";
import type { PairEvidence } from "../../data/network/graph";
import { ChevronDown, ChevronUp, Layers } from "lucide-react";
import { RefStatus } from "../relationships/rows/RefStatus";
import { buildQuadtree } from "../../utils/quadtree";
import { typeLabelColor } from "../../utils/typeColor";
import { noteCameraMove } from "../../utils/cameraMotion";
import { CANVAS_OVERLAY, CANVAS_OVERLAY_BUTTON, CANVAS_OVERLAY_GROUP, CANVAS_PANEL } from "../shared/canvasOverlay";

/** A whole-collection graph on one canvas.
 *
 *  Canvas 2D, not SVG: CEJIL is 4,398 nodes and 16,585 edges, eight times what
 *  the SVG graph holds. Per frame, edges are bucketed by style and width and
 *  stroked as one path per bucket; nodes are filled as one path per template
 *  and strength. Nothing is laid out here: positions come in `placement`, and
 *  in `focus` while a filter's matches are laid out on their own.
 *
 *  Every node is drawn at every zoom. Zoomed out, a large collection draws
 *  with less detail (`lod`): dots shrink toward 2px, edges thin to faint
 *  hairlines, and the largest communities get a faint caption at their centre.
 *  All three change continuously with the zoom, so there is no switch between
 *  two drawings. While filtering (`strength`: 2 match, 1 neighbour, 0 rest),
 *  matches draw full, neighbours small and muted, the rest as faint points;
 *  an edge draws only with a matching end. When the match set changes (`fitKey`), positions move
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
  /** Draw with less detail when zoomed out (smaller dots, hairline edges,
   *  community captions). Off for small collections, which draw the same at
   *  every zoom. */
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
  /** A community (stored id) to centre once the canvas has a size; `onCentred`
   *  is told when it has (the Overview's Network teaser). */
  centreOn?: number | null;
  onCentred?: () => void;
  /** Width covered by a panel at each side (the Full width rail's), in px.
   *  Fits and centring use the rest; opening or closing one eases there. */
  inset?: { left: number; right: number };
}

export interface EdgeInfo {
  types: string[];
  refs: number;
  evidence: PairEvidence[];
}

/** Zoom, relative to the first fit, over which the zoomed-out detail level
 *  becomes the full node drawing. */
const LOD_FROM = 1;
const LOD_TO = 2.8;
/** Zoom from which the breadcrumb names the community in view. */
const CRUMB_FROM = 2.25;
/** Most communities given a caption when zoomed out (fewer on a small
 *  pane), and the zoom (relative, past `LOD_FROM`) over which captions fade
 *  out. */
const CAPTIONS = 5;
const CAPTION_FADE = 0.6;
/** Dot size (screen px). At the first fit a typical record is `DOT_FIT`, less
 *  where the records crowd (a radius of `DOT_SPACING` of the mean distance
 *  between them, to `DOT_MIN`); a record's degree percentile within its
 *  collection adds up to `DOT_HUB`, almost all of it in the top 1%. */
const DOT_FIT = 2.4;
const DOT_MIN = 1.4;
const DOT_SPACING = 0.3;
const DOT_HUB = 6;
const DOT_HUB_CURVE = 60;
const MIN_REL = 0.5;
const MAX_REL = 60;
const KEYBOARD_LIST = 60;
/** Length of a filter move: positions and camera together. */
const MOVE_MS = 380;
/** Two taps within this long (and 12px) are a double-click. */
const DOUBLE_TAP_MS = 320;
/** Pixels kept clear around a fit, for dots, labels and the controls. */
const FIT_PAD = 96;
/** Margins of a fit: the sides, and the top and bottom, which clear the
 *  control bars laid over the canvas on the gutter (12px, a 28px bar, 16px). */
const FIT_MARGIN = 32;
const FIT_BAR_MARGIN = 56;

type Box = [number, number, number, number];

/** Edge styles, in stroke order within each pass, and stroke widths by
 *  reference count (1, 2–3, 4+). */
const BASE = 0, HUB = 1, LIGHT = 2, STRONG = 3, LIFT = 4, SEL = 5;
const EDGE_WIDTHS = [0.8, 1.3, 2];

/** A label placed by the label pass: a node's (`cap` -1, at `spot`: right,
 *  left, above, below) or a community caption's (`cap`, `dy` off its centre). */
interface LabelOp {
  i: number;
  cap: number;
  spot: number;
  dy: number;
  text: string;
  tw: number;
  force: boolean;
}
interface LabelPlan {
  key: string;
  ops: LabelOp[];
}

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
  kind: "node" | "edge";
  i: number;
  wx: number;
  wy: number;
  /** A node outside the locked neighbourhood: nothing is drawn for it, and
   *  its tooltip (title only) waits `QUIET_TIP_MS`. */
  quiet?: boolean;
}

/** How long a quiet hover waits before its tooltip shows. */
const QUIET_TIP_MS = 450;

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
  centreOn: centreCommunityId = null,
  onCentred,
  inset,
}: NetworkCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const insetL = inset?.left ?? 0;
  const insetR = inset?.right ?? 0;
  /** The centre of the uncovered width: where fits and centring aim. */
  const viewCx = (insetL + size.w - insetR) / 2;
  const cam = useRef<Camera>({ k: 1, tx: 0, ty: 0 });
  const fitK = useRef(1);
  const frame = useRef(0);
  /** A camera move or a glide is drawing every frame: nothing else schedules
   *  a draw (the lift, a hover, a re-render), so a frame draws once. */
  const animOn = useRef(false);
  const glideOn = useRef(false);
  const driven = () => animOn.current || glideOn.current;
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
  /* Colours, re-read on a theme change. Labels use the label colour of their
     template (`typeLabelColor`); dots keep the raw colour. */
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
     applied). Captions and the keyboard's groups skip communities with none. */
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

  /* Per community: how many of its members match, for captions and the
     keyboard's groups. */
  const communityMatch = useMemo(() => {
    if (!strength) return null;
    return communities.map((c) => c.members.reduce((s, i) => s + (strength[i] === 2 ? 1 : 0), 0));
  }, [communities, strength]);

  // A focus layout is drawn in full at every zoom: its communities are the
  // global layout's and mean nothing there.
  const lodOn = overview && !focus;
  /** Detail at relative zoom `r`: 0 at the first fit, 1 from `LOD_TO` on,
   *  where the drawing is the full node view. */
  const lodAt = (r: number) => (lodOn ? Math.max(fade.current, clamp((r - LOD_FROM) / (LOD_TO - LOD_FROM), 0, 1)) : 1);
  /* Degree percentile per record (ties take the middle of their run), so
     the size reads the same in a collection of few links as in one of many. */
  const degreeRank = useMemo(() => {
    const out = new Float32Array(n);
    for (let a = 0; a < n; ) {
      let b = a;
      while (b + 1 < n && graph.degree[byDegree[b + 1]] === graph.degree[byDegree[a]]) b++;
      const p = 1 - (a + b + 1) / 2 / Math.max(1, n);
      for (let q = a; q <= b; q++) out[byDegree[q]] = p;
      a = b + 1;
    }
    return out;
  }, [graph, n, byDegree]);
  /* Records drawn, for the typical dot's crowding cap at the fit. */
  const drawnCount = useMemo(() => {
    let c = 0;
    for (let i = 0; i < n; i++) if (nodeOn[i] && (!member || member[i])) c++;
    return Math.max(1, c);
  }, [nodeOn, member, n]);
  /* The size rule is the same at every zoom: a typical dot from the eye's
     minimum at the fit, scaled with the square root of the zoom; the hub term
     grows less zoomed in and shrinks faster zoomed out. Only an overview
     zoomed out on a crowded pane reaches the 2px floor. */
  const nodeRadius = (i: number, r: number) => {
    const fk = fitK.current;
    const area = (baseExtent.maxX - baseExtent.minX) * (baseExtent.maxY - baseExtent.minY) * fk * fk;
    const typical = clamp(DOT_SPACING * Math.sqrt(area / drawnCount), DOT_MIN, DOT_FIT);
    const hub = DOT_HUB * degreeRank[i] ** DOT_HUB_CURVE;
    const grow = r >= 1 ? Math.min(Math.sqrt(r), 2.2) : Math.sqrt(r);
    const hubGrow = r >= 1 ? Math.min(r ** 0.25, 1.6) : r;
    return clamp(typical * grow + hub * hubGrow, lodOn ? 1 : DOT_MIN, 16);
  };
  /* Node size and strength while filtering: a neighbour is small, the rest a point. */
  const radiusAt = (i: number, r: number) =>
    !strength
      ? nodeRadius(i, r)
      : strength[i] === 2
        ? Math.max(2 + lodAt(r), nodeRadius(i, r))
        : strength[i] === 1
          ? Math.max(1.2, nodeRadius(i, r) * 0.55)
          : 1.1;

  /* Communities that may get a caption, largest first: by matches while
     filtering (those with none get none), by records drawn otherwise. */
  const captionOrder = useMemo(() => {
    if (!lodOn) return [];
    return communities
      .map((c, idx) => ({ idx, size: shownCount.get(c) ?? 0, m: communityMatch ? communityMatch[idx] : 0 }))
      .filter((x) => x.size >= 8 && (!communityMatch || x.m > 0))
      .sort((p, q) => q.m - p.m || q.size - p.size)
      .map((x) => x.idx);
  }, [lodOn, communities, shownCount, communityMatch]);

  /* One-hop neighbourhood of a node over drawn edges: the node, then its
     neighbours by the weight of their link to it (references), then by their
     own links. `edge` maps a neighbour to the edge that joins them. Kept for
     the last node asked about. */
  const hoodCache = useRef<{ i: number; key: unknown[]; node: Uint8Array; list: number[]; edge: Map<number, number> } | null>(null);
  const hoodOf = (i: number) => {
    const c = hoodCache.current;
    if (c && c.i === i && c.key[0] === edgeOn && c.key[1] === nodeOn && c.key[2] === member) return c;
    const node = new Uint8Array(n);
    const list = [i];
    const edge = new Map<number, number>();
    node[i] = 1;
    for (let j = graph.adjStart[i]; j < graph.adjStart[i + 1]; j++) {
      const e = graph.adjEdge[j];
      if (!edgeOn[e]) continue;
      const o = otherEnd(graph, e, i);
      if (node[o] || !nodeOn[o] || (member && !member[o])) continue;
      node[o] = 1;
      list.push(o);
      edge.set(o, e);
    }
    const weight = (o: number) => graph.refs[edge.get(o)!];
    list.sort((x, y) => (x === i ? -1 : y === i ? 1 : weight(y) - weight(x) || graph.degree[y] - graph.degree[x]));
    hoodCache.current = { i, key: [edgeOn, nodeOn, member], node, list, edge };
    return hoodCache.current;
  };

  /** The find cursor was moved more recently than the selection. */
  const findWins = useRef(true);
  /** Focus is arranging the matches: hover lifts nothing until it lands. */
  const arranging = !!layoutSwitch?.pending;
  /** The node the lift is locked on: the selection or the find cursor,
   *  whichever moved last; -1 for none. */
  const anchorNode = () => {
    const sel = selected >= 0 && nodeOn[selected] && (!member || member[selected]) ? selected : -1;
    const cur = find && nodeOn[find.node] ? find.node : -1;
    return findWins.current ? (cur >= 0 ? cur : sel) : sel >= 0 ? sel : cur;
  };
  /** The hover that draws: none while it is quiet. */
  const liveHover = () => {
    const hv = hoverRef.current;
    return hv && !hv.quiet ? hv : null;
  };
  /** The node to lift. With an anchor (a selection, the find cursor) it is
   *  the anchor whatever the pointer is over; while Focus arranges, nothing;
   *  otherwise the hovered node. */
  const liftWanted = () => {
    const a = anchorNode();
    if (a >= 0) return a;
    if (arranging) return -1;
    const hv = liveHover();
    return hv?.kind === "node" ? hv.i : -1;
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

  /** The edge drawn highlighted: hovered, else the one joining a hovered
   *  neighbour to the anchor, else pinned. */
  const edgeTarget = () => {
    const hv = liveHover();
    if (hv?.kind === "edge") return hv.i;
    if (hv?.kind === "node") {
      const a = anchorNode();
      return a >= 0 && hv.i !== a ? hoodOf(a).edge.get(hv.i) ?? -1 : -1;
    }
    if (hv) return -1;
    return pinnedRef.current?.kind === "edge" ? pinnedRef.current.i : -1;
  };

  /* ── Drawing ─────────────────────────────────────────────────────────── */

  /** Frames drawn, for the scripted checks (dev only). */
  const drawCount = useRef(0);
  /** Label widths by font and text: `measureText` is the label pass's cost. */
  const textWidths = useRef(new Map<string, number>());
  /** The labels placed on a drive's first frame (a move or a glide), drawn
   *  at their nodes on the frames after it; placed again when what is
   *  labelled or the zoom step changes, and at rest. */
  const labelPlan = useRef<LabelPlan | null>(null);
  /** Edge endpoints per (style, width), reused from frame to frame. */
  const edgeBuckets = useRef<number[][]>(Array.from({ length: 6 * EDGE_WIDTHS.length }, () => []));
  const draw = useCallback(() => {
    frame.current = 0;
    if (import.meta.env.DEV) drawCount.current++;
    const canvas = canvasRef.current;
    if (!canvas || !size.w || !size.h) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const { k, tx, ty } = cam.current;
    const r = k / fitK.current;
    const t = colors.tokens;
    const pos = shown.current;
    const lod = lodAt(r);
    // Receded edges thin and fade toward hairlines as the zoom goes out.
    const hair = 0.5 + 0.5 * lod;
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
    const widths = textWidths.current;
    const widthOf = (text: string) => {
      const key = `${ctx.font}|${text}`;
      let w = widths.get(key);
      if (w === undefined) {
        if (widths.size > 20000) widths.clear();
        widths.set(key, (w = ctx.measureText(text).width));
      }
      return w;
    };

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
    {
      const buckets = edgeBuckets.current;
      for (const b of buckets) b.length = 0;
      const push = (style: number, w: number, x1: number, y1: number, x2: number, y2: number) =>
        buckets[style * EDGE_WIDTHS.length + w].push(x1, y1, x2, y2);
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
        const w = refs >= 4 ? 2 : refs >= 2 ? 1 : 0;
        const style = sel
          ? SEL
          : lift
            ? LIFT
            : hub && hubEdges === "faint"
              ? HUB
              : !strength
                ? BASE
                : strength[i] === 2 && strength[j] === 2
                  ? STRONG
                  : LIGHT;
        push(style, w, x1, y1, x2, y2);
      }
      ctx.lineCap = "round";
      // A selected or lifted hub's hundreds of edges would cover the canvas,
      // and they now draw over the receded nodes: they lighten as its degree
      // grows (0.85 at 40 links, about 0.15 at 400).
      const thin = (i: number, top: number) => clamp(top * (40 / Math.max(1, graph.degree[i])) ** 0.75, 0.1, top);
      const selAlpha = selected >= 0 ? thin(selected, 0.85) * (hood && liftI !== selected ? recede : 1) : 0;
      const liftAlpha = hood ? thin(liftI, 0.8) * la : 0;
      const styleAlpha = [
        0.28 * recede * hair,
        0.07 * recede * hair,
        0.2 * recede * hair,
        0.6 * recede * hair,
        liftAlpha,
        selAlpha,
      ];
      /* The receded edges first; the lifted node's and the selection's are
         stroked after the receded nodes, so nothing behind covers them.
         Selection over lift; wider over narrower. */
      const strokeEdges = (incident: boolean) => {
        for (const style of incident ? [LIFT, SEL] : [BASE, HUB, LIGHT, STRONG]) {
          for (let w = 0; w < EDGE_WIDTHS.length; w++) {
            const pts = buckets[style * EDGE_WIDTHS.length + w];
            if (!pts.length) continue;
            ctx.globalAlpha = styleAlpha[style];
            ctx.strokeStyle = style === SEL ? t.carbon : style === STRONG || style === LIFT ? t.inkSecondary : t.inkTertiary;
            ctx.lineWidth = incident
              ? EDGE_WIDTHS[w] * 1.3
              : Math.max(0.4, EDGE_WIDTHS[w] * (style === STRONG ? 1.15 : 1) * hair);
            ctx.beginPath();
            for (let p = 0; p < pts.length; p += 4) {
              ctx.moveTo(pts[p], pts[p + 1]);
              ctx.lineTo(pts[p + 2], pts[p + 3]);
            }
            ctx.stroke();
          }
        }
      };
      strokeEdges(false);

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
        ctx.globalAlpha = alpha;
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
      strokeEdges(true);

      /* The hovered or pinned edge: carbon, under the nodes it joins. An end
         that is not lifted is drawn again over it, so a line never crosses
         its own dots. */
      const dot = (i: number, alpha: number) => {
        const x = sx(i), y = sy(i);
        if (x < -pad || x > W + pad || y < -pad || y > H + pad) return;
        const rd = rad(i);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = colors.dot.get(graph.typeIds[i]) ?? t.inkTertiary;
        ctx.beginPath();
        ctx.arc(x, y, rd, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = t.bg;
        ctx.lineWidth = 1;
        ctx.stroke();
      };
      if (edgeHi >= 0) {
        const i = graph.a[edgeHi];
        const j = graph.b[edgeHi];
        ctx.globalAlpha = 1;
        ctx.strokeStyle = t.carbon;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sx(i), sy(i));
        ctx.lineTo(sx(j), sy(j));
        ctx.stroke();
        for (const e of [i, j]) if (!lifted(e) && nodeOn[e]) dot(e, 1);
      }

      /* The lifted neighbourhood over the lifted edges; the anchor and the
         selection last, so no neighbour draws inside them. */
      const last = hood ? [liftI, selected].filter((i, k, all) => i >= 0 && all.indexOf(i) === k && hood.node[i] === 1) : [];
      if (hood) {
        const groups = new Map<string, number[]>();
        for (const i of hood.list) {
          if (last.includes(i)) continue;
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
          ctx.globalAlpha = a0 + (1 - a0) * la;
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

      for (const i of last) {
        const a0 = baseAlpha(strength ? strength[i] : 2);
        dot(i, a0 + (1 - a0) * la);
      }

      /* Rings: selected (carbon), keyboard focus (carbon, wider), hover (ink). */
      const ring = (i: number, color: string, width: number, gap: number) => {
        if (i < 0 || !nodeOn[i]) return;
        ctx.globalAlpha = 1;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.arc(sx(i), sy(i), rad(i) + gap, 0, Math.PI * 2);
        ctx.stroke();
      };
      if (find && find.node !== selected) ring(find.node, t.ink, 2, 3);
      ring(selected, t.carbon, 2, 2.5);
      ring(focused, t.carbon, 2.5, 5);
      const hv = liveHover();
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
         template's label colour (`typeLabelColor`). Zoomed out, the largest
         communities' captions come after the always-labelled nodes. */
      {
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        // Captions are gone by about 1.6× the first fit: past it the dots are
        // apart enough for the records' own labels.
        const capAlpha = (1 - clamp((r - LOD_FROM) / CAPTION_FADE, 0, 1)) * 0.85 * recede;
        // What is labelled, and the zoom in steps of about 19%: a drive places
        // labels again only when one of these changes.
        const labelKey = [
          selected,
          focused,
          hv?.kind === "node" ? hv.i : -1,
          hood ? liftI : -1,
          hood && la > 0.5 ? 1 : 0,
          find?.node ?? -1,
          edgeHi,
          capAlpha > 0.02 ? 1 : 0,
          Math.round(Math.log2(r) * 4),
          W,
          H,
        ].join();
        const plan = labelPlan.current;
        const reuse = driven() && plan?.key === labelKey;
        /** One label's text, drawn with its halo. */
        const paint = (text: string, x: number, y: number, alpha: number, fill: string) => {
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = t.bg;
          ctx.lineWidth = 3;
          ctx.strokeText(text, x, y);
          ctx.fillStyle = fill;
          ctx.fillText(text, x, y);
        };
        /** Where spot `s` puts a label `tw` wide beside a node at x, y. */
        const spotAt = (s: number, x: number, y: number, rd: number, tw: number): [number, number] =>
          s === 0 ? [x + rd + 4, y] : s === 1 ? [x - rd - 4 - tw, y] : s === 2 ? [x - tw / 2, y - rd - 9] : [x - tw / 2, y + rd + 9];
        if (reuse) {
          for (const op of plan.ops) {
            if (op.cap >= 0) {
              const c = communities[op.cap];
              if (!c || capAlpha <= 0.02) continue;
              ctx.font = `500 11px ${t.font}`;
              ctx.textAlign = "center";
              paint(op.text, c.x * k + tx, c.y * k + ty + op.dy, capAlpha, t.inkTertiary);
              ctx.textAlign = "start";
              continue;
            }
            if (!nodeOn[op.i]) continue;
            ctx.font = `${op.force ? 600 : 500} 11px ${t.font}`;
            const [lx, ly] = spotAt(op.spot, sx(op.i), sy(op.i), rad(op.i), op.tw);
            paint(op.text, lx, ly, op.force || lifted(op.i) ? 1 : recede, colors.mark.get(graph.typeIds[op.i]) ?? t.inkSecondary);
          }
        } else {
          const ops: LabelOp[] = [];
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
            const tw = widthOf(text);
            const rd = rad(i);
            let at: [number, number] | null = null;
            let spot = 0;
            for (let s = 0; s < 4; s++) {
              const [lx, ly] = spotAt(s, x, y, rd, tw);
              const box: Box = [lx - 2, ly - 7, lx + tw + 2, ly + 7];
              // A label cut by the pane's edge reads as a different name.
              if (box[0] < 0 || box[2] > W || box[1] < 0 || box[3] > H) continue;
              if (boxes.hits(box)) continue;
              at = [lx, ly];
              spot = s;
              boxes.add(box);
              break;
            }
            if (!at) {
              if (!force) return;
              // Always labelled: on its right, even where it overlaps.
              at = spotAt(0, x, y, rd, tw);
              boxes.add([at[0] - 2, at[1] - 7, at[0] + tw + 2, at[1] + 7]);
            }
            paint(text, at[0], at[1], force || lifted(i) ? 1 : recede, colors.mark.get(graph.typeIds[i]) ?? t.inkSecondary);
            ops.push({ i, cap: -1, spot, dy: 0, text, tw, force });
            placed++;
          };
          for (const i of want) place(i, true);
          /* Captions: the name of each of the largest communities (by matches
             while filtering), centred on it in tertiary ink, fading out as the
             zoom comes in. Its best-connected record then gets no label of its
             own, which would repeat the name. */
          const captioned = new Set<number>();
          if (capAlpha > 0.02) {
            ctx.font = `500 11px ${t.font}`;
            ctx.textAlign = "center";
            let shown = 0;
            // A phone's pane has room for two next to the records' labels.
            const most = Math.round(clamp((W * H) / 160000, 2, CAPTIONS));
            for (const idx of captionOrder) {
              if (shown >= most) break;
              const c = communities[idx];
              const text = truncate(titleOf(c.top), 28);
              const tw = widthOf(text);
              // On the centre, else just above or below it; never over the
              // dot of the record it names.
              const x = c.x * k + tx;
              const rd = rad(c.top) + 2;
              const dotBox: Box = [sx(c.top) - rd, sy(c.top) - rd, sx(c.top) + rd, sy(c.top) + rd];
              let y = NaN;
              let at = 0;
              for (const dy of [0, -14, 14]) {
                const cy = c.y * k + ty + dy;
                const box: Box = [x - tw / 2 - 2, cy - 7, x + tw / 2 + 2, cy + 7];
                if (box[0] < 0 || box[2] > W || box[1] < 0 || box[3] > H || boxes.hits(box)) continue;
                if (box[0] < dotBox[2] && dotBox[0] < box[2] && box[1] < dotBox[3] && dotBox[1] < box[3]) continue;
                boxes.add(box);
                y = cy;
                at = dy;
                break;
              }
              if (Number.isNaN(y)) continue;
              captioned.add(c.top);
              shown++;
              paint(text, x, y, capAlpha, t.inkTertiary);
              ops.push({ i: c.top, cap: idx, spot: 0, dy: at, text, tw, force: false });
            }
            ctx.textAlign = "start";
          }
          if (hood && la > 0.5) {
            for (const i of hood.list) {
              if (placed >= budget) break;
              if (!want.includes(i)) place(i, false);
            }
          }
          for (const i of matchOrder ?? byDegree) {
            if (placed >= budget) break;
            if (want.includes(i) || lifted(i) || captioned.has(i)) continue;
            place(i, false);
          }
          labelPlan.current = driven() ? { key: labelKey, ops } : null;
        }
      }
    }

    /* Keyboard focus on a community: a carbon ring around it. */
    const fc = communities[focusedCommunity];
    if (fc) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = t.carbon;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(fc.x * k + tx, fc.y * k + ty, clamp(fc.spread * k, 14, Math.min(W, H) * 0.45), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    placeTip();
    if (!painted.current) {
      painted.current = true;
      performance.mark("network-first-paint");
    }
    if (lifting && !driven()) frame.current = requestAnimationFrame(() => drawRef.current());
    // `lodAt` and `radiusAt` close over props and the memos listed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, colors, graph, n, edgeOn, nodeOn, strength, member, hubDegree, hubEdges, selected, find, arranging, focused, focusedCommunity, matchOrder, byDegree, titleOf, communities, captionOrder, lodOn, degreeRank, drawnCount, baseExtent]);

  const drawRef = useRef(draw);
  drawRef.current = draw;
  // A new draw reads other props: the next drive frame places labels again.
  useEffect(() => {
    labelPlan.current = null;
  }, [draw]);
  const request = useCallback(() => {
    if (!frame.current && !driven()) frame.current = requestAnimationFrame(draw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw]);
  /** A loop that draws every frame takes over from a pending draw. */
  const dropRequest = () => {
    cancelAnimationFrame(frame.current);
    frame.current = 0;
  };

  /* ── Tooltip placement ───────────────────────────────────────────────── */

  const tipRef = useRef<HTMLDivElement>(null);
  const tipSize = useRef<{ target: Hover | null; w: number; h: number } | null>(null);
  /** Where a tooltip's target is on screen, and the radius it must keep clear. */
  const anchorOf = (h: Hover) => {
    const { k, tx, ty } = cam.current;
    const r = k / fitK.current;
    if (h.kind === "node") {
      const pos = shown.current;
      return { x: pos[h.i * 2] * k + tx, y: pos[h.i * 2 + 1] * k + ty, r: Math.max(radiusAt(h.i, r), nodeRadius(h.i, r)) + 4 };
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
    // Measured at rest; a drive reuses the size, so its frames read no
    // layout that a commit beside the canvas (a panel opening) has dirtied.
    let box = tipSize.current;
    if (!box || box.target !== target || !driven()) box = tipSize.current = { target, w: el.offsetWidth, h: el.offsetHeight };
    const { w, h } = box;
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

  /** The camera that frames `ext` between the control bars along the
   *  canvas's top (breadcrumb, stepper) and bottom (zoom, Focus switch, chip). */
  const frameOf = useCallback(
    (ext: Extent, uncovered = true): Camera => {
      const top = FIT_BAR_MARGIN;
      const bottom = FIT_BAR_MARGIN;
      const w = ext.maxX - ext.minX || 1;
      const h = ext.maxY - ext.minY || 1;
      const availH = Math.max(1, size.h - top - bottom);
      // `uncovered`: into the width a panel leaves. The base zoom is always
      // taken from the whole width, so a panel never changes the detail level.
      const l = uncovered ? insetL : 0;
      const r = uncovered ? insetR : 0;
      const k = Math.min(Math.max(1, size.w - l - r - 2 * FIT_MARGIN) / w, availH / h);
      return { k, tx: (l + size.w - r) / 2 - ((ext.minX + ext.maxX) / 2) * k, ty: top + availH / 2 - ((ext.minY + ext.maxY) / 2) * k };
    },
    [size, insetL, insetR],
  );

  // The base zoom every relative measure (detail level, labels, zoom limits)
  // is taken from: the layout on screen, framed whole. A resize updates it
  // below, with the camera.
  useLayoutEffect(() => {
    if (size.w && size.h) fitK.current = frameOf(baseExtent, false).k;
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
    const k = clamp(f.k, base.k, base.k * (focus ? 4 : LOD_TO * 2.5));
    const wx = (viewCx - f.tx) / f.k;
    const wy = (size.h / 2 - f.ty) / f.k;
    return { k, tx: viewCx - wx * k, ty: size.h / 2 - wy * k };
  }, [frameOf, baseExtent, strength, target, matchOrder, focus, size, viewCx]);

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
    fitK.current = frameOf(baseExtent, false).k;
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
  const stopAnim = () => {
    cancelAnimationFrame(anim.current);
    animOn.current = false;
  };
  const stopGlide = () => {
    cancelAnimationFrame(glide.current);
    glideOn.current = false;
  };
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
  const moving = useRef<{ to: Float32Array; fade: number; cam: Camera } | null>(null);
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
      stopAnim();
      stopGlide();
      settle();
      const from = { ...cam.current };
      const fromPos = to ? new Float32Array(shown.current) : null;
      const fromFade = fade.current;
      const endFade = toFade ?? fromFade;
      const finish = () => {
        animOn.current = false;
        cam.current = next;
        if (to) shown.current.set(to);
        fade.current = endFade;
        moving.current = null;
        draw();
        sync.current();
      };
      if (!animate || reducedMotion()) return finish();
      if (to) moving.current = { to, fade: endFade, cam: next };
      dropRequest();
      animOn.current = true;
      labelPlan.current = null;
      noteCameraMove(ms);
      // Timed from the first frame, as one frame in: a frame's timestamp is
      // when it began, before this call, and the first would not move.
      let start = -1;
      let frames = 0;
      const step = (now: number) => {
        frames++;
        if (start < 0) start = now - 1000 / 60;
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
        if (p < 1) {
          draw();
          anim.current = requestAnimationFrame(step);
          return;
        }
        // The last frame is the end: drawn once, by `finish`.
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
      stopAnim();
      stopGlide();
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

  /** A camera centred on node `i`, close enough to draw it in full detail. */
  const nodeCamera = (i: number, from: Camera | null = null): Camera => {
    const k = Math.max(from?.k ?? 0, fitK.current * (lodOn ? LOD_TO * 1.25 : 2));
    return { k, tx: viewCx - target[i * 2] * k, ty: size.h / 2 - target[i * 2 + 1] * k };
  };

  // A record selected elsewhere (the drawer's links, a list behind it) is
  // brought into view when it is off screen. A node selected here stays
  // where it is.
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
    const inView = x > insetL + FIT_PAD / 2 && x < size.w - insetR - FIT_PAD / 2 && y > FIT_PAD / 2 && y < size.h - FIT_PAD / 2;
    if (!inView) setCamera(nodeCamera(selected, c), true);
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
      cam: () => cam.current,
      lift: () => [liftNode.current, liftAmt.current],
      anchor: () => anchorNode(),
      hood: (i: number) => [...hoodOf(i).list],
      hover: () => hoverRef.current,
      draws: () => drawCount.current,
      /** Drawn nodes under a control laid over the canvas. */
      underOverlays: () => {
        const c = cam.current;
        const pts: [number, number][] = [];
        for (let i = 0; i < n; i++)
          if (nodeOn[i] && (!member || member[i])) pts.push([shown.current[i * 2] * c.k + c.tx, shown.current[i * 2 + 1] * c.k + c.ty]);
        return pts.filter(([x, y]) => overlays.current.some((b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3])).length;
      },
      /** Drawn radii (screen px) at the current zoom: percentiles and the
       *  degree percentiles, to compare collections. */
      radii: () => {
        const r = cam.current.k / fitK.current;
        const rs: number[] = [];
        const ds: number[] = [];
        for (let i = 0; i < n; i++) if (nodeOn[i]) (rs.push(radiusAt(i, r)), ds.push(graph.degree[i]));
        const q = (a: number[], p: number) => a[Math.min(a.length - 1, Math.floor(p * a.length))];
        rs.sort((x, y) => x - y);
        ds.sort((x, y) => x - y);
        const at = [0.1, 0.5, 0.9, 0.99, 1];
        return { n: rs.length, rel: r, radius: at.map((p) => +q(rs, p).toFixed(2)), degree: at.map((p) => q(ds, p)) };
      },
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
      setCamera({ k, tx: viewCx - wx * k, ty: size.h / 2 - wy * k }, animate),
    [setCamera, size, viewCx],
  );

  // A panel opened or closed over the canvas: ease to the new uncovered
  // width. Opening one centres the selected record there (the one it shows);
  // otherwise the view shifts by the change, and closing shifts it back.
  const lastInset = useRef({ l: insetL, r: insetR });
  useEffect(() => {
    const prev = lastInset.current;
    lastInset.current = { l: insetL, r: insetR };
    if (!size.w || lastFit.current === undefined) return;
    const shift = viewCx - (prev.l + size.w - prev.r) / 2;
    if (!shift) return;
    settle();
    const c = cam.current;
    if (insetL + insetR > prev.l + prev.r && selected >= 0 && nodeOn[selected]) {
      centreOn(target[selected * 2], target[selected * 2 + 1], c.k);
      return;
    }
    setCamera({ k: c.k, tx: c.tx + shift, ty: c.ty }, true);
    // Only a change of the inset moves the camera here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insetL, insetR]);

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
    (x: number, y: number): { kind: "node"; i: number } | null => {
      const c = cam.current;
      const r = c.k / fitK.current;
      const wx = (x - c.tx) / c.k;
      const wy = (y - c.ty) / c.k;
      const i = quad.nearest(wx, wy, 18 / c.k, (j) => nodeOn[j] === 1 && (!member || member[j] === 1));
      if (i < 0) return null;
      const d = Math.hypot(target[i * 2] * c.k + c.tx - x, target[i * 2 + 1] * c.k + c.ty - y);
      return d <= radiusAt(i, r) + 5 ? { kind: "node", i } : null;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [quad, nodeOn, member, target, lodOn, size, strength, degreeRank, drawnCount, baseExtent],
  );

  /** The drawn edge within 5px of a point. While a node is lifted or
   *  anchored, only its own edges answer; faint hub edges never do, nor do
   *  the hairlines of a zoomed-out drawing. */
  const edgeAt = (x: number, y: number): number => {
    const c = cam.current;
    const pos = shown.current;
    const anchor = anchorNode();
    const liftI = anchor >= 0 ? anchor : liftNode.current >= 0 && liftAmt.current > 0.5 ? liftNode.current : -1;
    if (liftI < 0 && lodAt(c.k / fitK.current) < 0.5) return -1;
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
  /* While a selection or the find cursor anchors the lift, or Focus is
     arranging, hover is locked: a node outside the anchor's neighbourhood
     changes nothing on the canvas (a quiet hover), a neighbour shows its ring,
     its label and its link to the anchor, and edges answer a click only. */
  const hoverAt = (x: number, y: number) => {
    // Mid-move, nodes are drawn between two layouts: nothing is hit.
    if (moving.current) return;
    const c = cam.current;
    const wx = (x - c.tx) / c.k;
    const wy = (y - c.ty) / c.k;
    const anchor = anchorNode();
    const node = hitAt(x, y);
    const edge = node || anchor >= 0 || arranging ? -1 : edgeAt(x, y);
    let hit: Hover | null = node ? { ...node, wx, wy } : edge >= 0 ? { kind: "edge", i: edge, wx, wy } : null;
    if (hit?.kind === "node" && (anchor >= 0 ? !hoodOf(anchor).node[hit.i] : arranging)) hit = { ...hit, quiet: true };
    const prev = hoverRef.current;
    if (hit?.kind !== prev?.kind || hit?.i !== prev?.i || !!hit?.quiet !== !!prev?.quiet) {
      hoverRef.current = hit;
      setHover(hit);
      // A quiet hover draws nothing, so the canvas is not redrawn for it.
      if ((hit && !hit.quiet) || (prev && !prev.quiet)) request();
    }
  };
  rehover.current = () => {
    const p = pointerAt.current;
    if (p && !gesture.current) hoverAt(p.x, p.y);
  };

  // The lock changes under a still pointer: its hover is quiet or not.
  useEffect(() => {
    rehover.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, find?.node, arranging]);

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
    if (lodOn && r >= CRUMB_FROM) {
      const i = quad.nearest((viewCx - c.tx) / c.k, (size.h / 2 - c.ty) / c.k, Math.max(size.w, size.h) / c.k, (j) => nodeOn[j] === 1);
      setOpenCommunity(i >= 0 ? communityIndex.get(placement.community[i]) ?? -1 : -1);
    } else setOpenCommunity(-1);
    const inView: number[] = [];
    for (const i of byDegree) {
      if (!nodeOn[i] || (member && !member[i])) continue;
      const x = target[i * 2] * c.k + c.tx;
      const y = target[i * 2 + 1] * c.k + c.ty;
      if (x >= insetL && x <= size.w - insetR && y >= 0 && y <= size.h) inView.push(i);
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
      const more = Math.hypot(vx, vy) > 0.02;
      // Off before the last frame's draw, so a lift still easing goes on.
      glideOn.current = more;
      drawRef.current();
      if (more) glide.current = requestAnimationFrame(step);
      else sync.current();
    };
    dropRequest();
    glideOn.current = true;
    labelPlan.current = null;
    glide.current = requestAnimationFrame(step);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    // A press stops a glide, and takes the keyboard to the canvas.
    if (glideOn.current) {
      stopGlide();
      request();
    }
    velocity.current = { vx: 0, vy: 0, t: 0 };
    // A press during a move ends it where it is going, so a click hits the
    // positions it sees drawn next (Review #4).
    if (moving.current) {
      stopAnim();
      cam.current = moving.current.cam;
      settle();
      draw();
      sync.current();
    }
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
      stopAnim();
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
    // already done its own thing (selected a node); the second does not
    // repeat it.
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
    selfSelect.current = true;
    onSelect(hit.i, e);
  };

  /** The community at a point: that of the nearest node; -1 for none within
   *  reach or a record with no relationships. */
  const communityAt = (x: number, y: number): number => {
    const c = cam.current;
    const i = quad.nearest((x - c.tx) / c.k, (y - c.ty) / c.k, 40 / c.k, (j) => nodeOn[j] === 1 && (!member || member[j] === 1));
    return i < 0 ? -1 : communityIndex.get(placement.community[i]) ?? -1;
  };

  /** Centre community `idx` and zoom until it fills the view with a margin:
   *  its matches while filtering, when it has any. Zoomed out, the zoom goes
   *  far enough for full detail and the breadcrumb. */
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
    const k = clamp(f.k, fitK.current * (lodOn ? LOD_TO * 1.1 : 1), fitK.current * Math.min(MAX_REL, 12));
    centreOn((ext.minX + ext.maxX) / 2, (ext.minY + ext.maxY) / 2, k);
  };

  // Opened from the Overview's Network teaser: centre that community once the
  // canvas has a size, after its first fit.
  useEffect(() => {
    if (centreCommunityId === null || !size.w || !size.h) return;
    const idx = communityIndex.get(centreCommunityId);
    if (idx !== undefined) centreCommunity(idx);
    onCentred?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centreCommunityId, size.w > 0 && size.h > 0, communityIndex]);

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
  // The list is the records in view, so Tab reaches what the camera shows
  // (Review #3); before the first sync, the best-connected.
  const keyboardNodes = viewNodes ?? bestNodes;

  const focusNode = (i: number) => {
    setFocused(i);
    settle();
    const k = Math.max(cam.current.k, fitK.current * (lodOn ? LOD_TO * 1.2 : 1.5));
    centreOn(target[i * 2], target[i * 2 + 1], k);
  };

  /* ── Tooltip ─────────────────────────────────────────────────────────── */

  // A quiet hover's tooltip waits, so passing over the receded nodes shows nothing.
  const [quietTip, setQuietTip] = useState(false);
  useEffect(() => {
    setQuietTip(false);
    if (!hover?.quiet) return;
    const t = window.setTimeout(() => setQuietTip(true), QUIET_TIP_MS);
    return () => window.clearTimeout(t);
  }, [hover]);
  const tipOf = hover?.quiet && !quietTip ? null : hover ?? pinned;
  const tip = useMemo(() => {
    if (!tipOf) return null;
    if (tipOf.kind === "node") {
      const i = tipOf.i;
      if (tipOf.quiet) return { title: titleOf(i), sub: "" };
      const d = graph.degree[i];
      const what = strength ? (strength[i] === 2 ? "Match" : strength[i] === 1 ? "Linked to a match" : "") : "";
      const links = `${d.toLocaleString()} ${d === 1 ? "link" : "links"}`;
      // A neighbour of the anchor: how it is linked to it.
      const a = anchorNode();
      const e = a >= 0 && a !== i ? hoodOf(a).edge.get(i) : undefined;
      const via = e !== undefined ? edgeInfo(e) : null;
      return {
        title: titleOf(i),
        sub: [typeNameOf(graph.typeIds[i]), links, what].filter(Boolean).join(" · "),
        hint: via
          ? `${via.types.slice(0, 3).join(", ") || "Related"}${via.types.length > 3 ? ` +${via.types.length - 3}` : ""} · ${via.refs.toLocaleString()} ${via.refs === 1 ? "reference" : "references"}`
          : undefined,
      };
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
    return null;
    // `anchorNode` and `hoodOf` read `selected`, `find` and the drawn edges.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipOf, hover, pinned, graph, strength, titleOf, typeNameOf, edgeInfo, selected, find, edgeOn]);
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
    if (!lodOn) return [];
    return communities
      .map((c, idx) => ({ c, idx, m: communityMatch ? communityMatch[idx] : -1 }))
      .filter((x) => x.m !== 0 && (shownCount.get(x.c) ?? 0) > 0)
      // All of them: a group past the first few is otherwise out of the
      // keyboard's reach (Review #3).
      .sort((p, q) => q.m - p.m || q.c.members.length - p.c.members.length);
  }, [lodOn, communities, communityMatch, shownCount]);

  /* The keyboard lists (every group, the records in view), built again only
     when what they list changes: a selection or a camera move re-renders the
     canvas, and these were most of its render. */
  const kbd = useRef({ request, centreCommunity, focusNode, onSelect });
  kbd.current = { request, centreCommunity, focusNode, onSelect };
  const communityList = useMemo(
    () =>
      keyboardCommunities.length > 0 && (
        <ul aria-label={communityMatch ? "Where the matches are" : "Groups"} className="sr-only">
          {keyboardCommunities.map(({ c, idx, m }) => (
            <li key={c.id}>
              <button
                type="button"
                onFocus={() => {
                  setFocusedCommunity(idx);
                  kbd.current.request();
                }}
                onBlur={() => setFocusedCommunity((f) => (f === idx ? -1 : f))}
                onClick={() => kbd.current.centreCommunity(idx)}
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
      ),
    // `kbd` holds the handlers.
    [keyboardCommunities, communityMatch, titleOf],
  );
  const nodeList = useMemo(
    () => (
      <ul aria-label={label} className="sr-only">
        {keyboardNodes.map((i) => (
          <li key={graph.ids[i]}>
            <button
              type="button"
              aria-pressed={i === selected}
              onFocus={() => kbd.current.focusNode(i)}
              onBlur={() => setFocused((f) => (f === i ? -1 : f))}
              onClick={(e) => kbd.current.onSelect(i, e)}
            >
              {titleOf(i)}, {typeNameOf(graph.typeIds[i])}
              {strength ? (strength[i] === 2 ? ", match" : strength[i] === 1 ? ", linked to a match" : "") : ""}
            </button>
          </li>
        ))}
      </ul>
    ),
    [keyboardNodes, selected, strength, label, graph, titleOf, typeNameOf],
  );

  /* While filtering, the chip counts matches with no relationship, or says
     nothing matches. */
  const isolatedMatches = useMemo(() => {
    if (!matchOrder) return 0;
    let k = 0;
    for (const i of matchOrder) if (graph.degree[i] === 0) k++;
    return k;
  }, [matchOrder, graph]);
  const chip = !strength
    ? overview && placement.isolated > 0 && rel < LOD_TO
      ? `${placement.isolated.toLocaleString()} ${placement.isolated === 1 ? "record has" : "records have"} no relationships`
      : null
    : matchOrder && matchOrder.length === 0
      ? hiddenMatches > 0
        ? `${hiddenMatches.toLocaleString()} ${hiddenMatches === 1 ? "match is" : "matches are"} hidden by Display options`
        : "No records match"
      : isolatedMatches > 0 && lodOn && rel < LOD_TO
        ? `${isolatedMatches.toLocaleString()} ${isolatedMatches === 1 ? "match has" : "matches have"} no relationships`
        : null;

  const zoomButton = `${CANVAS_OVERLAY_BUTTON} text-sm`;
  const switchButton = (on: boolean) =>
    `h-7 px-2 text-meta font-medium rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40 ${
      on ? "bg-parchment text-ink" : "text-ink-secondary hover:bg-warm hover:text-ink cursor-pointer"
    }`;
  const centre = () => ({ x: viewCx, y: size.h / 2 });
  // Open where it is short and there is room; a long list starts closed.
  const [legendOpen, setLegendOpen] = useState<boolean | null>(null);
  const legendShown = legendOpen ?? (legend.length <= 8 && size.w >= 640);
  const crumb = communities[openCommunity];

  return (
    <div
      ref={hostRef}
      data-component="NetworkCanvas"
      // Edge to edge of the pane: listed by `__gutter()`, not asserted. Its
      // controls sit on the gutter (12px) inside it.
      data-gutter-bleed
      className="relative w-full h-full min-h-0 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-carbon/40"
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
          className="pointer-events-none absolute left-0 top-0 z-10 w-max max-w-[18rem] px-2.5 py-1.5 rounded-lg bg-paper/90 backdrop-blur-sm"
          style={{ visibility: "hidden" }}
        >
          <p className="text-xs font-medium text-ink truncate">{tip.title}</p>
          {"ends" in tip && tip.ends && (
            <>
              <p className="text-meta text-ink-secondary truncate">Between {tip.ends[0]}</p>
              <p className="text-meta text-ink-secondary truncate">and {tip.ends[1]}</p>
            </>
          )}
          {tip.sub && <p className="text-meta text-ink-tertiary truncate">{tip.sub}</p>}
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
      {/* Where the camera is, once zoomed in on a community. The Templates
          button sits under it while it is drawn. */}
      {lodOn && crumb && (
        <nav
          aria-label="Where you are"
          data-part="breadcrumb" data-overlay
          className={`absolute top-3 left-3 max-w-[calc(100%-11rem-var(--rail-reserve,0px))] ${CANVAS_OVERLAY_GROUP} gap-1 text-meta`}
        >
          <button
            type="button"
            className={`${CANVAS_OVERLAY_BUTTON} text-meta`}
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
          <span className="shrink-0 pe-2 text-ink-tertiary tabular-nums">{crumb.members.length.toLocaleString()}</span>
        </nav>
      )}
      {legend.length > 1 && (
        // Under the breadcrumb when it is drawn, else at the top of the
        // canvas: placed from its presence, nothing moves in between.
        <div
          data-part="legend" data-overlay
          className={`absolute left-3 ${lodOn && crumb ? "top-13" : "top-3"} flex flex-col items-start gap-1.5 max-w-[16rem]`}
        >
          <button
            type="button"
            aria-label="Templates"
            title="Templates"
            aria-expanded={legendShown}
            className={`relative w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40
              ${legendShown ? "bg-parchment text-ink" : "bg-paper/80 backdrop-blur-sm text-ink-secondary hover:bg-warm hover:text-ink"}`}
            onClick={() => setLegendOpen(!legendShown)}
          >
            <Layers size={14} aria-hidden />
            {/* Some template is hidden. */}
            {hiddenTypes.size > 0 && (
              <span aria-hidden className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-carbon" />
            )}
            {hiddenTypes.size > 0 && <span className="sr-only">, {hiddenTypes.size} hidden</span>}
          </button>
          {legendShown && (
            <div className={`w-fit max-w-full ${CANVAS_PANEL}`}>
              <p className="px-2 pt-1.5 pb-0.5 text-meta font-semibold uppercase tracking-wider text-ink-tertiary">
                Templates{hiddenTypes.size > 0 && <span className="normal-case tracking-normal font-medium"> · {hiddenTypes.size} hidden</span>}
              </p>
              <ul className="pb-1 px-1 overflow-y-auto" style={{ maxHeight: Math.max(96, size.h - (lodOn && crumb ? 188 : 148)) }}>
                {legend.map(({ typeId, count }) => {
                  const on = !hiddenTypes.has(typeId);
                  const name = typeNameOf(typeId);
                  return (
                    <li key={typeId}>
                      <button
                        type="button"
                        aria-pressed={on}
                        title={on ? `Hide ${name}` : `Show ${name}`}
                        className="w-full h-7 flex items-center gap-1.5 px-1.5 rounded-md text-meta hover:bg-warm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
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
            </div>
          )}
        </div>
      )}
      {find && (
        <div
          data-part="find" data-overlay
          role="group"
          aria-label="Matches"
          // `--rail-reserve`: the Library's Full width rail sits at this corner.
          className={`absolute top-3 right-[calc(var(--rail-reserve,0px)+0.75rem)] ${CANVAS_OVERLAY_GROUP}`}
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
          className={`absolute left-3 bottom-3 w-fit px-2.5 flex items-center ${CANVAS_OVERLAY} text-meta text-ink-tertiary`}
        >
          {chip}
        </p>
      )}
      <div className="absolute bottom-3 right-3 flex flex-wrap-reverse justify-end items-center gap-1.5 max-w-[calc(100%-1.5rem)]">
        {layoutSwitch && (
          <div
            data-part="layout" data-overlay
            role="group"
            aria-label="Layout"
            className={CANVAS_OVERLAY_GROUP}
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
          className={CANVAS_OVERLAY_GROUP}
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
            className={`${CANVAS_OVERLAY_BUTTON} text-meta`}
            onClick={() => setCamera(fitCamera(), true)}
          >
            Fit
          </button>
        </div>
      </div>
      {communityList}
      {nodeList}
    </div>
  );
}
