/** Scrape the open evidence card into plain data. */
export async function scrapeCard(p) {
  return await p.evaluate(() => {
    const card = document.querySelector('[data-component="RefEvidenceCard"]');
    if (!card) return null;
    const t = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();
    const dlg = card.querySelector('[role=dialog]') ?? card;
    const sub = [...card.querySelectorAll("h2,h3,p,span")].find((e) => false);
    const status = card.querySelector('[data-part=status]');
    const statusPs = status ? [...status.querySelectorAll(":scope > p")].map(t) : [];
    const chips = status ? [...status.querySelectorAll(":scope > div > *")].map(t) : [];
    const sources = [...card.querySelectorAll('[data-part=source]')].map((li) => {
      const pTop = li.querySelector("p");
      const dateEl = li.querySelector(":scope > div:first-child > span:last-child");
      const a = li.querySelector("a[href]");
      const rec = li.querySelector(":scope > div:nth-child(2) > button");
      return {
        publisherLine: t(pTop), date: dateEl ? t(dateEl) : "",
        title: t(rec), href: a?.getAttribute("href") ?? null, target: a?.getAttribute("target") ?? null, rel: a?.getAttribute("rel") ?? null,
        synd: t(li.querySelector('[data-part=syndication]')),
        quotes: [...li.querySelectorAll('[data-part=quote]')].map((q) => ({ text: t(q.querySelector("p")), page: t(q.querySelector('[data-component=PageTag]')) })),
      };
    });
    const passages = card.querySelector('[data-part=passages]');
    return {
      text: card.innerText,
      statusPs, chips,
      facts: t(card.querySelector('[data-part=facts]')),
      notes: [...card.querySelectorAll('[data-part=notes] p')].map(t),
      sources,
      passagesLabel: passages ? t(passages.querySelector("p, h2, h3, div")) : "",
      loose: passages ? [...passages.querySelectorAll(":scope li")].map((li) => ({ quote: t(li.querySelector('[data-part=quote] p')), page: t(li.querySelector('[data-component=PageTag]')), time: t(li.querySelector('[data-component=TimeTag]')), text: t(li) })) : [],
    };
  });
}
