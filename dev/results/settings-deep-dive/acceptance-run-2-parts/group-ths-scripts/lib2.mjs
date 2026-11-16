import { S, wait, clean, sh, rail, toSettings } from "./g.mjs";
/** Library (navbar) -> read the Template facet of the Sample: top-level rows and group rows. */
export async function goLibrary(p) { await p.locator("button", { hasText: "Library" }).first().click(); await wait(p, 2200); }
export const libFacet = (p) => p.evaluate(() => {
  const cards = [...document.querySelectorAll("[data-component=FacetCard]")];
  const i = cards.findIndex((c) => c.querySelector("h2")?.textContent === "Template");
  if (i < 0) return null;
  const row = (l) => ({ name: l.querySelector("input")?.getAttribute("aria-label"), count: l.querySelector("[data-part=count]")?.textContent, checked: l.querySelector("input")?.checked, bold: /font-bold/.test(l.querySelector("[data-part=count]")?.className || "") });
  const top = [...cards[i].querySelectorAll(":scope > [data-component=FacetRow]")].map(row);
  const groups = [];
  for (let k = i + 1; k < cards.length; k++) {
    if (cards[k].querySelector("h2")) break;
    const head = cards[k].querySelector(":scope > [data-component=FacetRow]");
    if (!head) continue;
    groups.push({ ...row(head), chevron: !!head.querySelector("[data-part=expand]"), expanded: head.querySelector("[data-part=expand]")?.getAttribute("aria-expanded"), children: [...cards[k].querySelectorAll("[data-component=TreeChildren] [data-component=FacetRow]")].map(row) });
  }
  return { top, groups };
});
export const entityCountText = (p) => p.evaluate(() => (document.body.innerText.match(/([\d,]+) entities/) || [])[1]);
export const facetTop = (f) => f ? f.top.map((r) => r.name) : null;
export const facetGroups = (f) => f ? f.groups.map((g) => `${g.name}(${g.count}):[${g.children.map((c) => c.name + ":" + c.count).join(",")}]`) : null;
export async function backFilters(p) { await toSettings(p, "Filters"); }
export async function newTemplate(p, name) {
  await toSettings(p, "Templates");
  await S(p).getByRole("button", { name: /Add template/ }).click(); await wait(p, 500);
  await S(p).getByLabel("Template name").fill(name); await wait(p, 200);
  await S(p).getByRole("button", { name: /Create template/ }).click(); await wait(p, 700);
}
