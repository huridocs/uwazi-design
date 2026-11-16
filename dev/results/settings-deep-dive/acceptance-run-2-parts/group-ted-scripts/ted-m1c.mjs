// TED-71 (Image, on Artworks: Sample has no image file to pick), TED-73 (Media), TED-68 (Multiple select card), TED-69 (Relationship)
import { launch, open, S, rec, wait, strip, shot, openEditor, saveBtn, dlg, propNames, rowPills, errs, guardFor, ONLY, toLibrary, openTemplate, toSettingsTemplates, openEntityEdit, labelsIn, createEntity, pickOpt, addProp, saveTemplate, metaTab, switchTo } from "./ted-lib.mjs";
import { driveType, recordText } from "./drive.mjs";
const b = await launch();
const guard = guardFor(rec, ONLY);

await guard("TED-71", async () => {
  const c = await open(b, "templates", "desktop", { source: "artworks" }); const p = c.page; await wait(p, 1200);
  const rowsTxt = (await S(p).locator("[role=row]").allInnerTexts()).map(strip);
  await openTemplate(p, "Artwork");
  await addProp(p, { type: "Image", label: "QA Image", flags: ["Full width"], fill: async (d) => { await d.getByRole("radio", { name: "Fit" }).check(); } });
  const pillsDraft = await rowPills(p, "QA Image");
  await saveTemplate(p);
  await p.reload(); await wait(p, 1800);
  await openTemplate(p, "Artwork");
  await S(p).getByRole("button", { name: "Edit QA Image", exact: true }).click(); await wait(p, 500);
  const reopen = await dlg(p).evaluate(e => ({ type: e.querySelector("[data-part=type-box]")?.innerText.replace(/\s+/g, " "), flags: [...e.querySelectorAll("[data-part=flags] input:checked")].map(i => i.getAttribute("aria-label")), radios: [...e.querySelectorAll("input[type=radio]:checked")].map(r => r.parentElement.innerText.trim()) }));
  await dlg(p).getByRole("button", { name: "Cancel" }).click(); await wait(p, 300);
  await toLibrary(p, null);
  await p.locator("[data-component=EntityCard]").first().click(); await wait(p, 900); await metaTab(p);
  await p.getByRole("button", { name: "Edit", exact: true }).first().click(); await wait(p, 900);
  const field = p.locator("label", { hasText: "QA Image" }).first();
  const sel = p.locator("select#field-qa_image");
  const hasSel = await sel.count();
  const optTexts = hasSel ? await sel.locator("option").allInnerTexts() : [];
  if (hasSel) await sel.selectOption({ index: Math.min(1, optTexts.length - 1) });
  await p.getByLabel(/^Description\*?/).first().fill("QA description");
  await shot(p, "TED-71-form");
  await p.getByRole("button", { name: "Save", exact: true }).last().click(); await wait(p, 1500);
  await metaTab(p);
  const img = await p.evaluate(() => { const f = [...document.querySelectorAll("[data-part=field]")].find(e => /QA Image/i.test(e.innerText) || /QA Image/i.test(e.textContent)); if (!f) return null; const i = f.querySelector("img"); if (!i) return { field: f.innerText.replace(/\s+/g, " ").slice(0, 80), img: false }; const r = i.getBoundingClientRect(); const pr = f.getBoundingClientRect(); return { img: true, w: Math.round(r.width), fieldW: Math.round(pr.width), fit: getComputedStyle(i).objectFit, src: i.getAttribute("src")?.slice(-40), natural: [i.naturalWidth, i.naturalHeight] }; });
  await shot(p, "TED-71-record");
  const recFields = await p.evaluate(() => [...document.querySelectorAll("[data-part=field]")].map(f => f.innerText.replace(/\s+/g, " ").slice(0, 24)));
  const errsNow = errs(c.errors).filter(x => !/InvalidPDFException/.test(x));
  const pdfWarn = errs(c.errors).filter(x => /InvalidPDFException/.test(x)).length;
  const ok = reopen.type && /Image/.test(reopen.type) && reopen.flags.includes("Full width") && reopen.radios.includes("Fit") && hasSel && img && img.img && img.fit === "contain" && img.w >= img.fieldW * 0.8;
  rec("TED-71", ok ? "PASS" : "FAIL", `Driven on the Artworks data source (templates ${JSON.stringify(rowsTxt.slice(1).map(t => t.slice(0, 20)))}): the Sample has no image file for the picker (an image field there only says "Attach an image in the Files tab, then pick it here"; the Files tab takes PDFs). Artwork + "QA Image" (Image, Full width, style Fit), Save, reload: panel reopens as ${JSON.stringify(reopen)}. Entity form: image picker is a select=${hasSel === 1} with options ${JSON.stringify(optTexts.slice(0, 4))}. After choosing the image and Save, the Metadata record has fields ${JSON.stringify(recFields)}: block for "QA Image" / image drawn: ${JSON.stringify(img)} (expected the image shown whole (Fit) at full width). Console ${JSON.stringify(errsNow)} (plus ${pdfWarn} "InvalidPDFException" warning(s) from the Artwork Document tab, which shows "PDF not found. Place a sample.pdf in app/public/"; unrelated to this property).`, "TED-71-record");
  await c.ctx.close();
});

await guard("TED-73", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await addProp(p, { type: "Media", label: "QA Media" });
  await saveTemplate(p);
  await p.reload(); await wait(p, 1800);
  await openTemplate(p, "Court Case");
  await S(p).getByRole("button", { name: "Edit QA Media", exact: true }).click(); await wait(p, 500);
  const reopen = await dlg(p).evaluate(e => ({ type: e.querySelector("[data-part=type-box]")?.innerText.replace(/\s+/g, " "), radios: [...e.querySelectorAll("input[type=radio]:checked")].map(r => r.parentElement.innerText.trim()) }));
  await dlg(p).getByRole("button", { name: "Cancel" }).click(); await wait(p, 300);
  await S(p).locator("footer").getByRole("button", { name: "Cancel" }).click(); await wait(p, 500);
  await toLibrary(p, "Court Case");
  const results = {};
  let ctl = null;
  for (const [tag, url] of [["mp4", "https://example.org/clip.mp4"], ["youtube", "https://youtu.be/dQw4w9WgXcQ"]]) {
    await createEntity(p, "Court Case");
    ctl = await p.locator("#field-qa_media").evaluate(e => ({ tag: e.tagName, type: e.type, ph: e.placeholder, chapters: !!e.closest("[data-component=MediaFieldEditor]")?.querySelector("[data-part=chapters]") }));
    await p.getByLabel(/^Title\*?$/).first().fill("QA media " + tag);
    await p.getByLabel(/^Description\*?/).first().fill("desc");
    await p.locator("#field-qa_media").fill(url);
    await p.getByRole("button", { name: "Save", exact: true }).last().click(); await wait(p, 1500);
    const rec1 = await recordText(p, "QA Media");
    const player = await p.evaluate(() => ({ video: document.querySelectorAll("video").length, audio: document.querySelectorAll("audio").length, iframe: document.querySelectorAll("iframe").length, link: [...document.querySelectorAll("[data-part=field] a")].filter(a => /recording/i.test(a.innerText)).map(a => a.getAttribute("href")), embed: [...document.querySelectorAll("[data-component*=Media]")].filter(e => !e.closest("[inert]")).map(e => e.getAttribute("data-component")) }));
    if (tag === "youtube") { const pb = p.locator("[data-component=MediaFieldValue] button").first(); player.playButton = await pb.getAttribute("aria-label").catch(() => null); await pb.click().catch(() => {}); await wait(p, 1200); player.iframeAfterPlay = await p.locator("iframe").count(); player.iframeSrc = await p.locator("iframe").first().getAttribute("src").catch(() => null); }
    results[tag] = { text: rec1 && rec1.text, player };
    await shot(p, "TED-73-" + tag);
    await p.getByRole("button", { name: "Close", exact: true }).last().click().catch(() => {}); await wait(p, 500);
  }
  const anyPlayer = Object.values(results).some(r => r.player.video + r.player.audio + r.player.iframe + (r.player.iframeAfterPlay || 0) > 0);
  rec("TED-73", reopen.type && /Media/.test(reopen.type) && ctl.type === "url" && anyPlayer ? "PASS" : "FAIL", `After Save + reload the Media property reopens as ${JSON.stringify(reopen)}. Blank form control ${JSON.stringify(ctl)} (URL input and Add chapter). Record after saving a direct mp4 URL: ${JSON.stringify(results.mp4)}; after a YouTube URL: ${JSON.stringify(results.youtube)}. Expected a media player for the saved URL.`, "TED-73-youtube");
  await c.ctx.close();
});

await guard("TED-72", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await addProp(p, { type: "Preview", label: "QA Preview" });
  await saveTemplate(p);
  await p.reload(); await wait(p, 1800);
  await openTemplate(p, "Court Case");
  await S(p).getByRole("button", { name: "Edit QA Preview", exact: true }).click(); await wait(p, 500);
  const reopen = await dlg(p).evaluate(e => ({ type: e.querySelector("[data-part=type-box]")?.innerText.replace(/\s+/g, " "), radios: [...e.querySelectorAll("input[type=radio]:checked")].map(r => r.parentElement.innerText.trim()) }));
  await dlg(p).getByRole("button", { name: "Cancel" }).click(); await wait(p, 300);
  await S(p).locator("footer").getByRole("button", { name: "Cancel" }).click(); await wait(p, 500);
  await toLibrary(p, "Court Case");
  const thumb = await p.locator("[data-component=EntityCard]").first().evaluate(e => ({ canvas: e.querySelectorAll("canvas").length, img: e.querySelectorAll("img").length, pdfLabel: /PDF/.test(e.innerText) }));
  await createEntity(p, "Court Case");
  const ctl = { byLabel: await p.getByLabel("QA Preview", { exact: false }).count(), labelText: await p.locator("label", { hasText: "QA Preview" }).count() };
  await p.getByLabel(/^Title\*?$/).first().fill("QA preview entity");
  await p.getByLabel(/^Description\*?/).first().fill("desc");
  await p.getByRole("button", { name: "Save", exact: true }).last().click(); await wait(p, 1500);
  const inRecord = await recordText(p, "QA Preview");
  await shot(p, "TED-72-record");
  rec("TED-72", reopen.type && /Preview/.test(reopen.type) && ctl.byLabel === 0 && ctl.labelText === 0 && inRecord === null && (thumb.canvas + thumb.img) > 0 ? "PASS" : "FAIL", `QA Preview (Preview) after Save + reload reopens as ${JSON.stringify(reopen)}. Entity form has a "QA Preview" field: ${JSON.stringify(ctl)} (expected none). Record lists it as a value: ${JSON.stringify(inRecord)}. Library Court Case card thumbnail elements ${JSON.stringify(thumb)} (document thumbnail drawn).`, "TED-72-record");
  await c.ctx.close();
});

await guard("TED-68", async () => {
  const c = await openEditor(b, "Court Case"); const p = c.page;
  await addProp(p, { type: "Multiple select", label: "QA Multiple select", flags: ["Show in cards"], fill: async (d) => { await pickOpt(d.page(), "Thesaurus", "Case status"); } });
  await saveTemplate(p);
  await toLibrary(p, "Court Case"); await createEntity(p, "Court Case");
  await p.getByLabel(/^Title\*?$/).first().fill("QA multi entity");
  await p.getByLabel(/^Description\*?/).first().fill("desc");
  const g = p.getByRole("group", { name: "QA Multiple select", exact: true });
  const boxes = await g.locator("input[type=checkbox]").evaluateAll(r => r.map(x => x.getAttribute("aria-label")));
  for (const v of ["Open", "Under review", "Admissible", "Decided", "Archived"]) await g.getByRole("checkbox", { name: v, exact: true }).check();
  await p.getByRole("button", { name: "Save", exact: true }).last().click(); await wait(p, 1500);
  const r1 = await recordText(p, "QA Multiple select");
  const chips = await p.locator("[data-part=field]").filter({ hasText: /QA Multiple select/i }).first().evaluate(e => [...e.querySelectorAll("li,span")].filter(x => x.childElementCount === 0).map(x => x.textContent.trim())).catch(() => []);
  await p.getByRole("button", { name: "Close", exact: true }).last().click().catch(() => {}); await wait(p, 500);
  const card = p.locator("[data-component=EntityCard]", { hasText: "QA multi entity" }).first();
  const cardText = strip(await card.innerText());
  await shot(p, "TED-68-card");
  const more = /\+\s?\d/.test(cardText);
  rec("TED-68", boxes.join() === "Open,Under review,Admissible,Decided,Archived" && r1 && /Open/.test(r1.text) && /Archived/.test(r1.text) && more ? "PASS" : "FAIL", `QA Multiple select (thesaurus Case status, Show in cards): form multi picker boxes ${JSON.stringify(boxes)}; five ticked, Save: record "${r1 && r1.text}" (chips ${JSON.stringify(chips)}). Library card "${cardText}" shows a "+N" tail=${more}.`, "TED-68-card");
  await c.ctx.close();
});
await b.close();
