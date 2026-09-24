// SYNTHETIC portraits for the Travesía corpus's people.
//
// These records depict people at risk, so no photograph is used — not a stock
// face, not a generated "realistic" one whose provenance can't be shown. Each
// person gets a painted likeness DRAWN here, as SVG, from their own id: skin,
// hair, features and clothing are picked by a hash of the id and shaded by the
// record's sex and age, so the same person always gets the same portrait and no
// two neighbours look alike. Nothing is stored; nothing resembles anyone.
//
// The palette leans on the region the corpus describes (Mesoamerica and the
// Caribbean): warm browns across a wide range, dark hair mostly, greying with age.
import type { EntityImage } from "../entities";

const W = 300;
const H = 400;
/** The figure's scale and lift (see portraitSvg's return). */
const FIG_SCALE = 0.75;
const FIG_LIFT = 38;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SKIN = ["#f1c9a5", "#e0ac7e", "#d39a6a", "#c68650", "#b3713f", "#9c5d33", "#83492a", "#6b3a22", "#56301e"];
const HAIR = ["#1b1411", "#231915", "#2e211a", "#3b2a1f", "#4a3325", "#5b3f2b"];
const GREY = ["#8f8a86", "#a9a39e", "#c9c4bf"];
const CLOTH = ["#3f5a73", "#6b4f3a", "#56704f", "#7a3b3b", "#4b4a6b", "#8a6d3b", "#2f4f4f", "#6d5f7a", "#a05a2c", "#355c7d"];
const BACK = ["#e9e1d3", "#e4ddd0", "#dfe3e0", "#e6dfd8", "#dcdcd4", "#e8e2da"];

/** Darken (neg) or lighten (pos) a hex colour by `amt` (−1..1). */
function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(Math.min(255, Math.max(0, amt < 0 ? c * (1 + amt) : c + (255 - c) * amt)));
  const r = f(n >> 16);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export interface PortraitSubject {
  id: string;
  /** "F" / "M"; anything else draws a neutral figure. */
  sex?: string;
  age?: number;
  /** Darker skin more often (the corpus's Haitian records). */
  darker?: boolean;
}

/** The portrait as an SVG string. */
export function portraitSvg({ id, sex, age = 30, darker }: PortraitSubject): string {
  const r = rng(hash(id));
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const female = sex === "F";
  const child = age < 13;
  const skinIdx = darker ? 6 + Math.floor(r() * 3) : 1 + Math.floor(r() * 7);
  const skin = SKIN[Math.min(SKIN.length - 1, skinIdx)];
  const skinShadow = shade(skin, -0.14);
  const hair = age >= 55 && r() < 0.7 ? pick(GREY) : age >= 42 && r() < 0.35 ? shade(pick(HAIR), 0.25) : pick(HAIR);
  const cloth = pick(CLOTH);
  const back = pick(BACK);

  // Head geometry: children rounder and smaller in frame.
  const cx = W / 2;
  const headW = child ? 70 : female ? 66 : 70;
  const headH = child ? 80 : female ? 88 : 92;
  const cy = child ? 170 : 160;
  const neckW = child ? 28 : female ? 30 : 38;

  // The ground sits outside the figure's transform (see the return below).
  const ground = `<rect width="${W}" height="${H}" fill="${back}"/><rect width="${W}" height="${H}" fill="url(#v)"/>`;
  const parts: string[] = [];

  // Shoulders + clothing.
  const shoulderY = cy + headH + (child ? 26 : 34);
  const collar = r();
  parts.push(
    `<path d="M${cx - 190} ${H + 160} L ${cx - 190} ${shoulderY + 70} C ${cx - 150} ${shoulderY + 4}, ${cx - 80} ${shoulderY - 18}, ${cx} ${shoulderY - 20} C ${cx + 80} ${shoulderY - 18}, ${cx + 150} ${shoulderY + 4}, ${cx + 190} ${shoulderY + 70} L ${cx + 190} ${H + 160} Z" fill="${cloth}"/>`,
  );
  // Neck.
  parts.push(`<rect x="${cx - neckW / 2}" y="${cy + headH - 30}" width="${neckW}" height="${shoulderY - (cy + headH - 30) + 4}" fill="${skinShadow}"/>`);
  parts.push(
    collar < 0.5
      ? `<path d="M${cx - neckW / 2 - 6} ${shoulderY - 16} L ${cx} ${shoulderY + 22} L ${cx + neckW / 2 + 6} ${shoulderY - 16}" fill="${skinShadow}"/>`
      : `<path d="M${cx - neckW / 2 - 10} ${shoulderY - 18} Q ${cx} ${shoulderY + 6} ${cx + neckW / 2 + 10} ${shoulderY - 18}" fill="none" stroke="${shade(cloth, -0.25)}" stroke-width="6"/>`,
  );

  // Hair behind the head (long styles).
  const style = female ? pick(["long", "long", "tied", "curly", "short"]) : pick(["short", "short", "cropped", "curly", "cap"]);
  if (style === "long")
    parts.push(`<path d="M${cx - headW - 14} ${cy - 10} Q ${cx - headW - 24} ${cy + headH + 60} ${cx - headW + 6} ${cy + headH + 70} L ${cx + headW - 6} ${cy + headH + 70} Q ${cx + headW + 24} ${cy + headH + 60} ${cx + headW + 14} ${cy - 10} Z" fill="${hair}"/>`);
  if (style === "curly")
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (1 + i / 8);
      parts.push(`<circle cx="${cx + Math.cos(a) * (headW + 6)}" cy="${cy - 6 + Math.sin(a) * (headH * 0.55)}" r="${22 + r() * 8}" fill="${hair}"/>`);
    }

  // Ears, head.
  parts.push(`<ellipse cx="${cx - headW + 2}" cy="${cy + 8}" rx="11" ry="16" fill="${skinShadow}"/>`);
  parts.push(`<ellipse cx="${cx + headW - 2}" cy="${cy + 8}" rx="11" ry="16" fill="${skinShadow}"/>`);
  parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${headW}" ry="${headH}" fill="${skin}"/>`);
  // A side shadow, so the face reads as round rather than as a disc.
  parts.push(`<path d="M${cx + headW * 0.35} ${cy - headH * 0.85} Q ${cx + headW * 1.05} ${cy} ${cx + headW * 0.35} ${cy + headH * 0.92} Q ${cx + headW * 0.8} ${cy} ${cx + headW * 0.35} ${cy - headH * 0.85} Z" fill="${skinShadow}" opacity="0.45"/>`);

  // Hair on top.
  if (style === "cap") {
    const capC = pick(CLOTH);
    parts.push(`<path d="M${cx - headW - 4} ${cy - 18} Q ${cx} ${cy - headH - 40} ${cx + headW + 4} ${cy - 18} Z" fill="${capC}"/>`);
    parts.push(`<path d="M${cx - headW + 4} ${cy - 20} Q ${cx + headW * 0.2} ${cy - 30} ${cx + headW + 42} ${cy - 14}" fill="none" stroke="${shade(capC, -0.2)}" stroke-width="9" stroke-linecap="round"/>`);
  } else {
    const top = style === "cropped" ? 0.62 : 0.78;
    parts.push(
      `<path d="M${cx - headW - 3} ${cy - 4} Q ${cx - headW} ${cy - headH - 8} ${cx} ${cy - headH - 12} Q ${cx + headW} ${cy - headH - 8} ${cx + headW + 3} ${cy - 4} Q ${cx + headW * 0.7} ${cy - headH * top} ${cx + (r() - 0.5) * 20} ${cy - headH * (top + 0.06)} Q ${cx - headW * 0.7} ${cy - headH * top} ${cx - headW - 3} ${cy - 4} Z" fill="${hair}"/>`,
    );
    if (style === "tied") parts.push(`<circle cx="${cx}" cy="${cy - headH - 18}" r="22" fill="${hair}"/>`);
  }

  // Features.
  const eyeY = cy + 2;
  const eyeDx = headW * 0.42;
  const brow = age >= 55 ? GREY[0] : shade(hair, 0.05);
  const eyeC = pick(["#2a1d16", "#3a281c", "#1f1a17"]);
  for (const s of [-1, 1]) {
    parts.push(`<ellipse cx="${cx + s * eyeDx}" cy="${eyeY}" rx="10" ry="6" fill="#f7f2ea"/>`);
    parts.push(`<circle cx="${cx + s * eyeDx}" cy="${eyeY}" r="4.6" fill="${eyeC}"/>`);
    parts.push(`<path d="M${cx + s * eyeDx - 13} ${eyeY - 14} Q ${cx + s * eyeDx} ${eyeY - 21 - r() * 3} ${cx + s * eyeDx + 13} ${eyeY - 14}" fill="none" stroke="${brow}" stroke-width="${female ? 3.5 : 5}" stroke-linecap="round"/>`);
    if (age >= 45) parts.push(`<path d="M${cx + s * eyeDx - 9} ${eyeY + 9} Q ${cx + s * eyeDx} ${eyeY + 13} ${cx + s * eyeDx + 9} ${eyeY + 9}" fill="none" stroke="${skinShadow}" stroke-width="2"/>`);
  }
  // Nose, mouth.
  parts.push(`<path d="M${cx - 3} ${eyeY + 8} Q ${cx - 9} ${eyeY + 30} ${cx - 10} ${eyeY + 34} Q ${cx} ${eyeY + 40} ${cx + 10} ${eyeY + 34}" fill="none" stroke="${skinShadow}" stroke-width="3" stroke-linecap="round"/>`);
  const mouthY = eyeY + (child ? 46 : 54);
  const lip = shade(skin, female ? -0.3 : -0.22);
  parts.push(`<path d="M${cx - 17} ${mouthY} Q ${cx} ${mouthY + 6 + r() * 4} ${cx + 17} ${mouthY}" fill="none" stroke="${lip}" stroke-width="4" stroke-linecap="round"/>`);

  // Facial hair, for some adult men.
  if (!female && !child && age >= 20 && r() < 0.35) {
    const beard = age >= 55 ? pick(GREY) : hair;
    parts.push(
      r() < 0.5
        ? `<path d="M${cx - 20} ${mouthY - 7} Q ${cx} ${mouthY - 14} ${cx + 20} ${mouthY - 7}" fill="none" stroke="${beard}" stroke-width="6" stroke-linecap="round"/>`
        : `<path d="M${cx - headW + 8} ${cy + 12} Q ${cx - headW + 14} ${cy + headH + 10} ${cx} ${cy + headH + 8} Q ${cx + headW - 14} ${cy + headH + 10} ${cx + headW - 8} ${cy + 12} Q ${cx + headW * 0.5} ${mouthY + 26} ${cx} ${mouthY + 22} Q ${cx - headW * 0.5} ${mouthY + 26} ${cx - headW + 8} ${cy + 12} Z" fill="${beard}" opacity="0.85"/>`,
    );
  }
  // Earrings, for some women.
  if (female && r() < 0.4) for (const s of [-1, 1]) parts.push(`<circle cx="${cx + s * (headW - 2)}" cy="${cy + 26}" r="3.5" fill="#d4b26a"/>`);

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<defs><radialGradient id="v" cx="50%" cy="40%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.12"/></radialGradient></defs>` +
    ground +
    // The figure, scaled down and lifted so the face sits in the image's top
    // third. A card's landscape band covers a tall image anchored to its TOP
    // (EntityThumbnail) and shows only the top ~29% of a 3:4 picture — drawn
    // centred, a portrait showed there as a head of hair.
    `<g transform="translate(${cx} 0) scale(${FIG_SCALE}) translate(${-cx} ${-FIG_LIFT})">` +
    parts.join("") +
    `</g></svg>`
  );
}

const cache = new Map<string, EntityImage>();
/** The portrait as the image a card and a record draw: a data URL, 3:4. */
export function portraitImage(subject: PortraitSubject, alt: string, fieldKey?: string): EntityImage {
  const hit = cache.get(subject.id);
  if (hit) return hit;
  const img: EntityImage = {
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(portraitSvg(subject))}`,
    width: W,
    height: H,
    aspect: "portrait",
    alt,
    filename: `retrato-sintetico-${subject.id}.svg`,
    ...(fieldKey ? { fieldKey } : {}),
  };
  cache.set(subject.id, img);
  return img;
}
