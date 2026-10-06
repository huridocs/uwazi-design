import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { NetworkGraph } from "../../data/network/graph";
import type { Community, NetworkPlacement } from "../../data/network/layout";
import { buildQuadtree } from "../../utils/quadtree";
import { typeLabelColor } from "../../utils/typeColor";

/** A whole-collection graph on one canvas.
 *
 *  Canvas 2D, not SVG: CEJIL is 4,398 nodes and 16,585 edges, eight times what
 *  the SVG graph holds. Per frame, edges are bucketed by style and width and
 *  stroked as one path per bucket; nodes are filled as one path per template
 *  and strength. Nothing is laid out here: positions come in `placement`.
 *
 *  Zoomed out, a large collection draws one mark per community (sized by its
 *  record count, coloured by its main template) and the marks open into nodes
 *  as you zoom. Filters dim in place: `strength` is 2 for a match, 1 for its
 *  neighbours, 0 for the rest, and null when nothing is filtered.
 *
 *  Keyboard: the canvas is not a control. A visually hidden list of buttons
 *  (the matches, or the best-connected records) comes after it; focusing one
 *  pans to its node and draws a focus ring there. */

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

interface Camera {
  k: number;
  tx: number;
  ty: number;
}

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
  const [rel, setRel] = useState(1);
  const themeVersion = useThemeVersion();

  const n = graph.ids.length;
  const { pos, communities, extent } = placement;
  const quad = useMemo(() => buildQuadtree(pos, n), [pos, n]);
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

  /* Label order while filtering: matches first. */
  const labelOrder = useMemo(
    () => (strength ? [...byDegree.filter((i) => strength[i] === 2), ...byDegree.filter((i) => strength[i] !== 2)] : byDegree),
    [byDegree, strength],
  );

  /* Per community: how many of its members match, for the overview. */
  const communityMatch = useMemo(() => {
    if (!strength) return null;
    return communities.map((c) => c.members.reduce((s, i) => s + (strength[i] === 2 ? 1 : 0), 0));
  }, [communities, strength]);

  /* Links between communities, counted once per edge drawn, for the overview. */
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
      if (hubEdges !== "full" && (graph.degree[graph.a[e]] >= hubDegree || graph.degree[graph.b[e]] >= hubDegree)) continue;
      const x = at.get(ca)!;
      const y = at.get(cb)!;
      const key = x < y ? x * C + y : y * C + x;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].map(([key, count]) => ({ x: Math.floor(key / C), y: key % C, count }));
  }, [overview, communities, graph, edgeOn, placement.community, hubEdges, hubDegree]);

  const mix = (r: number) => (overview ? clamp((r - OPEN_FROM) / (OPEN_TO - OPEN_FROM), 0, 1) : 1);
  // Marks scale with the pane, so a phone's overview is not one overlapping heap.
  const markScale = clamp(Math.min(size.w, size.h) / 760, 0.4, 1);
  const markRadius = (c: Community) => clamp((3 + Math.sqrt(c.members.length) * 1.5) * markScale, 3, 56);
  const nodeRadius = (i: number, r: number) =>
    clamp((1.6 + 0.55 * Math.sqrt(graph.degree[i])) * clamp(Math.sqrt(r / 2), 0.75, 1.8), 1.4, 16);

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
    const nodesAlpha = mix(r);
    const marksAlpha = 1 - nodesAlpha;
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
        const x1 = sx(i), y1 = sy(i), x2 = sx(j), y2 = sy(j);
        if ((x1 < -pad && x2 < -pad) || (x1 > W + pad && x2 > W + pad) || (y1 < -pad && y2 < -pad) || (y1 > H + pad && y2 > H + pad)) continue;
        const incident = selected >= 0 && (i === selected || j === selected);
        const hub = graph.degree[i] >= hubDegree || graph.degree[j] >= hubDegree;
        if (!incident) {
          if (hub && hubEdges === "off") continue;
          // Dim in place: an edge needs a matching end to be drawn.
          if (strength && strength[i] !== 2 && strength[j] !== 2) continue;
        }
        const refs = graph.refs[e];
        const w = refs >= 4 ? 2 : refs >= 2 ? 1.3 : 0.8;
        const style = incident ? "sel" : hub && hubEdges === "faint" ? "hub" : "base";
        push(`${style}|${w}`, x1, y1, x2, y2);
      }
      ctx.lineCap = "round";
      // A selected hub's thousands of edges would cover the canvas in carbon:
      // they lighten as its degree grows.
      const selAlpha = selected >= 0 ? clamp(0.85 * Math.sqrt(40 / Math.max(1, graph.degree[selected])), 0.12, 0.85) : 0;
      for (const [key, pts] of buckets) {
        const [style, w] = key.split("|");
        ctx.globalAlpha = nodesAlpha * (style === "sel" ? selAlpha : style === "hub" ? 0.07 : strength ? 0.45 : 0.28);
        ctx.strokeStyle = style === "sel" ? t.carbon : t.inkTertiary;
        ctx.lineWidth = Number(w) * (style === "sel" ? 1.3 : 1);
        ctx.beginPath();
        for (let p = 0; p < pts.length; p += 4) {
          ctx.moveTo(pts[p], pts[p + 1]);
          ctx.lineTo(pts[p + 2], pts[p + 3]);
        }
        ctx.stroke();
      }

      /* Nodes, one fill per (template, strength). Dim before strong, so a
         match is never under a dimmed dot. */
      const levels = strength ? [0, 1, 2] : [2];
      const levelAlpha = [0.13, 0.5, 1];
      for (const level of levels) {
        const groups = new Map<string, number[]>();
        for (let i = 0; i < n; i++) {
          if (!nodeOn[i]) continue;
          if (strength && strength[i] !== level) continue;
          const x = sx(i), y = sy(i);
          if (x < -pad || x > W + pad || y < -pad || y > H + pad) continue;
          const tId = graph.typeIds[i];
          let g = groups.get(tId);
          if (!g) groups.set(tId, (g = []));
          g.push(i);
        }
        ctx.globalAlpha = nodesAlpha * levelAlpha[level];
        for (const [tId, list] of groups) {
          ctx.fillStyle = colors.dot.get(tId) ?? t.inkTertiary;
          ctx.beginPath();
          for (const i of list) {
            const rad = nodeRadius(i, r);
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
        ctx.arc(sx(i), sy(i), nodeRadius(i, r) + gap, 0, Math.PI * 2);
        ctx.stroke();
      };
      ring(selected, t.carbon, 2, 2.5);
      ring(focused, t.carbon, 2.5, 5);
      const hv = hoverRef.current;
      if (hv?.kind === "node") ring(hv.i, t.ink, 1.5, 2);

      /* Labels: best-connected first (matches first while filtering), only
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
          if (!force && strength && strength[i] === 0) return;
          const x = sx(i) + nodeRadius(i, r) + 4;
          const y = sy(i);
          if (x < 0 || x > W || y < 0 || y > H) return;
          const text = truncate(titleOf(i));
          const tw = ctx.measureText(text).width;
          const box: [number, number, number, number] = [x - 2, y - 8, x + tw + 2, y + 8];
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
        for (const i of labelOrder) {
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
        const share = communityMatch ? communityMatch[idx] / c.members.length : 1;
        const dim = communityMatch && communityMatch[idx] === 0;
        ctx.globalAlpha = marksAlpha * (dim ? 0.25 : 1);
        ctx.fillStyle = t.bg;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = marksAlpha * (dim ? 0.08 : 0.2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.globalAlpha = marksAlpha * (dim ? 0.3 : 0.75);
        ctx.strokeStyle = color;
        ctx.lineWidth = hoverRef.current?.kind === "community" && hoverRef.current.i === idx ? 2.5 : 1.25;
        ctx.stroke();
        // While filtering: the matching share as an inner disc.
        if (communityMatch && share > 0) {
          ctx.globalAlpha = marksAlpha * 0.85;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(2, rad * Math.sqrt(share)), 0, Math.PI * 2);
          ctx.fill();
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
          const y = cy(c) + markRadius(c) + 9;
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
    ctx.globalAlpha = 1;
    // `mix`, `markRadius` and `nodeRadius` close over props only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, colors, graph, pos, n, edgeOn, nodeOn, strength, hubDegree, hubEdges, selected, focused, labelOrder, titleOf, communities, communityLinks, communityMatch, overview]);

  const request = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(draw);
  }, [draw]);
  useEffect(() => {
    request();
  }, [request]);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  /* ── Size, dpr, first fit ────────────────────────────────────────────── */

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

  const fit = useCallback(() => {
    const w = extent.maxX - extent.minX || 1;
    const h = extent.maxY - extent.minY || 1;
    // Room for the overview marks and their names at the edge.
    const k = Math.min((size.w - 96) / w, (size.h - 96) / h);
    fitK.current = k;
    return { k, tx: size.w / 2 - ((extent.minX + extent.maxX) / 2) * k, ty: size.h / 2 - ((extent.minY + extent.maxY) / 2) * k };
  }, [extent, size]);

  // Fit on first size and whenever the drawing changes; a resize keeps the
  // centre and the relative zoom.
  const fitted = useRef<{ extent: typeof extent; w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size.w || !size.h) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    const prev = fitted.current;
    if (!prev || prev.extent !== extent) {
      cam.current = fit();
    } else {
      const relNow = cam.current.k / fitK.current;
      const cxw = (prev.w / 2 - cam.current.tx) / cam.current.k;
      const cyw = (prev.h / 2 - cam.current.ty) / cam.current.k;
      const f = fit();
      const k = f.k * relNow;
      cam.current = { k, tx: size.w / 2 - cxw * k, ty: size.h / 2 - cyw * k };
    }
    fitted.current = { extent, w: size.w, h: size.h };
    setRel(cam.current.k / fitK.current);
    draw();
  }, [size, extent, fit, draw]);

  /* ── Camera moves ────────────────────────────────────────────────────── */

  const anim = useRef(0);
  const setCamera = useCallback(
    (next: Camera, animate = false) => {
      cancelAnimationFrame(anim.current);
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (!animate || reduce) {
        cam.current = next;
        setRel(next.k / fitK.current);
        request();
        return;
      }
      const from = { ...cam.current };
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / 320);
        const e = 1 - (1 - p) ** 3;
        // Interpolate the zoom geometrically so the centre path stays straight.
        const k = from.k * (next.k / from.k) ** e;
        const fx = (size.w / 2 - from.tx) / from.k;
        const fy = (size.h / 2 - from.ty) / from.k;
        const nx = (size.w / 2 - next.tx) / next.k;
        const ny = (size.h / 2 - next.ty) / next.k;
        const wx = fx + (nx - fx) * e;
        const wy = fy + (ny - fy) * e;
        cam.current = { k, tx: size.w / 2 - wx * k, ty: size.h / 2 - wy * k };
        draw();
        if (p < 1) anim.current = requestAnimationFrame(step);
        else setRel(k / fitK.current);
      };
      anim.current = requestAnimationFrame(step);
    },
    [draw, request, size],
  );

  const zoomAt = useCallback(
    (factor: number, x: number, y: number, animate = false) => {
      const c = cam.current;
      const k = clamp(c.k * factor, fitK.current * MIN_REL, fitK.current * MAX_REL);
      const f = k / c.k;
      setCamera({ k, tx: x - (x - c.tx) * f, ty: y - (y - c.ty) * f }, animate);
    },
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
      const i = quad.nearest(wx, wy, 18 / c.k, (j) => nodeOn[j] === 1);
      if (i < 0) return null;
      const d = Math.hypot(pos[i * 2] * c.k + c.tx - x, pos[i * 2 + 1] * c.k + c.ty - y);
      return d <= nodeRadius(i, r) + 5 ? { kind: "node", i } : null;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [communities, quad, nodeOn, pos, overview, size],
  );

  /* ── Pointer: pan, pinch, hover, click ───────────────────────────────── */

  const pointers = useRef(new Map<number, { x: number; y: number }>());
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

  const onPointerLeave = () => {
    if (hoverRef.current) {
      hoverRef.current = null;
      setHover(null);
      request();
    }
  };

  /* ── Keyboard list ───────────────────────────────────────────────────── */

  const keyboardNodes = useMemo(() => {
    const pick = strength ? byDegree.filter((i) => strength[i] === 2 && nodeOn[i]) : byDegree.filter((i) => nodeOn[i]);
    return pick.slice(0, KEYBOARD_LIST);
  }, [byDegree, strength, nodeOn]);

  const focusNode = (i: number) => {
    setFocused(i);
    const k = Math.max(cam.current.k, fitK.current * OPEN_TO * 1.2);
    centreOn(pos[i * 2], pos[i * 2 + 1], k);
  };

  /* ── Tooltip ─────────────────────────────────────────────────────────── */

  const tip = (() => {
    if (!hover) return null;
    if (hover.kind === "node") {
      return { title: titleOf(hover.i), sub: typeNameOf(graph.typeIds[hover.i]) };
    }
    const c = communities[hover.i];
    if (!c) return null;
    const count = c.members.length;
    return {
      title: titleOf(c.top),
      sub: `${count.toLocaleString()} ${count === 1 ? "record" : "records"}, mostly ${typeNameOf(c.typeId)}`,
    };
  })();

  const zoomButton =
    "h-6 min-w-6 px-1 text-sm text-ink-secondary hover:text-ink rounded-sm cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40";
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
        </div>
      )}
      {overview && placement.isolated > 0 && rel < OPEN_TO && (
        <p
          data-part="isolated"
          className="absolute left-0 bottom-0 w-fit px-2 h-6 flex items-center rounded-md bg-paper border border-border-soft text-meta text-ink-tertiary"
        >
          {placement.isolated.toLocaleString()} {placement.isolated === 1 ? "record has" : "records have"} no relationships
        </p>
      )}
      <div
        data-part="zoom"
        role="group"
        aria-label="Zoom"
        className="absolute bottom-0 right-0 flex items-center gap-0.5 bg-paper border border-border rounded-md shadow-sm px-1 py-0.5"
      >
        <button type="button" aria-label="Zoom out" className={zoomButton} onClick={() => zoomAt(1 / 1.6, centre().x, centre().y, true)}>
          −
        </button>
        <button type="button" aria-label="Zoom in" className={zoomButton} onClick={() => zoomAt(1.6, centre().x, centre().y, true)}>
          +
        </button>
        <button type="button" className={`${zoomButton} text-meta`} onClick={() => setCamera(fit(), true)}>
          Fit
        </button>
      </div>
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
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
