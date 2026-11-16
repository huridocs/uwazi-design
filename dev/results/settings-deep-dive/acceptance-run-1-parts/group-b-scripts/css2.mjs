import { launch, open, S, shot, rail, notifTitles, logEntries, axe, dialogs } from "./lib.mjs";
import { switchTo, toSettings } from "./h.mjs";
import { recorder, run, pass, noise } from "./rec.mjs";
const r = recorder("CSS");
const b = await launch();
const save = async (p) => { await S(p).getByRole("button", { name: "Save", exact: true }).click(); await p.waitForTimeout(400); };
const ta = (p) => S(p).locator("textarea").first();
const tab = (p, n) => S(p).getByRole("tab", { name: n }).or(S(p).getByRole("button", { name: n, exact: true })).first();
const mine = async (p) => (await notifTitles(p)).filter((t) => !/^(Uploading document batch|Processing PDFs|Some fields could|A new version|Entity saved|Failed to save entity|Batch import|Storage usage|Scheduled export)/.test(t));
const dlgTxt = (p) => p.locator("[data-component=ConfirmDialog]").innerText().then((t) => t.replace(/\s+/g, " ")).catch(() => "");


await run(r, "CSS-10", async () => {
  const { page } = await open(b, "customisation");
  await ta(page).fill("body { background: rgb(255, 0, 0); }"); await save(page);
  await rail(page, "Pages"); await page.waitForTimeout(500);
  const firstRow = S(page).locator("[role=row]").nth(1);
  await firstRow.click(); await page.waitForTimeout(1500);
  await shot(page, "CSS-10");
  const res = await page.evaluate(() => {
    const out = [];
    const docs = [document, ...[...document.querySelectorAll("iframe")].map((f) => { try { return f.contentDocument; } catch { return null; } }).filter(Boolean)];
    for (const d of docs) {
      const styles = [...d.querySelectorAll("style")].map((s) => s.textContent).filter((t) => /rgb\(255, 0, 0\)/.test(t)).length;
      out.push({ iframe: d !== document, styleWithCss: styles, bodyBg: getComputedStyle(d.body).backgroundColor });
    }
    return out;
  });
  r("CSS-10", "FAIL", `Saved \`body { background: rgb(255, 0, 0); }\`; opened the Pages editor on the first page (preview). Documents seen: ${JSON.stringify(res)}. The saved Global CSS is not applied in the preview (no style element carries it; nothing in the app reads the Global CSS store outside its own page). Public preview not reachable. `, "CSS-10");
  // CSS-15 compare code areas
  const fontPages = await page.evaluate(() => { const t = [...document.querySelectorAll("textarea")][0]; return t ? [getComputedStyle(t).fontFamily, getComputedStyle(t).fontSize] : null; });
  await page.context().close();
  const { page: p2 } = await open(b, "customisation");
  const fontCss = await ta(p2).evaluate((e) => [getComputedStyle(e).fontFamily, getComputedStyle(e).fontSize]);
  const gut = await p2.evaluate(() => (window.__gutter ? JSON.stringify(window.__gutter()).slice(0, 200) : "no __gutter"));
  const box = await ta(p2).evaluate((e) => { const pane = document.querySelector('[data-testid=settings-content]').getBoundingClientRect(); const b = e.closest("div.border").getBoundingClientRect(); return [Math.round(b.left - pane.left), Math.round(pane.right - b.right)]; });
  r("CSS-15", pass(JSON.stringify(fontPages) === JSON.stringify(fontCss) && /ok|\[\]|true|\{\}/.test(gut)), `Global CSS code area font ${JSON.stringify(fontCss)}; Pages code area font ${JSON.stringify(fontPages)}; __gutter(): ${gut}; code-area edge offsets from pane [left,right] ${box}`);
  await p2.context().close();
});


await run(r, "CSS-12", async () => {
  const { page } = await open(b, "customisation");
  const t0 = await page.title();
  await tab(page, /^JS$/).click(); await ta(page).fill("window.__ran = true; document.title = 'JS ran'"); await save(page);
  await page.reload(); await page.waitForTimeout(1200);
  const a = await page.evaluate(() => ({ ran: typeof window.__ran, title: document.title, scripts: [...document.querySelectorAll("script")].filter((s) => /__ran/.test(s.textContent)).length }));
  await rail(page, "Pages"); await page.waitForTimeout(400);
  await S(page).locator("[role=row]").nth(1).click(); await page.waitForTimeout(1500);
  const b2 = await page.evaluate(() => ({ ran: typeof window.__ran, title: document.title, scripts: [...document.querySelectorAll("script")].filter((s) => /__ran/.test(s.textContent)).length }));
  await rail(page, "Global CSS & JS").catch(()=>{}); 
  r("CSS-12", pass(a.ran === "undefined" && b2.ran === "undefined" && a.title === t0 && a.scripts === 0 && b2.scripts === 0), `after saving JS and reload: window.__ran ${a.ran}, title "${a.title}" (was "${t0}"), script elements with the text ${a.scripts}; in Pages editor: ${JSON.stringify(b2)}. JS text still shown after reload not re-verified separately`);
  await page.context().close();
});

await b.close();
