/** Settings › Theme and branding › Header layout: how the app bar arranges
 *  its items on desktops and tablets. Standard is the app bar with no menu
 *  links. The other three draw the collection's menu (Settings › Menu) in the
 *  bar, as a public site does, and their utilities are the language, the
 *  Library, Settings and Log in or Log out. Phones keep one bar whatever is
 *  chosen and list the menu in their menu sheet.
 *
 *  The choice is part of the theme and is stored with it, under
 *  `__headerLayout` beside `__preset` (`model.ts`). Standard is stored as no
 *  key, so an untouched theme stays empty and a theme from Uwazi, which has
 *  no such key, reads as Standard. Uwazi does not have this setting. */

export const HEADER_LAYOUT_KEY = "__headerLayout";

export const HEADER_LAYOUT_IDS = ["standard", "menu-centred", "menu-end", "compact"] as const;
export type HeaderLayout = (typeof HEADER_LAYOUT_IDS)[number];

export const HEADER_LAYOUTS: { id: HeaderLayout; label: string; description: string }[] = [
  { id: "standard", label: "Standard", description: "The app bar: logo and navigation at the start, utilities at the end. No menu links." },
  { id: "menu-centred", label: "Menu centred", description: "Logo at the start, the collection's menu centred in the bar, utilities at the end." },
  { id: "menu-end", label: "Menu at end", description: "Logo at the start; the collection's menu, then the utilities, at the end." },
  { id: "compact", label: "Compact", description: "A shorter bar: the collection's menu after the logo at a smaller size, utilities at the end." },
];

/** The layouts that draw the collection's menu in the bar. */
export const hasMenuLinks = (layout: HeaderLayout) => layout !== "standard";

const isHeaderLayout = (value: unknown): value is HeaderLayout => HEADER_LAYOUT_IDS.some((id) => id === value);

/** The layout a stored value names; anything else is Standard, the removed
 *  Two rows (`two-rows`) included. `centred` is what Menu centred replaced. */
export const headerLayoutFrom = (value: unknown): HeaderLayout =>
  isHeaderLayout(value) ? value : value === "centred" ? "menu-centred" : "standard";

export const headerLayoutOf = (vars: Record<string, string | undefined> | undefined): HeaderLayout =>
  headerLayoutFrom(vars?.[HEADER_LAYOUT_KEY]);

export const headerLayoutLabel = (id: HeaderLayout) => HEADER_LAYOUTS.find((l) => l.id === id)!.label;

/** `vars` with the layout set; Standard removes the key. */
export function withHeaderLayout<T extends Record<string, string | undefined>>(vars: T, layout: HeaderLayout): T {
  const next = { ...vars };
  delete next[HEADER_LAYOUT_KEY];
  return layout === "standard" ? next : { ...next, [HEADER_LAYOUT_KEY]: layout };
}
