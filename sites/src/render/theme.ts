/* Theme maths: fonts, the colour that sits on the accent, and contrast. */
import type { FontPair, Theme } from "../model/config";

export const FONT_PAIRS: Record<FontPair, { label: string; heading: string; body: string; sample: string }> = {
  editorial: {
    label: "Editorial",
    heading: "Charter, 'Iowan Old Style', 'Palatino Linotype', Georgia, serif",
    body: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
    sample: "Serif headings, sans text",
  },
  modern: {
    label: "Modern",
    heading: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
    body: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
    sample: "Sans throughout",
  },
  classic: {
    label: "Classic",
    heading: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
    body: "Charter, 'Iowan Old Style', Georgia, serif",
    sample: "Serif throughout",
  },
  humanist: {
    label: "Humanist",
    heading: "'Avenir Next', Avenir, 'Segoe UI', 'Gill Sans', ui-sans-serif, sans-serif",
    body: "Charter, Georgia, serif",
    sample: "Rounded sans headings, serif text",
  },
};

const hex = (h: string) => {
  const m = h.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
};
const lum = (h: string) => {
  const [r, g, b] = hex(h).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [hex(a), hex(b)];
  return "#" + x.map((c, i) => Math.round(c * t + y[i] * (1 - t)).toString(16).padStart(2, "0")).join("");
};

/** Light and dark grounds and text the site draws on — tokens.css values. */
const PAPER = { light: "#FFFFFF", dark: "#242424" };
const INK = { light: "#1A1A1A", dark: "#F5F0E8" };
/** Accent AS TEXT travels this far toward the text colour (the app's
 *  --label-mix idea), so a dark accent still reads on a dark ground. */
export const ACCENT_TEXT_MIX = 0.7;

export const onAccent = (accent: string) => (contrast(accent, "#FFFFFF") >= contrast(accent, "#1A1A1A") ? "#FFFFFF" : "#1A1A1A");

export interface ContrastReport {
  label: string;
  ratio: number;
  min: number;
  ok: boolean;
}

export function checkTheme(t: Theme): ContrastReport[] {
  const a = t.accent;
  const on = onAccent(a);
  const rows: ContrastReport[] = [
    { label: "Button text on the accent", ratio: contrast(on, a), min: 4.5, ok: false },
    { label: "Links on a light page", ratio: contrast(mix(a, INK.light, ACCENT_TEXT_MIX), PAPER.light), min: 4.5, ok: false },
    { label: "Links on a dark page", ratio: contrast(mix(a, INK.dark, ACCENT_TEXT_MIX), PAPER.dark), min: 4.5, ok: false },
  ];
  return rows.map((r) => ({ ...r, ok: r.ratio >= r.min }));
}

/** The nearest shade of the accent that passes every check, or null. */
export function fixAccent(accent: string): string | null {
  for (let i = 1; i <= 20; i++) {
    for (const toward of ["#000000", "#FFFFFF"]) {
      const c = mix(accent, toward, 1 - i * 0.04);
      if (checkTheme({ accent: c, fonts: "modern", mode: "light" }).every((r) => r.ok)) return c;
    }
  }
  return null;
}

/** CSS custom properties the renderer reads. */
export function themeVars(t: Theme): Record<string, string> {
  const f = FONT_PAIRS[t.fonts];
  return {
    "--site-accent": t.accent,
    "--site-on-accent": onAccent(t.accent),
    "--site-accent-text": `color-mix(in srgb, ${t.accent} ${ACCENT_TEXT_MIX * 100}%, var(--text-primary))`,
    "--site-heading": f.heading,
    "--site-body": f.body,
  };
}
