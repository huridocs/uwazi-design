import { execFileSync, spawnSync } from "child_process";
import { FF, S } from "./lib.mjs";
const OUT = "/Users/juanmnl/Developer/huridocs/uwazi_app/dev/clips/";
const order = ["01-library","02-search","08-timeline-filtering","03-entity","04-relationship-fields","05-relationships-graph","06-text-references","07-input-data"];
const dur = f => { const r = spawnSync(FF, ["-i", f], { encoding: "utf8" }); const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr); return +m[1] * 3600 + +m[2] * 60 + +m[3]; };
const inputs = [], durs = [];
const closeCard = () => { inputs.push("-loop", "1", "-framerate", "60", "-t", "2.4", "-i", S + "assets/card9.png"); durs.push(2.4); };
order.forEach((n, i) => {
  inputs.push("-loop", "1", "-framerate", "60", "-t", "1.6", "-i", S + `assets/card${i + 1}.png`); durs.push(1.6);
  const f = OUT + `edited/${n}.mp4`; inputs.push("-i", f); durs.push(dur(f));
});
closeCard();
const X = 0.3; let chain = "", prev = "[v0]", acc = durs[0];
let f = inputs.length ? "" : "";
const n = durs.length;
for (let i = 0; i < n; i++) f += `[${i}:v]fps=60,scale=1440:900,setsar=1,format=yuv420p[v${i}];`;
for (let i = 1; i < n; i++) { const off = acc - X; f += `${prev}[v${i}]xfade=transition=fade:duration=${X}:offset=${off.toFixed(3)}[x${i}];`; prev = `[x${i}]`; acc = off + durs[i]; }
f = f.replace(/;$/, "");
console.log("expected duration", acc.toFixed(2));
execFileSync(FF, ["-y", "-loglevel", "error", ...inputs, "-filter_complex", f, "-map", prev, "-c:v", "libx264", "-crf", "18", "-preset", "medium", "-pix_fmt", "yuv420p", "-r", "60", "-movflags", "+faststart", OUT + "uwazi-2-full.mp4"], { stdio: "inherit" });
