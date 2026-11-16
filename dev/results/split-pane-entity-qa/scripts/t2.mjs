import { launch, state, sig, setView, other, OUT } from "./lib2.mjs";
const prep = async (page, side) => { const p = page.locator(`[data-library-pane=${side}]`); await p.getByPlaceholder(/Search title/).fill("reparaciones"); await page.keyboard.press("Enter"); await page.waitForTimeout(2000); await setView(page, side, "Adv. Search"); await page.waitForTimeout(1500); };
const paths = {
  passage: async (page, side) => { await page.locator(`[data-library-pane=${side}]`).getByRole("button", { name: /^Page \d+, \d+ matches/ }).first().click(); },
  advresult: async (page, side) => { await page.locator(`[data-library-pane=${side}]`).getByRole("button", { name: /^Gómez Virula/ }).first().click(); await page.waitForTimeout(800); const v = page.getByRole("button", { name: /View entity/ }); if (await v.count()) await v.first().click(); },
};
for (const [name, fn] of Object.entries(paths)) for (const sync of [false, true]) for (const side of ["left", "right"]) {
  const { browser, page, logs } = await launch({ sync });
  await prep(page, side);
  const before = await sig(page, other(side));
  try { await fn(page, side); } catch (e) { console.log(name, sync, side, "ERR", e.message.split("\n")[0]); }
  await page.waitForTimeout(3000);
  const st = await state(page); const after = await sig(page, other(side));
  console.log(name.padEnd(9), "sync", sync ? "ON " : "OFF", side.padEnd(5), JSON.stringify({ split: st.split, L: st.left?.entityOpen, R: st.right?.entityOpen, tabs: st[side]?.tabs, title: st[side]?.h?.slice(0, 28), otherSame: before.h === after.h, scrollX: st.scrollX }), logs.length ? logs : "");
  if (!sync && side === "right") await page.screenshot({ path: `${OUT}/open-${name}-right-unsynced.png` });
  await browser.close();
}
