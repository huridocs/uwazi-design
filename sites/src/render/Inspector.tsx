/* The preview's box inspector. Hold Alt (Option) over a block, or with a
 * block's Style button focused, and its spacing is drawn the way browser dev
 * tools draw it: the section's padding in green, the gaps between its items
 * in purple, each with its size in pixels. Preview only; nothing here reaches
 * the public site. Positions are read from the live layout, so it is right at
 * any preview width and in either direction. */
import { useEffect, useState } from "react";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "pad" | "gap";
  label?: string;
}

const PAD_FILL = "rgb(147 196 125 / 0.45)";
const GAP_FILL = "rgb(180 140 230 / 0.45)";

function measure(block: HTMLElement): Box[] {
  const out: Box[] = [];
  const section = block.querySelector<HTMLElement>("section") ?? block;
  const r = section.getBoundingClientRect();
  const cs = getComputedStyle(section);
  const pt = parseFloat(cs.paddingTop), pb = parseFloat(cs.paddingBottom), pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight);
  if (pt) out.push({ x: r.left, y: r.top, w: r.width, h: pt, kind: "pad", label: `${Math.round(pt)}` });
  if (pb) out.push({ x: r.left, y: r.bottom - pb, w: r.width, h: pb, kind: "pad", label: `${Math.round(pb)}` });
  if (pl) out.push({ x: r.left, y: r.top + pt, w: pl, h: r.height - pt - pb, kind: "pad" });
  if (pr) out.push({ x: r.right - pr, y: r.top + pt, w: pr, h: r.height - pt - pb, kind: "pad" });

  // Gaps: between neighbours on a row, and between rows across the grid.
  for (const grid of block.querySelectorAll<HTMLElement>(".blk-grid")) {
    const kids = [...grid.children].map((c) => c.getBoundingClientRect()).filter((k) => k.width && k.height);
    if (kids.length < 2) continue;
    const g = grid.getBoundingClientRect();
    const rows: DOMRect[][] = [];
    for (const k of kids) {
      const row = rows.find((rw) => Math.abs(rw[0].top - k.top) < 2);
      if (row) row.push(k);
      else rows.push([k]);
    }
    let labelled = false;
    for (const row of rows) {
      const sorted = [...row].sort((a, b) => a.left - b.left);
      for (let i = 1; i < sorted.length; i++) {
        const a = sorted[i - 1], b = sorted[i];
        const w = b.left - a.right;
        if (w > 0.5) {
          out.push({ x: a.right, y: Math.min(a.top, b.top), w, h: Math.max(a.bottom, b.bottom) - Math.min(a.top, b.top), kind: "gap", label: labelled ? undefined : `${Math.round(w)}` });
          labelled = true;
        }
      }
    }
    for (let i = 1; i < rows.length; i++) {
      const top = Math.min(...rows[i].map((k) => k.top));
      const bottom = Math.max(...rows[i - 1].map((k) => k.bottom));
      if (top - bottom > 0.5) out.push({ x: g.left, y: bottom, w: g.width, h: top - bottom, kind: "gap", label: i === 1 ? `${Math.round(top - bottom)}` : undefined });
    }
  }
  return out;
}

export function Inspector() {
  const [alt, setAlt] = useState(false);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [boxes, setBoxes] = useState<Box[]>([]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => setAlt(e.altKey);
    const move = (e: PointerEvent) => {
      setAlt(e.altKey);
      setTarget((e.target as HTMLElement | null)?.closest<HTMLElement>("[data-block-id]") ?? null);
    };
    // A focused Style button inspects its block, for keyboard use.
    const focus = () => {
      const f = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>("[data-block-id]");
      if (f) setTarget(f);
    };
    const blur = () => setAlt(false);
    window.addEventListener("keydown", key);
    window.addEventListener("keyup", key);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("focusin", focus);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("keyup", key);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("focusin", focus);
      window.removeEventListener("blur", blur);
    };
  }, []);

  useEffect(() => {
    if (!alt || !target) return setBoxes([]);
    const update = () => setBoxes(measure(target));
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [alt, target]);

  if (!boxes.length) return null;
  return (
    <div aria-hidden data-part="inspector" className="fixed inset-0 z-50 pointer-events-none" dir="ltr">
      {boxes.map((b, i) => (
        <div key={i} className="absolute grid place-items-center" style={{ left: b.x, top: b.y, width: b.w, height: b.h, background: b.kind === "pad" ? PAD_FILL : GAP_FILL }}>
          {b.label && b.h >= 12 ? <span className="rounded-sm bg-black/75 px-1 text-[10px] leading-4 font-medium text-white tabular-nums">{b.label}</span> : null}
        </div>
      ))}
    </div>
  );
}
