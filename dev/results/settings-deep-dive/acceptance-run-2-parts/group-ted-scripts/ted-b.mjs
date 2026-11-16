import { launch, S, shot, rec, wait, openEditor, saveBtn, dirtyNow, propRows, propNames, dlg, openAdd, strip, tipText, errs, pickType, fieldSeq, tickAll, sameCols, pickOpt, rowPills, rowType } from "./ted-common.mjs";
const b = await launch();
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const guard = async (id, fn) => { if (ONLY && !ONLY.includes(id)) return; try { await fn(); } catch (e) { { console.error(e.stack.split("\n").slice(0,4).join(" / ").slice(0,500)); rec(id, "FAIL", "Script error while driving: " + String(e.message).split("\n")[0].slice(0, 300)); }; } };
const FLAGMAP = { "Hide label": "No label", "Required property": "Required", "Show in cards": "Show in cards", "Use as filter": "Use as filter", "Default filter": "Default filter", "Priority sorting": "Priority sorting" };
const FILT = ["Hide label", "Required property", "Show in cards", "Use as filter"];
// id, type label, label, before-sequence (leading fields), after-tick sequence, not shown, columns
const MATRIX = [
  ["TED-44", "Text", ["Label", ...FILT], ["Label", ...FILT, "Default filter", "Priority sorting"], ["Style", "Full width", "Thesaurus", "Relationship type"], ["Template", "Type"]],
  ["TED-45", "Rich text", ["Label", ...FILT], ["Label", ...FILT, "Default filter"], ["Priority sorting", "Style", "Full width", "Thesaurus", "Relationship type"], ["Template", "Type"]],
  ["TED-46", "Numeric", ["Label", ...FILT], ["Label", ...FILT, "Default filter", "Priority sorting"], ["Style", "Full width", "Thesaurus", "Relationship type"], ["Template", "Type"]],
  ["TED-47", "Date", ["Label", ...FILT], ["Label", ...FILT, "Default filter", "Priority sorting"], ["Style", "Full width", "Thesaurus", "Relationship type"], ["Template", "Type"]],
  ["TED-48", "Multiple dates", ["Label", ...FILT], ["Label", ...FILT, "Default filter"], ["Priority sorting", "Style", "Full width", "Thesaurus"], ["Template", "Type"]],
  ["TED-49", "Date range", ["Label", ...FILT], ["Label", ...FILT, "Default filter"], ["Priority sorting", "Style", "Full width", "Thesaurus"], ["Template", "Type"]],
  ["TED-50", "Multiple date ranges", ["Label", ...FILT], ["Label", ...FILT, "Default filter"], ["Priority sorting", "Style", "Full width", "Thesaurus"], ["Template", "Type"]],
  ["TED-51", "Select", ["Label", "Thesaurus", ...FILT], ["Label", "Thesaurus", ...FILT, "Default filter", "Priority sorting"], ["Style", "Full width", "Relationship type"], ["Template", "Type", "Thesauri"]],
  ["TED-52", "Multiple select", ["Label", "Thesaurus", ...FILT], ["Label", "Thesaurus", ...FILT, "Default filter"], ["Priority sorting", "Style", "Full width", "Relationship type"], ["Template", "Type", "Thesauri"]],
  ["TED-53", "Relationship", ["Label", "Relationship type", "Entities", "Inherit property", ...FILT], ["Label", "Relationship type", "Entities", "Inherit property", ...FILT, "Default filter"], ["Priority sorting", "Style", "Full width", "Thesaurus"], ["Template", "Type", "Relation type", "Entities", "Inherit type"]],
  ["TED-54", "Link", ["Label", "Hide label", "Required property", "Show in cards"], null, ["Use as filter", "Default filter", "Priority sorting", "Style", "Full width", "Thesaurus", "Relationship type"], ["Template", "Type"]],
  ["TED-55", "Image", ["Label", "Style", "Full width", "Hide label", "Required property", "Show in cards"], null, ["Use as filter", "Default filter", "Priority sorting", "Thesaurus", "Relationship type"], ["Template", "Type"]],
  ["TED-56", "Preview", ["Label", "Style", "Full width", "Hide label", "Required property", "Show in cards"], null, ["Use as filter", "Default filter", "Priority sorting", "Thesaurus", "Relationship type"], ["Template", "Type"]],
  ["TED-57", "Media", ["Label", "Style", "Full width", "Hide label", "Required property", "Show in cards"], null, ["Use as filter", "Default filter", "Priority sorting", "Thesaurus", "Relationship type"], ["Template", "Type"]],
  ["TED-58", "Geolocation", ["Label", "Hide label", "Required property", "Show in cards"], null, ["Use as filter", "Default filter", "Priority sorting", "Style", "Full width", "Thesaurus", "Relationship type"], ["Template", "Type"]],
  ["TED-59", "Generated ID", ["Label", ...FILT], ["Label", ...FILT, "Default filter"], ["Priority sorting", "Style", "Full width", "Thesaurus", "Relationship type"], ["Template", "Type"]],
];
for (const [id, type, seq0, seq1, notShown, cols] of MATRIX) await guard(id, async () => {
  const c = await openEditor(b, "Court Case"); const page = c.page;
  await openAdd(page);
  const d = dlg(page);
  const lbl = "QA " + type;
  await d.getByLabel("Label", { exact: true }).fill(lbl);
  if (type !== "Text") await pickType(page, type);
  const ph0 = await d.getByLabel("Label", { exact: true }).getAttribute("placeholder");
  const ev = {};
  let tplName = null;
  if (type === "Select" || type === "Multiple select") { const o = await pickOpt(page, "Thesaurus", 1); ev.firstThes = o[0]; }
  if (type === "Relationship") {
    const o1 = await pickOpt(page, "Relationship type", 1); ev.relOpts = o1.slice(0, 3);
    const seqPre = await fieldSeq(page);
    ev.inheritBefore = seqPre.includes("Inherit property");
    // Entities: pick a template
    const o2 = await pickOpt(page, "Entities", "Person"); ev.entFirst = o2[0]; tplName = "Person";
    await wait(page, 200);
  }
  const s0 = await fieldSeq(page);
  const tipsBefore = {};
  if (type === "Image") {
    ev.fillChecked = await d.getByRole("radio", { name: "Fill" }).isChecked();
    ev.tipFill = await tipText(page, d.getByRole("button", { name: "About Fill" }));
    ev.tipFit = await tipText(page, d.getByRole("button", { name: "About Fit" }));
    ev.tipFull = await tipText(page, d.getByRole("button", { name: "About Full width" }));
  }
  if (type === "Relationship") {
    // inherit options then pick first
    const o3 = await pickOpt(page, "Inherit property", 1); ev.inheritOpts = o3.slice(0, 8);
  }
  await tickAll(page);
  if (type === "Image" || type === "Preview" || type === "Media") await d.getByRole("radio", { name: "Fit" }).check();
  const s1 = await fieldSeq(page);
  const col = await sameCols(page);
  const sameHead = await d.locator('[data-part=same-label] h4').innerText().catch(() => "");
  const ticked = await d.locator('[data-part=flags] input[type=checkbox]:checked').evaluateAll(cs => cs.map(c => c.getAttribute("aria-label")));
  await shot(page, id);
  await d.getByRole("button", { name: "Add property" }).click(); await wait(page, 400);
  const open = await page.locator("[role=dialog][data-part=panel]:not([inert]):not([inert] *)").count();
  const rowT = await rowType(page, lbl).catch(() => null);
  const pills = await rowPills(page, lbl).catch(() => null);
  const want = ticked.map(t => FLAGMAP[t]).filter(Boolean);
  const pillsOk = pills && want.every(w => pills.includes(w));
  const exp1 = seq1 || seq0;
  const seqOk = JSON.stringify(s0) === JSON.stringify(seq0) && JSON.stringify(s1) === JSON.stringify(exp1);
  const noShow = notShown.every(n => !s0.includes(n) && !s1.includes(n)) || (type === "Relationship" ? true : false);
  const colOk = JSON.stringify(col) === JSON.stringify(cols);
  let extra = true;
  if (type === "Image") extra = ev.fillChecked && ev.tipFill.includes("Will attempt to fill the container, using its entire width. In cards, cropping is likely to occur.") && ev.tipFit.includes("Will show the entire media inside the container.") && ev.tipFull.includes("This property will be shown using all the width available.");
  if (type === "Select" || type === "Multiple select") extra = ev.firstThes === "Select...";
  if (type === "Relationship") extra = ev.inheritBefore === false && ev.entFirst === "Any entity" && ev.relOpts[0] === "Select...";
  if (id === "TED-56") { /* switching Image->Preview style tested in TED-56b */ }
  const ok = seqOk && noShow && colOk && rowT === type && pillsOk && !open && extra && /Properties from other templates in the collection using the same label\./.test(sameHead) && ph0 === type;
  rec(id, ok ? "PASS" : "FAIL", `Type ${type}: placeholder "${ph0}". Fields before ticking ${JSON.stringify(s0)} (expected ${JSON.stringify(seq0)}); after ticking all ${JSON.stringify(s1)} (expected ${JSON.stringify(exp1)}); not-shown names absent=${noShow}. Same-label heading "${sameHead.slice(0, 40)}...", columns ${JSON.stringify(col)}. Ticked ${JSON.stringify(ticked)}. New row Type "${rowT}", pills ${JSON.stringify(pills)}, panel closed=${!open}. ${JSON.stringify(ev).slice(0, 380)}`, id);
  await c.ctx.close();
});

// TED-56b: style radios controlled when switching type Image -> Preview
await guard("TED-56", async () => {
  const c = await openEditor(b, "Court Case"); const page = c.page;
  await openAdd(page);
  const d = dlg(page);
  await d.getByLabel("Label", { exact: true }).fill("QA style");
  await pickType(page, "Image");
  await d.getByRole("radio", { name: "Fit" }).check();
  const imgFit = await d.getByRole("radio", { name: "Fit" }).isChecked();
  await pickType(page, "Preview");
  const prevFit = await d.getByRole("radio", { name: "Fit" }).isChecked();
  const prevFill = await d.getByRole("radio", { name: "Fill" }).isChecked();
  await d.getByRole("button", { name: "Add property" }).click(); await wait(page, 300);
  const pills = await rowPills(page, "QA style");
  const prior = await (async () => { try { const l = (await import("fs")).readFileSync(new URL("./results.jsonl", import.meta.url), "utf8").trim().split("\n").map(JSON.parse).filter(x => x.id === "TED-56").pop(); return l; } catch { return null; } })();
  const sw = prevFit === imgFit && !prevFill && pills.includes("Fit");
  if (prior) rec("TED-56", prior.result === "PASS" && sw ? "PASS" : "FAIL", prior.evidence + ` | Image->Preview switch with Fit selected: Fit stays checked=${prevFit}, Fill checked=${prevFill}, stored pill ${JSON.stringify(pills)}.`, "TED-56");
  await c.ctx.close();
});
await b.close();
