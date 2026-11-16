const { chromium } = require("/Users/juanmnl/.operator/worktrees/uwazi_app-ad9c40/app/node_modules/playwright");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto("file://" + __dirname + "/prototype/index.html"); await p.waitForTimeout(800);
  console.log(await p.evaluate(() => {
    const from = sidIdx.get("xruguwr41jicc8fr"); const out = [];
    for (let x = 0; x < N; x++) { if (tplName(x) !== "Causa" || x === from) continue; const r = shortest(from, x, DEFAULT_SKIP, 6); if (r && r.steps >= 3 && r.steps <= 5 && r.routes >= 3 && r.routes <= 24) out.push([title(x), D.ents[x][0], r.steps, r.routes, r.layers.map(l => l.length).join("/")]); }
    out.sort((a, b) => a[2] - b[2] || b[3] - a[3]); return out.slice(0, 8).map(o => o.join(" · ")).join("\n");
  }));
  await b.close();
})();
