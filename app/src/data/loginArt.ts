import { asset } from "../utils/asset";

/** The sign-in screen's art. Each image ships as AVIF and WebP at two widths
 *  (`public/login-art/art-N-1x|2x.{avif,webp}`, every file ≤ 250KB); the
 *  originals are in `images/login-art-src/`, outside the bundle. `w2x` is the
 *  largest width that stayed under the size budget, so for the detailed pieces
 *  it is below the source width.
 *
 *  `focus` is the `object-position` the image is cropped around. The figures in
 *  these pieces stand low in the frame, so most anchor to the lower third; 6
 *  anchors to its foot, where the one small figure stands, and the book stack
 *  (2) to its middle. */
export interface LoginArt {
  id: number;
  w1x: number;
  w2x: number;
  /** width / height of the source. */
  aspect: number;
  focus: string;
}

export const LOGIN_ART: LoginArt[] = [
  { id: 1, w1x: 1200, w2x: 2048, aspect: 1, focus: "50% 64%" },
  { id: 2, w1x: 1200, w2x: 1792, aspect: 2 / 3, focus: "50% 55%" },
  { id: 3, w1x: 1200, w2x: 2048, aspect: 1, focus: "62% 76%" },
  { id: 4, w1x: 1200, w2x: 1305, aspect: 2 / 3, focus: "50% 70%" },
  { id: 5, w1x: 1200, w2x: 2048, aspect: 1, focus: "52% 66%" },
  { id: 6, w1x: 1200, w2x: 1450, aspect: 2 / 3, focus: "46% 88%" },
];

export const loginArtSrcSet = (art: LoginArt, format: "avif" | "webp"): string =>
  `${asset(`/login-art/art-${art.id}-1x.${format}`)} ${art.w1x}w, ${asset(
    `/login-art/art-${art.id}-2x.${format}`,
  )} ${art.w2x}w`;

export const loginArtFallback = (art: LoginArt): string =>
  asset(`/login-art/art-${art.id}-1x.webp`);

const LAST_KEY = "uwazi:loginArt";
let chosen: LoginArt | null = null;

/** One image per page load, never the one the previous load showed (kept in
 *  sessionStorage). Chosen once at module level, so React's double render in
 *  development and re-mounts within the same load agree on the picture. */
export function pickLoginArt(): LoginArt {
  if (chosen) return chosen;
  let last: number | null = null;
  try {
    const raw = sessionStorage.getItem(LAST_KEY);
    last = raw ? Number(raw) : null;
  } catch {
    // Storage blocked: any image will do.
  }
  const pool = LOGIN_ART.filter((a) => a.id !== last);
  chosen = pool[Math.floor(Math.random() * pool.length)];
  try {
    sessionStorage.setItem(LAST_KEY, String(chosen.id));
  } catch {
    // Storage blocked: the next load may repeat this image.
  }
  return chosen;
}
