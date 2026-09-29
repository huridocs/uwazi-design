// Changing the site type keeps what the person made.
//
//   cd sites && npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer } from "vite";

const ROOT = new URL("../", import.meta.url);
globalThis.fetch = async (url) => {
  const path = String(url).replace(/^.*\/data\//, "public/data/");
  return { ok: true, status: 200, json: async () => JSON.parse(readFileSync(new URL(path, ROOT), "utf8")) };
};
const vite = await createServer({ root: ROOT.pathname, logLevel: "error", server: { middlewareMode: true }, appType: "custom", optimizeDeps: { noDiscovery: true, include: [] } });
const { MockSource } = await vite.ssrLoadModule("/src/data/mock.ts");
const { SITE_TYPES, buildSite, profile } = await vite.ssrLoadModule("/src/model/templates.ts");
const { switchSiteType } = await vite.ssrLoadModule("/src/model/switchType.ts");
test.after(() => vite.close());

test("edits, languages, logo and added pages survive a type change; untouched parts follow the new type", async () => {
  const p = await profile(new MockSource("cejil", "/"));
  const site = buildSite("legal", p);
  const home = site.pages.find((x) => x.kind === "home");
  const hero = home.blocks.find((b) => b.type === "hero");
  hero.props = { ...hero.props, title: { es: "Mi título" } };
  const extra = { id: "pg-x", kind: "custom", title: { es: "Prensa" }, slug: "prensa", blocks: [] };
  const edited = { ...site, languages: [...site.languages, "ar"], theme: { ...site.theme, logo: { src: "x.png", alt: "Logo", focal: { x: 0.5, y: 0.5 } } }, pages: [...site.pages, extra] };

  for (const t of SITE_TYPES.filter((s) => s.id !== "legal")) {
    const { config, removed } = switchSiteType(edited, t.id, p);
    assert.equal(config.template, t.id);
    assert.deepEqual(config.languages, edited.languages, t.id);
    assert.equal(config.theme.logo.src, "x.png", t.id);
    assert.ok(config.pages.some((x) => x.id === "pg-x"), `${t.id}: added page kept`);
    assert.equal(config.pages.find((x) => x.kind === "home").id, home.id, `${t.id}: home keeps its id`);
    const newHero = config.pages.find((x) => x.kind === "home").blocks.find((b) => b.type === "hero");
    if (newHero) assert.equal(newHero.props.title.es, "Mi título", `${t.id}: edited hero kept`);
    else assert.ok(removed.some((r) => r.block === "Hero"), `${t.id}: dropped hero is listed`);
    // Theme was not edited, so it follows the new type.
    assert.equal(config.theme.accent, buildSite(t.id, p).theme.accent, t.id);
    // Every menu link points at a page that exists.
    for (const m of config.menu) if (m.page) assert.ok(config.pages.some((x) => x.id === m.page), `${t.id}: menu link to a missing page`);
  }
});

test("switching back and forth without edits returns the original type's blocks", async () => {
  const p = await profile(new MockSource("sample", "/"));
  const site = buildSite("research", p);
  const there = switchSiteType(site, "numbers", p).config;
  const back = switchSiteType(there, "research", p).config;
  const types = (c) => c.pages.map((x) => x.blocks.map((b) => b.type).join(","));
  assert.deepEqual(types(back), types(site));
});

test("a block's style survives a type change when the new type keeps the block", async () => {
  const p = await profile(new MockSource("cejil", "/"));
  const site = buildSite("legal", p);
  const hero = site.pages.find((x) => x.kind === "home").blocks.find((b) => b.type === "hero");
  hero.style = { pad: "L", bg: "warm" };
  for (const t of SITE_TYPES.filter((s) => s.id !== "legal")) {
    const next = switchSiteType(site, t.id, p).config.pages.find((x) => x.kind === "home").blocks.find((b) => b.type === "hero");
    if (next) assert.deepEqual(next.style, { pad: "L", bg: "warm" }, `${t.id}: hero keeps its style`);
  }
});
