import { launch, open, S, wait, devEmpty, devReturn } from "./common.mjs";
const b = await launch();
const { page } = await open(b, "dashboard");
page.on("console", async (m) => { if (m.type()==="error") { const a = await Promise.all(m.args().map(x=>x.jsonValue().catch(()=>"?"))); console.log("ERR", JSON.stringify(a).slice(0,700)); } });
await wait(page, 800);
await devEmpty(page, "Empty templates"); console.log("--- return");
await devReturn(page, "Templates");
await b.close();
