import fs from "fs";
import { execFileSync } from "child_process";
import { FF, S } from "./lib.mjs";
const OUT = "/Users/juanmnl/Developer/huridocs/uwazi_app/dev/clips-main/";
const W = 1080, H = 1920;
const sm = u => `(pow(${u},2)*(3-2*(${u})))`;
const moments = [
  { clip: "01-library", s: 0, len: 3.2, z: 1, cx: [[0, 480], [3.2, 480]], cap: "m1" },
  { clip: "02-search", s: 9.0, len: 3.8, z: 1, cx: [[0, 1210], [3.8, 1210]], cap: "m2" },
  { clip: "08-timeline-filtering", s: 4.0, len: 3.6, z: 1, cx: [[0, 1210], [1.6, 1037], [3.6, 480]], cap: "m3" },
  { clip: "05-relationships-graph", s: 9.5, len: 3.8, z: 1, cx: [[0, 437], [3.8, 437]], cap: "m4" },
  { clip: "06-text-references", s: 0.2, len: 4.0, z: 1, cx: [[0, 785], [4.0, 785]], cap: "m5" },
  { clip: "07-input-data", s: 3.0, len: 4.2, z: 1, cx: [[0, 438], [4.2, 438]], cap: "m6" },
  { clip: "07-input-data", s: 15.0, len: 4.4, z: 1, cx: [[0, 720], [4.4, 720]], cap: "m7" },
];
function pw(k) { // k: [[t,v]...] smoothstep
  let e = String(k[k.length - 1][1]);
  for (let i = k.length - 2; i >= 0; i--) { const [t0, v0] = k[i], [t1, v1] = k[i + 1]; if (t1 <= t0) continue;
    const v = v0 === v1 ? v0 : `(${v0}+(${v1 - v0})*${sm(`(t-${t0})/${t1 - t0}`)})`; e = `if(lt(t,${t1}),${v},${e})`; }
  return e;
}
fs.mkdirSync(S + "tmp/reel", { recursive: true });
const segs = [];
moments.forEach((m, i) => {
  const meta = JSON.parse(fs.readFileSync(S + `raw/${m.clip}.json`));
  const ch = 900 / m.z, cw = ch * 9 / 16, k = W / cw;
  const CX = pw(m.cx);
  const fw = Math.round(1440 * k), fh = Math.round(900 * k);
  const cy = 450; const yexpr = Math.min(Math.max(cy * k - H / 2, 0), fh - H);
  // No motion blur (Juan, 2026-09-27): no tmix.
  const filt = `[0:v]fps=60,scale=${fw}:${fh}:flags=lanczos,crop=${W}:${H}:x='min(max((${CX})*${k.toFixed(5)}-${W / 2},0),${fw - W})':y=${yexpr.toFixed(1)},setsar=1[b];[b][1:v]overlay=0:0,format=yuv420p[out]`;
  const out = S + `tmp/reel/m${i + 1}.mp4`;
  execFileSync(FF, ["-y", "-loglevel", "error", "-ss", String(meta.start + m.s), "-t", String(m.len), "-i", (fs.existsSync(S + `raw/${m.clip}.hi.mp4`) ? S + `raw/${m.clip}.hi.mp4` : S + `raw/${m.clip}.webm`), "-loop", "1", "-framerate", "60", "-i", S + `assets/cap-${m.cap}.png`, "-filter_complex", filt, "-map", "[out]", "-t", String(m.len), "-c:v", "libx264", "-crf", "16", "-r", "60", "-pix_fmt", "yuv420p", out], { stdio: "inherit" });
  segs.push({ out, len: m.len });
});
// closing card, fade over last 0.6s of final moment
const closeLen = 2.0, FADE = 0.6;
const inputs = []; segs.forEach(s => inputs.push("-i", s.out));
inputs.push("-loop", "1", "-framerate", "60", "-t", String(closeLen), "-i", S + "assets/close.png");
let f = "", cur = "";
f += segs.map((_, i) => `[${i}:v]`).join('') + `concat=n=${segs.length}:v=1:a=0,fps=60,settb=1/60[body];`;
f += `[${segs.length}:v]fps=60,settb=1/60,format=yuv420p,setsar=1[cl];`;
const bodyLen = segs.reduce((a, s) => a + s.len, 0);
f += `[body][cl]xfade=transition=fade:duration=${FADE}:offset=${(bodyLen - FADE).toFixed(3)}[v]`;
console.log("reel length", (bodyLen - FADE + closeLen).toFixed(2));
execFileSync(FF, ["-y", "-loglevel", "error", ...inputs, "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-filter_complex", f, "-map", "[v]", "-map", `${segs.length + 1}:a`, "-shortest", "-c:v", "libx264", "-profile:v", "high", "-level", "4.2", "-crf", "17", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "60", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", OUT + "uwazi-2-reel.mp4"], { stdio: "inherit" });
execFileSync(FF, ["-y", "-loglevel", "error", "-i", S + "assets/cover.png", "-frames:v", "1", "-q:v", "2", OUT + "uwazi-2-reel-cover.jpg"]);
