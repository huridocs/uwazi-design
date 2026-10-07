import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { useAtom, useAtomValue } from "jotai";
import { ChevronRight, ExternalLink, Minus, Plus } from "lucide-react";
import type { Entity } from "../../data/entities";
import { formatClock, formatOffset } from "../../data/vegas/links";
import { VEGAS_UTC_OFFSET } from "../../data/vegas/schema";
import {
  OUTLIER_SECONDS,
  SYNC_DEFAULT_WINDOW,
  SYNC_KINDS,
  syncLinkAt,
  vegasSyncModel,
  type SyncAnchor,
  type SyncKindId,
  type SyncLane,
  type SyncLink,
  type SyncMoment,
} from "../../data/vegas/syncLanes";
import { syncFoldedAtom, syncOpenNoticeSeenAtom, syncPlayheadAtom, syncWindowAtom } from "../../atoms/syncView";
import { Select } from "../shared/Select";
import { Modal, MODAL_BUTTON, MODAL_COMMIT } from "../shared/Modal";
import { BAR_GHOST } from "../shared/warmButton";

type OnSelect = (id: string, e?: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => void;

/* ── The clock ────────────────────────────────────────────────────────── */

const MIN_SPAN = 10;

const PRESETS = [
  { id: "1m", label: "1 min", span: 60 },
  { id: "5m", label: "5 min", span: 300 },
  { id: "shooting", label: "Shooting" },
  { id: "whole", label: "Whole" },
] as const;

/** Axis steps, in seconds; the first that leaves 64px between labels wins. */
const STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 21600];

const clock = (t: number) => formatClock(Math.floor(t));
const dayOf = (t: number) => new Date(t * 1000).toISOString().slice(0, 10);
const dayLabel = (t: number) =>
  new Date(t * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/* ── Geometry ─────────────────────────────────────────────────────────── */

/** Below this pane width the label sits over its bar (stacked lanes). */
const STACK_BELOW = 640;
const LABEL_W = 224;
const END_PAD = 12;
const AXIS_H = 40;
const GROUP_H = 32;
const LANE_H = 36;
const LANE_H_STACKED = 46;
/** The faded tail after a lane's last known instant: a fixed width, since
 *  what it stands for (the rest of the recording) has no length in the data. */
const TAIL_PX = 36;

type Item =
  | { kind: "group"; id: SyncKindId; label: string; count: number; clocked: number; folded: boolean }
  | { kind: "lane"; lane: SyncLane; pos: number };

interface Tokens {
  paper: string;
  warm: string;
  parchment: string;
  vellum: string;
  ink: string;
  ink2: string;
  ink3: string;
  muted: string;
  border: string;
  carbon: string;
  success: string;
  warning: string;
  font: string;
}

/** Canvas cannot read `var()`: resolve through a probe, as NetworkCanvas does. */
function readTokens(): Tokens {
  const probe = document.createElement("span");
  probe.style.display = "none";
  document.body.appendChild(probe);
  const c = (expr: string) => {
    probe.style.color = "";
    probe.style.color = expr;
    return getComputedStyle(probe).color || expr;
  };
  const t = {
    paper: c("var(--bg-surface)"),
    warm: c("var(--bg-warm)"),
    parchment: c("var(--bg-primary)"),
    vellum: c("var(--bg-muted)"),
    ink: c("var(--text-primary)"),
    ink2: c("var(--text-secondary)"),
    ink3: c("var(--text-tertiary)"),
    muted: c("var(--text-muted)"),
    border: c("var(--border-soft)"),
    carbon: c("var(--accent-blue)"),
    success: c("var(--success)"),
    warning: c("var(--warning)"),
    font: getComputedStyle(document.body).fontFamily,
  };
  probe.remove();
  return t;
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

const reducedMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);

/** `rgb(…)` → the same colour at `a` alpha. */
function alpha(rgb: string, a: number) {
  const m = /rgba?\(([^)]+)\)/.exec(rgb);
  if (!m) return rgb;
  const [r, g, b] = m[1].split(/[ ,/]+/).filter(Boolean);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

const VERIFICATION_WORD = { confirmed: "Confirmed", "single-source": "Single source", disputed: "Disputed" } as const;
const markColor = (t: Tokens, a: SyncAnchor) =>
  a.verification === "confirmed" ? t.success : a.verification === "disputed" ? t.warning : t.muted;

/** "3 s after", "1 s before". */
const offBy = (s: number) => `${Math.abs(Math.round(s))} s ${s > 0 ? "after" : "before"}`;

/** The flags a lane's label line names, shortest first. */
function laneNotes(l: SyncLane): { text: string; warn: boolean }[] {
  const out: { text: string; warn: boolean }[] = [];
  if (l.flags.some((f) => f.value === "drift")) out.push({ text: "Drift", warn: true });
  if (l.flags.some((f) => f.value === "title-mismatch")) out.push({ text: "Title time off", warn: true });
  const outliers = l.anchors.filter((a) => a.outlier).length;
  if (outliers) out.push({ text: outliers === 1 ? "1 outlier" : `${outliers} outliers`, warn: true });
  return out;
}

const anchorsWord = (n: number) => (n === 1 ? "1 anchor" : `${n.toLocaleString()} anchors`);

function laneAriaLabel(l: SyncLane) {
  const parts = [l.name, l.kindLabel];
  if (l.start === undefined) parts.push("no clock time");
  else {
    parts.push(`starts ${l.precision === "minute" ? clock(l.start).slice(0, 5) : clock(l.start)}`);
    parts.push(anchorsWord(l.anchors.length));
    if (l.confidence) parts.push(`sync: ${l.confidence.label.toLowerCase()}`);
    for (const n of laneNotes(l)) parts.push(n.text.toLowerCase());
  }
  return parts.join(", ");
}

/* ── The view ─────────────────────────────────────────────────────────── */

type Tip = { x: number; y: number; title: string; lines: string[] };
type Pending = { lane: SyncLane; link: SyncLink; offset: number };

/** The Library's Sync view: every recording as a lane on the collection's one
 *  wall clock, grouped by kind. Volleys are bands across the lanes, single
 *  gunshots, first shots and the corridor shots thin ticks; each recording's
 *  anchors are marks on its lane, coloured by their verification, and an
 *  anchor more than `OUTLIER_SECONDS` off its moment's consensus is drawn as an
 *  outlier tied to that consensus.
 *
 *  `entities` is the list every other view draws (`filtered` in LibraryView),
 *  so filters, facets, the date brush, search and a synced map area narrow
 *  the lanes. Lanes are DOM rows (the accessible list, the labels) over one
 *  canvas that draws the visible rows only: 379 lanes, at most a screenful
 *  painted per frame, so pan and zoom never wait on React. */
export const LibrarySyncView = memo(function LibrarySyncView({
  entities,
  selectedId,
  onSelect,
}: {
  entities: Entity[];
  selectedId: string | null;
  onSelect: OnSelect;
}) {
  const model = useMemo(() => vegasSyncModel(), []);
  const [windowState, setWindowState] = useAtom(syncWindowAtom);
  const [playhead, setPlayhead] = useAtom(syncPlayheadAtom);
  const [folded, setFolded] = useAtom(syncFoldedAtom);
  const [noticeSeen, setNoticeSeen] = useAtom(syncOpenNoticeSeenAtom);
  const theme = useThemeVersion();

  /* ── Lanes ─────────────────────────────────────────────────────────── */
  const shown = useMemo(() => new Set(entities.map((e) => e.id)), [entities]);
  const groups = useMemo(() => {
    if (!model) return [];
    return SYNC_KINDS.map((g) => {
      const lanes = model.lanes
        .filter((l) => l.group === g.id && shown.has(l.id))
        .sort((a, b) =>
          a.start === undefined || b.start === undefined
            ? (a.start === undefined ? 1 : 0) - (b.start === undefined ? 1 : 0) || a.name.localeCompare(b.name)
            : a.start - b.start || a.name.localeCompare(b.name),
        );
      return { id: g.id, label: g.label, lanes, clocked: lanes.filter((l) => l.start !== undefined).length };
    }).filter((g) => g.lanes.length > 0);
  }, [model, shown]);
  const shownLanes = useMemo(() => groups.flatMap((g) => g.lanes), [groups]);

  const isFolded = useCallback((g: { id: string; clocked: number }) => folded[g.id] ?? g.clocked === 0, [folded]);
  const items = useMemo(() => {
    const out: Item[] = [];
    let pos = 0;
    for (const g of groups) {
      const f = isFolded(g);
      out.push({ kind: "group", id: g.id, label: g.label, count: g.lanes.length, clocked: g.clocked, folded: f });
      if (!f) for (const lane of g.lanes) out.push({ kind: "lane", lane, pos: ++pos });
      else pos += g.lanes.length;
    }
    return out;
  }, [groups, isFolded]);

  /* ── Size ──────────────────────────────────────────────────────────── */
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const axisRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  const stacked = size.w > 0 && size.w < STACK_BELOW;
  const laneH = stacked ? LANE_H_STACKED : LANE_H;
  const plotX0 = stacked ? 0 : LABEL_W;
  const plotW = Math.max(1, size.w - plotX0 - (stacked ? 0 : END_PAD));

  const offsets = useMemo(() => {
    const ys = new Float64Array(items.length + 1);
    for (let i = 0; i < items.length; i++) ys[i + 1] = ys[i] + (items[i].kind === "group" ? GROUP_H : laneH);
    return ys;
  }, [items, laneH]);
  const total = offsets[items.length];

  /* ── View (the visible stretch of the clock) ───────────────────────── */
  const bounds = useMemo(() => {
    const from = Math.min(SYNC_DEFAULT_WINDOW.from, model?.extent.from ?? Infinity);
    const to = Math.max(SYNC_DEFAULT_WINDOW.to, model?.extent.to ?? -Infinity);
    const pad = (to - from) * 0.04;
    return { from: from - pad, to: to + pad };
  }, [model]);
  const viewRef = useRef(windowState ?? SYNC_DEFAULT_WINDOW);
  const clampView = useCallback(
    (v: { from: number; to: number }) => {
      let span = Math.min(Math.max(v.to - v.from, MIN_SPAN), bounds.to - bounds.from);
      let from = v.from;
      if (v.to - v.from !== span) from = (v.from + v.to) / 2 - span / 2;
      from = Math.max(bounds.from, Math.min(from, bounds.to - span));
      span = Math.min(span, bounds.to - from);
      return { from, to: from + span };
    },
    [bounds],
  );

  const drawRef = useRef<() => void>(() => {});
  const frame = useRef(0);
  const requestDraw = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      drawRef.current();
    });
  }, []);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  // The atom follows the view after it settles: a pan does not re-render React
  // per frame; the readout, the window label and the per-pane memory catch up.
  const [shownWindow, setShownWindow] = useState(viewRef.current);
  const commitTimer = useRef(0);
  const setView = useCallback(
    (v: { from: number; to: number }) => {
      viewRef.current = clampView(v);
      requestDraw();
      window.clearTimeout(commitTimer.current);
      commitTimer.current = window.setTimeout(() => {
        setShownWindow(viewRef.current);
        setWindowState(viewRef.current);
      }, 120);
    },
    [clampView, requestDraw, setWindowState],
  );
  useEffect(() => () => window.clearTimeout(commitTimer.current), []);
  // From outside (the Overview's teaser, a collection switch): take the atom.
  useEffect(() => {
    const next = windowState ?? SYNC_DEFAULT_WINDOW;
    const cur = viewRef.current;
    if (Math.abs(next.from - cur.from) > 0.01 || Math.abs(next.to - cur.to) > 0.01) {
      viewRef.current = clampView(next);
      setShownWindow(viewRef.current);
      requestDraw();
    }
  }, [windowState, clampView, requestDraw]);

  const anim = useRef(0);
  const animateTo = useCallback(
    (target: { from: number; to: number }) => {
      cancelAnimationFrame(anim.current);
      const goal = clampView(target);
      if (reducedMotion()) return setView(goal);
      const start = { ...viewRef.current };
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / 220);
        const k = ease(p);
        setView({ from: start.from + (goal.from - start.from) * k, to: start.to + (goal.to - start.to) * k });
        if (p < 1) anim.current = requestAnimationFrame(step);
      };
      anim.current = requestAnimationFrame(step);
    },
    [clampView, setView],
  );
  useEffect(() => () => cancelAnimationFrame(anim.current), []);

  const zoomAround = useCallback(
    (centre: number, factor: number) => {
      const v = viewRef.current;
      setView({ from: centre - (centre - v.from) * factor, to: centre + (v.to - centre) * factor });
    },
    [setView],
  );
  const timeAtX = useCallback(
    (clientX: number) => {
      const r = scrollerRef.current!.getBoundingClientRect();
      const v = viewRef.current;
      return v.from + ((clientX - r.left - plotX0) / plotW) * (v.to - v.from);
    },
    [plotX0, plotW],
  );

  /* ── Playhead ──────────────────────────────────────────────────────── */
  const playheadRef = useRef(playhead);
  playheadRef.current = playhead;
  const movePlayhead = useCallback(
    (t: number, keepInView = false) => {
      const next = Math.round(Math.max(bounds.from, Math.min(bounds.to, t)));
      setPlayhead(next);
      if (keepInView) {
        const v = viewRef.current;
        const margin = (v.to - v.from) * 0.05;
        if (next < v.from + margin) setView({ from: next - margin, to: next - margin + (v.to - v.from) });
        else if (next > v.to - margin) setView({ from: next + margin - (v.to - v.from), to: next + margin });
      }
    },
    [bounds, setPlayhead, setView],
  );
  useEffect(requestDraw, [playhead, selectedId, requestDraw]);

  /* ── Virtual rows ──────────────────────────────────────────────────── */
  const [range, setRange] = useState({ first: 0, last: 40 });
  const [focusIndex, setFocusIndex] = useState(-1);
  const updateRange = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const top = el.scrollTop - 240;
    const bottom = el.scrollTop + el.clientHeight + 240;
    let lo = 0;
    let hi = items.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (offsets[mid + 1] < top) lo = mid + 1;
      else hi = mid;
    }
    let last = lo;
    while (last < items.length - 1 && offsets[last + 1] < bottom) last++;
    setRange((r) => (r.first === lo && r.last === last ? r : { first: lo, last }));
  }, [items.length, offsets]);
  useLayoutEffect(updateRange, [updateRange, size.h]);

  /* ── Drawing ───────────────────────────────────────────────────────── */
  const tokens = useMemo(() => (typeof document === "undefined" ? null : readTokens()), [theme]); // eslint-disable-line react-hooks/exhaustive-deps
  const hoverRef = useRef<{ index: number; x: number } | null>(null);

  drawRef.current = () => {
    const canvas = canvasRef.current;
    const axis = axisRef.current;
    const scroller = scrollerRef.current;
    if (!canvas || !axis || !scroller || !tokens || !model || size.w === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const W = size.w;
    const H = size.h;
    for (const [c, h] of [
      [canvas, H],
      [axis, AXIS_H],
    ] as const) {
      if (c.width !== Math.round(W * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(W * dpr);
        c.height = Math.round(h * dpr);
      }
    }
    const v = viewRef.current;
    const k = plotW / (v.to - v.from);
    const x = (t: number) => plotX0 + (t - v.from) * k;
    const t = tokens;
    const scrollTop = scroller.scrollTop;
    const ph = playheadRef.current;

    /* Body */
    const g = canvas.getContext("2d")!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const hover = hoverRef.current;
    // Row grounds: the open recording, then the hovered row.
    for (let i = range.first; i <= range.last && i < items.length; i++) {
      const it = items[i];
      if (it.kind !== "lane") continue;
      const y = offsets[i] - scrollTop;
      if (y > H || y + laneH < 0) continue;
      if (it.lane.id === selectedId) {
        g.fillStyle = t.parchment;
        g.fillRect(0, y, W, laneH);
      } else if (hover?.index === i) {
        g.fillStyle = t.warm;
        g.fillRect(0, y, W, laneH);
      }
    }
    g.save();
    g.beginPath();
    g.rect(plotX0, 0, plotW, H);
    g.clip();
    // Volleys as bands, then the single shots as hairlines, under every lane.
    for (const m of model.volleys) {
      const x0 = x(m.bandFrom);
      const x1 = Math.max(x0 + 2, x(m.bandTo));
      if (x1 < plotX0 || x0 > plotX0 + plotW) continue;
      g.fillStyle = alpha(t.vellum, 0.75);
      g.fillRect(x0, 0, x1 - x0, H);
    }
    g.fillStyle = alpha(t.border, 0.9);
    for (const m of model.ticks) {
      const xx = Math.round(x(m.at)) + 0.5;
      g.fillRect(xx - 0.5, 0, 1, H);
    }
    // Lanes.
    for (let i = range.first; i <= range.last && i < items.length; i++) {
      const it = items[i];
      if (it.kind !== "lane" || it.lane.start === undefined) continue;
      const top = offsets[i] - scrollTop;
      if (top > H || top + laneH < 0) continue;
      const l = it.lane;
      const cy = stacked ? top + 34 : top + laneH / 2;
      const selected = l.id === selectedId;
      const drift = l.flags.some((f) => f.value === "drift");
      const unanchored = l.anchors.length === 0 && l.endBasis !== "clock-end";
      const base = selected ? t.carbon : drift ? t.warning : t.ink3;
      const xs = x(l.start!);
      const xe = Math.max(xs + 2, x(l.knownEnd!));
      // Known span: solid where anchors or a recorded end back it; an outline
      // where only the clock start does.
      g.fillStyle = alpha(base, selected ? 0.55 : unanchored ? 0 : 0.32);
      g.strokeStyle = alpha(base, 0.6);
      g.lineWidth = 1;
      roundRect(g, xs, cy - 3, xe - xs, 6, 3);
      g.fill();
      if (unanchored) g.stroke();
      // The tail: the recording may run on; the data does not say how long.
      if (l.endBasis !== "clock-end") {
        const grad = g.createLinearGradient(xe, 0, xe + TAIL_PX, 0);
        grad.addColorStop(0, alpha(base, selected ? 0.35 : 0.2));
        grad.addColorStop(1, alpha(base, 0));
        g.fillStyle = grad;
        g.fillRect(xe, cy - 3, TAIL_PX, 6);
      }
      // Start cap.
      g.fillStyle = selected ? t.carbon : t.ink2;
      g.fillRect(Math.round(xs) - 1, cy - 6, 2, 12);
      // Where the title alone would start it.
      if (l.titleStart !== undefined) {
        const xt = x(l.titleStart);
        g.strokeStyle = t.warning;
        g.setLineDash([2, 2]);
        g.beginPath();
        g.moveTo(xs, cy - 8.5);
        g.lineTo(xt, cy - 8.5);
        g.stroke();
        g.setLineDash([]);
        g.beginPath();
        g.arc(xt, cy - 8.5, 2.5, 0, Math.PI * 2);
        g.fillStyle = t.paper;
        g.fill();
        g.stroke();
      }
      // Anchors: a tick per anchor, an outlier tied to its consensus time.
      for (const a of l.anchors) {
        const xa = x(a.at);
        if (xa < plotX0 - 8 || xa > plotX0 + plotW + 8) continue;
        const col = markColor(t, a);
        if (a.outlier && a.residual !== undefined) {
          const xm = x(a.at - a.residual);
          g.strokeStyle = t.ink3;
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(xm, cy + 0.5);
          g.lineTo(xa, cy + 0.5);
          g.stroke();
          g.fillStyle = t.ink3;
          g.fillRect(Math.round(xm) - 0.5, cy - 3, 1, 7);
          g.beginPath();
          g.arc(xa, cy, 4, 0, Math.PI * 2);
          g.fillStyle = t.paper;
          g.fill();
          g.lineWidth = 2;
          g.strokeStyle = col;
          g.stroke();
          g.lineWidth = 1;
        } else {
          g.fillStyle = col;
          g.fillRect(Math.round(xa) - 1, cy - 6, 2, 12);
        }
      }
    }
    // The playhead, over everything.
    if (ph !== null) {
      const xp = Math.round(x(ph)) + 0.5;
      g.fillStyle = t.ink;
      g.fillRect(xp - 0.75, 0, 1.5, H);
    }
    g.restore();

    /* Axis */
    const a = axis.getContext("2d")!;
    a.setTransform(dpr, 0, 0, dpr, 0, 0);
    a.clearRect(0, 0, W, AXIS_H);
    a.save();
    a.beginPath();
    a.rect(plotX0, 0, plotW, AXIS_H);
    a.clip();
    for (const m of model.volleys) {
      const x0 = x(m.bandFrom);
      const x1 = Math.max(x0 + 2, x(m.bandTo));
      a.fillStyle = alpha(t.vellum, 0.75);
      a.fillRect(x0, 18, x1 - x0, AXIS_H - 18);
    }
    a.fillStyle = t.muted;
    for (const m of model.ticks) a.fillRect(Math.round(x(m.at)), 20, 1, AXIS_H - 20);
    // Volley numbers over their bands; one that would touch the last drawn
    // waits for a closer zoom.
    a.font = `600 11px ${t.font}`;
    a.textAlign = "center";
    a.textBaseline = "alphabetic";
    a.fillStyle = t.ink2;
    let lastRight = -Infinity;
    for (const m of model.volleys) {
      const cx = (x(m.bandFrom) + x(m.bandTo)) / 2;
      const label = String(m.number ?? "");
      const w = a.measureText(label).width;
      if (cx - w / 2 < lastRight + 4) continue;
      a.fillText(label, cx, 13);
      lastRight = cx + w / 2;
    }
    // Clock ticks.
    const span = v.to - v.from;
    const step = STEPS.find((s) => s * k >= 64) ?? STEPS[STEPS.length - 1];
    a.font = `400 11px ${t.font}`;
    a.fillStyle = t.ink3;
    a.textAlign = "left";
    const firstTick = Math.ceil(v.from / step) * step;
    for (let tt = firstTick; tt <= v.to; tt += step) {
      const xx = Math.round(x(tt)) + 0.5;
      a.fillRect(xx - 0.5, AXIS_H - 6, 1, 6);
      const label = step >= 60 ? clock(tt).slice(0, 5) : clock(tt);
      a.fillText(label, xx + 3, AXIS_H - 9);
    }
    if (span > 0 && dayOf(v.from) !== dayOf(v.to)) {
      // A window across midnight: name the second day where it starts.
      const mid = Math.ceil(v.from / 86400) * 86400;
      const xm = Math.round(x(mid)) + 0.5;
      a.fillStyle = t.ink2;
      a.fillRect(xm - 0.5, 16, 1, AXIS_H - 16);
      a.fillText(dayLabel(mid), xm + 3, 13);
    }
    if (ph !== null) {
      const xp = x(ph);
      const label = clock(ph);
      a.font = `600 11px ${t.font}`;
      const w = a.measureText(label).width + 10;
      const left = Math.max(plotX0, Math.min(plotX0 + plotW - w, xp - w / 2));
      a.fillStyle = t.ink;
      roundRect(a, left, AXIS_H - 21, w, 17, 4);
      a.fill();
      a.fillStyle = t.paper;
      a.textAlign = "center";
      a.fillText(label, left + w / 2, AXIS_H - 8.5);
      a.fillRect(Math.round(xp) - 0.75, AXIS_H - 4, 1.5, 4);
    }
    a.restore();
  };
  useLayoutEffect(() => drawRef.current());

  /* ── Pointer: pan, pinch, hover, playhead ──────────────────────────── */
  const drag = useRef<{ id: number; x: number; y: number; from: number; to: number; moved: boolean; mouse: boolean } | null>(null);
  const pinch = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ d: number; view: { from: number; to: number }; centre: number } | null>(null);
  const suppressClick = useRef(false);
  const [tip, setTip] = useState<Tip | null>(null);

  const itemAtY = useCallback(
    (clientY: number) => {
      const el = scrollerRef.current!;
      const y = clientY - el.getBoundingClientRect().top + el.scrollTop;
      let lo = 0;
      let hi = items.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (offsets[mid] <= y) lo = mid;
        else hi = mid - 1;
      }
      return y >= 0 && y < total ? lo : -1;
    },
    [items.length, offsets, total],
  );

  const tipFor = useCallback(
    (index: number, clientX: number, clientY: number): Tip | null => {
      const it = items[index];
      if (!it || it.kind !== "lane" || it.lane.start === undefined) return null;
      const r = scrollerRef.current!.getBoundingClientRect();
      const px = clientX - r.left;
      if (px < plotX0) return null;
      const v = viewRef.current;
      const k = plotW / (v.to - v.from);
      const x = (t: number) => plotX0 + (t - v.from) * k;
      const l = it.lane;
      let best: SyncAnchor | null = null;
      let bestD = 6;
      for (const a of l.anchors) {
        const d = Math.abs(x(a.at) - px);
        if (d < bestD) {
          best = a;
          bestD = d;
        }
      }
      const rowTop = offsets[index] - scrollerRef.current!.scrollTop + r.top;
      const cy = rowTop + (stacked ? 34 : laneH / 2);
      if (best) {
        const lines = [
          `${formatOffset(best.offset)} in · ${clock(best.at)}`,
          VERIFICATION_WORD[best.verification],
        ];
        if (best.residual !== undefined)
          lines.push(
            best.outlier
              ? `${offBy(best.residual)} the consensus time, ${clock(best.at - best.residual)}`
              : Math.round(best.residual) === 0
                ? "On the consensus time"
                : `${offBy(best.residual)} the consensus time`,
          );
        return { x: x(best.at) + r.left, y: cy - 10, title: best.label ? `${best.moment}: ${best.label}` : best.moment, lines };
      }
      if (l.titleStart !== undefined && Math.abs(x(l.titleStart) - px) < 6)
        return {
          x: x(l.titleStart) + r.left,
          y: cy - 14,
          title: `The title gives ${clock(l.titleStart)}`,
          lines: [`${offBy(l.titleStart - l.start!)} the start the anchors give, ${clock(l.start!)}`],
        };
      return null;
    },
    [items, offsets, plotX0, plotW, stacked, laneH],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || e.button === 0) {
      pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch.current.size === 2) {
        const [p, q] = [...pinch.current.values()];
        pinchStart.current = { d: Math.abs(p.x - q.x) || 1, view: { ...viewRef.current }, centre: timeAtX((p.x + q.x) / 2) };
        drag.current = null;
        return;
      }
      cancelAnimationFrame(anim.current);
      drag.current = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        ...viewRef.current,
        moved: false,
        mouse: e.pointerType === "mouse",
      };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (pinch.current.has(e.pointerId)) pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.size === 2 && pinchStart.current) {
      const [p, q] = [...pinch.current.values()];
      const s = pinchStart.current;
      const f = s.d / (Math.abs(p.x - q.x) || 1);
      setView({ from: s.centre - (s.centre - s.view.from) * f, to: s.centre + (s.view.to - s.centre) * f });
      suppressClick.current = true;
      return;
    }
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.abs(dx) > 4 && (d.mouse || Math.abs(dx) > Math.abs(dy))) {
        d.moved = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        setTip(null);
      }
      if (d.moved) {
        const per = (d.to - d.from) / plotW;
        setView({ from: d.from - dx * per, to: d.to - dx * per });
      }
      return;
    }
    if (e.pointerType !== "mouse") return;
    const index = itemAtY(e.clientY);
    const prev = hoverRef.current;
    hoverRef.current = index >= 0 ? { index, x: e.clientX } : null;
    if (prev?.index !== hoverRef.current?.index) requestDraw();
    setTip(index >= 0 ? tipFor(index, e.clientX, e.clientY) : null);
  };
  const endPointer = (e: React.PointerEvent) => {
    pinch.current.delete(e.pointerId);
    if (pinch.current.size < 2) pinchStart.current = null;
    const d = drag.current;
    if (d && d.id === e.pointerId) {
      if (d.moved) {
        suppressClick.current = true;
        window.setTimeout(() => (suppressClick.current = false), 0);
      }
      drag.current = null;
    }
  };
  const onPointerLeave = () => {
    if (hoverRef.current) {
      hoverRef.current = null;
      requestDraw();
    }
    setTip(null);
  };

  // Wheel: ⌘/Ctrl + wheel and a trackpad pinch zoom around the pointer; a
  // sideways swipe or Shift + wheel pans; a plain wheel scrolls the lanes.
  // On the clock itself a plain wheel zooms. Native, for `passive: false`.
  useEffect(() => {
    const body = scrollerRef.current;
    const axis = axisRef.current?.parentElement;
    if (!body || !axis) return;
    const zoom = (e: WheelEvent) => {
      e.preventDefault();
      cancelAnimationFrame(anim.current);
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAround(timeAtX(e.clientX), Math.exp(dy * 0.0025));
    };
    const pan = (e: WheelEvent) => {
      e.preventDefault();
      cancelAnimationFrame(anim.current);
      const delta = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
      const v = viewRef.current;
      const per = (v.to - v.from) / plotW;
      setView({ from: v.from + delta * per, to: v.to + delta * per });
    };
    const onBody = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) zoom(e);
      else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) pan(e);
    };
    const onAxis = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) pan(e);
      else zoom(e);
    };
    body.addEventListener("wheel", onBody, { passive: false });
    axis.addEventListener("wheel", onAxis, { passive: false });
    return () => {
      body.removeEventListener("wheel", onBody);
      axis.removeEventListener("wheel", onAxis);
    };
  }, [zoomAround, timeAtX, setView, plotW]);

  // The clock: a press sets the playhead, a drag scrubs it.
  const scrubbing = useRef<number | null>(null);
  const [axisTip, setAxisTip] = useState<Tip | null>(null);
  const axisTipAt = (clientX: number): Tip | null => {
    if (!model) return null;
    const r = axisRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    const k = plotW / (v.to - v.from);
    const x = (t: number) => plotX0 + (t - v.from) * k + r.left;
    const tick = model.ticks.find((m) => Math.abs(x(m.at) - clientX) < 4);
    const volley = tick ? undefined : model.volleys.find((m) => clientX >= x(m.bandFrom) - 4 && clientX <= Math.max(x(m.bandFrom) + 2, x(m.bandTo)) + 4);
    const m: SyncMoment | undefined = tick ?? volley;
    if (!m) return null;
    const lines = [`${clock(m.at)}, consensus of ${m.anchorCount.toLocaleString()} ${m.anchorCount === 1 ? "anchor" : "anchors"}`];
    if (volley) lines.push(`Band: anchors within ${OUTLIER_SECONDS} s, ${clock(m.bandFrom)}–${clock(m.bandTo - 1)}`);
    return { x: x(m.at), y: r.bottom + 6, title: m.label, lines };
  };

  /* ── Lane activation ───────────────────────────────────────────────── */
  const onLaneClick = (lane: SyncLane, e: ReactMouseEvent) => {
    if (suppressClick.current) return;
    onSelect(lane.id, e);
    // A pointer click sets the playhead where it landed; Space does not.
    if (e.detail > 0) {
      const r = scrollerRef.current!.getBoundingClientRect();
      if (e.clientX - r.left >= plotX0) movePlayhead(timeAtX(e.clientX));
    }
  };

  const [pending, setPending] = useState<Pending | null>(null);
  const open = useCallback(
    (lane: SyncLane, link: SyncLink, offset: number) => {
      if (!noticeSeen) return setPending({ lane, link, offset });
      window.open(link.url, "_blank", "noopener,noreferrer");
    },
    [noticeSeen],
  );
  const openLaneAtPlayhead = (lane: SyncLane) => {
    const offset = lane.start !== undefined && playhead !== null ? Math.max(0, playhead - lane.start) : 0;
    const link = syncLinkAt(lane, offset);
    if (link) open(lane, link, offset);
  };

  /* ── Keyboard ──────────────────────────────────────────────────────── */
  const focusItem = (i: number) => {
    const el = scrollerRef.current;
    if (!el || i < 0 || i >= items.length) return;
    const top = offsets[i];
    const h = offsets[i + 1] - top;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + h > el.scrollTop + el.clientHeight) el.scrollTop = top + h - el.clientHeight;
    setFocusIndex(i);
    pendingFocus.current = i;
  };
  const pendingFocus = useRef<number | null>(null);
  useLayoutEffect(() => {
    const i = pendingFocus.current;
    if (i === null) return;
    const btn = scrollerRef.current?.querySelector<HTMLButtonElement>(`[data-index="${i}"] [data-part="target"]`);
    if (btn) {
      pendingFocus.current = null;
      btn.focus({ preventScroll: true });
    }
  });
  const onListKey = (e: ReactKeyboardEvent) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>("[data-index]");
    const i = li ? Number(li.dataset.index) : focusIndex;
    const it = items[i];
    switch (e.key) {
      case "ArrowLeft":
      case "ArrowRight": {
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const v = viewRef.current;
        const from = playhead ?? Math.round((v.from + v.to) / 2);
        movePlayhead(playhead === null ? from : from + dir * (e.shiftKey ? 10 : 1), true);
        break;
      }
      case "ArrowDown":
      case "ArrowUp":
        e.preventDefault();
        focusItem(Math.max(0, Math.min(items.length - 1, i + (e.key === "ArrowDown" ? 1 : -1))));
        break;
      case "Home":
      case "End":
        e.preventDefault();
        focusItem(e.key === "Home" ? 0 : items.length - 1);
        break;
      case "Enter":
        if (it?.kind === "lane") {
          e.preventDefault();
          openLaneAtPlayhead(it.lane);
        }
        break;
      case "+":
      case "=":
      case "-": {
        e.preventDefault();
        const v = viewRef.current;
        animateTo(zoomed(v, playhead, e.key === "-" ? 2 : 0.5));
        break;
      }
    }
  };

  /* ── Readout ───────────────────────────────────────────────────────── */
  const readout = useMemo(() => {
    if (playhead === null) return null;
    const running: SyncLane[] = [];
    const after: SyncLane[] = [];
    for (const l of shownLanes) {
      if (l.start === undefined || l.start > playhead) continue;
      if (playhead <= l.knownEnd!) running.push(l);
      else if (l.endBasis !== "clock-end") after.push(l);
    }
    return { running, after };
  }, [playhead, shownLanes]);

  const goTo = (value: string) => {
    const m = model?.volleys.find((x) => x.id === value);
    if (!m) return;
    movePlayhead(m.at);
    const v = viewRef.current;
    const span = v.to - v.from;
    if (m.at < v.from || m.at > v.to) animateTo({ from: m.at - span / 2, to: m.at + span / 2 });
  };

  if (!model) return null;

  const rendered: number[] = [];
  for (let i = range.first; i <= range.last && i < items.length; i++) rendered.push(i);
  if (focusIndex >= 0 && focusIndex < items.length && (focusIndex < range.first || focusIndex > range.last)) rendered.push(focusIndex);
  // The roving tab stop: the focused row, else the open recording, else the first lane.
  const firstLane = items.findIndex((it) => it.kind === "lane");
  const selectedIndex = items.findIndex((it) => it.kind === "lane" && it.lane.id === selectedId);
  const tabIndexAt = focusIndex >= 0 && focusIndex < items.length ? focusIndex : selectedIndex >= 0 ? selectedIndex : Math.max(0, firstLane);
  const windowLabel =
    dayOf(shownWindow.from) === dayOf(shownWindow.to)
      ? `${clock(shownWindow.from)} – ${clock(shownWindow.to)}`
      : `${dayLabel(shownWindow.from)} ${clock(shownWindow.from)} – ${dayLabel(shownWindow.to)} ${clock(shownWindow.to)}`;
  const span = shownWindow.to - shownWindow.from;
  const presetOn = (id: string) =>
    id === "shooting"
      ? Math.abs(shownWindow.from - SYNC_DEFAULT_WINDOW.from) < 1 && Math.abs(shownWindow.to - SYNC_DEFAULT_WINDOW.to) < 1
      : id === "whole"
        ? Math.abs(span - (bounds.to - bounds.from)) < 1
        : Math.abs(span - (id === "1m" ? 60 : 300)) < 0.5;
  const choosePreset = (id: (typeof PRESETS)[number]["id"]) => {
    const v = viewRef.current;
    if (id === "shooting") return animateTo(SYNC_DEFAULT_WINDOW);
    if (id === "whole") return animateTo(bounds);
    const s = id === "1m" ? 60 : 300;
    const c = playhead !== null && playhead >= v.from && playhead <= v.to ? playhead : (v.from + v.to) / 2;
    animateTo({ from: c - s / 2, to: c + s / 2 });
  };

  return (
    <div ref={rootRef} data-component="LibrarySyncView" className="h-full flex flex-col gap-2 min-h-0">
      {/* ── Window and controls ── */}
      <div data-part="toolbar" className="flex flex-wrap items-center gap-x-3 gap-y-2 min-h-8">
        <div className="min-w-0 flex items-baseline gap-2 me-auto">
          <span className="text-sm font-semibold text-ink tabular-nums whitespace-nowrap" dir="ltr">
            {windowLabel}
          </span>
          <span className="text-xs text-ink-tertiary whitespace-nowrap">Las Vegas time, {VEGAS_UTC_OFFSET}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value=""
            options={[
              { value: "", label: "Go to volley" },
              ...model.volleys.map((m) => ({ value: m.id, label: `${m.label} · ${clock(m.at)}` })),
            ]}
            onChange={goTo}
            ariaLabel="Go to volley"
          />
          <div role="group" aria-label="Window" className="flex items-center gap-0.5 rounded-lg bg-paper p-0.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={presetOn(p.id)}
                onClick={() => choosePreset(p.id)}
                className={`h-7 px-2 rounded-md text-xs whitespace-nowrap cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40 ${
                  presetOn(p.id) ? "bg-parchment text-ink font-medium" : BAR_GHOST
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div role="group" aria-label="Zoom" className="flex items-center gap-0.5 rounded-lg bg-paper p-0.5">
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => animateTo(zoomed(viewRef.current, playhead, 2))}
              className={`h-7 w-7 grid place-items-center rounded-md cursor-pointer transition-colors ${BAR_GHOST} focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40`}
            >
              <Minus size={14} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => animateTo(zoomed(viewRef.current, playhead, 0.5))}
              className={`h-7 w-7 grid place-items-center rounded-md cursor-pointer transition-colors ${BAR_GHOST} focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40`}
            >
              <Plus size={14} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {/* ── Clock and lanes ── */}
      <div data-part="plot" className="relative flex-1 min-h-0 flex flex-col rounded-lg bg-paper overflow-hidden">
        <div
          data-part="clock"
          className="relative shrink-0 cursor-col-resize select-none border-b border-border"
          style={{ height: AXIS_H, touchAction: "pan-y" }}
          onPointerDown={(e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            const r = axisRef.current!.getBoundingClientRect();
            if (e.clientX - r.left < plotX0) return;
            scrubbing.current = e.pointerId;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            movePlayhead(timeAtX(e.clientX));
          }}
          onPointerMove={(e) => {
            if (scrubbing.current === e.pointerId) movePlayhead(timeAtX(e.clientX));
            else if (e.pointerType === "mouse") setAxisTip(axisTipAt(e.clientX));
          }}
          onPointerUp={() => (scrubbing.current = null)}
          onPointerCancel={() => (scrubbing.current = null)}
          onPointerLeave={() => setAxisTip(null)}
        >
          {!stacked && (
            <span className="absolute start-3 bottom-2 text-meta font-semibold uppercase tracking-wider text-ink-tertiary">
              Recording
            </span>
          )}
          <canvas ref={axisRef} aria-hidden className="absolute inset-0 w-full h-full" />
        </div>
        <div
          ref={scrollerRef}
          data-part="lanes"
          className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain"
          style={{ touchAction: "pan-y" }}
          onScroll={() => {
            // Synchronously, so the sticky canvas and the rows move in one frame.
            drawRef.current();
            updateRange();
            setTip(null);
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onPointerLeave={onPointerLeave}
        >
          <div className="relative" style={{ height: Math.max(total, size.h) }}>
            <canvas
              ref={canvasRef}
              aria-hidden
              className="sticky top-0 block pointer-events-none"
              style={{ width: "100%", height: size.h }}
            />
            {items.length === 0 ? (
              <p className="absolute inset-x-0 top-12 text-center text-sm font-medium text-ink-secondary">
                No recordings match your filters.
              </p>
            ) : (
              <ul role="list" aria-label="Recordings on the clock" className="absolute inset-0" onKeyDown={onListKey}>
                {rendered.map((i) => {
                  const it = items[i];
                  const top = offsets[i];
                  if (it.kind === "group")
                    return (
                      <li key={`g:${it.id}`} data-index={i} className="absolute inset-x-0" style={{ top, height: GROUP_H }}>
                        <button
                          type="button"
                          data-part="target"
                          tabIndex={i === tabIndexAt ? 0 : -1}
                          aria-expanded={!it.folded}
                          onFocus={() => setFocusIndex(i)}
                          onClick={() => setFolded((f) => ({ ...f, [it.id]: !it.folded }))}
                          className="w-full h-full flex items-center gap-1.5 px-3 text-start cursor-pointer hover:bg-warm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-carbon/40"
                        >
                          <ChevronRight
                            size={13}
                            aria-hidden
                            className={`shrink-0 text-ink-muted transition-transform motion-reduce:transition-none ${it.folded ? "" : "rotate-90 rtl:-rotate-90"}`}
                          />
                          <span className="text-meta font-semibold uppercase tracking-wider text-ink-tertiary">{it.label}</span>
                          <span className="text-xs text-ink-tertiary tabular-nums">{it.count.toLocaleString()}</span>
                          {it.clocked < it.count && (
                            <span className="text-xs text-ink-tertiary truncate">
                              · {it.clocked === 0 ? "no clock times" : `${(it.count - it.clocked).toLocaleString()} without a clock time`}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  const l = it.lane;
                  const notes = laneNotes(l);
                  const startLabel =
                    l.start === undefined ? "No clock time" : l.precision === "minute" ? `${clock(l.start).slice(0, 5)} (to the minute)` : clock(l.start);
                  return (
                    <li
                      key={l.id}
                      data-index={i}
                      aria-setsize={shownLanes.length}
                      aria-posinset={it.pos}
                      className="absolute inset-x-0"
                      style={{ top, height: laneH }}
                    >
                      <button
                        type="button"
                        data-part="target"
                        tabIndex={i === tabIndexAt ? 0 : -1}
                        aria-pressed={l.id === selectedId}
                        aria-label={laneAriaLabel(l)}
                        onFocus={() => setFocusIndex(i)}
                        onClick={(e) => onLaneClick(l, e)}
                        className="absolute inset-0 w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-carbon/40"
                      />
                      <div
                        aria-hidden
                        className={`relative pointer-events-none flex ${
                          stacked ? "flex-row items-baseline gap-2 px-0.5 pt-1" : "flex-col justify-center h-full px-3"
                        }`}
                        style={stacked ? undefined : { width: LABEL_W }}
                      >
                        <span className={`text-xs font-medium truncate ${l.id === selectedId ? "text-ink" : "text-ink"} ${stacked ? "min-w-0 flex-1" : ""}`} title={l.name}>
                          {l.name}
                        </span>
                        <span className="text-meta text-ink-tertiary tabular-nums truncate shrink-0" dir="ltr">
                          {startLabel}
                          {l.start !== undefined && !stacked && ` · ${anchorsWord(l.anchors.length)}`}
                          {notes.map((n) => (
                            <span key={n.text} className={n.warn ? "text-warning-label" : undefined}>
                              {` · ${n.text}`}
                            </span>
                          ))}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        {(tip ?? axisTip) && <SyncTip tip={(tip ?? axisTip)!} />}
      </div>

      {/* ── Playhead readout ── */}
      <section
        data-part="readout"
        aria-label="At the playhead"
        className={`@container shrink-0 flex flex-col rounded-lg bg-paper h-[min(13rem,30%)] min-h-[7.5rem]`}
      >
        <div className="shrink-0 flex items-baseline gap-2 h-10 px-3 pt-3" role="status" aria-live="polite">
          {readout && playhead !== null ? (
            <>
              <span className="text-sm font-semibold text-ink tabular-nums" dir="ltr">
                {clock(playhead)}
              </span>
              <span className="text-xs text-ink-tertiary truncate">
                {readout.running.length === 0
                  ? "No recording is known to run at this instant"
                  : `${readout.running.length.toLocaleString()} ${readout.running.length === 1 ? "recording runs" : "recordings run"} at this instant`}
              </span>
            </>
          ) : (
            <span className="text-xs text-ink-tertiary">
              Click the clock or a lane to set the playhead. Arrow keys move it by a second, Shift by ten.
            </span>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-2">
          {readout && playhead !== null && (
            <>
              <ReadoutList lanes={readout.running} playhead={playhead} selectedId={selectedId} onSelect={onSelect} onOpen={open} />
              {readout.after.length > 0 && (
                <details className="group mt-1">
                  <summary className="h-7 flex items-center gap-1.5 text-xs text-ink-secondary cursor-pointer list-none rounded-md hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40">
                    <ChevronRight size={13} aria-hidden className="text-ink-muted transition-transform motion-reduce:transition-none group-open:rotate-90" />
                    {readout.after.length.toLocaleString()} started earlier and may still run: their length is not in the data
                  </summary>
                  <ReadoutList lanes={readout.after} playhead={playhead} selectedId={selectedId} onSelect={onSelect} onOpen={open} />
                </details>
              )}
            </>
          )}
        </div>
      </section>

      {pending && (
        <Modal
          component="SyncOpenNotice"
          size="sm"
          title="Before you open a recording"
          onClose={() => setPending(null)}
          footer={
            <>
              <button type="button" onClick={() => setPending(null)} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
                Cancel
              </button>
              <button
                type="button"
                data-part="confirm"
                className={MODAL_COMMIT}
                onClick={() => {
                  setNoticeSeen(true);
                  window.open(pending.link.url, "_blank", "noopener,noreferrer");
                  setPending(null);
                }}
              >
                Open recording
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-2 text-sm text-ink-secondary leading-relaxed">
            <p>
              <span className="font-medium text-ink">{pending.lane.name}</span> is marked{" "}
              {pending.lane.warning === "graphic" ? "graphic: it may show violence or injury." : "distressing: it may be upsetting."}{" "}
              Every recording in this collection carries a warning like this.
            </p>
            <p>
              It opens on its host, in a new tab
              {pending.link.seeks
                ? `, ${formatOffset(pending.offset)} in.`
                : `, at its start; this host cannot open at a time, so go to ${formatOffset(pending.offset)}.`}{" "}
              Nothing is downloaded or stored here.
            </p>
            <p className="text-xs text-ink-tertiary">You are asked once per session.</p>
          </div>
        </Modal>
      )}
    </div>
  );
});

/** `v` zoomed by `factor` around the playhead when it is in view, else the centre. */
function zoomed(v: { from: number; to: number }, playhead: number | null, factor: number) {
  const c = playhead !== null && playhead >= v.from && playhead <= v.to ? playhead : (v.from + v.to) / 2;
  return { from: c - (c - v.from) * factor, to: c + (v.to - c) * factor };
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.arcTo(x + w, y, x + w, y + h, rr);
  g.arcTo(x + w, y + h, x, y + h, rr);
  g.arcTo(x, y + h, x, y, rr);
  g.arcTo(x, y, x + w, y, rr);
  g.closePath();
}

/** A mark's or a moment's tooltip: anchored to what it describes, above it,
 *  else below; never to the pointer. Fixed, so it is not clipped by the plot. */
function SyncTip({ tip }: { tip: Tip }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, tip.x - w / 2));
    const above = tip.y - h - 6;
    el.style.left = `${left}px`;
    el.style.top = `${above >= 8 ? above : tip.y + 22}px`;
    el.style.visibility = "visible";
  }, [tip]);
  return (
    <div
      ref={ref}
      role="tooltip"
      data-part="tooltip"
      className="pointer-events-none fixed z-30 w-max max-w-[20rem] px-2.5 py-1.5 rounded-lg bg-vellum"
      style={{ left: 0, top: 0, visibility: "hidden" }}
    >
      <p className="text-xs font-medium text-ink">{tip.title}</p>
      {tip.lines.map((l) => (
        <p key={l} className="text-meta text-ink-secondary tabular-nums">
          {l}
        </p>
      ))}
    </div>
  );
}

/** The recordings at the playhead, each a link that opens it there. */
function ReadoutList({
  lanes,
  playhead,
  selectedId,
  onSelect,
  onOpen,
}: {
  lanes: SyncLane[];
  playhead: number;
  selectedId: string | null;
  onSelect: OnSelect;
  onOpen: (lane: SyncLane, link: SyncLink, offset: number) => void;
}) {
  const seen = useAtomValue(syncOpenNoticeSeenAtom);
  return (
    <ul className="flex flex-col">
      {lanes.map((l) => {
        const offset = Math.max(0, playhead - l.start!);
        const link = syncLinkAt(l, offset);
        return (
          <li
            key={l.id}
            className={`group flex items-center gap-3 h-8 px-1 -mx-1 rounded-md ${l.id === selectedId ? "bg-parchment" : "hover:bg-warm"}`}
          >
            <button
              type="button"
              onClick={(e) => onSelect(l.id, e)}
              aria-pressed={l.id === selectedId}
              className="min-w-0 flex-1 text-start text-xs font-medium text-ink truncate cursor-pointer rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
              title={l.name}
            >
              {l.name}
            </button>
            <span className="hidden @md:inline text-meta text-ink-tertiary whitespace-nowrap">{l.kindLabel}</span>
            <span className="text-xs text-ink-tertiary tabular-nums whitespace-nowrap" dir="ltr">
              {formatOffset(offset)} in
            </span>
            <span className="w-fit px-1.5 py-px rounded-md bg-warm text-meta font-medium text-ink-secondary whitespace-nowrap">
              {l.warning === "graphic" ? "Graphic" : "Distressing"}
            </span>
            {link ? (
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  if (seen) return;
                  e.preventDefault();
                  onOpen(l, link, offset);
                }}
                title={link.seeks ? undefined : `Opens at the start; this host cannot open at a time. Go to ${formatOffset(offset)}.`}
                aria-label={`Open ${l.name} ${link.seeks ? `at ${formatOffset(offset)}` : "at its start"}, in a new tab`}
                className="shrink-0 inline-flex items-center gap-1 h-7 px-2 rounded-md text-xs text-ink-secondary hover:bg-paper hover:text-ink transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
              >
                {link.seeks ? `Open at ${formatOffset(offset)}` : "Open"}
                <ExternalLink size={12} aria-hidden className="text-ink-muted" />
              </a>
            ) : (
              <span className="shrink-0 text-xs text-ink-tertiary">No link</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
