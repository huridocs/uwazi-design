/** How an entity type's colour is allowed to become TEXT.
 *
 *  The rule (CLAUDE.md, "A11y patterns"): a label never uses the raw type
 *  colour. Those colours are picked to read as a set of hues at dot size, and at
 *  12px on their own 12.5% tint they don't clear WCAG — raw, they measured
 *  2.70:1 to 4.33:1 across the eight types and both themes. The dot keeps the
 *  true colour; that is where the hue belongs and where nothing has to be read.
 *
 *  Lives here, once, because it was already written twice (EntityPill and
 *  EntityTypeChip each carried their own `luminance` and their own mix) and the
 *  second copy is how one of them ended up shipping the raw colour. */

/** Perceived luminance of a hex colour, 0–1. */
export function luminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length < 6) return 0.5;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** How much of the type colour survives in a label, the rest being ink.
 *
 *  65, not the 70 this rule was written with: at 70 the blue "Right" (#2563EB)
 *  lands at 4.34:1 on its own tint in dark — under AA for small text — and it
 *  was the one combination the original number didn't cover. 65 clears every
 *  type in both themes at 4.72:1 or better, and 68 would only just scrape 4.50,
 *  which is too close to the line to survive a token being nudged. The hue is
 *  still plainly the type's. */
const LABEL_MIX = 65;

/** The colour a type's NAME is drawn in, over that type's own tint.
 *
 *  Pale types (yellows, light greens) go all the way to ink — mixing toward ink
 *  from an already-light colour just makes mud. Saturated ones keep most of
 *  their hue. */
export function typeLabelColor(color: string): string {
  return luminance(color) > 0.6
    ? "var(--text-primary)"
    : `color-mix(in srgb, ${color} ${LABEL_MIX}%, var(--text-primary))`;
}
