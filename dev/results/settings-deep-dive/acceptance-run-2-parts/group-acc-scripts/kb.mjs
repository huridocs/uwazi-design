// Harness observation for X-06 on phone: in the emulated 390x844 touch context the --kb inset can be stuck at a stale value from first load.
import { launch, open, S, shot, dialogs } from "./lib.mjs";
import { mk } from "./rec.mjs";
const { rec, save } = mk("kb");
const b = await launch();
const r = await open(b, "account", "mobile", { noKbFix: true }); const p = r.page;
const kb0 = await p.evaluate(() => document.documentElement.style.getPropertyValue("--kb"));
const vv = await p.evaluate(() => [innerHeight, visualViewport.height, visualViewport.offsetTop]);
await p.locator("#account-email").fill("k@x.org");
await p.getByRole("button", { name: "Update", exact: true }).tap(); await p.waitForTimeout(500);
const box = await p.locator('[role=dialog]:not([inert] *)').last().boundingBox();
await shot(p, "X-06-kb-stale");
await p.evaluate(() => window.visualViewport.dispatchEvent(new Event("resize"))); await p.waitForTimeout(300);
const kb1 = await p.evaluate(() => document.documentElement.style.getPropertyValue("--kb"));
const box1 = await p.locator('[role=dialog]:not([inert] *)').last().boundingBox();
await shot(p, "X-06-kb-fixed");
rec("X-06-kb", kb0 === "0px" || kb0 === "" ? "PASS" : "FAIL", `Fresh phone context (390x844, touch), Settings > Account, no interaction yet: --kb on :root="${kb0}" while innerHeight=${vv[0]}, visualViewport.height=${vv[1]}, offsetTop=${vv[2]} (expected 0px, there is no keyboard). With a field edited and the "Confirm" dialog opened, the dialog box is ${JSON.stringify(box && { y: Math.round(box.y), h: Math.round(box.height) })} (collapsed, the scrim shows but the dialog is not visible; Cancel/Accept cannot be tapped). After dispatching a visualViewport resize --kb="${kb1}" and the dialog box is ${JSON.stringify(box1 && { y: Math.round(box1.y), h: Math.round(box1.height) })}. The hook (hooks/useKeyboardInset.ts) measures once at mount and only on visualViewport resize/scroll; in this emulation the first value is taken while the layout viewport is still settling. Not confirmed on a real device`, "X-06-kb-stale.png");
save(); await b.close();
