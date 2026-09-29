// Export to Uwazi: every site type, on every collection, exports HTML that
// Uwazi can parse.
//
//   cd sites && npm test
//
// Checks, per page and language:
//  - every capitalised tag is a component in Uwazi's registry (research §1);
//  - every {name}(…) matches Uwazi's customComponentMatcher and names a known
//    extension;
//  - tags are balanced (html-to-react needs well-formed markup);
//  - every CSS selector is scoped to the page's class;
//  - exporting twice gives identical text.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "vite";

const ROOT = new URL("../", import.meta.url);
// The mock source fetches public/data/*.json; answer from disk.
globalThis.fetch = async (url) => {
  const path = String(url).replace(/^.*\/data\//, "public/data/");
  const body = readFileSync(new URL(path, ROOT), "utf8");
  return { ok: true, status: 200, json: async () => JSON.parse(body) };
};

const vite = await createServer({ root: ROOT.pathname, logLevel: "error", server: { middlewareMode: true }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
const { MockSource } = await vite.ssrLoadModule("/src/data/mock.ts");
const { SITE_TYPES, buildSite, profile } = await vite.ssrLoadModule("/src/model/templates.ts");
const { exportSite, UWAZI_TAGS, UWAZI_EXTENSIONS, CUSTOM_COMPONENT_MATCHER, scopeOf } = await vite.ssrLoadModule("/src/export/uwazi.ts");
test.after(() => vite.close());

const VOID = new Set(["br", "hr", "img", "input", "meta", "link"]);

function checkHtml(html, where) {
  const stack = [];
  for (const m of html.matchAll(/<(\/?)([A-Za-z][\w-]*)([^>]*?)(\/?)>/g)) {
    const [, close, name, , self] = m;
    if (/^[A-Z]/.test(name)) assert.ok(UWAZI_TAGS.includes(name), `${where}: <${name}> is not an Uwazi component`);
    if (self || VOID.has(name)) continue;
    if (close) {
      const top = stack.pop();
      assert.equal(top, name, `${where}: </${name}> closes <${top}>`);
    } else stack.push(name);
  }
  assert.deepEqual(stack, [], `${where}: unclosed ${stack.join(", ")}`);
  for (const m of html.matchAll(/\{(\w+)\}\(/g)) {
    const line = html.slice(m.index).split("\n")[0];
    assert.ok(CUSTOM_COMPONENT_MATCHER.test(line), `${where}: {${m[1]}}(…) does not match Uwazi's matcher`);
    assert.ok(UWAZI_EXTENSIONS.includes(m[1]), `${where}: {${m[1]}} is not a known extension`);
  }
}

function checkCss(css, scope, where) {
  const body = css.split("/* Custom CSS from Advanced")[0];
  for (const m of body.matchAll(/(^|})\s*([^{}]+?)\s*{/g)) {
    for (const sel of m[2].split(",").map((s) => s.trim())) {
      if (sel.startsWith(":root") || sel.startsWith("@")) continue;
      assert.ok(sel === `.${scope}` || sel.startsWith(`.${scope} `), `${where}: selector "${sel}" escapes .${scope}`);
    }
  }
}

for (const collection of ["sample", "cejil", "artworks"]) {
  test(`every site type exports parseable Uwazi pages — ${collection}`, async () => {
    const p = await profile(new MockSource(collection, "/"));
    for (const type of SITE_TYPES) {
      const site = buildSite(type.id, p);
      const opts = { titleOf: (id) => `Title of ${id}`, templates: p.templates };
      const a = exportSite(site, opts);
      const b = exportSite(site, opts);
      assert.deepEqual(a, b, `${type.id}: export is not deterministic`);
      assert.match(a.globalCss, /^\/\*.*\*\/\n:root \{/s);
      for (const page of a.pages) {
        const src = site.pages.find((x) => x.id === page.pageId);
        for (const lang of site.languages) checkHtml(page.html[lang], `${collection}/${type.id}/${page.title}/${lang}`);
        checkCss(page.css, scopeOf(src), `${collection}/${type.id}/${page.title}`);
        assert.equal(page.js, "", `${type.id}/${page.title}: no block should need JavaScript`);
      }
    }
  });
}

test("custom code is carried and flagged, not silently scoped", async () => {
  const p = await profile(new MockSource("sample", "/"));
  const site = { ...buildSite("research", p), advanced: { enabled: true, css: "body { margin: 0 }", js: "console.log(1)" } };
  const x = exportSite(site);
  assert.ok(x.pages[0].css.includes("Custom CSS from Advanced"));
  assert.equal(x.pages[0].js, "console.log(1)\n");
  assert.ok(x.pages[0].jsReason);
});

test("blocks with no Uwazi equivalent are named in the warnings", async () => {
  const p = await profile(new MockSource("cejil", "/"));
  const x = exportSite(buildSite("monitoring", p));
  const blocks = x.warnings.map((w) => w.block);
  assert.ok(blocks.includes("Status overview"));
  assert.ok(blocks.includes("Status history"));
});

test("each warning appears once, and the menu warning names its links", async () => {
  const p = await profile(new MockSource("cejil", "/"));
  for (const type of SITE_TYPES) {
    const site = buildSite(type.id, p);
    const x = exportSite(site);
    const lines = x.warnings.map((w) => `${w.page}|${w.block}|${w.message}`);
    assert.equal(new Set(lines).size, lines.length, `${type.id}: duplicate warnings`);
    const menu = x.warnings.find((w) => w.block === "Menu");
    if (site.menu.length) assert.ok(menu && menu.message.includes("→"), `${type.id}: menu warning lists the links`);
  }
});

test("block style exports as scoped page CSS; per-language visibility drops the block from other languages", async () => {
  const p = await profile(new MockSource("cejil", "/"));
  const site = buildSite("legal", p);
  const home = site.pages.find((x) => x.kind === "home");
  const [hero, second] = home.blocks;
  hero.style = { pad: "XL", align: "center", eyebrow: { es: "Archivo", en: "Archive" }, devices: ["desktop", "tablet"] };
  second.style = { langs: ["en"], bg: "image" };
  const x = exportSite(site);
  const page = x.pages.find((q) => q.pageId === home.id);
  const scope = scopeOf(home);
  assert.ok(page.html.es.includes('class="s-b0 s-hero"'), "styled block gets its class");
  assert.ok(page.html.es.includes('<p class="s-eyebrow">Archivo</p>'), "eyebrow in the page language");
  assert.ok(page.css.includes(`.${scope} .s-b0 {`) && page.css.includes("padding-block: 6rem"), "padding step exported");
  assert.ok(page.css.includes("@media (max-width: 39.99rem)"), "hidden on phones");
  checkCss(page.css, scope, "styled page");
  const n = (html) => (html.match(/<section/g) ?? []).length;
  assert.equal(n(page.html.es) + 1, n(page.html.en), "an EN-only block is left out of the ES HTML");
  assert.ok(x.warnings.some((w) => /background picture/.test(w.message)), "a background picture is named in the warnings");
});
