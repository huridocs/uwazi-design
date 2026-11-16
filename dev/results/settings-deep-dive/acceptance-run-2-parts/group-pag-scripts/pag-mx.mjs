import { dialogs, run, open, S, wait, check, listRows, clean, rowOf, footerBtn, dlgLoc, rail, rec, sh, axeOn, dark, contrastOf, hscroll, inTab } from "./g.mjs";
const guardDlg = (p) => p.locator("[data-component=ConfirmDialog],[data-component=ConfirmDelete]");
const mTab = async (p, name) => { await S(p).getByRole("button", { name: /^Section:/ }).tap(); await wait(p, 200); await p.getByRole("option", { name }).tap(); await wait(p, 300); };
const openNames = async (p) => (await dialogs(p)).filter((n) => n !== "Notifications" && n !== "Menu");
const inTop = (p) => p.evaluate(() => { const ds = [...document.querySelectorAll("[role=dialog]")].filter((e) => !e.closest("[inert]") && !e.hasAttribute("inert") && e.getBoundingClientRect().height > 0); const d = ds[ds.length - 1]; return !!d && d.contains(document.activeElement); });
const act = (p) => p.evaluate(() => (document.activeElement.tagName + ":" + (document.activeElement.getAttribute("aria-label") || document.activeElement.innerText || "").trim().slice(0, 24)));
const unlabeled = (p) => S(p).evaluate((root) => [...root.querySelectorAll("input,textarea,select,[role=combobox]")].filter((e) => { if (e.type === "hidden") return false; const n = e.getAttribute("aria-label") || e.getAttribute("aria-labelledby") || (e.id && root.ownerDocument.querySelector(`label[for="${e.id}"]`)) || e.closest("label"); return !n; }).map((e) => e.tagName));

/** one dialog on the phone: focus where, axe, Escape, focus after */
async function pcase(p, theme, name, openFn, expectFocus) {
  await openFn(); await wait(p, 600);
  const focusIn = await inTop(p); const f0 = await act(p);
  const vAll = await axeOn(p, "[role=dialog]:not([inert]):not([inert] *)");
  const v = vAll.filter((x) => /\((serious|critical)\)/.test(x));
  await sh(p, `X-07-${name}-390-${theme}`);
  await p.keyboard.press("Escape"); await wait(p, 500);
  const left = await openNames(p); const f1 = await act(p);
  return { ok: focusIn && v.length === 0 && left.length === 0 && new RegExp(expectFocus).test(f1), txt: `${name}: focus inside the top dialog on open=${focusIn} (activeElement ${f0.replace(/\n/g, " ")}), axe serious/critical ${JSON.stringify(v)}, Escape left open ${JSON.stringify(left)}, focus after "${f1.replace(/\n/g, " ")}" (expected ${expectFocus})` };
}

for (const theme of ["light", "dark"]) {
  await run("pag-mx-" + theme, async (b) => {
    const { page: p } = await open(b, "pages", "mobile");
    await wait(p, 1000);
    if (theme === "dark") await dark(p);
    // make a Published · edited row
    await S(p).getByRole("button", { name: "Edit Methodology" }).last().tap(); await wait(p, 800);
    await S(p).getByLabel("Title", { exact: true }).fill("Methodology edited"); await footerBtn(p, "Save").tap(); await wait(p, 500);
    await S(p).getByRole("button", { name: "Back" }).tap(); await wait(p, 500);
    await check(`X-08@390-${theme}`, p, async () => {
      const res = {};
      const pills = (await S(p).locator("[data-part=status]").allInnerTexts()).map(clean);
      for (const [i, t] of pills.entries()) if (t) res[t + "#" + i] = await contrastOf(p, "[data-testid=settings-content] [data-part=status]", i);
      const ok = Object.values(res).length >= 3 && Object.values(res).every((v) => v >= 4.5);
      return [ok, `Pages list status pill contrast (${theme}, 390, need 4.5): ${JSON.stringify(res)}`, `X-08-list-${theme}-390`];
    });
    await check(`X-07-list@390-${theme}`, p, async () => {
      const v = await axeOn(p, "[data-testid=settings-content]");
      const u = await unlabeled(p);
      return [v.length === 0 && u.length === 0, `axe on Pages list at 390 (${theme}): ${JSON.stringify(v)}; unlabeled inputs ${JSON.stringify(u)}`, `X-07-list-${theme}-390`];
    });
    await check(`X-07-listdlgs@390-${theme}`, p, async () => {
      const r = [];
      r.push(await pcase(p, theme, "picker", () => footerBtn(p, "Add page").tap(), "Add page"));
      r.push(await pcase(p, theme, "view", () => S(p).getByRole("button", { name: "View Partners" }).tap(), "View Partners"));
      // delete confirm stacked on the Actions sheet
      await S(p).getByRole("checkbox", { name: "Select Partners" }).tap(); await wait(p, 300);
      await S(p).locator("footer").getByRole("button", { name: "Actions" }).tap(); await wait(p, 600);
      await p.getByRole("button", { name: /^Delete/ }).last().tap(); await wait(p, 700);
      const focusIn = await inTop(p); const f0 = await act(p);
      const vv = (await axeOn(p, "[role=dialog]:not([inert]):not([inert] *)")).filter((x) => /\((serious|critical)\)/.test(x));
      await p.keyboard.press("Escape"); await wait(p, 500);
      const left = await openNames(p);
      const txt = `delete confirm stacked on the Actions sheet: focus inside on open=${focusIn} (${f0.replace(/\n/g, " ")}), axe serious/critical ${JSON.stringify(vv)}, Escape then left open ${JSON.stringify(left)}`;
      for (let i = 0; i < 3; i++) { if ((await openNames(p)).length) { await p.keyboard.press("Escape"); await wait(p, 400); } }
      await S(p).getByRole("button", { name: "Clear" }).tap().catch(() => {});
      return [r.every((x) => x.ok) && focusIn && vv.length === 0, r.map((x) => x.txt).join(" || ") + " || " + txt, `X-07-delete-390-${theme}`];
    });
    await check(`X-06@${theme}`, p, async () => {
      const hs = await hscroll(p);
      const out = [];
      // taps: View, Add page, selection -> Actions sheet -> Delete
      await S(p).getByRole("button", { name: "View Partners" }).tap(); await wait(p, 900); const v1 = (await openNames(p)).join(","); await p.keyboard.press("Escape"); await wait(p, 400);
      if ((await openNames(p)).length) { await dlgLoc(p).getByRole("button", { name: /Close|Back/ }).first().tap(); await wait(p, 400); }
      await footerBtn(p, "Add page").tap(); await wait(p, 700); const v2 = (await openNames(p)).join(","); await dlgLoc(p).getByRole("button", { name: "Cancel" }).tap(); await wait(p, 400);
      await S(p).getByRole("checkbox", { name: "Select Partners" }).tap(); await wait(p, 300);
      const bar = clean(await S(p).locator("footer").innerText());
      await S(p).locator("footer").getByRole("button", { name: "Actions" }).tap(); await wait(p, 600);
      const sheet = (await openNames(p)).join(",");
      await sh(p, `X-06-actions-${theme}`);
      const del = p.getByRole("button", { name: /^Delete/ }).last();
      await del.tap(); await wait(p, 700);
      const cd = await guardDlg(p).count();
      const focusIn = await inTop(p); const f0 = await act(p);
      await sh(p, `X-06-delete-${theme}`);
      await guardDlg(p).getByRole("button", { name: "Cancel" }).tap(); await wait(p, 500);
      const after = await openNames(p);
      const ok = hs.doc === 0 && hs.pane === 0 && v1 !== "" && v2 !== "" && /Selected 1 of 4/.test(bar) && sheet !== "" && cd === 1;
      return [ok, `hscroll ${JSON.stringify(hs)}; tap View opened "${v1}"; tap Add page opened "${v2}"; tap a row checkbox -> footer "${bar}"; tap Actions opened sheet "${sheet}"; tap Delete opened the delete dialog (count ${cd}), focus inside it=${focusIn} (${f0.replace(/\n/g, " ")}); Cancel tapped, dialogs left ${JSON.stringify(after)}; list shows rows not a table (no visible column headers)`, `X-06-delete-${theme}`];
    });
    await S(p).getByRole("button", { name: "Clear" }).tap().catch(() => {});
    await S(p).getByRole("button", { name: "Edit Methodology edited" }).last().tap(); await wait(p, 800);
    await check(`X-07-editor@390-${theme}`, p, async () => {
      const out = {};
      for (const t of ["Configuration", "HTML", "Javascript", "CSS"]) { await mTab(p, t); out[t] = await axeOn(p, "[data-testid=settings-content]"); out["unlabeled " + t] = await unlabeled(p); }
      await mTab(p, "Configuration");
      const bad = Object.entries(out).filter(([k, v]) => v.length);
      return [bad.length === 0, `axe on editor tabs at 390 (${theme}): ${JSON.stringify(out)}`, `X-07-editor-${theme}-390`];
    });
    await check(`X-08-editor@390-${theme}`, p, async () => {
      const sc = await contrastOf(p, "[data-testid=settings-content] footer [data-part=status]", 0);
      await sh(p, `X-08-editor-${theme}-390`);
      return [sc >= 4.5, `editor footer status pill contrast ${sc} (${theme}, 390)`, `X-08-editor-${theme}-390`];
    });
    await check(`X-07-dlgs@390-${theme}`, p, async () => {
      const r = [];
      r.push(await pcase(p, theme, "publish", () => S(p).getByRole("button", { name: "Publish", exact: true }).tap(), "Publish"));
      r.push(await pcase(p, theme, "restore", () => S(p).getByRole("button", { name: "Restore", exact: true }).tap(), "Restore"));
      // stacked: confirm over restore
      await S(p).getByRole("button", { name: "Restore", exact: true }).tap(); await wait(p, 500);
      await dlgLoc(p).locator("label").first().tap(); await dlgLoc(p).getByRole("button", { name: "Restore", exact: true }).tap(); await wait(p, 600);
      const focusIn = await inTop(p); const f0 = await act(p);
      const vv = (await axeOn(p, "[role=dialog]:not([inert]):not([inert] *)")).filter((x) => /\((serious|critical)\)/.test(x));
      await sh(p, `X-07-restore-confirm-stack-390-${theme}`);
      await p.keyboard.press("Escape"); await wait(p, 500);
      const left1 = await openNames(p);
      const stackedOk = focusIn && left1.length === 1 && left1[0] === "Restore previous version";
      const txt = `restore confirm stacked on the Restore sheet: focus inside confirm on open=${focusIn} (activeElement ${f0.replace(/\n/g, " ")}), axe serious/critical ${JSON.stringify(vv)}, Escape then left open ${JSON.stringify(left1)} (expected only "Restore previous version")`;
      // clean up
      for (let i = 0; i < 2; i++) { const d = guardDlg(p); if (await d.count()) await d.getByRole("button", { name: "Cancel" }).tap().catch(() => {}); await wait(p, 300); }
      if ((await openNames(p)).length) await dlgLoc(p).getByRole("button", { name: "Cancel" }).tap().catch(() => {});
      await wait(p, 300);
      return [r.every((x) => x.ok) && stackedOk && vv.length === 0, r.map((x) => x.txt).join(" || ") + " || " + txt, `X-07-restore-confirm-stack-390-${theme}`];
    });
  });
}
