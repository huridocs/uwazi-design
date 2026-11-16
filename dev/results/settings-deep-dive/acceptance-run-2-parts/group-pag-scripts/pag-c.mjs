import { run, open, S, wait, check, listRows, clean, rowOf, footerBtn, editPage, dlgLoc, nlist, newNotifs, rail, rec, sh, inTab } from "./g.mjs";
const lang = async (p, name) => { await S(p).getByRole("button", { name: /^Page language/ }).click(); await wait(p, 150); await p.getByRole("option", { name }).click(); await wait(p, 250); };
const title = (p) => S(p).getByLabel("Title", { exact: true }).inputValue();
const area = (p, tab, l = "English") => S(p).getByLabel(`${tab} · ${l}`);
const confirmGuard = (p, name) => p.locator("[data-component=ConfirmDialog],[data-component=ConfirmDelete]").getByRole("button", { name });

// PAG-12, PAG-14, PAG-15
await run("pag-c1", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  await editPage(p, "Methodology");
  await check("PAG-12", p, async () => {
    const sel = S(p).getByRole("button", { name: /^Page language/ });
    const box = await sel.boundingBox(); const sc = await S(p).boundingBox();
    const opts = await (async () => { await sel.click(); await wait(p, 150); const o = await p.getByRole("option").allInnerTexts(); await p.keyboard.press("Escape"); await wait(p, 150); return o.map(clean); })();
    const out = {};
    for (const [l, k] of [["Español", "es"], ["Français", "fr"], ["العربية", "ar"]]) {
      await lang(p, l);
      const t = await title(p);
      await inTab(p, "HTML"); const h = await area(p, "HTML", l).inputValue();
      await inTab(p, "Javascript"); const j = await area(p, "Javascript", l).inputValue();
      await inTab(p, "CSS"); const c = await area(p, "CSS", l).inputValue();
      await inTab(p, "Configuration");
      out[k] = { title: t, html: h.slice(0, 50), js: j.length, css: c.length };
    }
    await lang(p, "Español"); await inTab(p, "HTML"); await area(p, "HTML", "Español").fill("<p>ES-ONLY-TEXT</p>");
    await lang(p, "English"); const enHtml = await area(p, "HTML", "English").inputValue();
    await lang(p, "Español"); const esHtml = await area(p, "HTML", "Español").inputValue();
    const ok = box && box.x + box.width > sc.x + sc.width - 40 && opts.length === 5 && /Español/.test(out.es.title + "Español") && out.es.title === "Metodología" && out.fr.title === "Methodology" && out.ar.title === "Methodology" && !/ES-ONLY/.test(enHtml) && /ES-ONLY/.test(esHtml) && /Methodology/.test(enHtml);
    return [ok, `selector "Page language" at x=${Math.round(box.x)}..${Math.round(box.x + box.width)} of pane right ${Math.round(sc.x + sc.width)}; options ${JSON.stringify(opts)}; per language ${JSON.stringify(out)}; after typing in ES, EN HTML is "${enHtml.slice(0, 50)}" and ES HTML "${esHtml}"`, "PAG-12"];
  });
  // discard the ES edit
  await footerBtn(p, "Cancel").click(); await wait(p, 400);
  await confirmGuard(p, "Discard changes").click(); await wait(p, 500);
  await editPage(p, "Methodology");
  await check("PAG-14", p, async () => {
    const tabs = await S(p).getByRole("tab").allInnerTexts();
    await inTab(p, "HTML"); const html = clean(await S(p).locator("[data-part=banner]").innerText());
    const htmlLink = await S(p).getByRole("button", { name: "Learn more about the components." }).count();
    const mdToggle = await S(p).getByText(/markdown/i).allInnerTexts();
    await inTab(p, "Javascript"); const js = clean(await S(p).locator("[data-part=banner]").innerText());
    const jsLines = await S(p).locator("[data-part=banner] span").allInnerTexts();
    await inTab(p, "CSS"); const cssBanner = await S(p).locator("[data-part=banner]").count();
    const entityToggle = await S(p).getByText(/entity view/i).count();
    const ok = JSON.stringify(tabs.map(clean)) === JSON.stringify(["Configuration", "HTML", "Javascript", "CSS"]) &&
      html.startsWith("This page uses HTML only (Markdown is not processed). You can embed maps, charts, entity lists, and other components. Learn more about the components.") && htmlLink === 1 &&
      jsLines.map(clean).join("|") === "With great power comes great responsibility!|This area allows you to append custom Javascript to the page. This opens up a new universe of possibilities.|It could also very easily break the app. Only write code here if you know exactly what you are doing." && cssBanner === 0 && entityToggle === 0 && mdToggle.every((t) => /Markdown is not processed/.test(t));
    return [ok, `tabs ${JSON.stringify(tabs.map(clean))}; HTML banner "${html}" (link button "Learn more about the components." x${htmlLink}); other "markdown" texts ${JSON.stringify(mdToggle.map(clean))}; JS banner lines ${JSON.stringify(jsLines.map(clean))}; CSS banners ${cssBanner}; "entity view" texts ${entityToggle}`, "PAG-14"];
  });
  await check("PAG-15", p, async () => {
    await inTab(p, "HTML");
    const ta = area(p, "HTML", "English");
    const monaco = await p.locator(".monaco-editor").count();
    const tag = await ta.evaluate((e) => e.tagName);
    await ta.fill("ab"); await ta.evaluate((e) => e.setSelectionRange(1, 1));
    await p.keyboard.press("Tab"); await wait(p, 150);
    const v1 = await ta.inputValue();
    await p.keyboard.press("Escape"); await p.keyboard.press("Tab"); await wait(p, 150);
    const focusLeft = await p.evaluate(() => document.activeElement && document.activeElement.tagName + ":" + (document.activeElement.getAttribute("aria-label") || document.activeElement.innerText || "").slice(0, 30));
    const v2 = await ta.inputValue();
    await inTab(p, "CSS"); await area(p, "CSS", "English").fill("a{}"); await inTab(p, "HTML");
    const kept = await ta.inputValue();
    await lang(p, "Español"); await lang(p, "English"); const kept2 = await area(p, "HTML", "English").inputValue();
    const fs = await ta.evaluate((e) => getComputedStyle(e).fontSize + " " + getComputedStyle(e).fontFamily.slice(0, 30));
    const name = await ta.getAttribute("aria-label");
    await footerBtn(p, "Cancel").click(); await wait(p, 400);
    await confirmGuard(p, "Discard changes").click(); await wait(p, 500);
    await rail(p, "Customisation").catch(async () => rail(p, "Global CSS")); await wait(p, 600);
    const gfs = await S(p).locator("textarea").first().evaluate((e) => getComputedStyle(e).fontSize + " " + getComputedStyle(e).fontFamily.slice(0, 30)).catch(() => "none");
    const ok = monaco === 0 && tag === "TEXTAREA" && name === "HTML · English" && v1 === "a  b" && /^(?!TEXTAREA)/.test(focusLeft) && v2 === "a  b" && kept === "a  b" && kept2 === "a  b" && fs === gfs;
    return [ok, `Monaco elements ${monaco}; element ${tag}; accessible name "${name}"; after Tab at caret 1 in "ab": "${v1.replace(/ /g, "·")}"; Escape then Tab moved focus to ${focusLeft}; text after tab switch "${kept.replace(/ /g, "·")}", after language round trip "${kept2.replace(/ /g, "·")}"; computed font ${fs} vs Global CSS & JS editor ${gfs}`, "PAG-15"];
  });
});

// PAG-16 and PAG-31
await run("pag-c2", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  await editPage(p, "Methodology");
  const relCount = async () => { await inTab(p, "Configuration"); await S(p).getByRole("button", { name: "Restore", exact: true }).click(); await wait(p, 300); const d = dlgLoc(p); const t = await d.locator("label").allInnerTexts(); await p.keyboard.press("Escape"); await wait(p, 300); return t.map(clean); };
  await check("PAG-31", p, async () => {
    const f0 = clean(await S(p).locator("footer").innerText());
    const el0 = await S(p).locator("[data-part=last-saved]").innerText();
    await inTab(p, "HTML"); await area(p, "HTML", "English").fill("<h1>31</h1>");
    await footerBtn(p, "Save").click(); await wait(p, 500);
    const f1 = clean(await S(p).locator("footer").innerText());
    const sv = await S(p).locator("[data-part=last-saved]").innerText();
    await inTab(p, "Configuration");
    const ok = !/Saved/.test(f0) && /Saved just now by admin/.test(f1) && /Published/.test(f1);
    return [ok, `footer before any save this session: "${f0}" (last-saved slot "${el0}"); after Save: "${f1}" (slot "${sv}")`, "PAG-31"];
  });
  await p.reload(); await wait(p, 1500);
  // reload returns to Pages list; reopen
  await check("PAG-16", p, async () => {
    // reset state: go through Dashboard Reset to get clean
    await rail(p, "Dashboard"); await wait(p, 400);
    await S(p).getByRole("button", { name: "Reset demo data" }).click(); await wait(p, 300);
    await p.locator("[data-component=ConfirmDelete] [data-part=confirm]").click(); await wait(p, 600);
    await rail(p, "Pages"); await wait(p, 600);
    await editPage(p, "Methodology");
    const saveDis0 = await footerBtn(p, "Save").isDisabled();
    const rel0 = await relCount();
    const before = await nlist(p);
    await inTab(p, "HTML"); await area(p, "HTML", "English").fill("<h1>EN-HTML-EDIT</h1>");
    const saveEn = await footerBtn(p, "Save").isEnabled();
    await lang(p, "Español"); await inTab(p, "Javascript"); await area(p, "Javascript", "Español").fill("window.es=1;");
    await lang(p, "Français"); await inTab(p, "CSS"); await area(p, "CSS", "Français").fill("h1{color:red}");
    await footerBtn(p, "Save").click(); await wait(p, 500);
    const n = await newNotifs(p, before);
    const saveDisAfter = await footerBtn(p, "Save").isDisabled();
    const rel1 = await relCount();
    const read = async () => {
      const o = {};
      await lang(p, "English"); await inTab(p, "HTML"); o.enHtml = await area(p, "HTML", "English").inputValue();
      await lang(p, "Español"); await inTab(p, "Javascript"); o.esJs = await area(p, "Javascript", "Español").inputValue();
      await inTab(p, "CSS"); o.esCss = await area(p, "CSS", "Español").inputValue();
      await lang(p, "Français"); await inTab(p, "CSS"); o.frCss = await area(p, "CSS", "Français").inputValue();
      await inTab(p, "Javascript"); o.frJs = await area(p, "Javascript", "Français").inputValue();
      await lang(p, "English"); await inTab(p, "Configuration");
      return o;
    };
    const r1 = await read();
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 400);
    await rail(p, "Dashboard"); await wait(p, 400); await rail(p, "Pages"); await wait(p, 500);
    await editPage(p, "Methodology"); const r2 = await read();
    await p.reload(); await wait(p, 1500);
    await editPage(p, "Methodology"); const r3 = await read();
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 400);
    await rail(p, "Dashboard"); await wait(p, 400);
    await S(p).getByRole("button", { name: "Reset demo data" }).click(); await wait(p, 300);
    await p.locator("[data-component=ConfirmDelete] [data-part=confirm]").click(); await wait(p, 600);
    await rail(p, "Pages"); await wait(p, 500);
    await editPage(p, "Methodology"); const r4 = await read();
    const good = (r) => r.enHtml === "<h1>EN-HTML-EDIT</h1>" && r.esJs === "window.es=1;" && r.frCss === "h1{color:red}" && r.esCss === "" && r.frJs === "";
    const ok = saveDis0 && saveEn && n.filter((t) => /Saved successfully/.test(t)).length === 1 && saveDisAfter && good(r1) && good(r2) && good(r3) && /Methodology/.test(r4.enHtml) && r4.esJs === "" && r4.frCss === "" && JSON.stringify(rel0) === JSON.stringify(rel1);
    return [ok, `Save disabled before first edit=${saveDis0}; enabled after edit=${saveEn}; one Save, notifications ${JSON.stringify(n)}; Save disabled after save=${saveDisAfter}; after save ${JSON.stringify(r1)}; after Dashboard round trip same=${good(r2)}; after reload same=${good(r3)}; after Reset demo data ${JSON.stringify(r4)}; releases list before save ${JSON.stringify(rel0)} vs after ${JSON.stringify(rel1)}`, "PAG-16"];
  });
});
