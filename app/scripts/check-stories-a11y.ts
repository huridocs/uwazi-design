/* Runs axe — the engine the Storybook a11y addon uses — over every story in
 * BOTH themes, and exits non-zero on any violation.
 *
 * The addon already flags these in its panel, one story at a time, if someone
 * opens the panel. This makes the same check answerable in one command, which is
 * the difference between "the stories are auditable" and "the stories are
 * audited". It earned itself immediately: it caught 11px prose in `text-ink-muted`
 * (3.95:1 light, 2.91:1 dark), an amber sentence at 1.89:1, and the provenance
 * hop's `text-carbon` links — all in code that had already shipped.
 *
 *   npm run check:stories            # needs Storybook running
 *   node scripts/check-stories-a11y.ts --url http://localhost:6006
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const AXE = readFileSync("node_modules/axe-core/axe.min.js", "utf8");

const url = process.argv.includes("--url")
  ? process.argv[process.argv.indexOf("--url") + 1]
  : "http://localhost:6006";

// The story list comes from Storybook's own index, not a hand-written array.
// A hand list rots two ways at once: new stories never join it, and a renamed
// id keeps "passing" because nobody deletes it — while the summary still says
// clean as if coverage were total.
const indexRes = await fetch(`${url}/index.json`).catch(() => null);
if (!indexRes?.ok) {
  console.error(`No Storybook index at ${url}/index.json — start it (npm run storybook) or pass --url.`);
  process.exit(2);
}
const { entries } = (await indexRes.json()) as {
  entries: Record<string, { id: string; type?: string }>;
};
const STORIES = Object.values(entries)
  .filter((e) => e.type === "story")
  .map((e) => e.id);

const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1100, height: 800 }, deviceScaleFactor: 2 });
let bad = 0;
for (const id of STORIES) {
  for (const theme of ["light", "dark"] as const) {
    const res = await page.goto(`${url}/iframe.html?id=${id}&globals=theme:${theme}`, {
      waitUntil: "networkidle",
    });
    if (!res?.ok()) { console.log(`MISSING  ${id}`); bad++; continue; }
    // Storybook serves iframe.html?id=<anything> as 200 — an unknown or broken
    // id draws its error page in-document, so res.ok() proves nothing. A story
    // counts as present only once the root actually holds rendered elements.
    const rendered = await page
      .waitForFunction(() => {
        if (document.body.classList.contains("sb-show-errordisplay")) return "error";
        const root = document.querySelector("#storybook-root");
        return root && root.childElementCount > 0 ? "ok" : false;
      }, undefined, { timeout: 5000 })
      .then((h) => h.jsonValue(), () => "timeout");
    if (rendered !== "ok") { console.log(`MISSING  ${id} [${theme}] (${rendered})`); bad++; continue; }
    await page.waitForTimeout(700);
    await page.addScriptTag({ content: AXE });
    const out = await page.evaluate(async () => {
      // @ts-expect-error injected
      const r = await window.axe.run(document.body, {
        runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      });
      return r.violations.map((v: any) => ({ id: v.id, impact: v.impact, n: v.nodes.length,
        sample: v.nodes[0]?.html?.slice(0, 90) }));
    });
    if (out.length) {
      bad++;
      console.log(`VIOLATION ${id} [${theme}]`);
      for (const v of out) console.log(`   ${v.id} (${v.impact}, ${v.n}) ${v.sample}`);
    }
  }
}
console.log(bad === 0 ? `\nclean — ${STORIES.length} stories × 2 themes` : `\n${bad} story/theme combos with findings`);
await b.close();
process.exit(bad ? 1 : 0);
