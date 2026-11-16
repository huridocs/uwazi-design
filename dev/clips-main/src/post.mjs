import fs from "fs";
import { execFileSync } from "child_process";
import { FF, S } from "./lib.mjs";
const OUT = "/Users/juanmnl/Developer/huridocs/uwazi_app/dev/clips-main/";
export const NAMES = ["01-library","02-search","03-entity","04-relationship-fields","05-relationships-graph","06-text-references","07-input-data","08-timeline-filtering"];
const W = 1440, H = 900, RAMP = 0.6, LEAD = 0.15;
const sm = u => u * u * (3 - 2 * u);
export function camera(name, zmax = 2) {
  const m = JSON.parse(fs.readFileSync(S + `raw/${name}.json`));
  const len = m.dur - m.start;
  const evs = m.focus.map(f => {
    const r = f.rect;
    let z = Math.min(f.z, zmax, W / (r.width * 1.12), H / (r.height * 1.12)); z = Math.max(1.15, z);
    let cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    cx = Math.min(Math.max(cx, W / 2 / z), W - W / 2 / z); cy = Math.min(Math.max(cy, H / 2 / z), H - H / 2 / z);
    return { rel: f.t - m.start, z, cx, cy, hold: f.hold, rect: r };
  }).filter(e => e.rel > 0.2).sort((a, b) => a.rel - b.rel);
  const kf = [{ t: 0, z: 1, cx: W / 2, cy: H / 2 }]; const rest = [];
  let last = kf[0];
  const push = k => { kf.push(k); last = k; };
  const restPoints = [];
  evs.forEach((e, i) => {
    let ts = Math.max(e.rel - LEAD, last.t);
    if (last.z > 1 && ts - last.t < 0.001) ts = last.t; // chained pan
    else if (last.z > 1) { /* hold until ts */ push({ ...last, t: ts }); }
    else { if (ts > last.t) { rest.push([last.t, ts]); } push({ t: ts, z: 1, cx: W / 2, cy: H / 2 }); }
    push({ t: ts + RAMP, z: e.z, cx: e.cx, cy: e.cy });
    const tOut = e.rel + e.hold;
    const next = evs[i + 1];
    if (next && next.rel - LEAD < tOut + 0.5) { /* chain: stay */ if (next.rel - LEAD > last.t) { /* hold */ } }
    else { const to = Math.max(tOut, last.t + 0.3); push({ ...last, t: to }); push({ t: to + RAMP, z: 1, cx: W / 2, cy: H / 2 }); restPoints.push(to + RAMP); }
  });
  // rest intervals: from each zoom-out end to the next ramp start (or clip end)
  const restIv = []; let prevEnd = 0;
  for (let i = 0; i < kf.length - 1; i++) {
    const a = kf[i], b = kf[i + 1];
    if (a.z === 1 && b.z === 1) restIv.push([a.t, b.t]);
  }
  const lastK = kf[kf.length - 1]; if (lastK.z === 1) restIv.push([lastK.t, len + 5]);
  return { kf, restIv, len, start: m.start };
}
function pw(kf, key) {
  let e = String(kf[kf.length - 1][key].toFixed(3));
  for (let i = kf.length - 2; i >= 0; i--) {
    const a = kf[i], b = kf[i + 1];
    if (b.t - a.t < 1e-6) continue;
    const v = a[key] === b[key] ? a[key].toFixed(3) : `(${a[key].toFixed(3)}+(${(b[key] - a[key]).toFixed(3)})*st((t-${a.t.toFixed(3)})/${(b.t - a.t).toFixed(3)}))`;
    e = `if(lt(t,${b.t.toFixed(3)}),${v},${e})`;
  }
  return e;
}
// st(u)=u*u*(3-2u): ffmpeg has no user functions in filters, so expand inline
const ST = s => s.replace(/st\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, (_, u) => `(pow(${u},2)*(3-2*(${u})))`);
export function editedFilter(cam, opts = {}) {
  const Z = ST(pw(cam.kf, "z")), CX = ST(pw(cam.kf, "cx")), CY = ST(pw(cam.kf, "cy"));
  const en = cam.restIv.map(([a, b]) => `between(t,${a.toFixed(3)},${b.toFixed(3)})`).join("+") || "0";
  const scaleF = `scale=w='2*trunc(${W}*(${Z}))':h='2*trunc(${H}*(${Z}))':eval=frame:flags=bicubic`;
  const IW = `(2*trunc(${W}*(${Z})))`, IH = `(2*trunc(${H}*(${Z})))`;
  const cropF = `crop=${2 * W}:${2 * H}:x='min(max((${CX})*${IW}/${W}-${W},0),${IW}-${2 * W})':y='min(max((${CY})*${IH}/${H}-${H},0),${IH}-${2 * H})'`;
  // No motion blur (Juan, 2026-09-27): straight scale/crop per frame at 60fps, no tmix.
  return `[0:v]scale=${2 * W}:${2 * H}:flags=lanczos,fps=60,split[a][b];[a]${scaleF},${cropF},scale=${W}:${H}:flags=lanczos[p];[b]scale=${W}:${H}:flags=lanczos[s];[p][s]overlay=enable='${en}':shortest=1,format=yuv420p[out]`;
}
export const src = n => fs.existsSync(S + `raw/${n}.hi.mp4`) ? S + `raw/${n}.hi.mp4` : S + `raw/${n}.webm`;
export function run(args) { execFileSync(FF, ["-y", "-loglevel", "error", ...args], { stdio: "inherit" }); }
export function makeRaw(name) {
  const m = JSON.parse(fs.readFileSync(S + `raw/${name}.json`));
  fs.mkdirSync(OUT, { recursive: true });
  run(["-i", src(name), "-ss", String(m.start), "-t", String(m.dur - m.start), "-vf", "scale=1440:900:flags=lanczos,fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "17", "-preset", "slow", "-movflags", "+faststart", OUT + name + ".mp4"]);
}
export function makeEdited(name) {
  const cam = camera(name);
  fs.mkdirSync(OUT + "edited", { recursive: true });
  const fs_ = S + `tmp/${name}.fc`;
  fs.writeFileSync(fs_, editedFilter(cam));
  const m = JSON.parse(fs.readFileSync(S + `raw/${name}.json`));
  run(["-ss", String(m.start), "-t", String(m.dur - m.start), "-i", src(name), "-filter_complex_script", fs_, "-map", "[out]", "-c:v", "libx264", "-crf", "17", "-preset", "slow", "-r", "60", "-movflags", "+faststart", OUT + "edited/" + name + ".mp4"]);
  return cam;
}
if (process.argv[1].endsWith("post.mjs")) {
  const which = process.argv.slice(2).length ? process.argv.slice(2) : NAMES;
  for (const n of which) { console.log("post", n); makeRaw(n); const cam = makeEdited(n); console.log(n, "kf", cam.kf.length, "rest", cam.restIv.length); }
}
