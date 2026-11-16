import { dialogs, run, open, S, wait, check, listRows, clean, footerBtn, dlgLoc, rail, rec, sh, axeOn, dark, hscroll, switchTo, toSettings, logEntries, devSlow, backToSettings, toDev } from "./g.mjs";
const snap = async (p) => p.evaluate(() => { const c = document.querySelector("[data-testid=settings-content]"); if (!c) return null; const cards = c.querySelector("[data-part=cards]"); return { t: Math.round(performance.now()), busy: [...c.querySelectorAll("[aria-busy=true]")].length, pulse: [...c.querySelectorAll(".animate-pulse,[class*=skeleton]")].length, loadingText: /Loading/.test(c.innerText), cards: cards ? cards.innerText.replace(/\s+/g, " ").slice(0, 160) : "(no cards element)" }; });

// DSH-08
await run("dsh-c1", async (b) => {
  const { page: p } = await open(b, "dashboard");
  await wait(p, 1200);
  await check("DSH-08", p, async () => {
    await devSlow(p, true);
    const on = await p.locator("[data-component=DevPanel]").getByRole("checkbox", { name: "Slow load (2 s)" }).isChecked();
    await backToSettings(p, "Dashboard"); await wait(p, 3000);
    // reload tab with the switch on (kept in sessionStorage)
    await p.reload({ waitUntil: "commit" });
    const frames = [];
    for (const ms of [150, 500, 1000, 1700, 2600, 3500]) {
      await p.waitForTimeout(ms - (frames.length ? [150, 500, 1000, 1700, 2600, 3500][frames.length - 1] : 0));
      let s = null; try { s = await snap(p); } catch { s = { err: "page not ready" }; }
      frames.push({ at: ms, ...s });
      if (ms === 500) await sh(p, "DSH-08-t500").catch(() => {});
    }
    const url = await p.evaluate(() => sessionStorage.getItem("uwazi:dev:slowLoad"));
    // also: open Settings from the catalog with the switch on
    await toDev(p).catch(() => {});
    await backToSettings(p, "Dashboard").catch(() => {});
    const frames2 = [];
    for (const ms of [100, 500, 1200]) { await p.waitForTimeout(ms === 100 ? 100 : ms === 500 ? 400 : 700); let s = null; try { s = await snap(p); } catch { s = { err: "x" }; } frames2.push({ at: ms, ...s }); }
    await sh(p, "DSH-08-reopen");
    // control: the same switch on a list page, opened from the catalog the same way
    await toDev(p); await p.getByRole("button", { name: /Return to app/ }).click(); await p.waitForTimeout(700);
    await toSettings(p, "Pages");
    const ctl = await p.evaluate(() => { const c = document.querySelector("[data-testid=settings-content]"); return c ? { busy: c.querySelectorAll("[aria-busy=true]").length, pulse: c.querySelectorAll(".animate-pulse").length, loadingText: /Loading/.test(c.innerText) } : null; });
    await sh(p, "DSH-08-control-pages");
    const back = frames2[frames2.length - 1];
    const skeleton = frames.some((f) => f.pulse > 0 || f.busy > 0) || frames2.some((f) => f.pulse > 0 || f.busy > 0);
    const emptyNums = frames.concat(frames2).some((f) => /0 Bytes|USERS 0 |ENTITIES 0 /.test(f.cards || ""));
    return [skeleton && !emptyNums, `Slow load (2 s) switch on=${on}, stored ${url}; reload frames ${JSON.stringify(frames.map((f) => ({ at: f.at, busy: f.busy, pulse: f.pulse, loading: f.loadingText, cards: (f.cards || f.err || "").slice(0, 90) })))}; reopen from the catalog frames ${JSON.stringify(frames2.map((f) => ({ at: f.at, busy: f.busy, pulse: f.pulse, loading: f.loadingText, cards: (f.cards || f.err || "").slice(0, 90) })))}; skeleton/aria-busy elements seen=${skeleton}; control: with the same switch on, the Pages list right after Settings opens shows ${JSON.stringify(ctl)} , while the Dashboard opened the same way showed busy=${frames2[0].busy} pulse=${frames2[0].pulse} loading=${frames2[0].loadingText} at 100 ms; empty stand-in numbers seen=${emptyNums}`, "DSH-08-reopen"];
  });
});
