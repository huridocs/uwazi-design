/* A block's style on the public site. BlockView puts the style in context
 * and on its wrapper as data attributes; Section reads padding, width,
 * alignment, heading size and eyebrow from the context; grids, gaps and
 * picture shapes follow the data attributes through index.css (`.blk-grid`,
 * `.blk-shape`). One place per concern, so a block renderer only marks its
 * grid and its pictures. */
import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import type { BlockStyle, Device } from "../model/style";

const Ctx = createContext<BlockStyle | undefined>(undefined);
export const BlockStyleProvider = ({ value, children }: { value?: BlockStyle; children: ReactNode }) => <Ctx.Provider value={value}>{children}</Ctx.Provider>;
export const useBlockStyle = () => useContext(Ctx);

const PAD: Record<string, string> = { S: "py-5 sm:py-6", M: "py-8 sm:py-10", L: "py-12 sm:py-16", XL: "py-16 sm:py-24" };
const WIDTH: Record<string, string> = { narrow: "max-w-[40rem]", text: "max-w-[52rem]", wide: "max-w-[68rem]", full: "max-w-none" };
const H2: Record<string, string> = { "-1": "text-xl sm:text-2xl", "0": "text-2xl sm:text-[1.75rem]", "1": "text-3xl sm:text-[2.5rem]" };

/** Section's classes for a style: padding, width, alignment. */
export function sectionClasses(s: BlockStyle | undefined, wide: boolean) {
  const width = s?.width ? WIDTH[s.width] : wide ? "max-w-[80rem]" : WIDTH.wide;
  return `${PAD[s?.pad ?? "M"]} ${width} ${s?.align === "center" ? "text-center [&_.blk-row]:justify-center" : ""}`;
}
export const headingClass = (s: BlockStyle | undefined) => H2[String(s?.heading ?? 0)];

/** Hide by device with the site's own breakpoints (phone < 640px, tablet
 *  640–1023px, desktop ≥ 1024px). The preview's frame is the device's width,
 *  so the same classes answer there. */
const HIDE: Record<Device, string> = { phone: "max-sm:hidden", tablet: "sm:max-lg:hidden", desktop: "lg:hidden" };
const FADE: Record<Device, string> = { phone: "max-sm:opacity-35", tablet: "sm:max-lg:opacity-35", desktop: "lg:opacity-35" };

/** The wrapper's attributes: data attributes for the CSS hooks, background,
 *  and device visibility (in the builder, hidden devices fade instead). */
export function wrapperProps(s: BlockStyle | undefined, preview: boolean): { className: string; style?: CSSProperties; [k: `data-${string}`]: string | undefined } {
  const off = s?.devices?.length ? (["phone", "tablet", "desktop"] as Device[]).filter((d) => !s.devices!.includes(d)) : [];
  const bg = s?.bg === "warm" ? "bg-warm" : s?.bg === "vellum" ? "bg-vellum" : s?.bg === "tint" ? "bg-accent/8" : s?.bg === "image" ? "relative isolate overflow-hidden" : "";
  return {
    "data-pad": s?.pad,
    "data-gap": s?.gap,
    "data-cols": s?.cols ? String(s.cols) : undefined,
    "data-shape": s?.shape,
    "data-bg": s?.bg,
    className: `${bg} ${off.map((d) => (preview ? FADE : HIDE)[d]).join(" ")}`,
  };
}
