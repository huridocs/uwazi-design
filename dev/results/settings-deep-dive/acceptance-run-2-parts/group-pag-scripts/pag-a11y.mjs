import { dialogs, run, open, S, wait, check, listRows, clean, rowOf, footerBtn, editPage, dlgLoc, rail, rec, sh, inTab, axeOn, dark, contrastOf } from "./g.mjs";
const guardDlg = (p) => p.locator("[data-component=ConfirmDialog]");
const pubBtn = (p) => S(p).getByRole("button", { name: "Publish", exact: true });
const resBtn = (p) => S(p).getByRole("button", { name: "Restore", exact: true });
const unlabeled = (p) => S(p).evaluate((root) => [...root.querySelectorAll("input,textarea,select,[role=combobox]")].filter((e) => { if (e.type === "hidden") return false; const n = e.getAttribute("aria-label") || e.getAttribute("aria-labelledby") || (e.id && root.ownerDocument.querySelector(`label[for="${e.id}"]`)) || e.closest("label"); return !n; }).map((e) => e.tagName + ":" + (e.type || "") + ":" + (e.className || "").toString().slice(0, 30)));
const inTop = (p) => p.evaluate(() => { const ds = [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]") && !e.hasAttribute("inert")); const d = ds[ds.length - 1]; return !!d && d.contains(document.activeElement); });
const trap = async (p, n = 14) => { const outside = []; for (let i = 0; i < n; i++) { await p.keyboard.press("Tab"); if (!(await inTop(p))) outside.push(i); } for (let i = 0; i < 3; i++) { await p.keyboard.press("Shift+Tab"); if (!(await inTop(p))) outside.push("s" + i); } return outside; };
const activeName = (p) => p.evaluate(() => (document.activeElement.getAttribute("aria-label") || document.activeElement.innerText || "").trim().slice(0, 40));
const openNames = async (p) => (await dialogs(p)).filter((n) => n !== "Notifications");

/** open a dialog, check role/name/axe/trap, close with Escape, check focus restored to the opener */
async function dlgCase(p, theme, name, openFn, expectedFocus, extra) {
  await openFn(); await wait(p, 450);
  const d = dlgLoc(p);
  const role = await d.getAttribute("role");
  const lb = await d.getAttribute("aria-labelledby");
  const aname = (await d.getAttribute("aria-label")) || (lb ? await p.evaluate((id) => document.getElementById(id)?.innerText, lb) : "");
  const vAll = await axeOn(p, "[role=dialog]:not([inert]):not([inert] *)");
  const v = vAll.filter((x) => /\((serious|critical)\)/.test(x));
  const minor = vAll.filter((x) => !/\((serious|critical)\)/.test(x));
  const esc = await trap(p);
  await sh(p, `X-07-${name}-${theme}`);
  let extraTxt = "";
  if (extra) extraTxt = await extra();
  await p.keyboard.press("Escape"); await wait(p, 450);
  const left = await openNames(p);
  const foc = await activeName(p);
  const ok = role === "dialog" && !!clean(aname || "") && v.length === 0 && esc.length === 0 && left.length === 0 && new RegExp(expectedFocus).test(foc);
  return { ok, txt: `${name}: role=${role}, name "${clean(aname || "")}", axe serious/critical ${JSON.stringify(v)} (moderate/minor: ${JSON.stringify(minor.map((x) => x.split(":")[0]))}), focus left the dialog on Tab/Shift+Tab ${esc.length}x, Escape closed it (left open ${JSON.stringify(left)}), focus after close "${foc}" (expected ${expectedFocus})${extraTxt}` };
}

for (const theme of ["light", "dark"]) {
  await run("pag-a11y-" + theme, async (b) => {
    const { page: p } = await open(b, "pages");
    await wait(p, 800);
    if (theme === "dark") await dark(p);
    // a "Published · edited" row
    await editPage(p, "Methodology"); await S(p).getByLabel("Title", { exact: true }).fill("Methodology edited"); await footerBtn(p, "Save").click(); await wait(p, 500);
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 500);
    await check(`X-08@${theme}`, p, async () => {
      const res = {};
      const pills = (await S(p).locator("[data-part=status]").allInnerTexts()).map(clean);
      const blank = pills.filter((t) => !t).length;
      for (const [i, t] of pills.entries()) if (t) res[t + "#" + i] = await contrastOf(p, "[data-testid=settings-content] [data-part=status]", i);
      const ok = pills.includes("Draft") && pills.includes("Published") && pills.includes("Published · edited") && Object.values(res).every((v) => v >= 4.5);
      return [ok, `Pages list status pill contrast (${theme}, 1280, need 4.5): ${JSON.stringify(res)}`, `X-08-list-${theme}-1280`];
    });
    await check(`X-07-list@${theme}`, p, async () => {
      const v = await axeOn(p, "[data-testid=settings-content]");
      const u = await unlabeled(p);
      const names = await S(p).locator("button").evaluateAll((bs) => bs.map((x) => x.getAttribute("aria-label") || x.innerText.trim()).filter(Boolean));
      const dup = names.filter((n, i) => names.indexOf(n) !== i);
      return [v.length === 0 && u.length === 0 && dup.length === 0, `axe on Pages list (${theme}): ${JSON.stringify(v)}; unlabeled inputs ${JSON.stringify(u)}; duplicate button names ${JSON.stringify(dup)}`, `X-07-list-${theme}`];
    });
    await check(`X-07-listdlgs@${theme}`, p, async () => {
      const r = [];
      r.push(await dlgCase(p, theme, "picker", () => footerBtn(p, "Add page").click(), "Add page"));
      r.push(await dlgCase(p, theme, "view", () => S(p).getByRole("button", { name: "View Methodology edited" }).click(), "View Methodology edited"));
      await S(p).getByRole("checkbox", { name: "Select Partners" }).click();
      r.push(await dlgCase(p, theme, "delete", () => footerBtn(p, "Delete").click(), "Delete"));
      return [r.every((x) => x.ok), r.map((x) => x.txt).join(" || "), `X-07-delete-${theme}`];
    });
    await S(p).getByRole("button", { name: "Clear" }).click().catch(() => {});
    await editPage(p, "Methodology edited");
    await check(`X-07-editor@${theme}`, p, async () => {
      const out = {};
      for (const t of ["Configuration", "HTML", "Javascript", "CSS"]) { await inTab(p, t); out[t] = await axeOn(p, "[data-testid=settings-content]"); if (t !== "Configuration") out["unlabeled " + t] = await unlabeled(p); }
      await inTab(p, "Configuration"); out["unlabeled Configuration"] = await unlabeled(p);
      const bad = Object.entries(out).filter(([k, v]) => v.length);
      return [bad.length === 0, `axe on editor tabs (${theme}): ${JSON.stringify(out)}`, `X-07-editor-${theme}`];
    });
    await check(`X-08-editor@${theme}`, p, async () => {
      const sc = await contrastOf(p, "[data-testid=settings-content] footer [data-part=status]", 0);
      await inTab(p, "HTML"); await sh(p, `X-08-editor-html-${theme}-1280`); await inTab(p, "Configuration");
      return [sc >= 4.5, `editor footer status pill contrast ${sc} (${theme}); editor screenshots X-08-editor-${theme}-1280 / -html- reviewed`, `X-08-editor-${theme}-1280`];
    });
    await check(`X-07-editordlgs@${theme}`, p, async () => {
      const r = [];
      r.push(await dlgCase(p, theme, "publish", () => pubBtn(p).click(), "Publish"));
      // restore modal then confirm on top: Escape closes only the confirm
      r.push(await dlgCase(p, theme, "restore", () => resBtn(p).click(), "Restore", async () => {
        const d = dlgLoc(p); await d.locator("label").first().click(); await d.getByRole("button", { name: "Restore", exact: true }).click(); await wait(p, 400);
        const cd = await guardDlg(p).count(); const v = await axeOn(p, "[data-component=ConfirmDialog] [role=dialog]");
        await p.keyboard.press("Escape"); await wait(p, 400);
        const after = await openNames(p);
        await sh(p, `X-07-restore-confirm-${theme}`);
        return `; Restore confirm opened=${cd === 1}, axe on confirm (all impacts) ${JSON.stringify(v.map((x) => x.split(":")[0]))}, Escape on the confirm left ${JSON.stringify(after)} open (the Restore modal stays)`;
      }));
      await inTab(p, "HTML");
      r.push(await dlgCase(p, theme, "palette", () => S(p).getByRole("button", { name: "Insert component" }).click(), "Insert component"));
      const ok = r.every((x) => x.ok) && /Escape on the confirm left \["Restore previous version"\]/.test(r[1].txt);
      return [ok, r.map((x) => x.txt).join(" || "), `X-07-restore-confirm-${theme}`];
    });
  });
}
