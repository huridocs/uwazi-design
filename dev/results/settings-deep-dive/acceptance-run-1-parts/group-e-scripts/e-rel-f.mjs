import { run, open, S, wait, clean, sh, rec, openRow, guardInfo } from "./g.mjs";
await run("REL-chevron", async (b) => {
  for (const [sec, row, field, name] of [["relationship-types", "Victim", "#relationship-type-name", "REL"], ["thesauri", "Regions", '[aria-label="Item label"]', "THS"]]) {
    const { page } = await open(b, sec, "mobile");
    await wait(page, 500);
    await S(page).locator("li, [role=row]").filter({ hasText: row }).first().tap(); await wait(page, 600);
    const inp = S(page).locator(field).first(); const v = await inp.inputValue();
    await inp.fill(v + "x"); await wait(page, 150);
    const back = page.getByRole("button", { name: /Back/ });
    const cnt = await back.count();
    await (cnt ? back.first() : S(page).locator("header").getByRole("button").first()).tap(); await wait(page, 500);
    const d = await guardInfo(page);
    await sh(page, `X-02-${name}-phone`);
    rec(`PHONE-CHEVRON@${name}`, d.length ? "PASS" : "FAIL", `phone, dirty editor, back chevron (${cnt ? "Back button" : "header first button"}) -> dialog ${JSON.stringify(d.map((x) => x.name))}`, `acceptance-run-1-shots/X-02-${name}-phone.png`);
    await page.context().close();
  }
});
