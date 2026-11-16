import { S, wait, clean, sh, rail, dialogs, rec } from "./g.mjs";
export const footerBtn = (p, name) => S(p).locator("footer").getByRole("button", { name });
export const nameInput = (p) => S(p).getByLabel("Thesaurus name");
export const commitBtn = (p) => S(p).locator("footer").getByRole("button", { name: /^(Save|Create thesaurus)$/ });
export const cancelBtn = (p) => S(p).locator("footer").getByRole("button", { name: /^Cancel$/ });
export const listRows = (p) => S(p).locator("[data-part=row]").evaluateAll((r) => r.map((x) => x.innerText.replace(/\s+/g, " ").trim()));
export const openThes = async (p, name) => { await S(p).locator("[data-part=row]").filter({ hasText: name }).first().click(); await wait(p, 700); };
export const newThes = async (p, name) => { await footerBtn(p, "Add thesaurus").click(); await wait(p, 400); if (name !== undefined) await nameInput(p).fill(name); await wait(p, 100); };
/** values as text: "[G]Group (n)" / "  child" / "root" in display order */
export const vrows = (p) => S(p).locator("li[data-row-id]").evaluateAll((lis) => lis
  .map((li) => ({ top: parseFloat(li.style.top), li }))
  .sort((a, b) => a.top - b.top)
  .map(({ li }) => {
    const grp = !!li.querySelector("button[aria-expanded]");
    const inp = li.querySelector("input[type=text],input:not([type])");
    const lab = (inp ? "<" + inp.value + ">" : li.querySelector("[data-part=label]")?.textContent || "");
    const child = !!li.querySelector(":scope > span[aria-hidden].w-5");
    return (grp ? "[G]" : child ? "  -" : "") + lab;
  }));
/** Add values through the keyboard flow: Add value, type, Enter ... then Escape on the trailing blank row */
export async function addVals(p, labels) {
  await S(p).getByRole("button", { name: "Add value", exact: true }).first().click(); await wait(p, 150);
  for (const l of labels) { await p.keyboard.type(l); await p.keyboard.press("Enter"); await wait(p, 100); }
  await p.keyboard.press("Escape"); await wait(p, 150);
}
export const valueCount = async (p) => (clean(await S(p).locator("h3").first().innerText().catch(() => "")));
export const secTitle = async (p) => clean(await S(p).innerText());
export const saveThes = async (p) => { await commitBtn(p).click(); await wait(p, 600); };
export const guard = (p) => p.locator('[data-component=ConfirmDialog],[data-component=ConfirmDelete]');
export const toThesauri = async (p) => { await rail(p, "Thesauri"); await wait(p, 500); };
/** list with a thesaurus: create one with values quickly and save */
export async function makeThes(p, name, labels) {
  await newThes(p, name); if (labels?.length) await addVals(p, labels); await saveThes(p);
}
