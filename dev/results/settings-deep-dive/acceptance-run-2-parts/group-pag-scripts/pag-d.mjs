import { run, open, S, wait, check, listRows, clean, rowOf, footerBtn, editPage, dlgLoc, nlist, newNotifs, rail, rec, sh, inTab, logEntries } from "./g.mjs";
const lang = async (p, name) => { await S(p).getByRole("button", { name: /^Page language/ }).click(); await wait(p, 150); await p.getByRole("option", { name }).click(); await wait(p, 250); };
const title = (p) => S(p).getByLabel("Title", { exact: true }).inputValue();
const area = (p, tab, l = "English") => S(p).getByLabel(`${tab} · ${l}`);
const confirmGuard = (p, name) => p.locator("[data-component=ConfirmDialog],[data-component=ConfirmDelete]").getByRole("button", { name });
const frame = async (p, scope) => { const h = await (scope || p).locator("iframe[title='Public page preview']").first().elementHandle(); return h.contentFrame(); };
const show = async (p, v) => { await S(p).getByRole("radio", { name: v }).or(S(p).getByRole("button", { name: v, exact: true })).first().click(); await wait(p, 700); };

// PAG-17, 18, 19
await run("pag-d1", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  await check("PAG-17", p, async () => {
    await editPage(p, "Methodology");
    await inTab(p, "HTML"); await area(p, "HTML").fill("<h1>Hi</h1>");
    await wait(p, 700);
    const f = await frame(p);
    const live = clean(await f.locator("body").innerText());
    await footerBtn(p, "Save").click(); await wait(p, 600);
    const draftTxt = clean(await (await frame(p)).locator("body").innerText());
    const banner = clean(await (await frame(p)).locator("body").innerText());
    const outer = clean(await S(p).locator("[data-component=PublicPreview]").innerText());
    await show(p, "Published"); const pubTxt = clean(await (await frame(p)).locator("body").innerText());
    await show(p, "Draft");
    const saveAndPreview = await p.getByText(/Save & Preview/i).count();
    const openEl = await S(p).locator("[data-component=PublicPreview] [data-part=bar]").getByText("Open").evaluate((e) => ({ tag: e.tagName, title: e.getAttribute("title"), role: e.getAttribute("role"), href: e.getAttribute("href") }));
    // never-published page: Partners
    await footerBtn(p, "Cancel").click(); await wait(p, 300); if (await p.locator("[data-component=ConfirmDialog]").count()) await confirmGuard(p, "Discard changes").click(); await wait(p, 400);
    await editPage(p, "Partners"); await show(p, "Published");
    const never = clean(await (await frame(p)).locator("body").innerText());
    await sh(p, "PAG-17-never");
    const ok = /Hi/.test(live) && /Hi/.test(draftTxt) && /Methodology|selected/.test(pubTxt) && !/\bHi\b/.test(pubTxt) && /not published yet/i.test(never) && saveAndPreview === 0;
    return [ok, `typed <h1>Hi</h1> in HTML: inline preview shows "${live.slice(-60)}"; after Save Draft shows "${draftTxt.slice(-60)}"; Published shows the last release "${pubTxt.slice(-80)}"; never-published Partners Published view: "${never.slice(-90)}"; "Save & Preview" texts ${saveAndPreview}; the preview bar's "Open" is a ${openEl.tag} with title "${openEl.title}", role=${openEl.role}, href=${openEl.href} (inert label, not a button)`, "PAG-17"];
  });
});

await run("pag-d2", async (b) => {
  const { page: p } = await open(b, "pages");
  await wait(p, 800);
  await check("PAG-18", p, async () => {
    const shellBg0 = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await rail(p, "Global CSS"); await wait(p, 600);
    await S(p).getByRole("tab", { name: "CSS" }).click().catch(() => {}); await wait(p, 200);
    await S(p).getByLabel("Global CSS").fill("body { background: rgb(255, 255, 204); } h1 { color: rgb(200, 0, 0); }");
    await S(p).getByRole("tab", { name: "JS" }).click(); await wait(p, 200);
    await S(p).getByLabel("Global JS").fill("window.__globalJs = 1;");
    await footerBtn(p, "Save").click(); await wait(p, 500);
    await rail(p, "Pages"); await wait(p, 500);
    await editPage(p, "Methodology"); await inTab(p, "HTML"); await area(p, "HTML").fill("<h1>Hi</h1>");
    await footerBtn(p, "Save").click(); await wait(p, 500);
    await wait(p, 600);
    const f = await frame(p);
    const dBg = await f.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const dH1 = await f.evaluate(() => getComputedStyle(document.querySelector("h1")).color);
    const dJs = await f.evaluate(() => typeof window.__globalJs);
    const shellBg1 = await p.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const shellStyle = await p.evaluate(() => [...document.querySelectorAll("style")].filter((s) => /255,\s*255,\s*204/.test(s.textContent)).length);
    const shellJs = await p.evaluate(() => typeof window.__globalJs);
    await sh(p, "PAG-18-draft");
    // publish, then Published view and list View
    await inTab(p, "Configuration"); await S(p).getByRole("button", { name: "Publish", exact: true }).click(); await wait(p, 300);
    await dlgLoc(p).getByLabel("Release message").fill("g18"); await dlgLoc(p).getByRole("button", { name: "Publish", exact: true }).click(); await wait(p, 600);
    await show(p, "Published");
    const f2 = await frame(p);
    const pBg = await f2.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const pH1 = await f2.evaluate(() => getComputedStyle(document.querySelector("h1")).color);
    await S(p).getByRole("button", { name: "Back" }).click(); await wait(p, 400);
    await S(p).getByRole("button", { name: "View Methodology" }).click(); await wait(p, 1200);
    const f3 = await frame(p, dlgLoc(p));
    const vBg = await f3.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const vH1 = await f3.evaluate(() => getComputedStyle(document.querySelector("h1")).color);
    const vJs = await f3.evaluate(() => typeof window.__globalJs);
    await sh(p, "PAG-18-view");
    await p.keyboard.press("Escape"); await wait(p, 300);
    // clear global CSS
    await rail(p, "Global CSS"); await wait(p, 500);
    await S(p).getByRole("tab", { name: "CSS" }).click(); await wait(p, 200);
    await S(p).getByLabel("Global CSS").fill(""); await footerBtn(p, "Save").click(); await wait(p, 500);
    await rail(p, "Pages"); await wait(p, 400); await editPage(p, "Methodology"); await wait(p, 800);
    const f4 = await frame(p);
    const cBg = await f4.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const cH1 = await f4.evaluate(() => getComputedStyle(document.querySelector("h1")).color);
    const ok = dBg === "rgb(255, 255, 204)" && dH1 === "rgb(200, 0, 0)" && dJs === "undefined" && shellBg0 === shellBg1 && shellStyle === 0 && shellJs === "undefined" && pBg === "rgb(255, 255, 204)" && pH1 === "rgb(200, 0, 0)" && vBg === "rgb(255, 255, 204)" && vH1 === "rgb(200, 0, 0)" && vJs === "undefined" && cBg !== "rgb(255, 255, 204)" && cH1 !== "rgb(200, 0, 0)";
    return [ok, `Draft preview body ${dBg}, h1 ${dH1}, window.__globalJs in frame ${dJs}; shell body bg before ${shellBg0} / after ${shellBg1}; <style> elements in shell with the CSS ${shellStyle}; shell window.__globalJs ${shellJs}; Published tab (after Publish) body ${pBg}, h1 ${pH1}; list View modal body ${vBg}, h1 ${vH1}, __globalJs ${vJs}; after clearing Global CSS and Save: preview body ${cBg}, h1 ${cH1}`, "PAG-18-draft"];
  });
  await check("PAG-19", p, async () => {
    await inTab(p, "CSS"); await area(p, "CSS").fill("h1 { font-style: italic; }");
    await inTab(p, "Javascript"); await area(p, "Javascript").fill("window.__pageJs = 1;");
    await wait(p, 800);
    const f = await frame(p);
    const st = await f.evaluate(() => getComputedStyle(document.querySelector("h1")).fontStyle);
    const js = await f.evaluate(() => typeof window.__pageJs);
    const top = await p.evaluate(() => typeof window.__pageJs);
    const ok = st === "italic" && js === "undefined" && top === "undefined";
    return [ok, `Draft preview h1 font-style "${st}"; window.__pageJs in preview frame ${js}, in shell ${top}`, "PAG-19"];
  });
});
