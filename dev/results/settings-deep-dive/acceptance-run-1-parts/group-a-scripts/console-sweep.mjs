import { launch, open, S, rail } from "./lib.mjs";
import { realErrors } from "./rec.mjs";
const b = await launch();
const { page: p, errors } = await open(b, "account");
for (const item of ["Account","Dashboard","Users & Groups","Collection","Account"]) { await rail(p, item); await p.waitForTimeout(500); }
await rail(p, "Users & Groups"); await p.waitForTimeout(300);
await S(p).getByRole("button", { name: "Edit mlopez" }).first().dispatchEvent("click"); await p.waitForTimeout(400);
await S(p).getByRole("button", { name: "Cancel" }).click(); await p.waitForTimeout(300);
await S(p).getByRole("tab", { name: /^Groups/ }).click(); await p.waitForTimeout(300);
await S(p).getByRole("button", { name: "Add group" }).click(); await p.waitForTimeout(300);
await S(p).getByRole("button", { name: "Cancel" }).click(); await p.waitForTimeout(300);
await rail(p, "Dashboard"); await p.waitForTimeout(500);
console.log("real console errors/warnings:", JSON.stringify(realErrors(errors)), "total incl. known:", errors.length);
await b.close();
