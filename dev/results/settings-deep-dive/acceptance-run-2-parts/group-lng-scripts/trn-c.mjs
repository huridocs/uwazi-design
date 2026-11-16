// TRN-01 (with Filters), TRN-03 (menu), TRN-07 (relationship type, menu, filters keys follow their pages), desktop
import { launch, open, S, rows, title, dialogs, recorder, sh, section } from "./u.mjs";
const { rec, save } = recorder("./trn-c.json");
const b = await launch();
const real = (errs) => errs.filter(e => !/atomFamily is deprecated|fetchPriority|validateDOMNesting/.test(e));
const commit = (p) => p.locator("button:visible").filter({ hasText: /^(Save|Create template|Create relationship type)$/ }).last();
const keysOf = (p) => S(p).locator("[role=row]").evaluateAll(es => es.slice(1).map(e => e.querySelector("td,[role=cell]")?.innerText.trim()));
const toList = async (p) => { await section(p, "Translations"); if (await S(p).getByRole("button", { name: "Back" }).count()) { await S(p).getByRole("button", { name: "Back" }).first().click(); await p.waitForTimeout(500); } };
const ctxRows = async (p) => { await toList(p); return S(p).locator("[data-part=row]").evaluateAll(es => es.map(e => e.innerText.split("\n").map(x => x.trim()).filter(Boolean).slice(0, 3).join(" | "))); };
const openCtx = async (p, name, type) => { await toList(p); await S(p).locator("[data-part=row]").filter({ hasText: name }).filter({ hasText: type || "" }).first().click(); await p.waitForTimeout(700); };
const addFilterGroup = async (p, name) => {
  await section(p, "Filters");
  await S(p).getByRole("button", { name: /New group/ }).click(); await p.waitForTimeout(400);
  await S(p).getByLabel("Group name").fill(name);
  await S(p).locator("[data-part=row]").first().getByRole("combobox").click().catch(async () => { await S(p).locator("[data-part=row]").first().getByRole("button", { name: /No group/ }).click(); });
  await p.waitForTimeout(300);
  await p.getByRole("option", { name }).click(); await p.waitForTimeout(300);
  await commit(p).click(); await p.waitForTimeout(600);
};

// ---- TRN-03 menu context ----
{
  const { page: p, errors } = await open(b, "menu");
  const before = await ctxRows(p);
  await section(p, "Menu");
  await S(p).locator("[role=columnheader] input, thead input[type=checkbox], [role=checkbox]").first().click(); await p.waitForTimeout(300);
  await S(p).getByRole("button", { name: /^Delete/ }).last().click(); await p.waitForTimeout(500);
  const left = await S(p).locator("[data-part=row]").count();
  await commit(p).click(); await p.waitForTimeout(700);
  const after = await ctxRows(p);
  const hasMenu = after.some(r => /^Menu \| Menu/.test(r));
  // term N anywhere?
  const listTxt = await S(p).innerText();
  const termList = /\bterm \d+/i.test(listTxt);
  await openCtx(p, "User Interface", "User interface");
  await p.locator("input[placeholder*='Search' i]").first().fill("term "); await p.waitForTimeout(400);
  const termKeys = (await keysOf(p)).filter(k => /\bterm \d+/i.test(k));
  const s = await sh(p, "TRN-03");
  // restore a link
  await section(p, "Menu");
  await S(p).getByRole("button", { name: /Add link/ }).last().click(); await p.waitForTimeout(500);
  const dlg = p.locator("[role=dialog]:visible").last();
  const inputs = dlg.locator("input"); await inputs.nth(0).fill("Home"); await inputs.nth(1).fill("/library");
  await dlg.getByRole("button", { name: "Add", exact: true }).click(); await p.waitForTimeout(500);
  await commit(p).click(); await p.waitForTimeout(700);
  const restored = await ctxRows(p);
  const hasMenu2 = restored.some(r => /^Menu \| Menu \| 1/.test(r));
  const ok = before.some(r => /^Menu \| Menu \| 5/.test(r)) && left === 0 && !hasMenu && !termList && termKeys.length === 0 && hasMenu2;
  rec("TRN-03", ok ? "PASS" : "FAIL", `before: Menu context row present with 5 keys=${before.some(r => /^Menu \| Menu \| 5/.test(r))}; deleted all links (rows left=${left}) and saved; Translations System rows now ${JSON.stringify(after.filter(r => /Menu|User Interface/.test(r)))} (Menu present=${hasMenu}); text matching "term N" on the list=${termList}, in User Interface keys=${termKeys.length}; after adding link "Home" and saving: ${JSON.stringify(restored.filter(r => /Menu/.test(r)))}`, ok ? "" : s);
  rec("_errs-TC1", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- TRN-07 + TRN-01 ----
{
  const { page: p, errors } = await open(b, "translations");
  const r0 = await ctxRows(p);
  const sysBefore = r0.filter(r => /\| (Menu|Filters|User interface) \|/.test(r)).map(r => r.split(" | ")[0]);
  // Filters group
  await addFilterGroup(p, "Judicial cases");
  const r1 = await ctxRows(p);
  const sysAfter = r1.filter(r => /\| (Menu|Filters|User interface) \|/.test(r)).map(r => r.split(" | ")[0]);
  const s1 = await sh(p, "TRN-01-filters");
  const filtersRow = r1.find(r => /^Filters \| Filters/.test(r));
  await openCtx(p, "Filters", "Filters");
  const fKeys = await keysOf(p);
  // rename filter group
  await section(p, "Filters");
  await S(p).getByLabel("Group name").fill("Court matters"); await p.waitForTimeout(200);
  await commit(p).click(); await p.waitForTimeout(600);
  await openCtx(p, "Filters", "Filters");
  const fKeys2 = await keysOf(p);
  // relationship type context
  await openCtx(p, "Cites", "Relationship type");
  const rKeys = await keysOf(p);
  await section(p, "Relationship types");
  await S(p).locator("[data-part=row]").filter({ hasText: /^Cites/ }).first().getByText("Cites", { exact: true }).first().click(); await p.waitForTimeout(500);
  await p.locator("input:visible").first().fill("Cites also"); await commit(p).click(); await p.waitForTimeout(600);
  const relPageTxt = (await S(p).innerText()).replace(/\n+/g, " | ").slice(0, 120);
  await toList(p);
  const rr = (await S(p).locator("[data-part=row]").evaluateAll(es => es.map(e => e.innerText.split("\n")[0].trim())));
  const renamedCtx = rr.includes("Cites also") && !rr.includes("Cites");
  await section(p, "Relationship types");
  await S(p).getByRole("button", { name: /Add relationship type/ }).click(); await p.waitForTimeout(500);
  await p.locator("input:visible").first().fill("Zeta link"); await commit(p).click(); await p.waitForTimeout(600);
  await toList(p);
  const newCtx = (await S(p).locator("[data-part=row]").filter({ hasText: "Zeta link" }).count()) === 1;
  await section(p, "Relationship types");
  await S(p).getByRole("button", { name: "Delete Zeta link" }).click(); await p.waitForTimeout(500);
  { const cd = p.locator("[data-component=ConfirmDelete],[data-component=ConfirmDialog]"); if (await cd.count()) { await cd.getByRole("button", { name: /Delete/ }).last().click(); await p.waitForTimeout(600); } }
  await toList(p);
  const gone = (await S(p).locator("[data-part=row]").filter({ hasText: "Zeta link" }).count()) === 0;
  // menu keys per link
  await section(p, "Menu");
  const titles = await S(p).locator("[data-part=row]").evaluateAll(es => es.map(e => e.innerText.split("\n")[0].trim()));
  await openCtx(p, "Menu", "Menu");
  const mKeys = await keysOf(p);
  await section(p, "Menu");
  await S(p).getByRole("button", { name: /About.*(edit|Edit)|Edit About/ }).first().click().catch(async () => { await S(p).locator("[data-part=row]").filter({ hasText: "About" }).first().click(); });
  await p.waitForTimeout(500);
  const dlg = p.locator("[role=dialog]:visible").last();
  await dlg.locator("input").first().fill("About us");
  await dlg.getByRole("button", { name: /^(Save|Update|Add)$/ }).last().click(); await p.waitForTimeout(500);
  await commit(p).click(); await p.waitForTimeout(700);
  await openCtx(p, "Menu", "Menu");
  const mKeys2 = await keysOf(p);
  const s = await sh(p, "TRN-07");
  const okMenu = JSON.stringify([...mKeys].sort()) === JSON.stringify([...titles].sort()) && mKeys2.includes("About us") && !mKeys2.includes("About");
  const okF = fKeys.length === 1 && fKeys[0] === "Judicial cases" && fKeys2.length === 1 && fKeys2[0] === "Court matters";
  const okR = rKeys.length === 1 && rKeys[0] === "Cites" && renamedCtx && newCtx && gone;
  rec("TRN-07", okMenu && okF && okR ? "PASS" : "FAIL", `Relationship type "Cites" context keys=${JSON.stringify(rKeys)}; after renaming on Relationship types page the context is "Cites also"=${renamedCtx}; new type "Zeta link" adds a context=${newCtx}; deleting it removes it=${gone}; Menu links (${titles.length})=${JSON.stringify(titles)} vs Menu context keys=${JSON.stringify(mKeys)}; renaming About -> "About us" gives keys ${JSON.stringify(mKeys2)}; Filters group "Judicial cases" context keys=${JSON.stringify(fKeys)}, after renaming the group to "Court matters" keys=${JSON.stringify(fKeys2)}`, okMenu && okF && okR ? "" : s);
  const ok1 = sysAfter.includes("User Interface") && sysAfter.includes("Menu") && sysAfter.includes("Filters");
  rec("TRN-01 (Filters leg)", ok1 ? "PASS" : "FAIL", `System rows in the seed=${JSON.stringify(sysBefore)} (no Filters context because the seed has no Filters group); after saving one Filters group the System group lists ${JSON.stringify(sysAfter)}; Filters row: ${filtersRow}`, ok1 ? "" : s1);
  rec("_errs-TC2", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}
save();
await b.close();
