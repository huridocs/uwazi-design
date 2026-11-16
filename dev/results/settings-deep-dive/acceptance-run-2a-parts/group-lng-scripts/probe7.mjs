import { launch, open } from "./lib.mjs";
import { beacon } from "./u.mjs";
const b = await launch(); const {page} = await open(b,"languages");
console.log(await beacon(page)); await page.waitForTimeout(4000); console.log(await beacon(page)); await b.close();
