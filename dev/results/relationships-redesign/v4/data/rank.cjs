const { chromium } = require("/Users/juanmnl/.operator/worktrees/uwazi_app-ad9c40/app/node_modules/playwright");
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto("file://" + __dirname + "/prototype/index.html"); await p.waitForTimeout(800);
  const out = await p.evaluate(() => {
    const D = window.CEJIL; const res = [];
    const year = (s) => new Date(s * 1000).getUTCFullYear();
    for (let x = 0; x < N; x++) {
      if (tplName(x) !== "Causa") continue;
      const gs = connectionsOf(x);
      const k = { field: 0, listed: 0, together: 0, none: 0 };
      let hub2 = 0;
      for (const g of gs) { k[g.kind]++; if (g.kind === "field" && g.rows.length >= 2) hub2++; }
      const cc = connectedCount(x);
      // 1-hop + 2-hop dated entities
      const seen = new Set([x]); const hop1 = []; for (const g of gs) for (const r of g.rows) if (r.ent !== undefined && !seen.has(r.ent)) { seen.add(r.ent); hop1.push(r.ent); }
      const hop2 = []; for (const h of hop1) for (const g of connectionsOf(h)) for (const r of g.rows) if (r.ent !== undefined && !seen.has(r.ent)) { seen.add(r.ent); hop2.push(r.ent); }
      const dated = [x, ...hop1].filter(i => D.dates[i]);
      const years = new Set(dated.flatMap(i => D.dates[i].map(d => year(d[1]))));
      // pattern rows
      const sents = hop(x, "CorteIDH", "Sentencia de la CorteIDH"); let prow = 0, pais = 0;
      for (const s of sents) { const js = hop(s, "Firmantes", "Juez y/o Comisionado"); prow += js.length; for (const j of js) if (hop(j, "País", "País").length) pais++; }
      const ownDates = (D.dates[x] || []).length;
      res.push({ x, sid: D.ents[x][0], t: title(x), cc, ...k, hub2, dated1: dated.length, years: years.size, hop2: hop2.length, sents: sents.length, prow, pais, ownDates });
    }
    // Relaxed: the showcase may be spread over the first two steps of the trail.
    const kinds = (i) => { const k = new Set(connectionsOf(i).map(g => g.kind)); return k; };
    for (const r of res) {
      const gs = connectionsOf(r.x); const h1 = []; for (const g of gs) for (const q of g.rows) if (q.ent !== undefined) h1.push(q.ent);
      const k1 = new Set(); let togetherAt = null, listedAt = null, noneAt = r.none ? "self" : null;
      for (const h of h1) { const k = kinds(h); if (k.has("listed") && !listedAt) listedAt = title(h); if (k.has("none") && !noneAt) noneAt = title(h); if (k.has("together") && !togetherAt) togetherAt = title(h); }
      if (!togetherAt) for (const h of h1) { for (const g of connectionsOf(h)) for (const q of g.rows) if (q.ent !== undefined && !togetherAt && kinds(q.ent).has("together")) togetherAt = title(h) + " › " + title(q.ent); if (togetherAt) break; }
      Object.assign(r, { listedAt, noneAt, togetherAt });
    }
    const full = res.filter(r => r.hub2 && r.prow >= 6 && r.pais >= 3 && r.listedAt && r.noneAt && r.togetherAt && r.cc >= 5 && r.cc <= 30);
    full.sort((a, b) => (b.dated1 + b.years * 2 + b.pais + b.field) - (a.dated1 + a.years * 2 + a.pais + a.field));
    return { total: res.length, withAll: full.length, top: full.slice(0, 8), vr: res.find(r => r.t === "Velásquez Rodríguez") };
  });
  console.log(JSON.stringify(out, null, 0).replace(/\},\{/g, "},\n{"));
  await b.close();
})();
