import { chromium } from "playwright";
import { readFileSync } from "node:fs";
/** Header layout check (Settings › Theme and branding): Standard, Menu
 *  centred, Menu at end and Compact, in light and dark at 1360 and 900 wide,
 *  under the Uwazi Design preset and with a full-colour header bar, signed in
 *  and as an anonymous visitor on a public collection. Then the menu itself
 *  (a group's dropdown by keyboard, the More fold, the current link, a page
 *  link), the Library and an entity view, RTL, the phone bar and its menu
 *  sheet, Discard, and the theme file round trip.
 *
 *  Fails on overlapping or clipped bar controls, a menu off the bar's centre
 *  in Menu centred when it has the room, a menu-layout control under 32px, a
 *  bar whose height is not `--spacing-navbar`, content that does not start
 *  at the bar's bottom edge, page scroll, a control an anonymous visitor
 *  should not see, or an axe violation. The full-colour bar is the partner
 *  example (teal #0F9A80, white text, 3.5:1): axe runs there without its
 *  contrast rule, and Theme and branding lists the failure itself.
 *  Usage: PORT=1432 node scripts/check-header-layouts.mjs <screenshot-dir> */
const BASE = `http://localhost:${process.env.PORT || 5173}/`;
const out = process.argv[2];
const AXE = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const LAYOUTS = ["standard", "menu-centred", "menu-end", "compact"];
const MENU_LAYOUTS = LAYOUTS.slice(1);
const TEAL = "#0F9A80";
const ACCENT = "#FFE45C";
// PW_EXECUTABLE: a Chromium already on the machine, when this Playwright's own build is not installed.
const b = await chromium.launch(process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
let fails = 0;
const fail = (where, what) => { fails++; console.log(`FAIL ${where}: ${what}`); };
const BAR = '[data-component="Navbar"]';
const strip = (width) => ({ x: 0, y: 0, width, height: 220 });

const open = async (width, theme, height = 800) => {
  const ctx = await b.newContext({ viewport: { width, height }, acceptDownloads: true });
  await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme);
  const p = await ctx.newPage();
  await p.goto(BASE);
  await p.waitForSelector(BAR);
  await p.waitForTimeout(900);
  return { ctx, p };
};
const openSystemSettings = async (p, page) => {
  await p.click('[data-part="settings-trigger"]');
  await p.getByText("System settings", { exact: true }).first().click();
  await p.locator('[data-component="SettingsNav"]').getByText(page, { exact: true }).last().click();
};
const openThemePage = async (p) => {
  await openSystemSettings(p, "Theme and branding");
  await p.waitForSelector('[data-part="header-layouts"]');
};
const choose = async (p, layout) => {
  await p.click(`[data-part="header-layouts"] [data-layout="${layout}"]`);
  await p.waitForTimeout(300);
};
const save = async (p) => {
  const button = p.getByRole("button", { name: "Save theme" });
  if (await button.isEnabled()) await button.click();
  await p.waitForTimeout(300);
};
/** The Sample collection, whose seeded menu has a group. A reload returns to
 *  the default collection (CEJIL: six links, no group), which is what the
 *  sections that reload are checked on. Needs the Standard bar. */
const useSample = async (p) => {
  await p.click(`${BAR} [data-part="collection-trigger"]`);
  await p.locator(`${BAR} [data-part="collection-menu"] [data-part="option"]`, { hasText: "Inter-American Human Rights Archive" }).click();
  await p.waitForTimeout(1200);
};
const makePublic = async (p) => {
  await openSystemSettings(p, "Collection");
  await p.getByText("Public instance", { exact: true }).click();
  await p.getByRole("button", { name: "Save", exact: true }).click();
  await p.waitForTimeout(300);
};
/** The session, as Log out and Log in leave it, then a reload onto the Library. */
const setSession = async (p, state) => {
  await p.evaluate((s) => sessionStorage.setItem("uwazi:session", JSON.stringify(s)), state);
  await p.reload();
  await p.waitForSelector(BAR);
  await p.waitForTimeout(900);
};
const exportFile = async (p) => {
  const [dl] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: "Export theme instance file" }).click()]);
  return readFileSync(await dl.path(), "utf8");
};
const importFile = async (p, text) => {
  await p.setInputFiles('input[type="file"]', { name: "theme-instance.json", mimeType: "application/json", buffer: Buffer.from(text) });
  await p.waitForTimeout(400);
};
const stripNotes = (text) => text.replace(/("(?:\\.|[^"\\])*")|#[^\n]*/g, (_m, q) => q ?? "");
/** The theme on the page, with the partner example's header: a teal bar,
 *  white text and a yellow active link, in both modes. */
const tealFile = (file) => {
  const theme = JSON.parse(stripNotes(file));
  for (const mode of ["light", "dark"])
    theme[mode].header = { "--color-theme-chrome-app-bar": TEAL, "--color-theme-chrome-app-bar-fg": "#FFFFFF" };
  theme.__headerAccent = { light: ACCENT, dark: ACCENT };
  return JSON.stringify(theme);
};
const drawn = (p) => p.evaluate((sel) => document.querySelector(sel).dataset.layout, BAR);

const probe = ({ layout, anonymous }) => {
  const bar = document.querySelector('[data-component="Navbar"]');
  const br = bar.getBoundingClientRect();
  const issues = [];
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden"; };
  const ctls = [...bar.querySelectorAll("button,a,[data-part='current-entity']")].filter(vis).filter((e) => !e.closest('[role="listbox"],[data-part$="-menu"],[data-part="panel"],[inert],[role="dialog"],[aria-hidden="true"]'));
  const name = (e) => (e.getAttribute("aria-label") || e.dataset.part || e.textContent || e.tagName).trim().slice(0, 28);
  const rects = ctls.map((e) => ({ e, r: e.getBoundingClientRect(), n: name(e) }));
  const menu = layout !== "standard";
  for (const a of rects) {
    if (a.r.left < br.left + 11 || a.r.right > br.right - 11) issues.push(`outside the gutter: ${a.n} [${Math.round(a.r.left)}..${Math.round(a.r.right)}]`);
    if (a.r.top < br.top || a.r.bottom > br.bottom) issues.push(`outside the bar: ${a.n}`);
    for (const c of rects) if (a !== c && !a.e.contains(c.e) && !c.e.contains(a.e)) {
      const ox = Math.min(a.r.right, c.r.right) - Math.max(a.r.left, c.r.left), oy = Math.min(a.r.bottom, c.r.bottom) - Math.max(a.r.top, c.r.top);
      if (ox > 1 && oy > 1 && a.n < c.n) issues.push(`overlap: ${a.n} × ${c.n}`);
    }
    if (menu && (a.r.height < 31.5 || a.r.width < 31.5)) issues.push(`under 32px: ${a.n} ${Math.round(a.r.width)}×${Math.round(a.r.height)}`);
  }
  const probeEl = document.createElement("div"); probeEl.style.cssText = "position:absolute;height:var(--spacing-navbar)"; document.body.appendChild(probeEl);
  const tokenPx = probeEl.getBoundingClientRect().height; probeEl.remove();
  if (Math.abs(br.height - tokenPx) > 0.5) issues.push(`bar ${br.height}px, --spacing-navbar ${tokenPx}px`);
  if (br.height !== (layout === "compact" ? 40 : 52)) issues.push(`bar is ${br.height}px`);
  if (bar.dataset.layout !== layout) issues.push(`draws ${bar.dataset.layout}`);

  // The menu: present only in the menu layouts, inside the room it has, and
  // where the layout puts it.
  const nav = bar.querySelector('[data-component="NavMenu"]');
  const list = nav?.querySelector('[data-part="menu"]');
  let links = "";
  if (!menu && nav) issues.push("Standard draws the menu");
  if (menu && !list) issues.push("no menu in the bar");
  if (menu && list) {
    const n = nav.getBoundingClientRect(), l = list.getBoundingClientRect();
    const rtl = getComputedStyle(bar).direction === "rtl";
    const end = bar.querySelector('[data-part="end"]').getBoundingClientRect();
    const start = bar.querySelector('[data-part="start"]').getBoundingClientRect();
    if (l.left < n.left - 0.5 || l.right > n.right + 0.5) issues.push(`menu [${l.left}..${l.right}] leaves its room [${n.left}..${n.right}]`);
    const shown = [...list.children].map((c) => (c.querySelector("[data-part='group-trigger']") ?? c).textContent.trim());
    const folded = !!list.querySelector('[data-part="more"]');
    links = ` · ${shown.join(", ")}`;
    if (layout === "menu-centred") {
      const off = (l.left + l.right) / 2 - (br.left + br.right) / 2;
      // Off centre only where centring would leave under half the links in
      // the bar, which at desktop widths it never does.
      if (Math.abs(off) > 1 && innerWidth >= 1280) issues.push(`menu ${off.toFixed(1)}px off the bar's centre`);
      links += ` · ${Math.abs(off) <= 1 ? "centred" : `${off.toFixed(0)}px off centre`}`;
    }
    const gapToEnd = rtl ? l.left - end.right : end.left - l.right;
    const gapToStart = rtl ? start.left - l.right : l.left - start.right;
    if (layout === "menu-end" && Math.abs(gapToEnd - 12) > 1) issues.push(`menu ends ${gapToEnd}px before the utilities`);
    if (layout === "compact" && Math.abs(gapToStart - 12) > 1) issues.push(`menu starts ${gapToStart}px after the logo`);
    if (folded && !list.lastElementChild.querySelector('[data-part="more"]')) issues.push("More is not last");
    const current = list.querySelector('[aria-current="page"]');
    if (current) {
      const accent = getComputedStyle(bar).getPropertyValue("--header-accent").trim();
      const tmp = document.createElement("span"); tmp.style.color = accent; bar.appendChild(tmp);
      const want = getComputedStyle(tmp).color; tmp.remove();
      const rule = current.querySelector('[data-part="current-rule"]');
      if (getComputedStyle(current).color !== want) issues.push(`current link is ${getComputedStyle(current).color}, accent ${want}`);
      if (!rule || rule.getBoundingClientRect().height !== 2 || getComputedStyle(rule).backgroundColor !== want) issues.push("current link has no 2px rule in the accent");
    }
  }

  // Utilities: a visitor gets the language, the Library and Log in.
  const has = (part) => !!bar.querySelector(`[data-part="end"] [data-part="${part}"], [data-part="end"] [data-component="${part}"]`);
  if (menu) {
    for (const part of ["Select", "library"]) if (!has(part)) issues.push(`no ${part} in the utilities`);
    for (const part of ["Beacon", "notebook-trigger", "ask-bert", "settings-trigger", "log-out"])
      if (has(part) === anonymous && part !== "notebook-trigger") issues.push(`${anonymous ? "visitor sees" : "signed in, missing"} ${part}`);
    if (has("log-in") !== anonymous) issues.push(`Log in ${anonymous ? "missing" : "shown to a signed-in user"}`);
  }

  // What follows the bar starts at its bottom edge.
  const next = [...bar.parentElement.children].filter((e) => e !== bar && vis(e) && getComputedStyle(e).position !== "fixed")[0];
  if (next && Math.abs(next.getBoundingClientRect().top - br.bottom) > 0.5) issues.push(`content starts at ${next.getBoundingClientRect().top}, bar ends at ${br.bottom}`);
  if (document.documentElement.scrollWidth > innerWidth + 1) issues.push("page scrolls horizontally");
  if (document.documentElement.scrollHeight > innerHeight + 1) issues.push("page scrolls vertically");
  // Keyboard order follows the visual order.
  const rtl = document.documentElement.dir === "rtl" || getComputedStyle(bar).direction === "rtl";
  const order = rects.map((x) => ({ n: x.n, x: rtl ? -x.r.right : x.r.left }));
  for (let i = 1; i < order.length; i++) if (order[i].x < order[i - 1].x - 1) issues.push(`tab order: ${order[i].n} after ${order[i - 1].n}`);
  return { h: br.height, issues, links };
};
const check = async (p, where, layout, { axe = true, scope = null, anonymous = false, contrast = true } = {}) => {
  // A save flashes the Beacon open over what is beside it; measure the bar at rest.
  await p.mouse.move(1, 1);
  await p.waitForFunction(() => [...document.querySelectorAll('[data-component="Beacon"][data-state]')].every((e) => e.dataset.state === "collapsed"), null, { timeout: 15000 });
  await p.waitForTimeout(500);
  const r = await p.evaluate(probe, { layout, anonymous });
  for (const i of r.issues) fail(where, i);
  if (axe) {
    await p.addScriptTag({ content: AXE });
    const v = await p.evaluate(
      async ({ sel, contrast }) =>
        (await window.axe.run(sel ? document.querySelector(sel) : document, { resultTypes: ["violations"], rules: contrast ? {} : { "color-contrast": { enabled: false } } })).violations.map(
          (x) => `${x.id} (${x.nodes.length}): ${x.nodes[0].target.join(" ")}`,
        ),
      { sel: scope, contrast },
    );
    for (const x of v) fail(where, `axe ${x}`);
  }
  console.log(`${where}: bar ${r.h}px${r.links}${r.issues.length ? "" : " ok"}`);
  return r;
};

/* 1. Every layout, signed in (live preview on the theme page) and as a
      visitor (saved, on the Library), under both header bars. */
for (const theme of ["light", "dark"]) for (const w of [1360, 900]) {
  const { ctx, p } = await open(w, theme);
  await makePublic(p);
  for (const barName of ["design", "teal"]) {
    const teal = barName === "teal";
    const tag = teal ? "-teal" : "";
    await openThemePage(p);
    if (teal) await importFile(p, tealFile(await exportFile(p)));
    for (const layout of LAYOUTS) {
      await choose(p, layout);
      const where = `${theme} ${w} ${barName} ${layout}`;
      // The teal bar is checked on the bar alone: an import re-derives the
      // page's own text, which is not what this script is about.
      await check(p, where, layout, { contrast: !teal, scope: teal ? BAR : null });
      await p.screenshot({ path: `${out}/header-${theme}-${layout}-${w}${tag}.png`, ...(teal ? { clip: strip(w) } : {}) });
    }
    for (const layout of LAYOUTS) {
      await choose(p, layout);
      await save(p);
      await setSession(p, "signed-out");
      await check(p, `${theme} ${w} ${barName} ${layout} visitor`, layout, { anonymous: true, contrast: !teal, scope: teal ? BAR : null });
      await p.screenshot({ path: `${out}/header-${theme}-${layout}-${w}${tag}-visitor.png`, clip: strip(w) });
      await setSession(p, "signed-in");
      await openThemePage(p);
    }
    await choose(p, "standard");
    await save(p);
    await p.click(`${BAR} [data-part="library"]`);
    await p.waitForTimeout(600);
  }
  await ctx.close();
}

/* 2. The menu: the current link, a group by keyboard, a page link, the fold. */
for (const theme of ["light", "dark"]) {
  const { ctx, p } = await open(1360, theme);
  await useSample(p);
  await openThemePage(p);
  await importFile(p, tealFile(await exportFile(p)));
  await choose(p, "menu-centred");
  await save(p);
  await p.click(`${BAR} [data-part="library"]`);
  await p.waitForTimeout(1200);
  const menu = p.locator(`${BAR} [data-part="menu"]`);
  const current = await menu.locator('[aria-current="page"]').allTextContents();
  if (current.join() !== "Library") fail(`${theme} current link`, `aria-current on "${current.join()}"`);
  const accent = await menu.locator('[aria-current="page"]').evaluate((e) => getComputedStyle(e).color);
  if (accent !== "rgb(255, 228, 92)") fail(`${theme} current link`, `colour ${accent}`);
  await check(p, `${theme} 1360 teal menu-centred library`, "menu-centred", { contrast: false, scope: BAR });

  // A group: ArrowDown opens it on its first link, Escape closes it and
  // returns focus to the button.
  const trigger = menu.locator('[data-part="group-trigger"]').first();
  await trigger.focus();
  await p.keyboard.press("ArrowDown");
  await p.waitForTimeout(150);
  let state = await p.evaluate(() => ({ expanded: document.querySelector('[data-part="group-trigger"]').getAttribute("aria-expanded"), focus: document.activeElement.textContent.trim() }));
  if (state.expanded !== "true" || state.focus !== "Partners") fail(`${theme} group`, `ArrowDown: ${JSON.stringify(state)}`);
  await check(p, `${theme} 1360 teal group open`, "menu-centred", { contrast: false, scope: BAR });
  await p.screenshot({ path: `${out}/header-${theme}-menu-group-open.png`, clip: strip(1360) });
  await p.keyboard.press("Escape");
  state = await p.evaluate(() => ({ expanded: document.querySelector('[data-part="group-trigger"]').getAttribute("aria-expanded"), focus: document.activeElement.dataset.part }));
  if (state.expanded !== "false" || state.focus !== "group-trigger") fail(`${theme} group`, `Escape: ${JSON.stringify(state)}`);
  for (const key of ["Enter", "Space"]) {
    await p.keyboard.press(key);
    if ((await trigger.getAttribute("aria-expanded")) !== "true") fail(`${theme} group`, `${key} did not open it`);
    await p.keyboard.press("Escape");
  }
  console.log(`${theme} group: ArrowDown, Enter, Space open; Escape closes and returns focus`);

  // A page link opens the page as visitors see it and is the current link.
  await menu.getByText("About", { exact: true }).click();
  await p.waitForSelector('[data-component="PageViewModal"]');
  await p.waitForTimeout(400);
  const onPage = await menu.locator('[aria-current="page"]').allTextContents();
  if (onPage.join() !== "About") fail(`${theme} page link`, `aria-current on "${onPage.join()}"`);
  await p.screenshot({ path: `${out}/header-${theme}-menu-page-open.png` });
  await p.keyboard.press("Escape");
  await p.waitForTimeout(300);
  if (await p.locator('[data-component="PageViewModal"]').count()) fail(`${theme} page link`, "page view did not close");

  // The fold: at 900 the links that do not fit are under More.
  await p.setViewportSize({ width: 900, height: 800 });
  await p.waitForTimeout(500);
  for (const layout of MENU_LAYOUTS) {
    if (layout !== "menu-centred") {
      await openThemePage(p);
      await choose(p, layout);
      await save(p);
      await p.click(`${BAR} [data-part="library"]`);
      await p.waitForTimeout(800);
    }
    const more = p.locator(`${BAR} [data-part="more"] [data-part="group-trigger"]`);
    if (!(await more.count())) {
      // Compact's smaller links all fit the Sample's menu at 900.
      if (layout === "compact") console.log(`${theme} 900 compact: every link fits, no More`);
      else fail(`${theme} 900 ${layout}`, "no More at 900");
      continue;
    }
    await more.click();
    const all = await p.evaluate(() => {
      const list = document.querySelector('[data-component="NavMenu"] [data-part="menu"]');
      const top = [...list.children].slice(0, -1).map((c) => c.textContent.trim());
      const panel = list.querySelector('[data-part="panel"]');
      const r = panel.getBoundingClientRect();
      return { top, folded: [...panel.querySelectorAll("a")].map((a) => a.textContent.trim()), inView: r.left >= 0 && r.right <= innerWidth };
    });
    if (!all.inView) fail(`${theme} 900 ${layout}`, "More's panel leaves the window");
    for (const title of ["Library", "About", "Methodology", "Partners", "Documentation", "Contact"])
      if (![...all.top, ...all.folded].some((t) => t.startsWith(title))) fail(`${theme} 900 ${layout}`, `${title} is in neither the bar nor More`);
    console.log(`${theme} 900 ${layout} fold: bar ${all.top.join(", ")} · More ${all.folded.join(", ")}`);
    await check(p, `${theme} 900 teal ${layout} more open`, layout, { contrast: false, scope: BAR });
    await p.screenshot({ path: `${out}/header-${theme}-${layout}-900-more-open.png`, clip: { x: 0, y: 0, width: 900, height: 260 } });
    await p.keyboard.press("Escape");
  }
  await ctx.close();
}

/* 3. The bar's height reaches the Library and an entity view; the Settings
      menu carries what the menu layouts take out of the bar. */
for (const theme of ["light", "dark"]) for (const layout of MENU_LAYOUTS) for (const w of [1360, 900]) {
  const { ctx, p } = await open(w, theme);
  await openThemePage(p);
  await choose(p, layout);
  await save(p);
  await p.click(`${BAR} [data-part="library"]`);
  await p.waitForTimeout(1200);
  await check(p, `${theme} ${w} ${layout} library`, layout);
  if (w === 1360) await p.screenshot({ path: `${out}/header-${theme}-${layout}-library.png` });
  await p.locator('[data-component="EntityCard"] [data-part="primary-action"]').first().click({ position: { x: 6, y: 6 } });
  await p.waitForTimeout(500);
  await check(p, `${theme} ${w} ${layout} library+drawer`, layout, { axe: false });
  await p.getByRole("button", { name: "View entity" }).first().click();
  await p.waitForTimeout(1500);
  await check(p, `${theme} ${w} ${layout} entity`, layout);
  if (w === 1360 && layout === "compact") await p.screenshot({ path: `${out}/header-${theme}-${layout}-entity.png` });
  if (w === 1360 && layout === "menu-end") {
    await p.click('[data-part="settings-trigger"]');
    await p.waitForTimeout(200);
    const rows = await p.evaluate(() => {
      const m = document.querySelector('[data-part="settings-menu"]');
      const r = m.getBoundingClientRect();
      return { text: m.textContent, fits: r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth };
    });
    for (const want of ["Collection", "Tools", "User settings"]) if (!rows.text.includes(want)) fail(`${theme} settings menu`, `no ${want}`);
    for (const gone of ["Interface language", "Log out"]) if (rows.text.includes(gone)) fail(`${theme} settings menu`, `still lists ${gone}`);
    if (!rows.fits) fail(`${theme} settings menu`, "leaves the window");
    await check(p, `${theme} 1360 ${layout} settings menu`, layout);
    await p.screenshot({ path: `${out}/header-${theme}-${layout}-settings-menu.png` });
    await p.keyboard.press("Escape");
    await p.mouse.click(400, 500);
    // Log out is the power icon.
    await p.click(`${BAR} [data-part="log-out"]`);
    await p.waitForTimeout(600);
    if (!(await p.locator('[data-view="login"]').count())) fail(`${theme} log out`, "a private collection did not go to the login screen");
  }
  await ctx.close();
}

/* 4. RTL mirrors. */
{
  const { ctx, p } = await open(1360, "light");
  await useSample(p);
  await openThemePage(p);
  await p.click('[data-part="settings-trigger"]');
  await p.getByText("Test RTL layout").first().click();
  await p.waitForTimeout(400);
  for (const layout of LAYOUTS) {
    await choose(p, layout);
    await check(p, `rtl ${layout}`, layout);
    await p.screenshot({ path: `${out}/header-rtl-${layout}.png`, clip: strip(1360) });
  }
  await choose(p, "menu-end");
  await p.locator(`${BAR} [data-part="menu"] [data-part="group-trigger"]`).first().click();
  const inView = await p.evaluate(() => { const r = document.querySelector('[data-component="NavMenu"] [data-part="panel"]').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; });
  if (!inView) fail("rtl group", "panel leaves the window");
  await p.screenshot({ path: `${out}/header-rtl-menu-end-group-open.png`, clip: strip(1360) });
  await ctx.close();
}

/* 5. Discard reverts; the theme file; the phone keeps its bar and lists the
      menu in its sheet. */
{
  const { ctx, p } = await open(1360, "light");
  await useSample(p);
  await openThemePage(p);
  await choose(p, "compact");
  await p.getByRole("button", { name: "Discard changes" }).click();
  await p.waitForTimeout(300);
  const after = await drawn(p);
  if (after !== "standard") fail("discard", `bar draws ${after}`);
  console.log(`discard: ${after}`);

  await choose(p, "menu-end");
  const file = await exportFile(p);
  if (!/^  "__headerLayout": "menu-end",$/m.test(file)) fail("export", "no __headerLayout line");
  if (/__headerAccent|app-bar-accent/.test(file)) fail("export", "an untouched theme writes the active link colour");
  console.log(`export: ${file.split("\n").slice(0, 6).join(" ")}`);
  // A file from Uwazi has no such line: it loads as Standard. So does the
  // removed Two rows; Centred is what Menu centred replaced.
  for (const [text, want, what] of [
    [file.replace(/^  "__headerLayout".*\n/m, ""), "standard", "without the key"],
    [file, "menu-end", "with the key"],
    [file.replace("menu-end", "two-rows"), "standard", "two-rows"],
    [file.replace("menu-end", "centred"), "menu-centred", "centred"],
  ]) {
    await importFile(p, text);
    const now = await drawn(p);
    if (now !== want) fail(`import ${what}`, `bar draws ${now}`);
    console.log(`import ${what}: ${now}`);
  }
  // The header's colours and the active link's reach the bar, and the file
  // carries the active link outside the modes, where Uwazi's import skips it.
  await importFile(p, tealFile(file));
  const grounds = await p.evaluate((sel) => {
    const n = document.querySelector(sel);
    return { layout: n.dataset.layout, bar: getComputedStyle(n).backgroundColor, accent: getComputedStyle(n).getPropertyValue("--header-accent").trim() };
  }, BAR);
  if (grounds.layout !== "menu-end" || grounds.bar !== "rgb(15, 154, 128)" || grounds.accent.toUpperCase() !== ACCENT) fail("themed bar", JSON.stringify(grounds));
  const again = await exportFile(p);
  if (!/^  "__headerAccent": \{ "light": "#FFE45C", "dark": "#FFE45C" \},$/m.test(again)) fail("export", "no __headerAccent line");
  if (/app-bar-accent/.test(again)) fail("export", "the active link colour is inside a mode, where Uwazi refuses unknown keys");
  console.log(`themed bar: ${JSON.stringify(grounds)}`);
  // A preset keeps the layout.
  await p.locator('[data-part="presets"] button').nth(1).click();
  await p.waitForTimeout(300);
  if ((await drawn(p)) !== "menu-end") fail("preset", `bar draws ${await drawn(p)} after choosing a preset`);

  // Phones: Standard's sheet has no menu section; a menu layout's has.
  for (const [layout, wanted] of [["standard", false], ["menu-centred", true]]) {
    await p.setViewportSize({ width: 1360, height: 800 });
    await p.waitForTimeout(400);
    await choose(p, layout);
    await save(p);
    await p.setViewportSize({ width: 390, height: 800 });
    await p.waitForTimeout(600);
    const phone = await p.evaluate((sel) => { const n = document.querySelector(sel); return { layout: n.dataset.layout, h: n.getBoundingClientRect().height, attr: document.documentElement.dataset.headerLayout ?? null }; }, BAR);
    if (phone.layout !== "standard" || phone.h !== 52 || phone.attr) fail(`phone ${layout}`, JSON.stringify(phone));
    await p.click('[data-part="menu-trigger"]');
    await p.waitForTimeout(500);
    const section = await p.locator('[data-part="sheet-menu"] a').allTextContents();
    if (wanted !== section.length > 0) fail(`phone ${layout}`, `sheet menu: ${section.join(", ") || "none"}`);
    console.log(`phone ${layout}: ${JSON.stringify(phone)} · sheet menu ${section.join(", ") || "none"}`);
    if (wanted) {
      for (const title of ["Library", "About", "Methodology", "Partners", "Documentation", "Contact"]) if (!section.includes(title)) fail("phone sheet", `no ${title}`);
      await p.addScriptTag({ content: AXE });
      const v = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ["violations"] })).violations.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0].target.join(" ")}`));
      for (const x of v) fail("phone sheet", `axe ${x}`);
      await p.screenshot({ path: `${out}/header-phone-menu-sheet.png` });
      await p.locator('[data-part="sheet-menu"] a', { hasText: "Methodology" }).click();
      await p.waitForSelector('[data-component="PageViewModal"]');
      await p.waitForTimeout(500);
      await p.screenshot({ path: `${out}/header-phone-menu-page.png` });
    }
    await p.keyboard.press("Escape");
    await p.waitForTimeout(300);
    await p.keyboard.press("Escape");
  }
  await ctx.close();
}

await b.close();
console.log(fails ? `${fails} failure(s)` : "all header layout checks pass");
process.exit(fails ? 1 : 0);
