// LNG-09, LNG-17 failure injection via the Dev panel (SD-1), desktop
import { backToSettings, launch, open, S, rows, title, recorder, sh, section, notifMatch, beacon, arm, logo, logEntries } from "./u.mjs";
const { rec, save } = recorder("./lng-c.json");
const b = await launch();
const real = (errs) => errs.filter(e => !/atomFamily is deprecated|fetchPriority|React does not recognize the `%s` prop/.test(e));
const names = (p) => S(p).locator("[role=row]").evaluateAll(els => els.map(e => e.innerText.replace(/\s+/g, " ").trim()).filter(t => t && !/^LANGUAGE/i.test(t)));
const D = (p) => p.locator("[data-component=InstallLanguagesModal]");
async function install(p, labels) {
  await S(p).getByRole("button", { name: "Install Language(s)" }).click();
  await p.waitForTimeout(300);
  for (const l of labels) await D(p).locator("[data-part=language]").filter({ hasText: l }).click();
  await D(p).locator("[data-part=confirm]").click();
}
const errEntries = (p) => notifMatch(p, /An error occurred/);
const armedState = async (p) => { await logo(p).click(); await p.waitForTimeout(600); const t = await p.locator("[data-component=DevPanel] [role=status]").first().innerText(); await p.getByRole("button", { name: /Return to app/ }).click(); await p.waitForTimeout(600); await backToSettings(p, "Languages"); return t; };
const pick = async (p, name, label) => { await S(p).getByRole("button", { name: `Actions for ${name}` }).click(); await p.waitForTimeout(200); await p.getByRole("menuitem", { name: label, exact: true }).click().catch(async () => { await p.locator("[role=menu] button", { hasText: label }).first().click(); }); await p.waitForTimeout(400); };

// ---- LNG-09 ----
{
  const { page: p, errors } = await open(b, "languages");
  const st = await arm(p, "Install or Uninstall", "Injected install failure for QA.");
  await install(p, ["German (de)"]);
  await p.waitForTimeout(500);
  const r1 = await names(p);
  await p.waitForTimeout(4200);
  const r2 = await names(p);
  const errs = await errEntries(p);
  const running = await notifMatch(p, /Installing languages/);
  const st2 = await armedState(p);
  const s9 = await sh(p, "LNG-09");
  const failedRow = r2.find(x => /German/.test(x)) || "";
  const failed = /failed/i.test(failedRow) && /Retry/.test(failedRow);
  const ok9 = failed && errs.length === 1 && running.length === 0 && /Injected install failure/.test(failedRow + errs.join(" "));
  rec("LNG-09", ok9 ? "PASS" : "FAIL", `armed status: "${st}"; German row during install="${r1.find(x => /German/.test(x))}"; after ~5s row="${failedRow}"; error entries "An error occurred"=${JSON.stringify(errs)}; running Installing tasks=${running.length}; Dev panel status afterwards: "${st2}"`, ok9 ? "" : s9);
  // information: row state is the console hook's? try the documented dev-only console hook
  rec("_errs-C1", real(errors).length ? "FAIL" : "PASS", JSON.stringify(real(errors)));
  await p.context().close();
}

// ---- LNG-09 (console hook, information only: does the failed UI exist?) ----
{
  const { page: p } = await open(b, "languages");
  await p.evaluate(() => window.__failNextLanguageInstall && window.__failNextLanguageInstall());
  await install(p, ["German (de)"]);
  await p.waitForTimeout(4200);
  const r = (await names(p)).find(x => /German/.test(x));
  const errs = await errEntries(p);
  const running = await notifMatch(p, /Installing languages/);
  // retry
  await S(p).getByRole("button", { name: "Retry" }).click().catch(() => {});
  await p.waitForTimeout(4200);
  const r3 = (await names(p)).find(x => /German/.test(x));
  const s = await sh(p, "LNG-09-consolehook");
  console.log("INFO | LNG-09 console-hook | row=" + r + " | errs=" + JSON.stringify(errs) + " | running=" + running.length + " | after Retry row=" + r3);
  rec("_info-LNG-09-hook", "INFO", `Console hook window.__failNextLanguageInstall: row="${r}"; error entries=${JSON.stringify(errs)}; running tasks=${running.length}; after Retry row="${r3}"`, s);
  await p.context().close();
}

// ---- LNG-17: Make default / Reset / Uninstall fail ----
const scenarios = [
  { name: "Make default (scope Save)", scope: "Save", lang: "Spanish", item: "Make default", needsConfirm: "default" },
  { name: "Reset (scope Save)", scope: "Save", lang: "Spanish", item: "Reset", needsConfirm: "reset" },
  { name: "Uninstall (scope Install or Uninstall)", scope: "Install or Uninstall", lang: "Spanish", item: "Uninstall", needsConfirm: "uninstall" },
  { name: "Uninstall (scope Delete)", scope: "Delete", lang: "Spanish", item: "Uninstall", needsConfirm: "uninstall" },
];
const outcomes = [];
for (const sc of scenarios) {
  const { page: p, errors } = await open(b, "languages");
  const st = await arm(p, sc.scope, "Injected failure for QA.");
  await pick(p, sc.lang, sc.item);
  if (sc.needsConfirm === "default") {
    await p.locator("[data-component=ConfirmDialog]").getByRole("button", { name: "Make default" }).click();
  } else {
    await p.locator("[role=dialog]").getByRole("textbox").fill("CONFIRM");
    await p.locator("[data-part=confirm]").click();
  }
  await p.waitForTimeout(2000);
  const r = await names(p);
  const errs = await errEntries(p);
  const notifs = (await notifMatch(p, /default language|reset|uninstall/i));
  const log = await logEntries(p);
  const stAfter = await armedState(p);
  const s = await sh(p, `LNG-17-${sc.name.split(" ")[0]}-${sc.scope.split(" ")[0]}`);
  const rowsTxt = r.map(x => x.split(" ")[0] + (/Default/.test(x) ? "*" : "")).join(",");
  const failedWell = errs.length === 1;
  outcomes.push({ sc, errs, failedWell, rowsTxt, notifs, stAfter, s });
  console.log("INFO | LNG-17 |", sc.name, "| armed:", st, "| errors:", JSON.stringify(errs), "| rows:", rowsTxt, "| related notifs:", JSON.stringify(notifs), "| after:", stAfter, "| activity:", JSON.stringify(log));
  await p.context().close();
}
for (const o of outcomes)
  rec(`_LNG-17 ${o.sc.name}`, o.failedWell ? "PASS" : "FAIL", `error entries=${JSON.stringify(o.errs)}; list rows afterwards=${o.rowsTxt}; success notices=${JSON.stringify(o.notifs)}; Dev panel after: "${o.stAfter}"`, o.s);
const ok17 = outcomes.filter(o => ["default", "reset"].includes(o.sc.needsConfirm)).every(o => o.failedWell) && outcomes.filter(o => o.sc.needsConfirm === "uninstall").some(o => o.failedWell);
rec("LNG-17", ok17 ? "PASS" : "FAIL", outcomes.map(o => `${o.sc.name}: ${o.failedWell ? "one 'An error occurred' entry" : "no error entry; action " + (o.notifs.length ? "succeeded (" + o.notifs.join(" ; ") + ")" : "ran")}`).join(" || "), ok17 ? "" : outcomes[0].s);
save();
await b.close();
