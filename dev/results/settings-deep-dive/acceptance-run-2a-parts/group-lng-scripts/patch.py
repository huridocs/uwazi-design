p="trn4.mjs"
s=open(p).read()
s=s.replace('await page.getByRole("button", { name: "Translate Person" }).tap(); await page.waitForTimeout(800);','const cb = page.getByRole("button", { name: "Translate Person" }); await cb.scrollIntoViewIfNeeded(); const cbb = await cb.boundingBox(); await page.touchscreen.tap(cbb.x + 40, cbb.y + 16); await page.waitForTimeout(800);')
s=s.replace("const cbb = await cancelBtn.boundingBox()","const cbb2 = await cancelBtn.boundingBox()")
open(p,"w").write(s)
