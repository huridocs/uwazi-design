const { chromium } = require("/Users/juanmnl/.operator/worktrees/uwazi_app-ad9c40/app/node_modules/playwright");
const path = require("path");
(async () => {
  const [,, out, name, w, h, q, acts] = process.argv;
  const b = await chromium.launch();
  for (const theme of ["light", "dark"]) {
    const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2 });
    const errs = []; p.on("pageerror", (e) => errs.push(e.message));
    await p.goto("file://" + path.join(__dirname, "../prototype/index.html") + "?" + q + (q ? "&" : "") + "theme=" + theme);
    await p.waitForTimeout(500);
    for (const a of JSON.parse(acts || "[]")) {
      if (a.click) await p.click(a.click);
      if (a.type) await p.keyboard.type(a.type, { delay: 15 });
      if (a.eval) await p.evaluate(a.eval);
      if (a.hover) await p.hover(a.hover);
      await p.waitForTimeout(250);
    }
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, `${name}-${theme}.png`) });
    if (errs.length) console.log(name, theme, errs.slice(0, 3));
    await p.close();
  }
  await b.close();
})();
