import { run, open, S, wait, clean, sh, dialogs, rec, saveBtn, rail, guardBtn, nlist, newNotifs } from "./g.mjs";
await run("X-01-FLT", async (b) => {
  const { page } = await open(b, "filters");
  await S(page).getByLabel("Show Hearing").uncheck(); await wait(page);
  await saveBtn(page).click(); await wait(page);
  await rail(page, "Dashboard"); await wait(page, 500);
  await rail(page, "Filters"); await wait(page, 500);
  const a = await S(page).getByLabel("Show Hearing").isChecked();
  await page.reload(); await wait(page, 1500);
  const r = await S(page).getByLabel("Show Hearing").isChecked();
  await rail(page, "Dashboard"); await wait(page, 500);
  const reset = page.getByRole("button", { name: /Reset demo data/ });
  const n = await reset.count();
  if (n) { await reset.first().click(); await wait(page, 500); const c = page.locator('[data-component=ConfirmDialog],[data-component=ConfirmDelete]').getByRole("button", { name: /Reset|Accept|Confirm/ }); if (await c.count()) { await c.last().click(); await wait(page, 800); } }
  await rail(page, "Filters"); await wait(page, 800);
  const z = await S(page).getByLabel("Show Hearing").isChecked();
  rec("X-01", !a && !r && z ? "PASS" : "FAIL", `unticked Hearing, Save; after rail round trip checked=${a}; after reload checked=${r}; Reset demo data button count=${n}; after reset checked=${z}`, await sh(page, "X-01-FLT"));
});

await run("X-04-FLT", async (b) => {
  const { page } = await open(b, "filters");
  const bf = await nlist(page);
  await S(page).getByLabel("Show Hearing").uncheck(); await wait(page);
  await saveBtn(page).click(); await wait(page, 500);
  const n = await newNotifs(page, bf);
  rec("X-04", n.length === 1 && /^Filters saved/.test(n[0]) ? "PASS" : "FAIL", `one Save added Beacon entries ${JSON.stringify(n)} (one entry; expected the page's quoted text "Filters saved"); removing a group adds its own entry with Undo (FLT-11). Failure path: no failure switch, so the "An error occurred" entry was not driven`, await sh(page, "X-04-FLT"));
});
