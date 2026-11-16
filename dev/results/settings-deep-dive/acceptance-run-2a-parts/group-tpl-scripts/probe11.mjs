import { launch, open, S, wait, addTemplate, openRow, addRelProp } from "./common.mjs";
const b = await launch();
const { page } = await open(b, "templates");
page.on("console", async (m) => { if (m.type()==="error") { const a = await Promise.all(m.args().map(x=>x.jsonValue().catch(()=>"?"))); console.log("ERR", JSON.stringify(a).slice(0,500)); } });
await wait(page, 800);
await addTemplate(page, "QA Target");
await openRow(page, "Court Case"); console.log("--- adding rel to Court Case"); await addRelProp(page, "Related QA", "QA Target");
await b.close();
