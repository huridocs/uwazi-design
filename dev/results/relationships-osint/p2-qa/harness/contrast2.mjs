import { launch, pickCollection, openByTitle } from "./lib.mjs";
const run = async (dark) => {
  const { b, p } = await launch({ dark });
  await pickCollection(p, /Las Vegas/);
  await openByTitle(p, "Taxi dash video · 22:09:50");
  await p.getByRole("tab", { name: /^Relationships/ }).first().click(); await p.waitForTimeout(800);
  const ex = p.getByRole("button", { name: "Expand all" }).first(); if (await ex.count() && await ex.isEnabled()) { await ex.click(); await p.waitForTimeout(500); }
  const res = await p.evaluate(() => {
    const cv = document.createElement("canvas"); cv.width = cv.height = 1; const cx = cv.getContext("2d", { willReadFrequently: true });
    const rgba = (c) => { cx.clearRect(0, 0, 1, 1); cx.fillStyle = "#000"; cx.fillStyle = c; cx.fillRect(0, 0, 1, 1); const d = cx.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2], d[3] / 255]; };
    const over = (t, b) => [0, 1, 2].map(i => t[i] * t[3] + b[i] * (1 - t[3]));
    const lum = (c) => { const f = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const bgOf = (el) => { const L = []; for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c[3] > 0) { L.push(c); if (c[3] >= 1) break; } } let bg = [255, 255, 255]; for (const l of L.reverse()) bg = over(l, [...bg, 1]); return bg; };
    const measure = (el) => { const bg = bgOf(el); const fg = over(rgba(getComputedStyle(el).color), [...bg, 1]); const a = lum(fg), c = lum(bg); return { ratio: +((Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05)).toFixed(2), size: getComputedStyle(el).fontSize, text: el.textContent.trim().slice(0, 24) }; };
    const pick = (sel) => [...document.querySelectorAll(sel)].filter(e => e.getClientRects().length).slice(0, 2).map(measure);
    return { shapeLine: pick("[data-part=shape-line]"), members: pick("[data-part=members]"), span: pick("[data-part=span]"), clockMark: pick('[data-component="ContestedClock"] span:nth-child(2)') };
  });
  await b.close(); return res;
};
console.log("light", JSON.stringify(await run(false)));
console.log("dark", JSON.stringify(await run(true)));
