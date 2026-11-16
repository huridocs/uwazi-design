import { chromium } from "playwright";
const b = await chromium.launch();
const FONT = `-apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif`;
async function shot(w, h, html, path, transparent = false) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.setContent(`<style>*{margin:0;box-sizing:border-box}html,body{width:${w}px;height:${h}px;background:${transparent ? "transparent" : "#F5F0E8"};font-family:${FONT};color:#1A1A1A}</style>${html}`);
  await p.screenshot({ path, omitBackground: transparent }); await p.close();
}
const sections = ["The new library", "Full-text search results", "Time-based filtering", "Rebuilding the entity experience", "Grouped by relationship type", "Follow relationships across steps", "Smoother text referencing", "Bert, working alongside the researcher"];
sections.forEach(async () => {});
for (let i = 0; i < sections.length; i++) {
  await shot(1440, 900, `<div style="display:flex;flex-direction:column;justify-content:center;height:100%;padding:0 160px"><div style="font-size:22px;letter-spacing:.14em;text-transform:uppercase;color:#6b6257;margin-bottom:28px">Uwazi 2.0 · ${String(i + 1).padStart(2, "0")}</div><div style="font-size:92px;font-weight:600;letter-spacing:-.02em;line-height:1.05;text-wrap:balance">${sections[i]}</div></div>`, `assets/card${i + 1}.png`);
}
const caps = { m1: "Uwazi 2.0", m2: "Full-text search results", m3: "Time-based filtering", m4: "Networks you can see and navigate", m5: "Smoother text referencing", m6: "The human firmly in control", m7: "Bert, our integrated agent" };
for (const [k, t] of Object.entries(caps)) {
  await shot(1080, 1920, `<div style="position:absolute;left:0;right:0;top:1230px;height:230px;background:#F5F0E8;display:flex;align-items:center;justify-content:center;padding:0 80px;text-align:center;font-size:${k === "m1" ? 120 : 84}px;font-weight:650;letter-spacing:-.02em;line-height:1.08;text-wrap:balance;border-top:3px solid #1A1A1A;border-bottom:3px solid #1A1A1A">${t.replace(/ (\S+)$/, "&nbsp;$1")}</div>`, `assets/cap-${k}.png`, true);
}
await shot(1440, 900, `<div style="display:flex;flex-direction:column;justify-content:center;height:100%;padding:0 160px"><div style="font-size:22px;letter-spacing:.14em;text-transform:uppercase;color:#6b6257;margin-bottom:28px">Uwazi 2.0</div><div style="font-size:92px;font-weight:600;letter-spacing:-.02em;line-height:1.05">There is a lot still to&nbsp;come.</div><div style="font-size:92px;font-weight:600;letter-spacing:-.02em;line-height:1.05;margin-top:24px">Watch this&nbsp;space.</div></div>`, "assets/card9.png");
await shot(1080, 1920, `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:110px;font-weight:650;letter-spacing:-.02em;text-align:center;padding:0 90px;line-height:1.08">Watch this space.</div>`, "assets/close.png");
await shot(1080, 1920, `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center"><div style="font-size:30px;letter-spacing:.16em;text-transform:uppercase;color:#6b6257;margin-bottom:36px">HURIDOCS</div><div style="font-size:190px;font-weight:700;letter-spacing:-.03em;line-height:1">Uwazi&nbsp;2.0</div><div style="font-size:52px;margin-top:44px;color:#3a342d">A new chapter</div></div>`, "assets/cover.png");
await b.close();
