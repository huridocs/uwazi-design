import { chromium } from "playwright";
import fs from "fs";
import { execFileSync } from "child_process";
export const BASE = "http://localhost:1426/";
export const S = new URL(".", import.meta.url).pathname;
export const FF = "/private/tmp/claude-501/-Users-juanmnl-Developer-huridocs-uwazi-app/f65e5556-3126-44f5-9be9-e873db42f0c4/scratchpad/tools/node_modules/ffmpeg-static/ffmpeg";
const CURSOR = `(() => {
  const mk = () => {
    if (document.getElementById("__cur")) return;
    const d = document.createElement("div"); d.id="__cur";
    d.style.cssText="position:fixed;left:0;top:0;width:28px;height:28px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);will-change:transform";
    d.innerHTML='<svg width="28" height="28" viewBox="0 0 28 28"><path d="M5 3 L5 21 L10 16.5 L13.5 24 L16.5 22.6 L13 15.4 L19.5 15 Z" fill="#1c1712" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    const r=document.createElement("div"); r.id="__rip";
    r.style.cssText="position:fixed;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid #2b56c1;z-index:2147483646;pointer-events:none;opacity:0";
    document.documentElement.append(r, d);
    // No motion trail / motion blur on the cursor (Juan, 2026-09-27) — just the mark itself.
    addEventListener("mousemove", e => {
      d.style.transform = "translate("+e.clientX+"px,"+e.clientY+"px)"; r.style.left=e.clientX+"px"; r.style.top=e.clientY+"px";
    }, true);
    addEventListener("mousedown", () => { r.animate([{opacity:.9,transform:"scale(.3)"},{opacity:0,transform:"scale(1.4)"}],{duration:450,easing:"ease-out"}); }, true);
  };
  if (document.documentElement) mk(); else addEventListener("DOMContentLoaded", mk);
  new MutationObserver(mk).observe(document, {childList:true});
})();`;
const ease = t => t < .5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
export async function clip(name, fn, { theme = "light", url = BASE, prep } = {}) {
  const dir = S + "raw/" + name;
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const D = Number(process.env.DSF || 1);
  const browser = await chromium.launch(D > 1 ? { args: [`--force-device-scale-factor=${D}`, "--window-size=1440,900"] } : {});
  const ctx = await browser.newContext(D > 1 ? { viewport: null, colorScheme: theme, recordVideo: { dir, size: { width: 1440 * D, height: 900 * D } } } : { viewport: { width: 1440, height: 900 }, colorScheme: theme, recordVideo: { dir, size: { width: 1440, height: 900 } } });
  await ctx.addInitScript(CURSOR);
  const page = await ctx.newPage();
  const t0 = Date.now();
  const frames = []; let cdp;
  if (process.env.SC) {
    fs.mkdirSync(dir + "/f", { recursive: true });
    cdp = await ctx.newCDPSession(page);
    cdp.on("Page.screencastFrame", async ev => { const i = frames.length; fs.writeFileSync(`${dir}/f/${String(i).padStart(6, "0")}.jpg`, Buffer.from(ev.data, "base64")); frames.push(ev.metadata.timestamp); cdp.send("Page.screencastFrameAck", { sessionId: ev.sessionId }).catch(() => {}); });
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1440 * Number(process.env.DSF || 1), maxHeight: 900 * Number(process.env.DSF || 1), everyNthFrame: 1 });
  }
  const now = () => (Date.now() - t0) / 1000;
  const focus = []; let start = 0, mx = 720, my = 450;
  page.on("pageerror", e => console.log("[pageerror]", e.message));
  const c = {
    page, now,
    mark() { start = now(); },
    async qa(x, y) { const id = "q" + Math.random().toString(36).slice(2, 7); await page.evaluate(([x,y,id]) => { document.elementFromPoint(x,y).closest('button,a,[role=button]')?.setAttribute('data-qa',id); }, [x,y,id]); return page.locator(`[data-qa=${id}]`); },
    pause: ms => page.waitForTimeout((ms ?? 800) * Number(process.env.PK || 1)),
    async box(t) { const l = typeof t === "string" ? page.locator(t).first() : t.first(); await l.waitFor({ state: "visible", timeout: 8000 }); await l.scrollIntoViewIfNeeded().catch(()=>{}); return await l.boundingBox(); },
    // log a zoom focus target (rect in viewport px) at the current time
    zoom(rect, z, hold = 1.6, label = "") { focus.push({ t: +now().toFixed(2), rect, z, hold, label }); },
    async moveTo(x, y, dur = 700) {
      const sx = mx, sy = my, n = Math.max(8, Math.round(dur / 16));
      for (let i = 1; i <= n; i++) { const e = ease(i / n); await page.mouse.move(sx + (x - sx) * e, sy + (y - sy) * e); await page.waitForTimeout(16); }
      mx = x; my = y;
    },
    async hover(t, { z, hold, dx = 0.5, dy = 0.5, dur = 420 } = {}) {
      const b = await c.box(t); if (z) c.zoom(b, z, hold);
      await c.moveTo(b.x + b.width * dx, b.y + b.height * dy, dur); return b;
    },
    async click(t, o = {}) {
      const b = await c.hover(t, o); await page.waitForTimeout(90); await page.mouse.down(); await page.waitForTimeout(70); await page.mouse.up(); return b;
    },
    async type(t, text, o = {}) {
      await c.click(t, o); await page.waitForTimeout(300);
      for (const ch of text) { await page.keyboard.type(ch); await page.waitForTimeout(80); }
    },
    async key(k) { await page.keyboard.press(k); },
    async wheel(x, y, dy, steps = 8, every = 60) { await c.moveTo(x, y, 500); for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await page.waitForTimeout(every); } },
    async drag(x0, y0, x1, y1, dur = 900) {
      await c.moveTo(x0, y0, 600); await page.mouse.down(); await page.waitForTimeout(150);
      await c.moveTo(x1, y1, dur); await page.waitForTimeout(150); await page.mouse.up();
    },
  };
  await page.goto(url);
  if (prep) await prep(c);
  let err;
  try { await fn(c); } catch (e) { err = e; console.log("FLOW ERROR:", e.message.split("\n")[0]); await page.screenshot({ path: S + `raw/${name}-error.png` }).catch(()=>{}); }
  await page.waitForTimeout(800);
  const dur = now();
  let off = 0;
  if (process.env.SC) {
    await cdp.send("Page.stopScreencast").catch(() => {});
    await ctx.close(); await browser.close();
    const vt = frames.map(x => x - t0 / 1000);
    off = vt[0];
    const list = vt.map((t, i) => `file '${dir}/f/${String(i).padStart(6, "0")}.jpg'\nduration ${((i + 1 < vt.length ? vt[i + 1] : dur) - t).toFixed(4)}`).join("\n") + `\nfile '${dir}/f/${String(vt.length - 1).padStart(6, "0")}.jpg'\n`;
    fs.writeFileSync(dir + "/list.txt", list);
    execFileSync(FF, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", dir + "/list.txt", "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "12", "-preset", "fast", S + `raw/${name}.hi.mp4`]);
    fs.rmSync(dir, { recursive: true, force: true });
  } else {
    const vp = page.video();
    await ctx.close(); await browser.close();
    const webm = await vp.path();
    fs.renameSync(webm, S + `raw/${name}.webm`);
    try { fs.unlinkSync(S + `raw/${name}.hi.mp4`); } catch {}
  }
  fs.writeFileSync(S + `raw/${name}.json`, JSON.stringify({ start: start - off, dur: dur - off, focus: focus.map(f => ({ ...f, t: f.t - off })), err: err?.message }, null, 1));
  console.log(name, "recorded", dur.toFixed(1) + "s", "start", start.toFixed(1), "focus", focus.length);
  return { err };
}
export const q = s => s; 
