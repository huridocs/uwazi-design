import { S, wait, strip, shot, dlg, propNames, openEditor, rec, errs } from "./ted-common.mjs";
import { addProp, saveTemplate, toLibrary, createEntity, field, openTemplate } from "./ent.mjs";
// Drives one property type end to end: template editor -> save -> reload -> reopen property -> blank form -> value -> record.
export async function driveType(b, id, spec) {
  const out = { id, notes: [] };
  const c = await openEditor(b, "Court Case"); const p = c.page;
  try {
    await addProp(p, { type: spec.type, label: spec.label, fill: spec.panel, flags: spec.flags || [] });
    out.impact = await saveTemplate(p);
    await p.reload(); await wait(p, 1800);
    await openTemplate(p, "Court Case");
    await S(p).getByRole("button", { name: "Edit " + spec.label, exact: true }).click(); await wait(p, 500);
    const d = dlg(p);
    out.reopen = await d.evaluate(e => ({ type: e.querySelector("[data-part=type-box]")?.innerText.replace(/\s+/g, " "), label: e.querySelector("input[type=text]")?.value, flags: [...e.querySelectorAll("[data-part=flags] input:checked")].map(i => i.getAttribute("aria-label")), selects: [...e.querySelectorAll("button[aria-label*=': ']")].map(b => b.getAttribute("aria-label")), radios: [...e.querySelectorAll("input[type=radio]:checked")].map(r => r.parentElement.innerText.trim()) }));
    await shot(p, id + "-reopen");
    await d.getByRole("button", { name: "Cancel" }).click(); await wait(p, 300);
    out.dirtyAfter = !(await S(p).locator("footer").getByRole("button", { name: "Save" }).isDisabled());
    await S(p).locator("footer").getByRole("button", { name: "Cancel" }).click(); await wait(p, 500);
    await toLibrary(p, "Court Case");
    await createEntity(p, "Court Case");
    out.control = spec.inspect ? await spec.inspect(p) : null;
    await p.getByLabel("Title*", { exact: true }).fill("QA " + spec.type + " entity");
    await p.getByLabel("Description*", { exact: false }).first().fill("desc");
    await spec.enter(p);
    await shot(p, id + "-form");
    await p.getByRole("button", { name: "Save", exact: true }).last().click(); await wait(p, 1500);
    out.afterSave = await recordText(p, spec.label);
    // reopen: close drawer, open card again
    await p.getByRole("button", { name: "Close", exact: true }).last().click().catch(() => {}); await wait(p, 600);
    const card = p.locator("[data-component=EntityCard]", { hasText: "QA " + spec.type + " entity" }).first();
    if (await card.count()) {
      await card.click(); await wait(p, 900);
      out.reopened = await recordText(p, spec.label);
      out.cardText = strip(await card.innerText());
    } else out.notes.push("card not found after save");
    await shot(p, id + "-record");
    if (spec.after) await spec.after(p, out);
    out.errors = errs(c.errors);
  } catch (e) { out.script = String(e.message).split("\n")[0].slice(0, 300); out.stack = e.stack.split("\n").slice(1, 3).join(" / ").slice(0, 300); }
  await c.ctx.close();
  return out;
}
export const recordText = async (p, label) => {
  const f = p.locator('[data-part=field]').filter({ hasText: new RegExp("^\\s*" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }).first();
  if (!(await f.count())) return null;
  return { text: strip(await f.innerText()), html: (await f.evaluate(e => e.innerHTML)).slice(0, 1500) };
};
