/* The public page, rendered for the editors' live preview.
 *
 * Takes page HTML in Uwazi's own component syntax (both of them — the JSX tags
 * and the `{name}(options)` extensions), expands every component against the
 * collection's REAL entities, and wraps it in the public site's chrome as one
 * HTML document for an `<iframe srcdoc>`. The author's CSS and JS go in too; the
 * frame is sandboxed without same-origin, so a page script can run and still
 * cannot reach the app.
 *
 * A mock of what Uwazi's SSR does for `page/:sharedId`: real Uwazi renders the
 * components in React. What matters for the editors is that the preview answers
 * with the same data the published page would. */

export interface SiteEntity {
  id: string;
  title: string;
  typeId: string;
  typeName: string;
  color: string;
  country?: string;
  lat?: number;
  lng?: number;
  /** ms since epoch — the entity's representative date. */
  date?: number;
  /** How many relationships it has — "most cited". */
  links?: number;
  /** A status value (CEJIL's Activo / Cerrado; the Sample's case status). */
  status?: string;
}

export interface RenderContext {
  entities: SiteEntity[];
  /** The entity an entity-view page is shown with in the preview. */
  viewEntity?: SiteEntity;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function attrs(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of src.matchAll(/([\w-]+)\s*=\s*"([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

/** `template:court_case;country:Argentina` — template by id or by name. */
export function matches(e: SiteEntity, query = ""): boolean {
  for (const part of query.split(";")) {
    const [key, ...rest] = part.split(":");
    const value = rest.join(":").trim();
    if (!key.trim() || !value) continue;
    if (key.trim() === "template" && e.typeId !== value && e.typeName.toLowerCase() !== value.toLowerCase()) return false;
    if (key.trim() === "country" && (e.country ?? "").toLowerCase() !== value.toLowerCase()) return false;
    if (key.trim() === "status" && (e.status ?? "").toLowerCase() !== value.toLowerCase()) return false;
  }
  return true;
}

function countsBy(entities: SiteEntity[], by: string): { label: string; count: number; color: string }[] {
  const map = new Map<string, { count: number; color: string }>();
  for (const e of entities) {
    const label =
      by === "country" ? e.country : by === "status" ? e.status : by === "decade" ? (e.date ? `${Math.floor(new Date(e.date).getUTCFullYear() / 10) * 10}s` : undefined) : e.typeName;
    if (!label) continue;
    const hit = map.get(label);
    if (hit) hit.count++;
    else map.set(label, { count: 1, color: by === "country" ? "var(--accent)" : e.color });
  }
  const rows = [...map.entries()].map(([label, v]) => ({ label, ...v }));
  // Decades read in order; everything else by size.
  return by === "decade" ? rows.sort((a, b) => a.label.localeCompare(b.label)) : rows.sort((a, b) => b.count - a.count).slice(0, 8);
}

const unknown = (name: string) => `<div class="u-unknown">Unknown component: ${esc(name)}</div>`;

function chart(tag: string, a: Record<string, string>, ctx: RenderContext): string {
  const rows = countsBy(ctx.entities.filter((e) => matches(e, a.query)), a.property || "template");
  if (!rows.length) return `<p class="u-empty">No data for this chart.</p>`;
  const max = rows[0].count;
  const total = rows.reduce((n, r) => n + r.count, 0);
  if (tag === "PieChart") {
    let acc = 0;
    const stops = rows.map((r, i) => {
      const from = (acc / total) * 100;
      acc += r.count;
      return `hsl(${(i * 47) % 360} 45% 50%) ${from}% ${(acc / total) * 100}%`;
    });
    return `<div class="u-pie"><div class="u-pie-disc" style="background:conic-gradient(${stops.join(",")})"></div><ul>${rows
      .map((r, i) => `<li><i style="background:hsl(${(i * 47) % 360} 45% 50%)"></i>${esc(r.label)} <b>${r.count}</b></li>`)
      .join("")}</ul></div>`;
  }
  if (tag === "ListChart") {
    return `<ul class="u-listchart">${rows.map((r) => `<li><span>${esc(r.label)}</span><b>${r.count}</b></li>`).join("")}</ul>`;
  }
  return `<div class="u-bars">${rows
    .map((r) => `<div class="u-bar"><span>${esc(r.label)}</span><div><i style="width:${(r.count / max) * 100}%;background:${r.color}"></i></div><b>${r.count}</b></div>`)
    .join("")}</div>`;
}

function map(a: Record<string, string>, ctx: RenderContext): string {
  const pts = ctx.entities.filter((e) => matches(e, a.query) && e.lat !== undefined && e.lng !== undefined);
  // The Americas, roughly — where both corpora live.
  const [W, H, x0, x1, y0, y1] = [640, 360, -120, -30, 35, -45];
  const X = (lng: number) => ((lng - x0) / (x1 - x0)) * W;
  const Y = (lat: number) => ((y0 - lat) / (y0 - y1)) * H;
  const seen = new Map<string, number>();
  for (const p of pts) {
    const k = `${p.lat!.toFixed(1)},${p.lng!.toFixed(1)}`;
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  const dots = [...seen.entries()]
    .map(([k, n]) => {
      const [lat, lng] = k.split(",").map(Number);
      return `<circle cx="${X(lng).toFixed(1)}" cy="${Y(lat).toFixed(1)}" r="${Math.min(14, 3 + Math.sqrt(n) * 1.6).toFixed(1)}"/>`;
    })
    .join("");
  const grid = Array.from({ length: 9 }, (_, i) => `<line x1="${(i * W) / 8}" y1="0" x2="${(i * W) / 8}" y2="${H}"/>`).join("") +
    Array.from({ length: 5 }, (_, i) => `<line x1="0" y1="${(i * H) / 4}" x2="${W}" y2="${(i * H) / 4}"/>`).join("");
  return `<figure class="u-mapfig"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Map of ${pts.length} located entities"><g class="u-grid">${grid}</g><g class="u-dots">${dots}</g></svg><figcaption>${pts.length} located entities</figcaption></figure>`;
}

/** Expand every component in `html` against the collection. Unknown or broken
 *  components render as a visible notice, which is the point of a preview. */
export function expandComponents(html: string, ctx: RenderContext): string {
  const view = ctx.viewEntity;
  let out = html.replace(/\{\{title\}\}/g, esc(view?.title ?? "Entity title"));

  // Repeat first: its body holds other components, filled per entity.
  out = out.replace(/<Repeat\b([^>]*)>([\s\S]*?)<\/Repeat>/g, (_m, a: string, body: string) => {
    const at = attrs(a);
    const found = ctx.entities.filter((e) => matches(e, at.query));
    const sorted =
      at.sort === "cited" ? [...found].sort((a, b) => (b.links ?? 0) - (a.links ?? 0))
        : at.sort === "title" ? [...found].sort((a, b) => a.title.localeCompare(b.title))
          : at.sort === "recent" ? [...found].sort((a, b) => (b.date ?? 0) - (a.date ?? 0))
            : found;
    const list = sorted.slice(0, Number(at.limit) || 6);
    if (!list.length) return `<p class="u-empty">Nothing matches <code>${esc(at.query ?? "")}</code>.</p>`;
    const items = list
      .map((e) =>
        body
          .replace(/\{id\}/g, e.id)
          .replace(/<Value\s+path="title"\s*\/>/g, esc(e.title))
          .replace(/<Value\s+path="template"\s*\/>/g, esc(e.typeName))
          .replace(/<Value\s+path="country"\s*\/>/g, esc(e.country ?? ""))
          .replace(/<Value\s+path="meta"\s*\/>/g, esc([e.typeName, e.country, e.date ? String(new Date(e.date).getUTCFullYear()) : "", e.status].filter(Boolean).join(" · "))),
      )
      .join("");
    return `<div class="${esc(at.class ?? "u-cards")}">${items}</div>`;
  });

  out = out.replace(/<EntityInfo\b([^>]*)>([\s\S]*?)<\/EntityInfo>/g, (_m, a: string, children: string) => {
    const at = attrs(a);
    const tag = /^(a|div|span|li)$/.test(at.tag ?? "") ? at.tag : "span";
    const e = ctx.entities.find((x) => x.id === at.entity);
    const dot = e ? `<i class="u-dot" style="background:${e.color}"></i>` : "";
    return `<${tag} class="${esc(at.classname ?? "")}" href="#" data-entity="${esc(at.entity ?? "")}">${dot}<span>${children || esc(e?.title ?? "")}</span></${tag}>`;
  });

  out = out.replace(/<PayPalDonateLink\b([^>]*)>([\s\S]*?)<\/PayPalDonateLink>/g, (_m, _a: string, label: string) => `<a class="u-button" href="#">${label || "Donate"}</a>`);

  out = out.replace(/<(\w+)\b([^>]*?)\/>/g, (m, name: string, a: string) => {
    const at = attrs(a);
    switch (name) {
      case "Counter":
        return `<span class="u-count">${ctx.entities.filter((e) => matches(e, at.query)).length.toLocaleString("en-US")}</span>`;
      case "SearchBox":
        return `<form class="u-search" onsubmit="return false"><input type="search" placeholder="${esc(at.placeholder ?? "Search")}" aria-label="${esc(at.placeholder ?? "Search")}"><button type="submit">Search</button></form>`;
      case "ContactForm":
        return `<form class="u-form" onsubmit="return false"><label>Your email<input type="email"></label><label>Message<textarea rows="3"></textarea></label><button type="submit">${esc(at.button ?? `Send to ${at.email ?? ""}`)}</button></form>`;
      case "PublicForm":
        return `<form class="u-form" onsubmit="return false"><label>Your name<input></label><label>Your email<input type="email"></label><button type="submit">${esc(at.button ?? "Submit")}</button></form>`;
      case "Map":
        return map(at, ctx);
      case "BarChart":
      case "PieChart":
      case "ListChart":
        return chart(name, at, ctx);
      case "EntityData":
        return view ? `<span class="u-entitydata">${esc(at["value-of"] === "title" ? view.title : at["value-of"] === "template" ? view.typeName : (view.country ?? "—"))}</span>` : unknown(name);
      case "Value":
        return unknown("Value outside Repeat");
      default:
        return /^[A-Z]/.test(name) ? unknown(name) : m;
    }
  });

  // The markdown extensions.
  out = out.replace(/\{(\w+)\}\(([^)]*)\)/g, (_m, name: string, args: string) => {
    const [first, ...rest] = args.split(",").map((s) => s.trim());
    if (name === "link") return `<a class="u-button" href="${esc(first)}">${esc(rest.join(", ") || first)}</a>`;
    if (name === "media" || name === "youtube" || name === "vimeo") return `<div class="u-media"><span>▶</span><small>${esc(first)}</small></div>`;
    return unknown(`{${name}}`);
  });
  return out;
}

export interface SiteChrome {
  name: string;
  logoText: string;
  accent: string;
  headingFont: "serif" | "sans";
  nav: string[];
  lang: string;
  rtl: boolean;
  /** Shown in the preview only: which copy is being looked at. */
  banner?: string;
}

const BASE_CSS = `
*{box-sizing:border-box} html,body{margin:0}
body{font:15px/1.55 Inter,system-ui,-apple-system,sans-serif;color:#1c1c1c;background:#fbfaf7}
h1,h2,h3{font-family:var(--heading-font);line-height:1.2;margin:0 0 .5em}
h1{font-size:2.1rem;font-weight:600} h2{font-size:1.3rem;font-weight:600}
a{color:var(--accent)}
.u-site-header{display:flex;align-items:center;gap:14px;padding:14px 28px;border-bottom:1px solid #e8e3d8;background:#fff}
.u-logo{width:34px;height:34px;border-radius:8px;display:grid;place-items:center;background:var(--accent);color:#fff;font-weight:700;font-size:13px}
.u-sitename{font-weight:600} .u-nav{display:flex;gap:18px;margin-inline-start:auto;font-size:14px;color:#555}
.u-nav span:first-child{color:#1c1c1c;font-weight:500}
.u-langs{font-size:12px;color:#777;border:1px solid #e8e3d8;border-radius:6px;padding:3px 8px}
main{max-width:960px;margin:0 auto;padding:36px 28px 60px;display:flex;flex-direction:column;gap:36px}
.u-banner{font:12px Inter,system-ui,sans-serif;background:#f3efe6;color:#555;text-align:center;padding:5px}
.u-hero{padding:28px 0 8px;border-bottom:3px solid var(--accent)} .u-hero p{font-size:1.1rem;color:#444;max-width:40em}
.u-text p{max-width:42em}
.u-search{display:flex;gap:8px} .u-search input{flex:1;padding:11px 14px;border:1px solid #d9d2c3;border-radius:8px;font:inherit;background:#fff}
.u-search button,.u-form button,.u-button{background:var(--accent);color:#fff;border:0;border-radius:8px;padding:10px 16px;font:inherit;font-weight:500;cursor:pointer;text-decoration:none;display:inline-block}
.u-stats{display:flex;gap:40px;flex-wrap:wrap} .u-stat{display:flex;flex-direction:column}
.u-count{font-family:var(--heading-font);font-size:2.4rem;font-weight:600;color:var(--accent);line-height:1}
.u-stat span:last-child{color:#666;font-size:14px}
.u-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
.u-list{display:flex;flex-direction:column;border-top:1px solid #e8e3d8}

.u-card{display:flex;flex-direction:column;gap:4px;padding:14px;border:1px solid #e8e3d8;border-radius:10px;background:#fff;color:#1c1c1c;text-decoration:none}
.u-card small{color:#777;font-size:12px} .u-dot{display:inline-block;width:8px;height:8px;border-radius:2px;margin-inline-end:6px}
.u-card>.u-dot{margin-top:6px}
.u-list .u-card{border:0;border-bottom:1px solid #e8e3d8;border-radius:0;padding:10px 2px;flex-direction:row;flex-wrap:wrap;align-items:baseline;column-gap:12px;row-gap:2px}
.u-card small{display:block;margin-top:2px}
.u-list .u-card>span{display:flex;flex-wrap:wrap;align-items:baseline;column-gap:12px;row-gap:2px;flex:1;min-width:0}
.u-list .u-card>span small{margin:0;margin-inline-start:auto}
.u-bars{display:flex;flex-direction:column;gap:6px} .u-bar{display:grid;grid-template-columns:minmax(0,12rem) 1fr 3rem;gap:10px;align-items:center;font-size:13px}
.u-bar span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap} .u-bar div{background:#efeae0;border-radius:3px;height:12px} .u-bar i{display:block;height:100%;border-radius:3px}
.u-bar b{text-align:end;font-weight:500}
.u-pie{display:flex;gap:24px;align-items:center;flex-wrap:wrap} .u-pie-disc{width:150px;height:150px;border-radius:50%}
.u-pie ul,.u-listchart{list-style:none;margin:0;padding:0;font-size:13px} .u-pie li i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-inline-end:6px}
.u-listchart li{display:flex;justify-content:space-between;border-bottom:1px solid #e8e3d8;padding:7px 0;max-width:28rem}
.u-mapfig{margin:0} .u-mapfig svg{width:100%;background:#eef1ef;border-radius:10px} .u-grid line{stroke:#dde3df;stroke-width:1}
.u-dots circle{fill:var(--accent);fill-opacity:.55;stroke:#fff;stroke-width:1} .u-mapfig figcaption{font-size:12px;color:#777;margin-top:6px}
.u-form{display:flex;flex-direction:column;gap:10px;max-width:28rem} .u-form label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:#555}
.u-form input,.u-form textarea{padding:9px 12px;border:1px solid #d9d2c3;border-radius:8px;font:inherit;background:#fff}
.u-media{aspect-ratio:16/9;background:#1c1c1c;color:#fff;border-radius:10px;display:grid;place-items:center;align-content:center;gap:6px} .u-media small{opacity:.6}
.u-unknown{border:1px dashed #c0392b;color:#c0392b;background:#fdf1ef;border-radius:8px;padding:10px 12px;font-size:13px}
.u-empty{color:#777;font-size:14px} .u-entitydata{font-weight:600}
.u-mention{color:var(--accent);text-decoration:underline;text-decoration-color:color-mix(in srgb,var(--accent) 35%,transparent);text-underline-offset:3px}
.u-mention .u-dot{display:none}
.u-quote{margin:0;padding:8px 0 8px 20px;border-inline-start:3px solid var(--accent)} .u-quote p{font-family:var(--heading-font);font-size:1.45rem;line-height:1.35;margin:0 0 6px} .u-quote cite{font-style:normal;color:#666;font-size:13px}
.u-text ul{padding-inline-start:1.2em} .u-text li{margin:4px 0}
.u-lead .u-card{padding:22px;font-family:var(--heading-font);font-size:1.4rem}
.u-cta{background:#f3efe6;border-radius:12px;padding:24px}
.u-site-footer{border-top:1px solid #e8e3d8;padding:18px 28px;font-size:12px;color:#888;text-align:center}
@media (max-width:640px){main{padding:24px 18px 48px;gap:28px} h1{font-size:1.6rem} .u-site-header{padding:12px 16px} .u-nav{display:none} .u-bar{grid-template-columns:minmax(0,8rem) 1fr 2.5rem}}
`;

/** The whole public page as one document, for `<iframe srcdoc>`. */
export function publicDocument(bodyHtml: string, css: string, js: string, chrome: SiteChrome): string {
  const initials = chrome.logoText || chrome.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const font = chrome.headingFont === "serif" ? "Georgia, 'Times New Roman', serif" : "Inter, system-ui, sans-serif";
  return `<!doctype html><html lang="${chrome.lang}" dir="${chrome.rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>:root{--accent:${chrome.accent};--heading-font:${font}}${BASE_CSS}</style><style>${css}</style></head><body>
${chrome.banner ? `<div class="u-banner">${esc(chrome.banner)}</div>` : ""}
<header class="u-site-header"><div class="u-logo">${esc(initials)}</div><span class="u-sitename">${esc(chrome.name)}</span><nav class="u-nav">${chrome.nav.map((n) => `<span>${esc(n)}</span>`).join("")}</nav><span class="u-langs">${chrome.lang.toUpperCase()}</span></header>
<main>${bodyHtml}</main>
<footer class="u-site-footer">Powered by Uwazi</footer>
<script>document.addEventListener("click",function(e){var a=e.target.closest("a");if(a)e.preventDefault();});</script>
${js.trim() ? `<script>try{${js}\n}catch(err){document.body.insertAdjacentHTML("afterbegin",'<div class="u-unknown" style="margin:12px">Page script error: '+String(err.message).replace(/</g,"&lt;")+'</div>');}</script>` : ""}
</body></html>`;
}
