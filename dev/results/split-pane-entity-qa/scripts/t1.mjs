import { launch, state, sig, setView, other, OUT } from "./lib2.mjs";
const paths = {
  card: async (page, side) => { await page.locator(`[data-library-pane=${side}]`).getByRole("button", { name: /^Open$/ }).first().click(); },
  preview: async (page, side) => { const p = page.locator(`[data-library-pane=${side}]`); await p.getByRole("button", { name: /^Preview / }).first().click({ force: true }); await page.waitForTimeout(900); await page.getByRole("button", { name: /View entity/ }).first().click(); },
  listrow: async (page, side) => { await setView(page, side, "List"); const p = page.locator(`[data-library-pane=${side}]`); await p.locator('tbody tr, [role=row]').nth(1).locator('button').first().click({ force: true }); await page.waitForTimeout(800); const v = page.getByRole("button", { name: /View entity|Open entity/ }); if (await v.count()) await v.first().click(); },
};
const only = process.argv[2];
for (const [name, fn] of Object.entries(paths)) {
  if (only && only !== name) continue;
  for (const sync of [false, true]) for (const side of ["left", "right"]) {
    const { browser, page, logs } = await launch({ sync });
    const before = await sig(page, other(side));
    try { await fn(page, side); } catch (e) { console.log(name, sync, side, "ERR", e.message.split("\n")[0]); }
    await page.waitForTimeout(2000);
    const st = await state(page); const after = await sig(page, other(side));
    console.log(name.padEnd(8), "sync", sync ? "ON " : "OFF", side.padEnd(5), JSON.stringify({ split: st.split, L: st.left?.entityOpen, R: st.right?.entityOpen, title: st[side]?.h?.slice(0, 30), otherSame: before.h === after.h, scrollX: st.scrollX }), logs.length ? logs : "");
    if (sync === false && side === "right") await page.screenshot({ path: `${OUT}/open-${name}-right-unsynced.png` });
    await browser.close();
  }
}
