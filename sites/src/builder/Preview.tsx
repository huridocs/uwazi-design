/* The live preview: the real renderer (site.html?preview=1) in a frame, fed
 * the draft over postMessage. Desktop fills the canvas; tablet and phone are
 * drawn at their real CSS widths and scaled down only if the canvas is
 * narrower. */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { SiteConfig } from "../model/config";
import type { Route } from "../render/context";
import { isFromFrame, type ToFrame } from "../lib/protocol";

export type Device = "desktop" | "tablet" | "phone";
const SIZE: Record<Exclude<Device, "desktop">, { w: number; h: number }> = {
  tablet: { w: 834, h: 1112 },
  // iPhone 15: 390 × 844 CSS px, of which the status bar takes 47.
  phone: { w: 390, h: 844 },
};

export function Preview({
  config,
  route,
  selected,
  device,
  onSelect,
  onNavigate,
}: {
  config: SiteConfig;
  route: Route;
  selected?: string;
  device: Device;
  onSelect: (id: string) => void;
  onNavigate: (r: Route) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const handlers = useRef({ onSelect, onNavigate });
  handlers.current = { onSelect, onNavigate };

  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow || !isFromFrame(e.data)) return;
      if (e.data.type === "sites:ready") setReady(true);
      if (e.data.type === "sites:select") handlers.current.onSelect(e.data.id);
      if (e.data.type === "sites:navigate") handlers.current.onNavigate(e.data.route);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);

  // A short debounce: typing re-renders the frame at most every 120ms.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      const msg: ToFrame = { type: "sites:config", config, route, selected };
      frame.current?.contentWindow?.postMessage(msg, location.origin);
    }, 120);
    return () => clearTimeout(t);
  }, [ready, config, route, selected]);

  // Switching device mounts a new frame; wait for it to say it's ready.
  useLayoutEffect(() => setReady(false), [device]);

  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, [device]);

  const src = `${import.meta.env.BASE_URL}site.html?preview=1`;
  const iframe = (
    <iframe
      ref={frame}
      src={src}
      title="Site preview"
      className="block w-full h-full bg-paper"
    />
  );

  if (device === "desktop")
    return (
      <div ref={canvas} className="relative h-full w-full p-3 sm:p-4">
        <div className="h-full w-full rounded-lg overflow-hidden shadow-[var(--shadow-lg)] ring-1 ring-border">
          <div aria-hidden className="h-7 flex items-center gap-1.5 px-3 bg-warm border-b border-border">
            <span className="w-2 h-2 rounded-full bg-border-soft" />
            <span className="w-2 h-2 rounded-full bg-border-soft" />
            <span className="w-2 h-2 rounded-full bg-border-soft" />
          </div>
          <div className="h-[calc(100%-1.75rem)]">{iframe}</div>
        </div>
        {!ready ? <Loading /> : null}
      </div>
    );

  const d = SIZE[device];
  const bezel = device === "phone" ? 14 : 18;
  const outerW = d.w + bezel * 2;
  const outerH = d.h + bezel * 2;
  // Room for the size caption under the device.
  const scale = box.w && box.h ? Math.min(1, (box.w - 32) / outerW, (box.h - 56) / outerH) : 1;
  return (
    <div ref={canvas} className="relative h-full w-full overflow-hidden grid place-items-center pb-6">
      <div style={{ width: outerW * scale, height: outerH * scale }}>
        <div
          style={{ width: outerW, height: outerH, transform: `scale(${scale})`, transformOrigin: "top left", padding: bezel, borderRadius: device === "phone" ? 58 : 36 }}
          className="relative bg-[#1c1c1e] shadow-[var(--shadow-xl)]"
        >
          <div className="relative w-full h-full overflow-hidden bg-paper flex flex-col" style={{ borderRadius: device === "phone" ? 44 : 20 }}>
            {/* The status bar is not page: on a phone the site starts below it. */}
            {device === "phone" ? (
              <div aria-hidden className="shrink-0 h-[47px] relative flex items-center justify-between px-8 text-[15px] font-semibold text-ink bg-paper">
                <span>9:41</span>
                <span className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[7.5rem] h-[2.1rem] rounded-full bg-black" />
                <span className="flex items-center gap-1">
                  <span className="w-4 h-2.5 rounded-[2px] border border-ink/70" />
                </span>
              </div>
            ) : null}
            <div className="flex-1 min-h-0">{iframe}</div>
          </div>
        </div>
      </div>
      <p className="absolute bottom-2 inset-x-0 text-center text-[0.6875rem] text-ink-muted tabular-nums">
        {d.w} × {d.h}
        {scale < 1 ? ` · shown at ${Math.round(scale * 100)}%` : ""}
      </p>
      {!ready ? <Loading /> : null}
    </div>
  );
}

function Loading() {
  return (
    <div role="status" className="absolute inset-0 grid place-items-center pointer-events-none">
      <span className="rounded-md bg-paper/90 px-3 py-1.5 text-xs text-ink-tertiary shadow-[var(--shadow-sm)]">Loading preview…</span>
    </div>
  );
}
