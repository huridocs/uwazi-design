/** Settings › Theme and branding › Header layout: how the app bar arranges
 *  its items on desktops and tablets. Every layout holds the same items and
 *  controls; phones keep one bar whatever is chosen.
 *
 *  The choice is part of the theme and is stored with it, under
 *  `__headerLayout` beside `__preset` (`model.ts`). Standard is stored as no
 *  key, so an untouched theme stays empty and a theme from Uwazi, which has
 *  no such key, reads as Standard. Uwazi does not have this setting. */

export const HEADER_LAYOUT_KEY = "__headerLayout";

export const HEADER_LAYOUT_IDS = ["standard", "centred", "two-rows", "compact"] as const;
export type HeaderLayout = (typeof HEADER_LAYOUT_IDS)[number];

export const HEADER_LAYOUTS: { id: HeaderLayout; label: string; description: string }[] = [
  { id: "standard", label: "Standard", description: "Logo and navigation at the start, utilities at the end." },
  { id: "centred", label: "Centred", description: "Navigation at the start, the logo in the middle, utilities at the end." },
  { id: "two-rows", label: "Two rows", description: "Logo, collection and utilities on top; navigation as a row below." },
  { id: "compact", label: "Compact", description: "A shorter bar: a smaller logo, and utilities as icons." },
];

const isHeaderLayout = (value: unknown): value is HeaderLayout => HEADER_LAYOUT_IDS.some((id) => id === value);

/** The layout a stored value names; anything else is Standard. */
export const headerLayoutFrom = (value: unknown): HeaderLayout => (isHeaderLayout(value) ? value : "standard");

export const headerLayoutOf = (vars: Record<string, string | undefined> | undefined): HeaderLayout =>
  headerLayoutFrom(vars?.[HEADER_LAYOUT_KEY]);

export const headerLayoutLabel = (id: HeaderLayout) => HEADER_LAYOUTS.find((l) => l.id === id)!.label;

/** `vars` with the layout set; Standard removes the key. */
export function withHeaderLayout<T extends Record<string, string | undefined>>(vars: T, layout: HeaderLayout): T {
  const next = { ...vars };
  delete next[HEADER_LAYOUT_KEY];
  return layout === "standard" ? next : { ...next, [HEADER_LAYOUT_KEY]: layout };
}
