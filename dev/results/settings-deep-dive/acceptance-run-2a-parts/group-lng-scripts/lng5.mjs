import { launch, open, S, shot, axe, rail } from "./lib.mjs";
import { mk, realErr } from "./rec.mjs";
import { squash, lngRows, goto, installLang, beacon, newBeacon, activity, contrastOf } from "./u.mjs";
import { switchTo, toSettings } from "./h.mjs";
const { rec, save } = mk("lng5");
const b = await launch();
const D = (p) => p.locator("[role=dialog]:not([inert] *)").last();
const menuPick = async (p, lang, item) => { await p.getByRole("button", { name: `Actions for ${lang}` }).click(); await p.waitForTimeout(200); await p.getByRole("menuitem", { name: item, exact: true }).click(); await p.waitForTimeout(400); };
const typed = async (p) => { const d = D(p); await d.locator("input").first().fill("CONFIRM"); await d.locator("[data-part=confirm]").click(); await p.waitForTimeout(500); };
const def = async (p) => (await lngRows(p)).filter((r) => /Default/.test(r)).map((r) => r.split(" (")[0]).join();

// ---------- X-01 persistence
{
  const { page } = await open(b, "languages");
  await installLang(page, ["German"], 4000);
  await menuPick(page, "Spanish", "Make default"); await D(page).getByRole("button", { name: "Make default", exact: true }).click(); await page.waitForTimeout(400);
  const s0 = await lngRows(page);
  await goto(page, "Dashboard"); await goto(page, "Languages");
  const s1 = await lngRows(page);
  await page.reload(); await page.waitForTimeout(1500);
  const title = await S(page).locator("h2").first().innerText();
  const s2 = await lngRows(page);
  await goto(page, "Dashboard");
  await S(page).getByRole("button", { name: "Reset demo data" }).click(); await page.waitForTimeout(400);
  const dd = await page.locator("[role=dialog]:not([inert] *)").count();
  if (dd) await D(page).getByRole("button", { name: /Reset/ }).last().click();
  await page.waitForTimeout(600);
  await goto(page, "Languages");
  const s3 = await lngRows(page);
  await shot(page, "X-01-languages");
  const same = (a, c) => JSON.stringify(a) === JSON.stringify(c);
  rec("X-01", same(s0, s1) && same(s0, s2) && s0.some((r) => /German/.test(r)) && s0.some((r) => /Spanish \(es\)Español.*Default|Spanish.*Default/.test(r)) && s3.length === 4 && !s3.some((r) => /German/.test(r)) && /English \(en\)Default/.test(s3.join("|")) ? "PASS" : "FAIL",
    `installed German + made Spanish default: ${JSON.stringify(s0)}; after rail round trip same=${same(s0, s1)}; after reload.(page "${title}") same=${same(s0, s2)}; after Dashboard > Reset demo data: ${JSON.stringify(s3)}`, "X-01-languages.png");
  await page.context().close();
}

// ---------- X-09 activity log through the UI
{
  const { page } = await open(b, "languages");
  await installLang(page, ["German"], 4000);
  await menuPick(page, "Spanish", "Make default"); await D(page).getByRole("button", { name: "Make default", exact: true }).click(); await page.waitForTimeout(400);
  await menuPick(page, "French", "Reset"); await typed(page);
  await menuPick(page, "German", "Uninstall"); await typed(page);
  const log = await activity(page);
  await rail(page, "Activity log"); await page.waitForTimeout(700);
  const ui = (await S(page).innerText()).split("\n").map(squash).filter((r) => /language/.test(r));
  await shot(page, "X-09-activity");
  const need = [/Installed language .German./, /Set .Spanish. as the default language/, /Reset language .French./, /Uninstalled language .German./];
  const missing = need.filter((re) => !log.some((l) => re.test(l)));
  rec("X-09", !missing.length && log.slice(0, 4).every((l) => /\[admin\]$/.test(l)) ? "PASS" : "FAIL", `sessionStorage log: ${JSON.stringify(log.slice(0, 5))}; missing ${JSON.stringify(missing.map(String))}; Activity log page rows ${JSON.stringify(ui)}`, "X-09-activity.png");
  await page.context().close();
}

// ---------- X-13 corpus scope
{
  const { page } = await open(b, "languages");
  await installLang(page, ["German"], 4000);
  const sample = await lngRows(page);
  await goto(page, "Users & Groups"); const usersA = squash(await S(page).innerText()).slice(0, 250);
  await switchTo(page, "CEJIL");
  await toSettings(page, "Languages");
  const cejil = await lngRows(page);
  await goto(page, "Users & Groups"); const usersB = squash(await S(page).innerText()).slice(0, 250);
  await shot(page, "X-13-cejil");
  await switchTo(page, "Sample");
  await toSettings(page, "Languages");
  const back = await lngRows(page);
  const t = (a) => JSON.stringify(a);
  rec("X-13", t(sample) !== t(cejil) && t(back) === t(sample) && usersA === usersB ? "PASS" : "FAIL", `Sample ${t(sample)}; CEJIL ${t(cejil)}; back on Sample ${t(back)}; Users & Groups unchanged=${usersA === usersB}`, "X-13-cejil.png");
  await page.context().close();
}

// ---------- X-07 a11y, focus handling
{
  const { page } = await open(b, "languages");
  const bad = (v) => v.filter((x) => /\((serious|critical)\)/.test(x));
  const out = {};
  out.page = bad(await axe(page));
  // row buttons unique names
  const names = await page.locator("[data-testid=settings-content] button").evaluateAll((e) => e.map((x) => (x.getAttribute("aria-label") || x.innerText).trim()));
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  // install modal
  await S(page).getByRole("button", { name: "Install Language(s)" }).click(); await page.waitForTimeout(400);
  out.install = bad(await axe(page));
  const dn = await D(page).getAttribute("aria-label") || await D(page).getAttribute("aria-labelledby");
  const unl = await D(page).locator("input").evaluateAll((e) => e.filter((i) => !(i.getAttribute("aria-label") || i.labels?.length || i.getAttribute("aria-labelledby"))).length);
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const f1 = await page.evaluate(() => document.activeElement?.textContent?.trim());
  // confirm dialog
  await menuPick(page, "Spanish", "Make default"); out.confirm = bad(await axe(page));
  const cname = await page.evaluate(() => { const d = [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]")).pop(); return d?.getAttribute("aria-label") || d?.getAttribute("aria-labelledby"); });
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const f2 = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  // typed dialogs
  await menuPick(page, "Spanish", "Reset"); out.reset = bad(await axe(page));
  const tn = await page.evaluate(() => { const d = [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]")).pop(); return d?.getAttribute("aria-label") || (d?.getAttribute("aria-labelledby") && document.getElementById(d.getAttribute("aria-labelledby"))?.textContent); });
  const tUnl = await D(page).locator("input").evaluateAll((e) => e.filter((i) => !(i.labels?.length || i.getAttribute("aria-label"))).length);
  let esc1 = false; await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  const stillOpen = await page.evaluate(() => [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]")).length);
  const f3 = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"));
  await menuPick(page, "French", "Uninstall"); out.uninstall = bad(await axe(page));
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  // Escape closes only the top layer: open install modal, Escape closes modal, page remains
  const all = Object.entries(out).map(([k, v]) => `${k}: ${v.length ? JSON.stringify(v) : "none"}`).join("; ");
  const ok = Object.values(out).every((v) => !v.length) && !dupes.length && dn && unl === 0 && /Install Language/.test(f1) && cname && /Actions for Spanish/.test(f2) && tn === "Are you sure?" && tUnl === 0 && stillOpen === 0 && /Actions for Spanish/.test(f3);
  rec("X-07", ok ? "PASS" : "FAIL", `axe serious/critical ${all}; duplicate button names in the pane ${JSON.stringify(dupes)}; install dialog name "${dn}", unlabeled inputs ${unl}; focus after Escape: install modal -> "${f1}", confirm -> "${f2}", typed dialog -> "${f3}"; confirm dialog name "${cname}"; typed dialog name "${tn}", unlabeled inputs ${tUnl}, still open after Escape=${stillOpen}`);
  await page.context().close();
}

// ---------- X-08 dark mode contrast
{
  const { page } = await open(b, "languages");
  await page.evaluate(() => document.documentElement.classList.add("dark")); await page.waitForTimeout(300);
  const res = {};
  res.defaultBadgeDark = await contrastOf(page, "[data-testid=settings-content] [data-part=default]");
  await page.evaluate(() => document.documentElement.classList.remove("dark")); await page.waitForTimeout(200);
  res.defaultBadgeLight = await contrastOf(page, "[data-testid=settings-content] [data-part=default]");
  // installing + failed
  await page.evaluate(() => window.__failNextLanguageInstall());
  await S(page).getByRole("button", { name: "Install Language(s)" }).click(); await page.waitForTimeout(300);
  await D(page).locator("[data-part=language]").filter({ hasText: "German" }).first().click();
  await page.waitForTimeout(150);
  res.selectedPillLight = await contrastOf(page, "[role=dialog] [data-part=language] span.bg-success-light");
  await page.evaluate(() => document.documentElement.classList.add("dark")); await page.waitForTimeout(200);
  res.selectedPillDark = await contrastOf(page, "[role=dialog] [data-part=language] span.bg-success-light");
  res.selectPillDark = await contrastOf(page, "[role=dialog] [data-part=language] span.bg-warm");
  await D(page).getByRole("button", { name: /^Install \(1\)/ }).click(); await page.waitForTimeout(400);
  res.installingDark = await contrastOf(page, "[data-part=installing]");
  await page.evaluate(() => document.documentElement.classList.remove("dark")); await page.waitForTimeout(200);
  res.installingLight = await contrastOf(page, "[data-part=installing]");
  await page.waitForTimeout(3600);
  res.failedLight = await contrastOf(page, "[data-part=failed]");
  await page.evaluate(() => document.documentElement.classList.add("dark")); await page.waitForTimeout(200);
  res.failedDark = await contrastOf(page, "[data-part=failed]");
  await shot(page, "X-08-dark");
  const vals = Object.values(res); const low = Object.entries(res).filter(([k, v]) => v === null || v < 4.5);
  rec("X-08", !low.length ? "PASS" : "FAIL", `contrast ratios (need 4.5): ${JSON.stringify(res)}${low.length ? "; below 4.5 or not found: " + JSON.stringify(low) : ""}`, "X-08-dark.png");
  await page.context().close();
}
save(); await b.close();
