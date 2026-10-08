import { useCallback, useEffect, useRef, useState } from "react";
import type { NetworkGraph } from "../../data/network/graph";
import type { NetworkPlacement } from "../../data/network/layout";

const H_DEFAULT = 240;
const PAD = 12;

/** The Overview's network picture, when Settings › Collection makes it the
 *  hero visual: every record at its stored Network position, edges as faint
 *  hairlines, dots in their template's colour. Not interactive beyond one
 *  button: the drawing opens the Network view. */
export function OverviewNetwork({
  graph,
  placement,
  colorOf,
  label,
  onOpen,
  height = H_DEFAULT,
}: {
  graph: NetworkGraph;
  placement: NetworkPlacement;
  colorOf: (typeId: string) => string;
  label: string;
  onOpen: () => void;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [w, setW] = useState(0);
  const ro = useRef<ResizeObserver | null>(null);
  const measure = useCallback((el: HTMLDivElement | null) => {
    ro.current?.disconnect();
    ro.current = null;
    if (!el) return;
    setW(el.clientWidth);
    ro.current = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.current.observe(el);
  }, []);
  // Colours are re-read when the theme changes (`:root.dark`).
  const [theme, setTheme] = useState(0);
  useEffect(() => {
    const mo = new MutationObserver(() => setTheme((n) => n + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !w) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, height);
    const { pos } = placement;
    const { minX, maxX, minY, maxY } = placement.extent;
    const k = Math.min((w - PAD * 2) / Math.max(1, maxX - minX), (height - PAD * 2) / Math.max(1, maxY - minY));
    const ox = (w - (maxX - minX) * k) / 2 - minX * k;
    const oy = (height - (maxY - minY) * k) / 2 - minY * k;
    const x = (i: number) => pos[i * 2] * k + ox;
    const y = (i: number) => pos[i * 2 + 1] * k + oy;

    const probe = document.createElement("span");
    probe.style.display = "none";
    probe.style.color = "var(--text-tertiary)";
    canvas.parentElement!.appendChild(probe);
    const edge = getComputedStyle(probe).color;
    probe.remove();

    ctx.strokeStyle = edge;
    // Fainter as edges multiply, so CEJIL's 16,000 do not fill the drawing.
    ctx.globalAlpha = Math.min(0.2, Math.max(0.04, 600 / Math.max(1, graph.a.length)));
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let e = 0; e < graph.a.length; e++) {
      ctx.moveTo(x(graph.a[e]), y(graph.a[e]));
      ctx.lineTo(x(graph.b[e]), y(graph.b[e]));
    }
    ctx.stroke();

    // One path per template.
    const byType = new Map<string, number[]>();
    for (let i = 0; i < graph.ids.length; i++) {
      const list = byType.get(graph.typeIds[i]);
      if (list) list.push(i);
      else byType.set(graph.typeIds[i], [i]);
    }
    ctx.globalAlpha = 0.85;
    const r = graph.ids.length > 2000 ? 1.1 : 1.6;
    for (const [typeId, nodes] of byType) {
      ctx.fillStyle = colorOf(typeId);
      ctx.beginPath();
      for (const i of nodes) {
        ctx.moveTo(x(i) + r, y(i));
        ctx.arc(x(i), y(i), r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, [graph, placement, colorOf, w, height, theme]);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={label}
      className="group w-full block rounded-md p-2 -m-2 cursor-pointer hover:bg-warm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
    >
      <div ref={measure} className="w-full" style={{ height }}>
        <canvas ref={canvasRef} aria-hidden className="block w-full" style={{ height }} />
      </div>
    </button>
  );
}
