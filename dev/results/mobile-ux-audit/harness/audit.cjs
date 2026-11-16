// Mobile UX audit harness. Headless only: never touches the user's Chrome.
// usage: node audit.cjs <baseUrl> <outDir> <branchTag> <width> <theme> <lang> [scenarioFilter]
const { chromium } = require("/Users/juanmnl/.operator/worktrees/uwazi_app-ad9c40/app/node_modules/playwright");
const fs = require("fs");
const path = require("path");
const SCEN = require("./scenarios.cjs");

const CHECK = () => {
  const vis = (e) => {
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    if (e.closest("[inert],[aria-hidden=true]")) return false;
    let n = e, op = 1;
    while (n && n !== document.body) { const s = getComputedStyle(n); if (s.visibility === "hidden" || s.display === "none") return false; op *= +s.opacity; n = n.parentElement; }
    e.__op = op;
    return r.bottom > 0 && r.top < innerHeight;
  };
  const label = (e) => (e.getAttribute("aria-label") || e.getAttribute("title") || e.textContent || e.querySelector("img[alt]")?.alt || e.placeholder || e.getAttribute("data-component") || e.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
  const inScroller = (e) => { let n = e.parentElement; while (n && n !== document.body) { const s = getComputedStyle(n); if (/(auto|scroll)/.test(s.overflowX) && n.scrollWidth > n.clientWidth + 1) return true; n = n.parentElement; } return false; };
  const inter = [...document.querySelectorAll("button,a[href],[role=button],[role=tab],[role=menuitem],[role=option],[role=checkbox],[role=radio],input:not([type=hidden]),select,textarea,[tabindex='0']")].filter(vis);
  const out = { scrollW: document.documentElement.scrollWidth, innerW: innerWidth, innerH: innerHeight };
  out.pageOverflowX = document.documentElement.scrollWidth > innerWidth + 1 || document.body.scrollWidth > innerWidth + 1;
  out.offscreen = inter.filter((e) => { const r = e.getBoundingClientRect(); return (r.right > innerWidth + 1 || r.left < -1) && !inScroller(e); }).map((e) => { const r = e.getBoundingClientRect(); return `${label(e)} [${Math.round(r.left)}→${Math.round(r.right)}]`; }).slice(0, 12);
  // Anything laid out past the right/left edge, interactive or not: text and boxes that get clipped.
  out.clipped = [...document.querySelectorAll("main *, [role=dialog] *, [data-component] *")].filter((e) => { if (!e.childElementCount && !e.textContent.trim()) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > innerWidth + 2 && r.left < innerWidth && !inScroller(e) && !e.closest("svg,canvas,.leaflet-container,.maplibregl-map,[inert]"); }).filter((e, _, arr) => !arr.some((o) => o !== e && o.contains(e))).map((e) => `${label(e).slice(0, 30)} [→${Math.round(e.getBoundingClientRect().right)}]`).slice(0, 8);
  const shown = inter.filter((e) => e.__op > 0.05);
  const small = shown.map((e) => { const r = e.getBoundingClientRect(); return { l: label(e), w: Math.round(r.width), h: Math.round(r.height) }; });
  out.targets = shown.length;
  out.under24 = small.filter((s) => Math.min(s.w, s.h) < 24).map((s) => `${s.l} ${s.w}×${s.h}`);
  out.under44 = small.filter((s) => Math.min(s.w, s.h) < 44).length;
  out.hoverOnly = inter.filter((e) => e.__op <= 0.05).map((e) => { let n = e, cls = ""; for (let k = 0; k < 4 && n; k++, n = n.parentElement) cls += " " + (n.className && n.className.baseVal === undefined ? n.className : ""); return /hover/.test(cls) ? label(e) : null; }).filter(Boolean).slice(0, 12);
  const tiny = new Map();
  for (const el of document.querySelectorAll("body *")) {
    if (!el.childNodes.length) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(" ");
    if (!own) continue;
    const fs_ = parseFloat(getComputedStyle(el).fontSize);
    if (fs_ < 11 && vis(el) && el.__op > 0.05 && !el.closest("svg,.textLayer,.react-pdf__Page__textContent,.annotationLayer")) tiny.set(own.slice(0, 30), fs_);
  }
  out.tinyText = [...tiny.entries()].slice(0, 12).map(([t, s]) => `${t} (${s}px)`);
  out.tinyTextCount = tiny.size;
  const fixed = [...document.querySelectorAll("body *")].filter((e) => { const s = getComputedStyle(e).position; return (s === "fixed" || s === "sticky") && vis(e) && e.__op > 0.05; });
  const coll = [];
  for (let i = 0; i < fixed.length; i++) for (let j = i + 1; j < fixed.length; j++) {
    const a = fixed[i], b = fixed[j];
    if (a.contains(b) || b.contains(a)) continue;
    const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect();
    const ox = Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left), oy = Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top);
    if (ox > 4 && oy > 4) coll.push(`${label(a).slice(0, 20)} ⨯ ${label(b).slice(0, 20)} (${Math.round(ox)}×${Math.round(oy)})`);
  }
  out.fixedCollisions = coll.slice(0, 8);
  out.dialogs = [...document.querySelectorAll("[role=dialog],[aria-modal=true]")].filter(vis).map((d) => { const r = d.getBoundingClientRect(); return `${label(d).slice(0, 24)} top=${Math.round(r.top)} bottom=${Math.round(r.bottom)} h=${Math.round(r.height)}${r.bottom > innerHeight + 1 || r.top < -1 ? " DOES-NOT-FIT" : ""}`; });
  out.smallInputs = [...document.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]),textarea,select")].filter(vis).filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => `${label(e).slice(0, 26)} ${getComputedStyle(e).fontSize}`).slice(0, 8);
  out.unnamed = inter.filter((e) => e.__op > 0.05 && !(e.getAttribute("aria-label") || e.textContent.trim() || e.querySelector("img[alt]")?.alt || e.getAttribute("title") || e.placeholder || e.getAttribute("aria-labelledby"))).map((e) => `${e.tagName.toLowerCase()} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)}`).slice(0, 8);
  return out;
};

(async () => {
  const [,, base, outDir, tag, width, theme, lang, filter] = process.argv;
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch();
  const results = [];
  for (const sc of SCEN) {
    if (filter && !new RegExp(filter).test(sc.id)) continue;
    const ctx = await b.newContext({ viewport: { width: +width, height: sc.h || 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: "en-US" });
    await ctx.addInitScript(([th]) => { try { localStorage.setItem("theme", th); } catch {} }, [theme]);
    const p = await ctx.newPage();
    const errs = [];
    p.on("pageerror", (e) => errs.push(e.message.slice(0, 120)));
    const fails = [];
    try {
      await p.goto(base, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(1800);
      const steps = [...(lang === "ar" ? SCEN.AR_STEPS : []), ...sc.steps];
      for (const a of steps) {
        try {
          if (a.role) await p.getByRole(a.role[0], { name: a.role[1], exact: !!a.exact || !!a.role[2] }).nth(a.nth || 0).tap({ timeout: 2500 });
          if (a.text) await p.getByText(a.text, { exact: !!a.exact }).nth(a.nth || 0).tap({ timeout: 2500 });
          if (a.tap) await p.locator(a.tap).nth(a.nth || 0).tap({ timeout: 2500 });
          if (a.click) await p.locator(a.click).nth(a.nth || 0).click({ timeout: 2500 });
          if (a.fill) await p.locator(a.fill[0]).first().fill(a.fill[1]);
          if (a.type) await p.keyboard.type(a.type, { delay: 25 });
          if (a.key) await p.keyboard.press(a.key);
          if (a.eval) await p.evaluate(a.eval);
          if (a.scroll) await p.locator(a.scroll).first().evaluate((e, y) => e.scrollBy(0, y), a.by || 400);
          if (a.lp) { const box = await p.locator(a.lp).nth(a.nth || 0).boundingBox(); const cdp = await ctx.newCDPSession(p); const pt = [{ x: box.x + box.width / 2, y: box.y + Math.min(box.height / 2, 60) }]; await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: pt }); await p.waitForTimeout(800); await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
          if (a.wait) await p.waitForTimeout(a.wait);
        } catch (e) { fails.push(JSON.stringify(a).slice(0, 70) + " :: " + (e.message.match(/(intercepts pointer events|not visible|outside of the viewport|Timeout [0-9]+ms exceeded|strict mode|not stable)/)?.[0] || e.message.split("\n")[0].slice(0, 60))); }
        await p.waitForTimeout(a.pause ?? 350);
      }
      await p.waitForTimeout(600);
      const shot = `${tag}-${sc.id}-${width}-${theme}-${lang}.png`;
      await p.screenshot({ path: path.join(outDir, shot) });
      const c = await p.evaluate(CHECK);
      results.push({ id: sc.id, surface: sc.surface, shot, fails, errs, ...c });
    } catch (e) { results.push({ id: sc.id, error: e.message.slice(0, 200) }); }
    await ctx.close();
  }
  fs.writeFileSync(path.join(outDir, `${tag}-${width}-${theme}-${lang}.json`), JSON.stringify(results, null, 1));
  await b.close();
  console.log(`${tag} ${width} ${theme} ${lang}: ${results.length} scenarios, ${results.filter((r) => r.fails?.length).length} with failed steps`);
})();
