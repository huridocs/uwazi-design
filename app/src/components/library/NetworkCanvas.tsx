import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { NetworkGraph } from "../../data/network/graph";
import type { Community, NetworkPlacement } from "../../data/network/layout";
import type { FocusLayout } from "../../data/network/focus";
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
  /** Accessible name of the drawing and of its keyboard list. */
  label: string;
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
  nodeOn,
  edgeOn,
  strength,
  hubDegree,
  hubEdges,
  overview,
  focus = null,
  fitKey,
  layoutSwitch,
  selected,
  onSelect,
  label,
}: NetworkCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const cam = useRef<Camera>({ k: 1, tx: 0, ty: 0 });
  const fitK = useRef(1);
  const frame = useRef(0);
  const [hover, setHover] = useState<{ kind: "node" | "community"; i: number; x: number; y: number } | null>(null);
  const hoverRef = useRef(hover);
  hoverRef.current = hover;
  const [focused, setFocused] = useState(-1);
  const [focusedCommunity, setFocusedCommunity] = useState(-1);
  const [rel, setRel] = useState(1);
  const themeVersion = useThemeVersion();

  const n = graph.ids.length;
  const { communities } = placement;
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
  const markRadius = (c: Community) => clamp((3 + Math.sqrt(c.members.length) * 1.5) * markScale, 3, 56);
  const nodeRadius = (i: number, r: number) =>
    clamp((1.6 + 0.55 * Math.sqrt(graph.degree[i])) * clamp(Math.sqrt(r / 2), 0.75, 1.8), 1.4, 16);
  /* Node size and strength while filtering: a neighbour is small, the rest a point. */
  const radiusAt = (i: number, r: number) =>
    !strength ? nodeRadius(i, r) : strength[i] === 2 ? Math.max(3, nodeRadius(i, r)) : strength[i] === 1 ? Math.max(1.2, nodeRadius(i, r) * 0.55) : 1.1;

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
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const sx = (i: number) => pos[i * 2] * k + tx;
    const sy = (i: number) => pos[i * 2 + 1] * k + ty;
    const pad = 40;

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
        const incident = selected >= 0 && (i === selected || j === selected);
        // An edge needs a matching end while filtering.
        if (!incident && strength && strength[i] !== 2 && strength[j] !== 2) continue;
        if (member && !incident && (!member[i] || !member[j])) continue;
        const x1 = sx(i), y1 = sy(i), x2 = sx(j), y2 = sy(j);
        if ((x1 < -pad && x2 < -pad) || (x1 > W + pad && x2 > W + pad) || (y1 < -pad && y2 < -pad) || (y1 > H + pad && y2 > H + pad)) continue;
        const hub = graph.degree[i] >= hubDegree || graph.degree[j] >= hubDegree;
        if (!incident && hub && hubEdges === "off") continue;
        const refs = graph.refs[e];
        const w = refs >= 4 ? 2 : refs >= 2 ? 1.3 : 0.8;
        const style = incident
          ? "sel"
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
      // A selected hub's thousands of edges would cover the canvas in carbon:
      // they lighten as its degree grows.
      const selAlpha = selected >= 0 ? clamp(0.85 * Math.sqrt(40 / Math.max(1, graph.degree[selected])), 0.12, 0.85) : 0;
      const styleAlpha: Record<string, number> = { sel: selAlpha, hub: 0.07, base: 0.28, strong: 0.6, light: 0.2 };
      for (const [key, pts] of buckets) {
        const [style, w] = key.split("|");
        ctx.globalAlpha = nodesAlpha * styleAlpha[style];
        ctx.strokeStyle = style === "sel" ? t.carbon : style === "strong" ? t.inkSecondary : t.inkTertiary;
        ctx.lineWidth = Number(w) * (style === "sel" ? 1.3 : style === "strong" ? 1.15 : 1);
        ctx.beginPath();
        for (let p = 0; p < pts.length; p += 4) {
          ctx.moveTo(pts[p], pts[p + 1]);
          ctx.lineTo(pts[p + 2], pts[p + 3]);
        }
        ctx.stroke();
      }

      /* Nodes, one fill per (template, strength). The rest first, as faint
         points in one colour; then neighbours; matches last, on top. */
      const levels = strength ? [0, 1, 2] : [2];
      for (const level of levels) {
        const alpha = level === 2 ? 1 : level === 1 ? 0.45 : 0.22 * (member ? restAlpha : 1);
        if (alpha < 0.01) continue;
        const groups = new Map<string, number[]>();
        for (let i = 0; i < n; i++) {
          if (!nodeOn[i]) continue;
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
            const rad = radiusAt(i, r);
            const x = sx(i), y = sy(i);
            ctx.moveTo(x + rad, y);
            ctx.arc(x, y, rad, 0, Math.PI * 2);
          }
          ctx.fill();
          if (level === 2 && r > 1.5) {
            ctx.strokeStyle = t.bg;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      /* Rings: selected (carbon), keyboard focus (carbon, wider), hover (ink). */
      const ring = (i: number, color: string, width: number, gap: number) => {
        if (i < 0 || !nodeOn[i]) return;
        ctx.globalAlpha = Math.max(nodesAlpha, 0.6);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.arc(sx(i), sy(i), radiusAt(i, r) + gap, 0, Math.PI * 2);
        ctx.stroke();
      };
      ring(selected, t.carbon, 2, 2.5);
      ring(focused, t.carbon, 2.5, 5);
      const hv = hoverRef.current;
      if (hv?.kind === "node") ring(hv.i, t.ink, 1.5, 2);

      /* Labels: best-connected first (only matches while filtering), only
         where they do not collide. The selected node is always labelled. */
      // One label set at a time: node labels once nodes are the stronger layer.
      if (nodesAlpha >= 0.5) {
        ctx.font = `500 11px ${t.font}`;
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        const taken: [number, number, number, number][] = [];
        const budget = Math.round(clamp(10 + 14 * Math.log2(Math.max(1, r)), 10, 70));
        const want = [selected, focused, ...(hv?.kind === "node" ? [hv.i] : [])].filter((i) => i >= 0);
        let placed = 0;
        const place = (i: number, force: boolean) => {
          if (!nodeOn[i]) return;
          const x = sx(i) + radiusAt(i, r) + 4;
          const y = sy(i);
          if (x < 0 || x > W || y < 0 || y > H) return;
          const text = truncate(titleOf(i));
          const tw = ctx.measureText(text).width;
          const box: [number, number, number, number] = [x - 2, y - 8, x + tw + 2, y + 8];
          // A label cut by the pane's edge reads as a different name.
          if (!force && box[2] > W) return;
          if (!force && taken.some((b) => b[0] < box[2] && box[0] < b[2] && b[1] < box[3] && box[1] < b[3])) return;
          taken.push(box);
          ctx.globalAlpha = nodesAlpha;
          ctx.strokeStyle = t.bg;
          ctx.lineWidth = 3;
          ctx.strokeText(text, x, y);
          ctx.fillStyle = force ? t.ink : t.inkSecondary;
          ctx.fillText(text, x, y);
          placed++;
        };
        for (const i of want) place(i, true);
        for (const i of matchOrder ?? byDegree) {
          if (placed >= budget) break;
          if (want.includes(i)) continue;
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
      // they fit; only while the marks are the stronger layer.
      if (marksAlpha > 0.5) {
        ctx.font = `500 11px ${t.font}`;
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        const taken: [number, number, number, number][] = [];
        communities.forEach((c, idx) => {
          if (c.members.length < 8 || (communityMatch && communityMatch[idx] === 0)) return;
          const text = truncate(titleOf(c.top), 28);
          const x = cx(c);
          const y = cy(c) + markRadius(c) + (communityMatch ? 13 : 9);
          const tw = ctx.measureText(text).width;
          const box: [number, number, number, number] = [x - tw / 2 - 2, y - 8, x + tw / 2 + 2, y + 8];
          if (taken.some((b) => b[0] < box[2] && box[0] < b[2] && b[1] < box[3] && box[1] < b[3])) return;
          taken.push(box);
          ctx.globalAlpha = marksAlpha;
          ctx.strokeStyle = t.bg;
          ctx.lineWidth = 3;
          ctx.strokeText(text, x, y);
          ctx.fillStyle = t.inkSecondary;
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
    // `mix`, `markRadius` and `radiusAt` close over props only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, colors, graph, n, edgeOn, nodeOn, strength, member, hubDegree, hubEdges, selected, focused, focusedCommunity, matchOrder, byDegree, titleOf, communities, communityLinks, communityMatch, marksOn]);

  const request = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(draw);
  }, [draw]);
  useEffect(() => {
    request();
  }, [request]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  /* ── Size, dpr, fits ─────────────────────────────────────────────────── */

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
    setRel(cam.current.k / fitK.current);
    draw();
    // Only a size or collection change refits here; filter moves are below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, placement.extent]);

  /* ── Moves ───────────────────────────────────────────────────────────── */

  const anim = useRef(0);
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
    (next: Camera, animate: boolean, to?: Float32Array, toFade?: number) => {
      cancelAnimationFrame(anim.current);
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
        setRel(next.k / fitK.current);
        draw();
      };
      if (!animate || reducedMotion()) return finish();
      if (to) moving.current = { to, fade: endFade };
      const start = performance.now();
      let frames = 0;
      const step = (now: number) => {
        frames++;
        const p = Math.min(1, (now - start) / MOVE_MS);
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

  const setCamera = useCallback((next: Camera, animate = false) => move(next, animate), [move]);

  // A new match set or layout: move nodes and camera together. The first one
  // (the view opening on a filter) jumps.
  const lastFit = useRef<string | null | undefined>(undefined);
  useLayoutEffect(() => {
    if (!size.w || !size.h || fitKey === undefined || fitKey === null) return;
    if (lastFit.current === fitKey) return;
    const first = lastFit.current === undefined;
    lastFit.current = fitKey;
    move(fitCamera(), !first, target, focus ? 1 : 0);
    // `fitKey` names everything a move depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, size.w > 0 && size.h > 0]);

  const zoomAt = useCallback(
    (factor: number, x: number, y: number, animate = false) => {
      settle();
      const c = cam.current;
      const k = clamp(c.k * factor, fitK.current * MIN_REL, fitK.current * MAX_REL);
      const f = k / c.k;
      setCamera({ k, tx: x - (x - c.tx) * f, ty: y - (y - c.ty) * f }, animate);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setCamera],
  );

  const centreOn = useCallback(
    (wx: number, wy: number, k: number, animate = true) =>
      setCamera({ k, tx: size.w / 2 - wx * k, ty: size.h / 2 - wy * k }, animate),
    [setCamera, size],
  );

  // Wheel zoom needs a native listener: React's is passive and cannot
  // preventDefault the page scroll.
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const scale = e.deltaMode === 1 ? 16 : 1;
      const factor = Math.exp(-e.deltaY * scale * (e.ctrlKey ? 0.01 : 0.0018));
      zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

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
    [communities, quad, nodeOn, member, target, marksOn, size, strength],
  );

  /* ── Pointer: pan, pinch, hover, click ───────────────────────────────── */

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const communityIndex = useMemo(() => new Map(communities.map((c, idx) => [c.id, idx])), [communities]);
  const gesture = useRef<{ moved: boolean; x: number; y: number; dist: number; mx: number; my: number } | null>(null);

  const local = (e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
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
      const hit = hitAt(p.x, p.y);
      const prev = hoverRef.current;
      if (hit?.kind !== prev?.kind || hit?.i !== prev?.i) {
        setHover(hit ? { ...hit, x: p.x, y: p.y } : null);
        hoverRef.current = hit ? { ...hit, x: p.x, y: p.y } : null;
        request();
      }
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
    request();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size === 0) {
      gesture.current = null;
      setRel(cam.current.k / fitK.current);
    } else if (g) {
      // One finger left a pinch: it pans from where it is now.
      g.dist = 0;
      const [rest] = [...pointers.current.values()];
      g.mx = rest.x;
      g.my = rest.y;
    }
    if (!g || g.moved || pointers.current.size) return;
    const p = local(e);
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
    if (!hit) return;
    if (hit.kind === "node") {
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
    if (hoverRef.current) {
      hoverRef.current = null;
      setHover(null);
      request();
    }
  };

  /* ── Keyboard list ───────────────────────────────────────────────────── */

  // Matches first, then their neighbours, then the best-connected rest.
  const keyboardNodes = useMemo(() => {
    const on = byDegree.filter((i) => nodeOn[i] && (!member || member[i]));
    if (!strength) return on.slice(0, KEYBOARD_LIST);
    const rank = (i: number) => (strength[i] === 2 ? 0 : strength[i] === 1 ? 1 : 2);
    return on
      .map((i, k) => [i, rank(i) * n + k] as const)
      .sort((x, y) => x[1] - y[1])
      .slice(0, KEYBOARD_LIST)
      .map(([i]) => i);
  }, [byDegree, strength, nodeOn, member, n]);

  const focusNode = (i: number) => {
    setFocused(i);
    settle();
    const k = Math.max(cam.current.k, fitK.current * (marksOn ? OPEN_TO * 1.2 : 1.5));
    centreOn(target[i * 2], target[i * 2 + 1], k);
  };

  /* ── Tooltip ─────────────────────────────────────────────────────────── */

  const tip = (() => {
    if (!hover) return null;
    if (hover.kind === "node") {
      const what = strength ? (strength[hover.i] === 2 ? "Match" : strength[hover.i] === 1 ? "Linked to a match" : "") : "";
      return { title: titleOf(hover.i), sub: [typeNameOf(graph.typeIds[hover.i]), what].filter(Boolean).join(" · ") };
    }
    const c = communities[hover.i];
    if (!c) return null;
    const count = c.members.length;
    const records = `${count.toLocaleString()} ${count === 1 ? "record" : "records"}`;
    if (communityMatch) {
      const m = communityMatch[hover.i];
      return {
        title: titleOf(c.top),
        sub: `${m.toLocaleString()} of ${records} ${m === 1 ? "matches" : "match"}, mostly ${typeNameOf(c.typeId)}`,
        hint: "Double-click to centre",
      };
    }
    return { title: titleOf(c.top), sub: `${records}, mostly ${typeNameOf(c.typeId)}`, hint: "Double-click to centre" };
  })();

  /* Communities for the keyboard: by match count while filtering (those with
     a match only), by size otherwise. Enter centres one. */
  const keyboardCommunities = useMemo(() => {
    if (!marksOn) return [];
    return communities
      .map((c, idx) => ({ c, idx, m: communityMatch ? communityMatch[idx] : -1 }))
      .filter((x) => x.m !== 0)
      .sort((p, q) => q.m - p.m || q.c.members.length - p.c.members.length)
      .slice(0, 20);
  }, [marksOn, communities, communityMatch]);

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
      ? "No records match"
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

  return (
    <div ref={hostRef} data-component="NetworkCanvas" className="relative w-full h-full min-h-0 overflow-hidden">
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
      {tip && hover && (
        <div
          role="presentation"
          data-part="tooltip"
          className="pointer-events-none absolute z-10 max-w-[18rem] px-2 py-1.5 rounded-md bg-paper shadow-md border border-border-soft"
          style={{
            left: Math.min(hover.x + 12, Math.max(0, size.w - 290)),
            top: Math.max(0, hover.y + 14),
          }}
        >
          <p className="text-xs font-medium text-ink truncate">{tip.title}</p>
          <p className="text-meta text-ink-tertiary truncate">{tip.sub}</p>
          {"hint" in tip && <p className="text-meta text-ink-tertiary">{tip.hint}</p>}
        </div>
      )}
      {chip && (
        <p
          data-part="isolated"
          className="absolute left-0 bottom-0 w-fit px-2 h-6 flex items-center rounded-md bg-paper border border-border-soft text-meta text-ink-tertiary"
        >
          {chip}
        </p>
      )}
      <div className="absolute bottom-0 right-0 flex flex-wrap-reverse justify-end items-center gap-1.5 max-w-full">
        {layoutSwitch && (
          <div
            data-part="layout"
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
          data-part="zoom"
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
