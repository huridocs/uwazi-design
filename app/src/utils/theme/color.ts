/** Colour maths for Settings › Theme and branding: contrast (WCAG), mixing,
 *  and the swatch palette a picker offers around a colour. Ported from
 *  huridocs/uwazi `app/shared/utils/contrast.ts` and `app/react/V2/theme/
 *  colorPaletteFromHex.ts`, `colorSpaceForPalette.ts`, `themePaletteSort.ts`,
 *  so a theme file reads the same in both. Hex in, hex out (`#RRGGBB`). */

type Rgb = [number, number, number];

const toUnit = (hex: string): Rgb => {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  return [
    parseInt(full.slice(0, 2), 16) / 255,
    parseInt(full.slice(2, 4), 16) / 255,
    parseInt(full.slice(4, 6), 16) / 255,
  ];
};

const fromUnit = (r: number, g: number, b: number): string =>
  `#${[r, g, b]
    .map((x) =>
      Math.round(Math.max(0, Math.min(1, x)) * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`.toUpperCase();

export const isValidHex = (s: string) => /^#([0-9a-fA-F]{6})$/.test(s);
export const normalizeHex = (s: string) => (s.startsWith("#") ? s : `#${s}`).slice(0, 7);
export const sameHex = (a: string | undefined, b: string | undefined) =>
  a !== undefined && b !== undefined && normalizeHex(a).toUpperCase() === normalizeHex(b).toUpperCase();

/** `weight` 0 = `a`, 1 = `b`. */
export function mixHex(a: string, b: string, weight: number): string {
  const [r1, g1, b1] = toUnit(a);
  const [r2, g2, b2] = toUnit(b);
  const w = Math.max(0, Math.min(1, weight));
  return fromUnit(r1 + (r2 - r1) * w, g1 + (g2 - g1) * w, b1 + (b2 - b1) * w);
}

const linearize = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminanceOf = ([r, g, b]: Rgb) => 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
const ratioOf = (l1: number, l2: number) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

export const WCAG_AA = 4.5;
export const WCAG_AA_LARGE_UI = 3;

export interface ContrastCheck {
  ratio: number;
  passesAA: boolean;
}

export function checkContrast(bg: string, fg: string): ContrastCheck {
  const ratio = ratioOf(luminanceOf(toUnit(bg)), luminanceOf(toUnit(fg)));
  return { ratio, passesAA: ratio >= WCAG_AA };
}

export const INK = "#1A1A1A";
export const WHITE = "#FFFFFF";

/** Ink or white, whichever reads better on `bg`. */
export const inkFor = (bg: string) =>
  checkContrast(bg, INK).ratio >= checkContrast(bg, WHITE).ratio ? INK : WHITE;

/** `preferred` when it clears `minimum` on `bg`; else `preferred` walked
 *  toward ink or white until it does. */
export function accessibleForeground(bg: string, preferred: string, minimum = WCAG_AA): string {
  if (checkContrast(bg, preferred).ratio >= minimum) return preferred;
  const target = inkFor(bg);
  for (let step = 1; step <= 20; step += 1) {
    const fg = mixHex(preferred, target, step / 20);
    if (checkContrast(bg, fg).ratio >= minimum) return fg;
  }
  return target;
}

/** `fill` walked toward black until white text clears AA on it: the solid
 *  danger button's ground (`--accent-seal-fill`). */
export function fillForWhiteText(fill: string): string {
  for (let step = 0; step <= 20; step += 1) {
    const next = mixHex(fill, "#000000", step / 20);
    if (checkContrast(next, WHITE).passesAA) return next;
  }
  return "#000000";
}

/* ── HSL, for the palette ───────────────────────────────────────────────── */

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function hslOf(hex: string): { h: number; s: number; l: number } {
  const [r, g, b] = toUnit(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  if (d < 1e-9) return { h: 0, s: 0, l: l * 100 };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslHex(hDeg: number, sPct: number, lPct: number): string {
  const h = ((hDeg % 360) + 360) % 360;
  const s = clamp(sPct, 0, 100) / 100;
  const l = clamp(lPct, 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const tri: readonly Rgb[] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ];
  const [r, g, b] = tri[Math.min(5, Math.floor(h / 60))];
  return fromUnit(r + m, g + m, b + m);
}

/** The swatches offered around `base`: a neutral ramp for a grey, else a
 *  lightness ramp of its hue plus neighbouring hues at three weights. */
export function colorPaletteFromHex(base: string): string[] {
  const norm = isValidHex(base) ? base.toUpperCase() : "#C03B22";
  const { h, s, l } = hslOf(norm);
  const acc = new Set<string>();
  const add = (hh: number, ss: number, ll: number) => acc.add(hslHex(hh, ss, ll));
  if (s < 1.5) {
    for (let step = 4; step <= 96; step += 4) add(h, 0, step);
    return [...acc];
  }
  for (let i = 0; i <= 10; i += 1) add(h, clamp(s * (0.55 + i * 0.045), 5, 100), 8 + i * 8);
  for (const dh of [-120, -90, -72, -48, -30, -18, 18, 30, 48, 72, 90, 120, 150, 180]) {
    const ad = Math.abs(dh);
    const scale = ad > 100 ? 0.5 : ad > 60 ? 0.72 : 0.9;
    add(h + dh, clamp(s * scale, 8, 100), clamp(l - 14, 10, 88));
    add(h + dh, clamp(s * scale * 0.62, 8, 95), clamp(l + 10, 12, 92));
    add(h + dh, clamp(s * scale * 0.35, 6, 80), clamp(l + 2, 14, 86));
  }
  add(h, s, l);
  return [...acc].sort((a, b) => {
    const A = hslOf(a);
    const B = hslOf(b);
    return Math.abs(A.h - B.h) > 0.01 ? A.h - B.h : A.l - B.l;
  });
}

/* ── Order swatches so neighbours look alike (greedy walk in Lab) ───────── */

type Lab = { L: number; a: number; b: number };

function labOf(hex: string): Lab {
  const [r, g, b] = toUnit(hex).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f((r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047);
  const fy = f(r * 0.2126729 + g * 0.7151522 + b * 0.072175);
  const fz = f((r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** Unique valid hexes, darkest first, each followed by its nearest remaining. */
export function sortPaletteHexColors(hexes: string[]): string[] {
  const unique = [...new Set(hexes.filter(isValidHex).map((h) => h.toUpperCase()))];
  if (unique.length <= 1) return unique;
  const labs = new Map(unique.map((h) => [h, labOf(h)]));
  const remaining = new Set(unique);
  let current = unique.reduce((d, h) => (labs.get(h)!.L < labs.get(d)!.L ? h : d));
  const ordered = [current];
  remaining.delete(current);
  while (remaining.size > 0) {
    const from = labs.get(current)!;
    let best = "";
    let bestD = Infinity;
    for (const h of remaining) {
      const q = labs.get(h)!;
      const d = (from.L - q.L) ** 2 + (from.a - q.a) ** 2 + (from.b - q.b) ** 2;
      if (d < bestD || (d === bestD && h.localeCompare(best) < 0)) {
        bestD = d;
        best = h;
      }
    }
    ordered.push(best);
    remaining.delete(best);
    current = best;
  }
  return ordered;
}

/** Swatches ordered by contrast against `against`, best first.
 *  `swatchIsBackground`: the swatch is the ground and `against` the text. */
export function colorsByContrast(colors: string[], against: string, swatchIsBackground: boolean): string[] {
  const ratio = (swatch: string) =>
    checkContrast(swatchIsBackground ? swatch : against, swatchIsBackground ? against : swatch).ratio;
  return [...new Set(colors.filter(isValidHex).map((h) => h.toUpperCase()))].sort((l, r) => ratio(r) - ratio(l));
}
