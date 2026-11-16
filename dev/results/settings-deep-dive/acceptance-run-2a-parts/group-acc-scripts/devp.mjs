// Dev panel helpers. The catalog is reached with the navbar logo; "Return to app" lands on the Library, so go back to Settings either
// through the Settings menu (opens the first allowed section) or, to keep the stored section, with a synthetic storage event on appView
// (atomWithStorage listens for it, so no reload and the in-memory Dev switches survive).
export const openCatalog = async (p) => { await p.locator('[data-part=logo]').click(); await p.waitForTimeout(800); };
export const backToSettings = async (p, group = "User settings", item = null) => {
  await p.getByRole("button", { name: "Return to app" }).click(); await p.waitForTimeout(600);
  await p.locator('button:has-text("Settings")').first().click(); await p.waitForTimeout(300);
  await p.getByRole("button", { name: group, exact: true }).click(); await p.waitForTimeout(700);
  if (item) { await p.locator('nav[aria-label="Settings navigation"] button', { hasText: item }).first().click(); await p.waitForTimeout(500); }
};
export const resumeSettings = async (p) => {
  await p.evaluate(() => { sessionStorage.setItem("uwazi:appView", JSON.stringify("settings")); window.dispatchEvent(new StorageEvent("storage", { key: "uwazi:appView", newValue: JSON.stringify("settings"), storageArea: sessionStorage })); });
  await p.waitForTimeout(800);
};
export const setRole = async (p, label) => { await p.locator("[data-component=DevPanel]").getByRole("button", { name: /^Role:/ }).click(); await p.waitForTimeout(250); await p.getByRole("option", { name: label, exact: true }).click(); await p.waitForTimeout(500); };
export const flagBox = (p, name) => p.locator("[data-component=DevPanel]").getByLabel(name, { exact: true });
export const toggleFlag = async (p, name) => { await flagBox(p, name).click({ force: true }); await p.waitForTimeout(300); };
export const flagState = (p, name) => flagBox(p, name).isChecked();
