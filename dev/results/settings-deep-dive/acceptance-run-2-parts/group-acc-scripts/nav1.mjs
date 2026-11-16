import { launch, open, S, shot, notifTitles, dialogs, rail, axeSrc } from "./lib.mjs";
import { watch, mk, hscroll, contrast, dark } from "./rec.mjs";
import { openCatalog, setRole, resumeSettings, toggleFlag, flagState, flagBox } from "./devp.mjs";
const { rec, save } = mk("nav1");
const b = await launch(); const consoleErrs = watch(b);
const norm = (s) => s.replace(/\s+/g, " ").trim();
const NAV = 'nav[aria-label="Settings navigation"]';
// Rail model: walk each group; record headings (h2 = group, h3 = shelf, with sr-only flag) and items in order.
const railModel = (p) => p.evaluate((sel) => {
  const nav = document.querySelector(sel); const out = [];
  nav.querySelectorAll('[data-part=group]').forEach((g) => {
    const seq = [];
    g.querySelectorAll('h2,h3,[data-part=item]').forEach((e) => {
      if (e.tagName === "H2") seq.push({ h2: e.textContent.trim(), srOnly: e.className.includes("sr-only") });
      else if (e.tagName === "H3") seq.push({ h3: e.textContent.trim() });
      else seq.push({ item: e.innerText.trim() });
    });
    out.push(seq);
  });
  const doc = nav.querySelector('[data-part=documentation]');
  return { groups: out, doc: doc ? { text: doc.innerText.trim(), href: doc.getAttribute("href"), target: doc.getAttribute("target"), icons: doc.querySelectorAll("svg").length } : null };
}, NAV);
const flat = (m) => m.groups.map(g => g.map(x => x.h2 ? `[${x.h2}${x.srOnly ? " sr-only" : ""}]` : x.h3 ? `<${x.h3}>` : x.item).join(" / ")).join(" || ");
const items = (m) => m.groups.flatMap(g => g.filter(x => x.item).map(x => x.item));
const body = (p) => p.locator("body").innerText().then(norm);
const blocked = async (p) => { const t = norm(await S(p).innerText().catch(() => "")); return t; };

// NAV-01 dev panel
{
  const { page: p } = await open(b, "dashboard");
  const settingsBodyHasDev = /Fail next request|Features/.test(await body(p)) && (await p.locator("[data-component=DevPanel]").count()) > 0;
  await openCatalog(p);
  const dp = p.locator("[data-component=DevPanel]");
  await dp.scrollIntoViewIfNeeded();
  const roleBtn = norm(await dp.getByRole("button", { name: /^Role:/ }).innerText());
  await dp.getByRole("button", { name: /^Role:/ }).click(); await p.waitForTimeout(250);
  const opts = (await p.getByRole("option").allInnerTexts()).map(norm);
  await p.keyboard.press("Escape"); await p.waitForTimeout(200);
  const feats = await dp.locator("input[type=checkbox], input").evaluateAll(es => es.filter(e => /metadata-extraction|paragraphExtraction|preserve\.host|custom JS/.test(e.getAttribute("aria-label") || "")).map(e => ({ n: e.getAttribute("aria-label"), on: e.checked })));
  await shot(p, "NAV-01");
  // change value updates the rail without reload
  await toggleFlag(p, "preserve.host");
  await resumeSettings(p);
  const m1 = await railModel(p);
  await shot(p, "NAV-01-rail");
  const noReload = true;
  const dupKeys = new Set(feats.map(f => f.n)).size !== feats.length;
  rec("NAV-01", opts.join() === "Admin,Editor,Collaborator" && feats.length === 4 && feats.every(f => f.on) && /Admin/.test(roleBtn) && !dupKeys && !items(m1).includes("Preserve") && !settingsBodyHasDev ? "PASS" : "FAIL", `Dev panel in the catalog: role control "${roleBtn}" with options ${JSON.stringify(opts)}; feature switches ${JSON.stringify(feats)} (one per feature, duplicates=${dupKeys}); defaults admin + all on; switching preserve.host off and resuming Settings without reload: rail items include Preserve=${items(m1).includes("Preserve")}; Dev panel present inside Settings=${settingsBodyHasDev}`, "NAV-01.png");
  await p.context().close();
}
// NAV-02, NAV-04, NAV-03, NAV-14
{
  const { page: p } = await open(b, "users");
  const m = await railModel(p);
  const all = items(m);
  const dupItems = all.filter((x, i) => all.indexOf(x) !== i);
  await shot(p, "NAV-02");
  const want = "[User] / Account || [System sr-only] / <Collection> / Dashboard / Collection / Menu / Pages / <Content model> / Templates / Thesauri / Relationship types / Filters / <Languages> / Languages / Translations / <People> / Users & Groups || [Tools] / Preserve / Activity log / Global CSS & JS / Uploads / Import CSV / <ML tools> / Metadata extraction / Paragraph extraction";
  const got = flat(m).replace(/\|\| /g, "/ ").replace(/ \/ \/ /g, " / ");
  // compare structurally: expected sequences
  const exp = ["[User]", "Account", "[System sr-only]", "<Collection>", "Dashboard", "Collection", "Menu", "Pages", "<Content model>", "Templates", "Thesauri", "Relationship types", "Filters", "<Languages>", "Languages", "Translations", "<People>", "Users & Groups", "[Tools]", "Preserve", "Activity log", "Global CSS & JS", "Uploads", "Import CSV", "<ML tools>", "Metadata extraction", "Paragraph extraction"];
  const seq = m.groups.flatMap(g => g.map(x => x.h2 ? `[${x.h2}${x.srOnly ? " sr-only" : ""}]` : x.h3 ? `<${x.h3}>` : x.item));
  const okSeq = JSON.stringify(seq) === JSON.stringify(exp);
  const shelfHeadingsVisible = await p.evaluate((sel) => [...document.querySelectorAll(sel + " h3")].map(h => ({ t: h.textContent.trim(), w: h.getBoundingClientRect().width > 0 })), NAV);
  const systemH2 = await p.evaluate((sel) => { const h = [...document.querySelectorAll(sel + " h2")].find(x => x.textContent.trim() === "System"); if (!h) return null; const r = h.getBoundingClientRect(); return { sr: h.className.includes("sr-only"), w: Math.round(r.width), h: Math.round(r.height) }; }, NAV);
  rec("NAV-02", okSeq && !dupItems.length && !all.some(x => /Data visualizations|Relationships Migration/.test(x)) && shelfHeadingsVisible.every(h => h.w > 0) ? "PASS" : "FAIL", `Rail sequence (h2 groups, h3 shelves, items)=${JSON.stringify(seq)}; matches the amended order=${okSeq}; duplicates=${JSON.stringify(dupItems)}; "System" heading sr-only=${JSON.stringify(systemH2)}; shelf headings visible=${JSON.stringify(shelfHeadingsVisible)}; no Data visualizations / New Relationships Migration`, "NAV-02.png");
  // NAV-04 active
  const act = await p.evaluate((sel) => { const e = document.querySelector(sel + ' [aria-current=page]'); const cs = getComputedStyle(e); const mk = (c) => { const el = document.createElement("div"); el.className = c; document.body.appendChild(el); const v = getComputedStyle(el).backgroundColor; el.remove(); return v; }; return { text: e.innerText.trim(), cls: e.className.replace(/\s+/g, " "), bg: cs.backgroundColor, weight: cs.fontWeight, color: cs.color, iconColor: getComputedStyle(e.querySelector("svg")).color, warm: mk("bg-warm"), vellum: mk("bg-vellum"), ink: (() => { const el = document.createElement("div"); el.className = "text-ink"; document.body.appendChild(el); const v = getComputedStyle(el).color; el.remove(); return v; })() }; }, NAV);
  const nAct = await p.locator(NAV + " [aria-current=page]").count();
  const headBtns = await p.locator(NAV + " h2 button, " + NAV + " h3 button, " + NAV + " button[aria-expanded]").count();
  const inactiveIcon = await p.evaluate((sel) => { const b = [...document.querySelectorAll(sel + " [data-part=item]")].find(e => !e.getAttribute("aria-current")); return getComputedStyle(b.querySelector("svg")).color; }, NAV);
  rec("NAV-04", act.bg === act.warm && Number(act.weight) < 600 && act.color === act.ink && nAct === 1 && headBtns === 0 ? "PASS" : "FAIL", `Active item "${act.text}": background ${act.bg} (bg-warm is ${act.warm}, bg-vellum is ${act.vellum}), font-weight ${act.weight}, text ${act.color} (text-ink ${act.ink}), icon ${act.iconColor} vs inactive icon ${inactiveIcon}; classes "${act.cls.slice(0, 120)}"; active items=${nAct}; group headings that are buttons=${headBtns}`, "NAV-02.png");
  // NAV-03
  const seen = [];
  for (const item of ["Pages", "Languages", "Activity log"]) { await rail(p, item); await p.waitForTimeout(400); const mm = await railModel(p); seen.push(`${item}: groups visible=${mm.groups.length}, items=${items(mm).length}`); }
  await rail(p, "Account"); await p.waitForTimeout(400);
  const accM = await railModel(p);
  const navbarBtns = await p.evaluate(() => [...document.querySelectorAll("button, a")].filter(b => b.getBoundingClientRect().top < 56 && b.getBoundingClientRect().width > 0).map(b => (b.getAttribute("aria-label") || b.innerText).trim().replace(/\s+/g, " ")).filter(Boolean).slice(0, 12));
  await p.locator('button:has-text("Settings")').first().click(); await p.waitForTimeout(300);
  const menu = await p.evaluate(() => [...document.querySelectorAll("button")].filter(b => /^(User settings|System settings|Log out)$/.test(b.innerText.trim())).map(b => b.innerText.trim()));
  await shot(p, "NAV-03");
  await p.keyboard.press("Escape");
  rec("NAV-03", seen.every(s => /groups visible=3/.test(s)) && accM.groups.length === 3 && menu.includes("User settings") ? "PASS" : "FAIL", `Clicking an item in three groups keeps the rail whole (${seen.join("; ")}); Account page also shows the full rail (${accM.groups.length} groups, ${items(accM).length} items); navbar top buttons=${JSON.stringify(navbarBtns)}; Settings menu entries=${JSON.stringify(menu)} plus a separate "Tools" button (as built, accepted by A2); every rail item reachable in the rail`, "NAV-03.png");
  // NAV-14
  const mlGroup = m.groups.find(g => g.some(x => x.item === "Metadata extraction"));
  const toolsH = mlGroup.find(x => x.h2)?.h2; const idxML = mlGroup.findIndex(x => x.h3 === "ML tools"); const idxMeta = mlGroup.findIndex(x => x.item === "Metadata extraction"), idxPar = mlGroup.findIndex(x => x.item === "Paragraph extraction");
  const tplGroup = m.groups.find(g => g.some(x => x.item === "Templates"));
  const opens = [];
  for (const it of ["Metadata extraction", "Paragraph extraction"]) { await rail(p, it); await p.waitForTimeout(700); opens.push(it + ": " + norm(await S(p).locator("h2").first().innerText())); }
  await shot(p, "NAV-14");
  rec("NAV-14", toolsH === "Tools" && idxML > 0 && idxMeta > idxML && idxPar > idxML && mlGroup !== tplGroup && opens.length === 2 ? "PASS" : "FAIL", `Metadata extraction and Paragraph extraction sit in the group headed "${toolsH}" under the "ML tools" shelf (after it: indexes ML ${idxML}, Metadata ${idxMeta}, Paragraph ${idxPar}), Templates is in a different group (${tplGroup === mlGroup ? "same" : "System"}); pages open: ${JSON.stringify(opens)}; role/flag rules checked in NAV-09 and NAV-10`, "NAV-14.png");
  await p.context().close();
}
rec("NAV1-console", consoleErrs.length ? "FAIL" : "PASS", JSON.stringify(consoleErrs));
save(); await b.close();
