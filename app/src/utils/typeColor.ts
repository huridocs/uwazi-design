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
 *  55, and DARK MODE is what sets it. This number went 70 → 65 → 55, each step
 *  because the set it was measured against grew:
 *
 *  - 70 was tuned on the eight base types and missed the blue "Right" (#2563EB),
 *    4.34:1 on its own tint in dark.
 *  - 65 fixed that, but was still measured on those eight. CEJIL types don't use
 *    them — `data/cejil/typesAdapter.ts` assigns from a 22-colour PALETTE, and
 *    four of those still failed AA in dark at 65: #BE123C 3.98, #1D4ED8 4.22,
 *    #0369A1 4.45 (the live "Instrumento" chip), #7C3AED 4.47.
 *
 *  Light was never the binding case — every colour clears 7:1 there, because
 *  mixing toward #1A1A1A darkens a saturated hue against a white-ish tint. Dark
 *  is the hard direction: the mix lightens toward #F5F0E8, and 65% of an already
 *  dark blue or crimson is still dark on a dark tint. Measured worst-case over
 *  all 22 at each step: 65 → 3.98, 60 → 4.38, 55 → 4.82, 50 → 5.31. 55 is the
 *  first that clears AA for every colour in the palette with room to spare; 60
 *  still fails #BE123C.
 *
 *  Check new type colours against BOTH themes, and against the CEJIL palette —
 *  not the eight. That assumption is what this constant keeps being wrong about.
 *
 *  The VALUE lives in tokens.css as `--label-mix`: seal's label token needs the
 *  same number, and a second copy of a contrast constant is precisely what this
 *  file exists to prevent. The reasoning stays here. */
const LABEL_MIX = "var(--label-mix)";

/** The colour a type's NAME is drawn in, over that type's own tint.
 *
 *  Pale types (yellows, light greens) go all the way to ink — mixing toward ink
 *  from an already-light colour just makes mud. Saturated ones keep most of
 *  their hue. */
export function typeLabelColor(color: string): string {
  return luminance(color) > 0.6
    ? "var(--text-primary)"
    : `color-mix(in srgb, ${color} ${LABEL_MIX}, var(--text-primary))`;
}
