const { chromium } = require("/Users/juanmnl/.operator/worktrees/uwazi_app-ad9c40/app/node_modules/playwright");
const path = require("path");
(async () => { const [,, out, name, w, h] = process.argv; const b = await chromium.launch();
 for (const theme of ["light","dark"]) { const p = await b.newPage({ viewport:{width:+w,height:+h}, deviceScaleFactor:2 });
  await p.goto("file://"+path.join(__dirname,"mock",name+".html")+"?theme="+theme); await p.waitForTimeout(600);
  await p.screenshot({ path: path.join(out, `${name}-${theme}.png`) }); await p.close(); } await b.close(); })();
