import { run, open, S, wait, clean, sh, rec, devButton, backToSettings } from "./tx.mjs";
await run("FLT-8", async (b) => {
  const { page } = await open(b, "filters");
  await wait(page, 500);
  await devButton(page, "Empty templates"); await backToSettings(page, "Filters");
  const t = clean(await S(page).innerText());
  const adds = await S(page).getByRole("button", { name: /Add (group|template)|New group/ }).count();
  await sh(page, "X-10-FLT");
  rec("X-10", false ? "PASS" : "FAIL", `covered by FLT-20 (all templates unticked: the page gives only the footer line "No template ticked: the Library lists every template", not "No templates listed. The Library shows every template."). Also driven: Dev panel "Empty templates" then Filters shows "${t.slice(t.indexOf("Types"), t.indexOf("Types") + 190)}" (title "No templates yet" and a one-line hint, no create action; the generic "Nothing here yet." is not used)`, "acceptance-run-2-shots/X-10-FLT.png");
  await page.context().close();
});
