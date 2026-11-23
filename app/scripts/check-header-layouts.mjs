import { chromium } from "playwright";
import { readFileSync } from "node:fs";
/** Header layout check (Settings › Theme and branding): Standard, Menu
 *  centred, Menu at end and Compact, in light and dark at 1360 and 900 wide,
 *  under the Uwazi Design preset and with a full-colour header bar, signed in
 *  and as an anonymous visitor on a public collection. Then the menu itself
 *  (a group's dropdown by keyboard, the More fold, the current link, a page
 *  link), the Library and an entity view, RTL, the phone bar and its menu
 *  sheet, Discard, the theme file round trip, the three header heights, and
 *  the Settings dropdown (the Collection list, the language list, keyboard).
 *
 *  Fails on overlapping or clipped bar controls, a menu off the bar's centre
 *  in Menu centred when it has the room, a menu link under 32px or off 14px
 *  (12px in Compact), utilities that differ from Standard's, a logo off its
 *  default box, a clipped list in the Settings dropdown, a
 *  bar whose height is not `--spacing-navbar`, content that does not start
 *  at the bar's bottom edge, page scroll, a control an anonymous visitor
 *  should not see, or an axe violation. The full-colour bar is the partner
 *  example (teal #0F9A80, white text, 3.5:1): axe runs there without its
 *  contrast rule, and Theme and branding lists the failure itself.
 *  Usage: PORT=1432 node scripts/check-header-layouts.mjs <screenshot-dir>
 *  SECTIONS=6,7 runs only those numbered sections; unset runs all nine. */
const BASE = `http://localhost:${process.env.PORT || 5173}/`;
const out = process.argv[2];
const AXE = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const LAYOUTS = ["standard", "menu-centred", "menu-end", "compact"];
const MENU_LAYOUTS = LAYOUTS.slice(1);
const TEAL = "#0F9A80";
const ACCENT = "#FFE45C";
// PW_EXECUTABLE: a Chromium already on the machine, when this Playwright's own build is not installed.
const b = await chromium.launch(process.env.PW_EXECUTABLE ? { executablePath: process.env.PW_EXECUTABLE } : {});
const ONLY = process.env.SECTIONS ? process.env.SECTIONS.split(",").map(Number) : null;
const run = (n) => !ONLY || ONLY.includes(n);
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
  await p.click(`${BAR} [data-part="settings-trigger"]`);
  await p.click(`${BAR} [data-part="collection-row"]`);
  await p.locator(`${BAR} [data-part="collection-menu"] [data-part="option"]`, { hasText: "Inter-American Human Rights Archive" }).click();
  await p.waitForTimeout(1200);
};
/** To the Library: Standard's button, or in a menu layout the menu's own
 *  Library link (the Sample's "Library", CEJIL's "Processes"), under More
 *  when it is folded. */
const goLibrary = async (p) => {
  const button = p.locator(`${BAR} [data-part="library"]`);
  if (await button.count()) return button.first().click();
  for (const name of ["Library", "Processes"]) {
    const link = p.locator(`${BAR} [data-part="menu"] a`, { hasText: new RegExp(`^${name}$`) }).first();
    if (!(await link.count())) continue;
    if (!(await link.isVisible())) await p.locator(`${BAR} [data-part="more"] [data-part="group-trigger"]`).click();
    return link.click();
  }
  throw new Error("no way to the Library in the bar");
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
const HEIGHTS = ["default", "tall", "extra-tall"];
const HEIGHT_LABEL = { default: "Default", tall: "Tall", "extra-tall": "Extra tall" };
const HEIGHT_LAYOUTS = ["standard", "menu-centred", "menu-end"];
const chooseHeight = async (p, height) => {
  await p.locator('[data-part="header-height"] [data-part="option"]', { hasText: new RegExp(`^${HEIGHT_LABEL[height]}$`) }).click();
  await p.waitForTimeout(300);
};
/** Two partner-shaped logos: a wide wordmark (5:1) and a square badge. */
const LOGOS = {
  wordmark: { name: "wordmark.svg", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="120" viewBox="0 0 600 120"><rect width="600" height="120" rx="8" fill="#1F3A8A"/><text x="300" y="80" font-family="Arial,sans-serif" font-size="64" font-weight="700" fill="#fff" text-anchor="middle">PARTNER LIBRARY</text></svg>` },
  badge: { name: "badge.svg", svg: `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><circle cx="128" cy="128" r="124" fill="#0072CE"/><circle cx="128" cy="96" r="34" fill="#fff"/><path d="M52 212c8-48 40-72 76-72s68 24 76 72z" fill="#fff"/></svg>` },
};
const uploadLogo = async (p, which) => {
  await p.locator('[data-part="header-layouts"]').scrollIntoViewIfNeeded();
  await p.getByRole("button", { name: "Change", exact: true }).first().click();
  const dialog = p.locator('[role="dialog"]').last();
  const already = dialog.getByText(LOGOS[which].name, { exact: false }).first();
  if (await already.count()) await already.click();
  else await dialog.locator('input[type="file"]').setInputFiles({ name: LOGOS[which].name, mimeType: "image/svg+xml", buffer: Buffer.from(LOGOS[which].svg) });
  await p.waitForTimeout(900);
  if (await p.locator('[data-component="ImagePickerModal"]').count()) throw new Error(`the picker did not close on ${which}`);
};
const drawn = (p) => p.evaluate((sel) => document.querySelector(sel).dataset.layout, BAR);

const probe = ({ layout, anonymous, height = "default", logo = null }) => {
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
    // The menu's links and the logo are 2rem targets; the utilities are Standard's.
    if (menu && a.e.closest('[data-component="NavMenu"],[data-part="logo"]') && (a.r.height < 31.5 || a.r.width < 31.5)) issues.push(`under 32px: ${a.n} ${Math.round(a.r.width)}×${Math.round(a.r.height)}`);
  }
  const probeEl = document.createElement("div"); probeEl.style.cssText = "position:absolute;height:var(--spacing-navbar)"; document.body.appendChild(probeEl);
  const tokenPx = probeEl.getBoundingClientRect().height; probeEl.remove();
  if (Math.abs(br.height - tokenPx) > 0.5) issues.push(`bar ${br.height}px, --spacing-navbar ${tokenPx}px`);
  const wantH = layout === "compact" ? 40 : { default: 52, tall: 72, "extra-tall": 88 }[height];
  if (br.height !== wantH) issues.push(`bar is ${br.height}px, wanted ${wantH}`);
  if (bar.dataset.layout !== layout) issues.push(`draws ${bar.dataset.layout}`);
  if (layout !== "compact" && bar.dataset.height !== height) issues.push(`draws height ${bar.dataset.height}`);
  // Every control sits on the bar's centre line (the bar's box less its 1px rule).
  const mid = br.top + (br.height - 1) / 2;
  for (const a of rects) if (Math.abs((a.r.top + a.r.bottom) / 2 - mid) > 1) issues.push(`off the centre line: ${a.n} by ${((a.r.top + a.r.bottom) / 2 - mid).toFixed(1)}px`);
  // The logo keeps its frame at every height, and keeps its shape.
  const frame = layout === "compact" ? [112, 24, 12] : [128, 28, 14.7];
  const img = bar.querySelector('[data-part="logo"] img');
  const ir = img.getBoundingClientRect();
  let logoNote = "";
  if (logo) {
    if (!img.hasAttribute("data-custom")) issues.push("the bar draws the built-in wordmark, not the uploaded logo");
    const scale = Math.min(frame[0] / img.naturalWidth, frame[1] / img.naturalHeight, 1);
    if (Math.abs(ir.width - img.naturalWidth * scale) > 1 || Math.abs(ir.height - img.naturalHeight * scale) > 1)
      issues.push(`logo ${ir.width.toFixed(0)}×${ir.height.toFixed(0)}, wanted ${(img.naturalWidth * scale).toFixed(0)}×${(img.naturalHeight * scale).toFixed(0)}`);
    logoNote = ` · logo ${Math.round(ir.width)}×${Math.round(ir.height)}`;
  } else if (!img.hasAttribute("data-custom") && Math.abs(ir.height - frame[2]) > 0.6) issues.push(`wordmark ${ir.height.toFixed(1)}px tall, wanted ${frame[2]}`);
  if (ir.top < br.top + 3 || ir.bottom > br.bottom - 3) issues.push("logo touches the bar's edge");

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
    // Links are text-sm at every height, text-xs in Compact.
    const want = layout === "compact" ? 12 : 14;
    const sizes = [...new Set([...list.querySelectorAll(":scope > * > a, :scope > * > button, [data-part='group-trigger']")].map((e) => parseFloat(getComputedStyle(e).fontSize)))];
    if (sizes.some((f) => f !== want)) issues.push(`menu links at ${sizes.join("/")}px, want ${want}px`);
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
      else if (Math.abs(rule.getBoundingClientRect().bottom - br.bottom) > 0.5) issues.push(`current link's rule ends ${br.bottom - rule.getBoundingClientRect().bottom}px above the bar's bottom edge`);
    }
  }

  // Utilities: the same in every layout. Beacon, Notebook, Ask Bert, then
  // Settings (signed in) or Log in (a visitor), then the theme toggle, with
  // their words. Nothing else: no language button, Library icon or Log out.
  const endEl = bar.querySelector('[data-part="end"]');
  const has = (part) => !!endEl.querySelector(`[data-part="${part}"], [data-component="${part}"]`);
  const endSettingsOpen = !!endEl.querySelector('[data-part="settings-menu"]');
  for (const part of ["Beacon", "NotebookButton", "ask-bert", "ThemeToggle"]) if (!has(part)) issues.push(`no ${part} in the utilities`);
  if (has("settings-trigger") === anonymous) issues.push(`Settings ${anonymous ? "shown to a visitor" : "missing"}`);
  if (has("log-in") !== anonymous) issues.push(`Log in ${anonymous ? "missing" : "shown to a signed-in user"}`);
  if (!endSettingsOpen) for (const part of ["Select", "library", "log-out"]) if (has(part)) issues.push(`${part} is in the bar`);
  for (const [part, word] of [["ask-bert", "Ask Bert"], [anonymous ? "log-in" : "settings-trigger", anonymous ? "Log in" : "Settings"]]) {
    const el = endEl.querySelector(`[data-part="${part}"]`);
    if (el && !el.textContent.includes(word)) issues.push(`${part} has no label`);
  }
  // Standard: the bar's collection picker is a visitor's only.
  if (!menu && !!bar.querySelector('[data-part="collection-trigger"]') !== anonymous) issues.push(`collection picker ${anonymous ? "missing for a visitor" : "in the bar"}`);

  // What follows the bar starts at its bottom edge.
  const next = [...bar.parentElement.children].filter((e) => e !== bar && vis(e) && getComputedStyle(e).position !== "fixed")[0];
  if (next && Math.abs(next.getBoundingClientRect().top - br.bottom) > 0.5) issues.push(`content starts at ${next.getBoundingClientRect().top}, bar ends at ${br.bottom}`);
  if (document.documentElement.scrollWidth > innerWidth + 1) issues.push("page scrolls horizontally");
  if (document.documentElement.scrollHeight > innerHeight + 1) issues.push("page scrolls vertically");
  // Keyboard order follows the visual order.
  const rtl = document.documentElement.dir === "rtl" || getComputedStyle(bar).direction === "rtl";
  const order = rects.map((x) => ({ n: x.n, x: rtl ? -x.r.right : x.r.left }));
  for (let i = 1; i < order.length; i++) if (order[i].x < order[i - 1].x - 1) issues.push(`tab order: ${order[i].n} after ${order[i - 1].n}`);
  return { h: br.height, issues, links: links + logoNote };
};
const check = async (p, where, layout, { axe = true, scope = null, anonymous = false, contrast = true, height = "default", logo = null } = {}) => {
  // A save flashes the Beacon open over what is beside it; measure the bar at rest.
  await p.mouse.move(1, 1);
  await p.waitForFunction(() => [...document.querySelectorAll('[data-component="Beacon"][data-state]')].every((e) => e.dataset.state === "collapsed"), null, { timeout: 15000 });
  await p.waitForTimeout(500);
  const r = await p.evaluate(probe, { layout, anonymous, height, logo });
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
if (run(1)) for (const theme of ["light", "dark"]) for (const w of [1360, 900]) {
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
    await goLibrary(p);
    await p.waitForTimeout(600);
  }
  await ctx.close();
}

/* 2. The menu: the current link, a group by keyboard, a page link, the fold. */
if (run(2)) for (const theme of ["light", "dark"]) {
  const { ctx, p } = await open(1360, theme);
  await useSample(p);
  await openThemePage(p);
  await importFile(p, tealFile(await exportFile(p)));
  await choose(p, "menu-centred");
  await save(p);
  await goLibrary(p);
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
      await goLibrary(p);
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
      menu carries the collection and, in the menu layouts, Tools. */
if (run(3)) for (const theme of ["light", "dark"]) for (const layout of MENU_LAYOUTS) for (const w of [1360, 900]) {
  const { ctx, p } = await open(w, theme);
  await openThemePage(p);
  await choose(p, layout);
  await save(p);
  await goLibrary(p);
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
    for (const want of ["Collection", "Tools", "User settings", "Interface language", "Live translate", "Log out"]) if (!rows.text.includes(want)) fail(`${theme} settings menu`, `no ${want}`);
    if (!rows.fits) fail(`${theme} settings menu`, "leaves the window");
    await check(p, `${theme} 1360 ${layout} settings menu`, layout);
    await p.screenshot({ path: `${out}/header-${theme}-${layout}-settings-menu.png` });
    // Log out is in the dropdown.
    await p.click(`${BAR} [data-part="settings-menu"] [data-part="log-out"]`);
    await p.waitForTimeout(600);
    if (!(await p.locator('[data-view="login"]').count())) fail(`${theme} log out`, "a private collection did not go to the login screen");
  }
  await ctx.close();
}

/* 4. RTL mirrors. */
if (run(4)) {
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
if (run(5)) {
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

/* 6. Header height: Default, Tall and Extra tall under the three layouts
      that take it, with a wide wordmark and a square badge as the logo, on
      both bars. */
if (run(6)) for (const theme of ["light", "dark"]) for (const w of [1360, 900]) {
  const { ctx, p } = await open(w, theme);
  const shots = (theme === "light" && w === 1360) || (theme === "dark" && w === 900);
  await openThemePage(p);
  for (const barName of ["design", "teal"]) {
    const teal = barName === "teal";
    if (teal) await importFile(p, tealFile(await exportFile(p)));
    for (const logo of ["wordmark", "badge"]) {
      await uploadLogo(p, logo);
      for (const layout of HEIGHT_LAYOUTS) {
        await choose(p, layout);
        for (const height of HEIGHTS) {
          await chooseHeight(p, height);
          await check(p, `${theme} ${w} ${barName} ${logo} ${layout} ${height}`, layout, { height, logo, contrast: !teal, scope: teal ? BAR : null });
          if (shots) await p.screenshot({ path: `${out}/height-${theme}-${w}${teal ? "-teal" : ""}-${logo}-${layout}-${height}.png`, clip: { x: 0, y: 0, width: w, height: 130 } });
        }
      }
    }
    if (!teal && w === 1360) {
      // The built-in wordmark scales too; the adjust dialog reads the frame.
      await p.getByRole("button", { name: "Reset", exact: true }).first().click();
      await choose(p, "menu-end");
      for (const height of HEIGHTS) {
        await chooseHeight(p, height);
        await check(p, `${theme} ${w} built-in wordmark ${height}`, "menu-end", { height });
      }
      await p.screenshot({ path: `${out}/height-${theme}-theme-page-extra-tall.png` });
      await uploadLogo(p, "wordmark");
      await p.getByRole("button", { name: "Adjust logo" }).click();
      await p.waitForSelector('[data-part="header-preview"] img');
      await p.waitForTimeout(400);
      const adjust = await p.evaluate(() => {
        const strip = document.querySelector('[data-part="header-preview"]');
        const i = strip.querySelector("img").getBoundingClientRect();
        return { strip: strip.getBoundingClientRect().height, img: `${Math.round(i.width)}×${Math.round(i.height)}`, text: strip.parentElement.textContent };
      });
      if (adjust.strip !== 88 || adjust.img !== "128×26" || !adjust.text.includes("128×26")) fail(`${theme} adjust logo`, JSON.stringify(adjust));
      console.log(`${theme} adjust logo at Extra tall: ${JSON.stringify(adjust)}`);
      await p.screenshot({ path: `${out}/height-${theme}-adjust-logo-extra-tall.png` });
      await p.keyboard.press("Escape");
      // Compact keeps its own height: the control is disabled and says so.
      await choose(p, "compact");
      const off = await p.evaluate(() => ({
        disabled: [...document.querySelectorAll('[data-part="header-height"] [data-part="option"]')].every((o) => o.disabled),
        note: document.querySelector('[data-part="header-height-note"]').textContent,
      }));
      if (!off.disabled || !off.note.startsWith("Compact has its own height")) fail(`${theme} compact`, JSON.stringify(off));
      await check(p, `${theme} ${w} compact with Extra tall stored`, "compact", { logo: "wordmark" });
      await p.screenshot({ path: `${out}/height-${theme}-compact-disabled.png` });
    }
  }
  await ctx.close();
}

/* 7. Extra tall reaches everything measured from the bar: the Library, the
      Library with its drawer, an entity view, the Live translate strip. */
if (run(7)) for (const theme of ["light", "dark"]) for (const layout of HEIGHT_LAYOUTS) for (const w of [1360, 900]) {
  const { ctx, p } = await open(w, theme);
  await openThemePage(p);
  await uploadLogo(p, "badge");
  await choose(p, layout);
  await chooseHeight(p, "extra-tall");
  await save(p);
  const opts = { height: "extra-tall", logo: "badge" };
  await goLibrary(p);
  await p.waitForTimeout(1200);
  await check(p, `${theme} ${w} ${layout} extra-tall library`, layout, opts);
  if (w === 1360) await p.screenshot({ path: `${out}/height-${theme}-${layout}-extra-tall-library.png` });
  await p.locator('[data-component="EntityCard"] [data-part="primary-action"]').first().click({ position: { x: 6, y: 6 } });
  await p.waitForTimeout(500);
  await check(p, `${theme} ${w} ${layout} extra-tall library+drawer`, layout, { ...opts, axe: false });
  if (w === 1360) await p.screenshot({ path: `${out}/height-${theme}-${layout}-extra-tall-library-drawer.png` });
  await p.getByRole("button", { name: "View entity" }).first().click();
  await p.waitForTimeout(1500);
  await check(p, `${theme} ${w} ${layout} extra-tall entity`, layout, opts);
  if (w === 1360) await p.screenshot({ path: `${out}/height-${theme}-${layout}-extra-tall-entity.png` });
  if (theme === "light" && layout === "menu-end") {
    if (w === 900) {
      // The fold under the tallest bar: More is there, last, and opens in view.
      const more = p.locator(`${BAR} [data-part="more"] [data-part="group-trigger"]`);
      if (!(await more.count())) fail("extra-tall fold", "no More at 900");
      else {
        await more.click();
        const inView = await p.evaluate(() => { const r = document.querySelector('[data-component="NavMenu"] [data-part="panel"]').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= document.querySelector('[data-component="Navbar"]').getBoundingClientRect().bottom - 30; });
        if (!inView) fail("extra-tall fold", "More's panel is misplaced");
        await check(p, "light 900 menu-end extra-tall more open", layout, opts);
        await p.screenshot({ path: `${out}/height-light-menu-end-extra-tall-900-more-open.png`, clip: { x: 0, y: 0, width: 900, height: 330 } });
        await p.keyboard.press("Escape");
      }
    } else {
      await p.click('[data-part="settings-trigger"]');
      await p.click('[data-part="live-translate"]');
      await p.waitForTimeout(300);
      const strip = await p.evaluate(() => ({ top: document.querySelector('[data-component="LiveTranslateStrip"]').getBoundingClientRect().top, bar: document.querySelector('[data-component="Navbar"]').getBoundingClientRect().bottom }));
      if (Math.abs(strip.top - strip.bar) > 0.5) fail("live translate", `strip at ${strip.top}, bar ends at ${strip.bar}`);
      await check(p, "light 1360 menu-end extra-tall live translate", layout, { ...opts, axe: false });
      await p.screenshot({ path: `${out}/height-light-menu-end-extra-tall-live-translate.png` });
    }
  }
  await ctx.close();
}

/* 8. Height is part of the theme: Discard, the file, a preset, the Activity
      log, the phone. */
if (run(8)) {
  const { ctx, p } = await open(1360, "light");
  await openThemePage(p);
  await chooseHeight(p, "tall");
  await p.getByRole("button", { name: "Discard changes" }).click();
  await p.waitForTimeout(300);
  const barH = () => p.evaluate((sel) => document.querySelector(sel).getBoundingClientRect().height, BAR);
  if ((await barH()) !== 52) fail("height discard", `bar is ${await barH()}px`);
  await chooseHeight(p, "tall");
  const file = await exportFile(p);
  if (!/^  "__headerHeight": "tall",$/m.test(file)) fail("height export", "no __headerHeight line");
  if (/__headerHeight/.test(file.slice(file.indexOf('"light"')))) fail("height export", "the height is inside a mode");
  for (const [text, want, what] of [
    [file.replace(/^  "__headerHeight".*\n/m, ""), 52, "without the key"],
    [file.replace('"tall"', '"extra-tall"'), 88, "extra-tall"],
    [file.replace('"tall"', '"huge"'), 52, "an unknown value"],
    [file, 72, "tall"],
  ]) {
    await importFile(p, text);
    if ((await barH()) !== want) fail(`height import ${what}`, `bar is ${await barH()}px`);
    console.log(`height import ${what}: ${await barH()}px`);
  }
  await p.locator('[data-part="presets"] button').nth(1).click();
  await p.waitForTimeout(300);
  if ((await barH()) !== 72) fail("height preset", `bar is ${await barH()}px after choosing a preset`);
  await save(p);
  await openSystemSettings(p, "Activity log");
  await p.waitForTimeout(600);
  await p.getByRole("button", { name: /Updated theme/ }).first().click();
  await p.waitForTimeout(400);
  const logged = await p.evaluate(() => /Header height\s*Default\s*(→|to)?\s*Tall/.test(document.body.innerText) || document.body.innerText.includes("Header height"));
  if (!logged) fail("activity log", "no Header height line");
  console.log(`activity log: Header height ${logged ? "listed" : "missing"}`);
  await p.setViewportSize({ width: 390, height: 800 });
  await p.waitForTimeout(600);
  const phone = await p.evaluate((sel) => ({ h: document.querySelector(sel).getBoundingClientRect().height, attr: document.documentElement.dataset.headerHeight ?? null }), BAR);
  if (phone.h !== 52 || phone.attr) fail("height phone", JSON.stringify(phone));
  console.log(`height phone: ${JSON.stringify(phone)}`);
  await ctx.close();
}

/* 9. The Settings dropdown: every layout carries the collection, the
      language, Live translate and Log out. The Collection row opens its list
      in the dropdown with every name and description in full, by keyboard
      too; the Interface language list opens over the panel's edge unclipped. */
if (run(9)) for (const theme of ["light", "dark"]) for (const w of [1360, 900]) for (const layout of ["standard", "menu-end", "compact"]) for (const rtl of [false, true]) {
  if (rtl && !(theme === "light" && layout !== "compact")) continue;
  const where = `${theme} ${w} ${layout}${rtl ? " rtl" : ""} settings`;
  const { ctx, p } = await open(w, theme);
  await openThemePage(p);
  await choose(p, layout);
  await save(p);
  if (rtl) {
    await p.click('[data-part="settings-trigger"]');
    await p.getByText("Test RTL layout").first().click();
    await p.waitForTimeout(400);
  }
  await goLibrary(p);
  await p.waitForTimeout(1200);
  await p.keyboard.press("Escape");
  const trigger = p.locator(`${BAR} [data-part="settings-trigger"]`);
  await trigger.focus();
  await p.keyboard.press("Enter");
  await p.waitForTimeout(200);
  const text = await p.locator('[data-part="settings-menu"]').textContent();
  for (const want of ["Collection", "Interface language", "Live translate", "User settings", "Log out"]) if (!text.includes(want)) fail(where, `no ${want}`);
  if (text.includes("Tools") !== (layout !== "standard")) fail(where, `Tools section ${layout === "standard" ? "listed beside the bar's Tools" : "missing"}`);
  /** Nothing in `sel` is cut: its text fits its box, the box is in the
   *  window, and the panel does not paint over or clip its corners. */
  const unclipped = (sel) => p.evaluate((sel) => {
    const out = [];
    for (const e of document.querySelectorAll(sel)) {
      const r = e.getBoundingClientRect();
      const n = e.textContent.trim().slice(0, 30);
      if (e.scrollWidth > e.clientWidth) out.push(`${n}: text ${e.scrollWidth}px in ${e.clientWidth}px`);
      if (r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight) out.push(`${n}: outside the window`);
      // Inset past the rounded corners.
      for (const [x, y] of [[r.left + 6, r.top + 6], [r.right - 6, r.bottom - 6]]) {
        const hit = document.elementFromPoint(x, y);
        if (!hit || !(e.contains(hit) || hit.contains(e))) out.push(`${n}: covered or clipped at ${Math.round(x)},${Math.round(y)}`);
      }
    }
    return out;
  }, sel);
  // The Collection row by keyboard: Enter opens on the current collection.
  await p.locator(`${BAR} [data-part="collection-row"]`).focus();
  await p.keyboard.press("Enter");
  await p.waitForTimeout(200);
  const names = await p.locator('[data-part="collection-menu"] [data-part="option-name"]').allTextContents();
  const details = await p.locator('[data-part="collection-menu"] [data-part="option-detail"]').allTextContents();
  if (names.length !== 6 || details.some((d) => !d.trim())) fail(where, `collection list: ${names.join(" | ")}`);
  for (const i of await unclipped('[data-part="collection-menu"] [data-part="option-name"], [data-part="collection-menu"] [data-part="option-detail"], [data-part="collection-menu"] [data-part="option"]')) fail(where, `collection list, ${i}`);
  const panel = await p.evaluate(() => { const r = document.querySelector('[data-part="settings-menu"]').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; });
  if (!panel) fail(where, "the dropdown leaves the window with the collection list open");
  let at = await p.evaluate(() => ({ selected: document.activeElement.getAttribute("aria-selected"), name: document.activeElement.querySelector('[data-part="option-name"]')?.textContent }));
  if (at.selected !== "true") fail(where, `opening did not focus the current collection: ${JSON.stringify(at)}`);
  await check(p, `${where}, collection list`, layout);
  if (theme === "light" || layout === "menu-end") await p.screenshot({ path: `${out}/settings-${theme}-${layout}-${w}${rtl ? "-rtl" : ""}-collection-list.png`, clip: { x: 0, y: 0, width: w, height: 420 } });
  await p.keyboard.press("End");
  await p.keyboard.press("ArrowUp");
  at = await p.evaluate(() => document.activeElement.querySelector('[data-part="option-name"]')?.textContent);
  if (at !== names[names.length - 2]) fail(where, `End then ArrowUp is on "${at}"`);
  // Escape returns to the row and keeps the dropdown; the next one closes it.
  await p.keyboard.press("Escape");
  await p.waitForTimeout(150);
  let state = await p.evaluate(() => ({ focus: document.activeElement.dataset.part, list: !!document.querySelector('[data-part="collection-menu"]'), menu: !!document.querySelector('[data-part="settings-menu"]') }));
  if (state.focus !== "collection-row" || state.list || !state.menu) fail(where, `first Escape: ${JSON.stringify(state)}`);
  // The Interface language list opens over the panel's edge, whole.
  await p.locator('[data-part="settings-menu"] [data-component="Select"] button').first().click();
  await p.waitForTimeout(250);
  for (const i of await unclipped('[data-part="settings-menu"] [data-part="listbox"], [data-part="settings-menu"] [data-part="listbox"] [role="option"]')) fail(where, `language list, ${i}`);
  if (w === 1360 && theme === "light" && layout === "standard" && !rtl) await p.screenshot({ path: `${out}/settings-light-standard-1360-language-list.png`, clip: { x: 0, y: 0, width: w, height: 420 } });
  await p.keyboard.press("Escape");
  await p.waitForTimeout(150);
  if (!(await p.locator('[data-part="settings-menu"]').count())) fail(where, "closing the language list closed the dropdown");
  await p.locator(`${BAR} [data-part="collection-row"]`).focus();
  await p.keyboard.press("Escape");
  await p.waitForTimeout(150);
  state = await p.evaluate(() => ({ focus: document.activeElement.dataset.part, menu: !!document.querySelector('[data-part="settings-menu"]') }));
  if (state.focus !== "settings-trigger" || state.menu) fail(where, `second Escape: ${JSON.stringify(state)}`);
  // Arrow to another collection and Enter: the Library opens on it.
  await p.keyboard.press("Enter");
  await p.locator(`${BAR} [data-part="collection-row"]`).focus();
  await p.keyboard.press("Enter");
  await p.waitForTimeout(150);
  await p.keyboard.press("Home");
  const first = await p.evaluate(() => document.activeElement.querySelector('[data-part="option-name"]').textContent);
  await p.keyboard.press("Enter");
  await p.waitForTimeout(1500);
  await p.click(`${BAR} [data-part="settings-trigger"]`);
  const now = await p.locator('[data-part="collection-current"]').textContent();
  if (now !== first) fail(where, `Enter on "${first}" left the collection at "${now}"`);
  console.log(`${where}: ${names.length} collections in full; Enter, arrows, Escape twice; switched to ${now}`);
  await ctx.close();
}

await b.close();
console.log(fails ? `${fails} failure(s)` : "all header layout checks pass");
process.exit(fails ? 1 : 0);
