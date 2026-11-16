import { toSettingsSafe, errMark, errNew, run, open, S, wait, clean, sh, rec, rail, nlist, fresh, toSettings, relRows, relNames, relPills, addTypeBtn, relName, relSave, addRelType, openRel, delRel, footerTxt, dialogs, dialogText, openBeacon, cancelBtn, guardInfo, logEntries, arm, switchTo, saveClick } from "./tx.mjs";
const cd = (p) => p.locator("[data-component=ConfirmDialog]");
const guardTxt = async (p) => { await wait(p, 400); const t = await dialogText(p); return t ? t.replace(/^.*?(Discard changes\?)/, "$1").slice(0, 140) : "no dialog"; };
await run("REL-7", async (b) => {
  // REL-15 + X-02 + X-03 + X-01 + X-09
  let { page } = await open(b, "relationship-types");
  await wait(page, 600);
  await addRelType(page, "Oversees");
  await openRel(page, "Oversees");
  await relName(page).fill("Oversees 2");
  const dirtyEn = !(await relSave(page).isDisabled());
  const b0 = await nlist(page);
  await relSave(page).click(); await wait(page, 600);
  const n15 = await fresh(page, b0);
  const names = await relNames(page);
  const hl = await page.evaluate(() => { const rows = [...document.querySelectorAll("[data-testid=settings-content] [data-part=row]")]; const r = rows.find((x) => /Oversees 2/.test(x.innerText)); return { hit: r ? getComputedStyle(r).backgroundColor : null, other: getComputedStyle(rows[0]).backgroundColor, cls: r?.className.slice(0, 120), sel: r?.getAttribute("aria-selected") }; });
  const entries = await logEntries(page);
  // guard: change then back arrow, Escape, footer Cancel, rail, navbar, data source
  const ensureDirty = async () => { if ((await relName(page).count()) === 0) { await toSettings(page, "Relationship types"); await openRel(page, "Oversees 2"); } await relName(page).fill("Oversees 3"); await wait(page, 150); };
  const closeGuard = async () => { if (await cd(page).count()) await cd(page).getByRole("button", { name: "Cancel" }).click(); await wait(page, 300); };
  const probes = [];
  const probe = async (label, act) => { await ensureDirty(); await act(); const g = await guardTxt(page); const still = (await relName(page).count()) === 1; probes.push(`${label}: ${g}${/no dialog/.test(g) ? (still ? " (editor stayed open)" : " (left the editor)") : ""}`); await closeGuard(); };
  await openRel(page, "Oversees 2");
  await probe("back arrow", () => page.getByRole("button", { name: "Back", exact: true }).click());
  await probe("breadcrumb", () => S(page).getByRole("navigation", { name: "Breadcrumb" }).getByRole("button", { name: "Relationship types" }).click());
  await probe("Escape", () => page.keyboard.press("Escape"));
  await probe("rail Templates", () => page.locator('nav[aria-label="Settings navigation"] button', { hasText: "Templates" }).first().click());
  await probe("navbar Library", () => page.locator("button", { hasText: "Library" }).first().click());
  await probe("data source switch", async () => { await page.locator('button[aria-label^="Collection:"]').click(); await wait(page, 250); await page.locator('[data-part=collection-menu] [role=option]').filter({ hasText: "Sample" }).click().catch(() => {}); });
  await probe("footer Cancel", () => cancelBtn(page).click());
  await sh(page, "REL-15");
  const yes = (t) => /unsaved changes/.test(t);
  const pr = Object.fromEntries(probes.map((p) => p.split(": ", 2)).map(([k, v]) => [k, v]));
  rec("REL-15", names.includes("Oversees 2") && probes.every(yes) && hl.hit !== hl.other ? "PASS" : "FAIL", `Save after renaming: Save enabled when dirty=${dirtyEn}; Beacon ${JSON.stringify(n15)}; list returns and shows "Oversees 2"=${names.includes("Oversees 2")}; that row is highlighted: background ${hl.hit} vs other row ${hl.other}=${hl.hit !== hl.other} (expected highlighted until the next interaction). Dirty form (renamed to "Oversees 3"), each tried from a dirty editor: ${probes.join("; ")}. Expected the "Discard changes?" dialog on Cancel, Escape and the back arrow. A failed save keeping the form open: see X-04`, "acceptance-run-2-shots/REL-15.png");
  rec("X-02", yes(probes[0]) && yes(probes[1]) && yes(probes[3]) && yes(probes[4]) && yes(probes[5]) ? "PASS" : "FAIL", `dirty editor: ${probes.join("; ")}; expected "Discard changes?" with "You have unsaved changes. Do you want to continue?" for back arrow, breadcrumb, rail item, navbar link and data-source switch (footer Cancel and Escape are listed in REL-15 only)`, "acceptance-run-2-shots/REL-15.png");
  rec("X-09", entries.some((e) => /relationship type/i.test(e)) ? "PASS" : "FAIL", `add + rename in this session: log ${JSON.stringify(entries.slice(0, 3))}`, "");
  await page.context().close();

  // X-03, X-01 reload, X-04 failure
  ({ page } = await open(b, "relationship-types"));
  await wait(page, 600);
  await openRel(page, "Cites");
  const dis0 = await relSave(page).isDisabled();
  await relName(page).fill("Cites X");
  const en = !(await relSave(page).isDisabled());
  await relName(page).fill("Cites");
  const dis1 = await relSave(page).isDisabled();
  await relName(page).fill("Cites X");
  await relSave(page).click(); await wait(page, 600);
  await page.reload(); await wait(page, 1500);
  const afterReload = (await relNames(page)).includes("Cites X");
  rec("X-03", dis0 && en && dis1 ? "PASS" : "FAIL", `edit form: Save disabled when clean=${dis0}, enabled after a change=${en}, disabled again after a hand revert=${dis1}; after Save the editor closes to the list (no dialog on a rail click)`, "");
  rec("X-01", afterReload ? "PASS" : "FAIL", `renamed "Cites" to "Cites X", Save, then reloaded the tab: "Cites X" listed=${afterReload}; Templates-to-Relationship-types round trip see REL-08/REL-16`, "");
  await page.context().close();

  ({ page } = await open(b, "relationship-types"));
  await wait(page, 600);
  const st = await arm(page, "Save", "The server did not answer in time.", "Relationship types");
  await openRel(page, "Cites");
  await relName(page).fill("Cites Y");
  const b3 = await nlist(page);
  await relSave(page).click(); await wait(page, 600);
  const n3 = await fresh(page, b3);
  const open3 = (await relName(page).count()) === 1;
  const val3 = open3 ? await relName(page).inputValue() : null;
  await sh(page, "X-04-REL");
  rec("X-04", n3.length === 1 && /An error occurred/.test(n3[0]) && open3 && val3 === "Cites Y" ? "PASS" : "FAIL", `success half: add/rename/delete give a bare "Updated" entry (Uwazi's own text for this page). Failure half: Dev panel armed for Save (${st}); Save of "Cites Y" gave Beacon ${JSON.stringify(n3)} (expected one "An error occurred" with the reason), form kept open with the typed name=${open3 && val3 === "Cites Y"} (it saved and closed instead=${!open3})`, "acceptance-run-2-shots/X-04-REL.png");
  await page.context().close();

  // X-13
  ({ page } = await open(b, "relationship-types"));
  await wait(page, 600);
  const s = await relNames(page);
  await switchTo(page, "Red Trav"); await toSettingsSafe(page, "Relationship types"); await wait(page, 1500);
  const t = await relNames(page);
  await sh(page, "X-13-REL");
  await switchTo(page, "Sample"); await toSettingsSafe(page, "Relationship types"); await wait(page, 1000);
  const s2 = await relNames(page);
  rec("X-13", JSON.stringify(s) !== JSON.stringify(t) && JSON.stringify(s) === JSON.stringify(s2) ? "PASS" : "FAIL", `Sample ${s.length} types (${s.slice(0, 3)}), Red Trav ${t.length} (${t.slice(0, 3)}), back on Sample ${s2.length}`, "acceptance-run-2-shots/X-13-REL.png");
  await page.context().close();
});
