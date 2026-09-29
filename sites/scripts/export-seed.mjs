// Exports the prototype's seed collections to static JSON for the site builder's
// mock data source: sites/public/data/{sample,cejil,artworks}.json.
//
//   cd sites && npm run export-seed
//
// Sample and Artworks are TypeScript modules in ../app, so they are loaded
// through Vite's SSR loader (it handles the app's TS, ?raw and JSON imports).
// CEJIL is read from the app's own JSON dump (app/public/cejil-data). Nothing
// here makes a network request: the builder never talks to a live Uwazi.
import { createServer } from "vite";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const APP = fileURLToPath(new URL("../../app/", import.meta.url));
const OUT = fileURLToPath(new URL("../public/data/", import.meta.url));
mkdirSync(OUT, { recursive: true });

const slug = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const ms = (d) => {
  if (d === undefined || d === null || d === "") return undefined;
  if (typeof d === "number") return d < 1e11 ? d * 1000 : d; // Uwazi dates are unix seconds
  const t = Date.parse(d);
  return Number.isNaN(t) ? undefined : t;
};
const clean = (o) => {
  for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
  return o;
};

/** Templates and thesauri are derived from what the entities carry, so the file
 *  describes exactly the data in it. */
function describe(entities, templateMeta) {
  const props = new Map(); // template -> Map(name -> {label,type})
  const thes = new Map(); // prop name -> Map(value -> count)
  for (const e of entities) {
    const tp = props.get(e.template) ?? new Map();
    props.set(e.template, tp);
    for (const m of e.metadata) {
      if (!tp.has(m.name)) tp.set(m.name, { name: m.name, label: m.label, type: m.type });
      if (m.type === "select" || m.type === "multiselect") {
        const t = thes.get(m.name) ?? { name: m.name, label: m.label, values: new Map() };
        thes.set(m.name, t);
        for (const v of m.values) t.values.set(v, (t.values.get(v) ?? 0) + 1);
      }
    }
  }
  const templates = templateMeta
    .filter((t) => props.has(t.id))
    .map((t) => ({ ...t, properties: [...(props.get(t.id)?.values() ?? [])] }));
  const thesauri = [...thes.values()].map((t) => ({
    id: t.name,
    name: t.label,
    values: [...t.values.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, count]) => ({ id: slug(label), label, count })),
  }));
  return { templates, thesauri };
}

function write(id, file) {
  const json = JSON.stringify(file);
  writeFileSync(`${OUT}${id}.json`, json);
  console.log(`${id}.json  ${file.entities.length} entities  ${(json.length / 1024).toFixed(0)} KB`);
}

/* ── Sample and Artworks, through the app's own modules ─────────────────── */
const vite = await createServer({ root: APP, logLevel: "error", server: { middlewareMode: true }, appType: "custom" });
try {
  const { entities, entityTypes } = await vite.ssrLoadModule("/src/data/entities.ts");
  const { getEntityProfile } = await vite.ssrLoadModule("/src/data/entityProfiles.ts");
  const { references } = await vite.ssrLoadModule("/src/data/references.ts");
  const { getEntityProp } = await vite.ssrLoadModule("/src/data/entityMetadata.ts");

  const fieldsOf = (profile) =>
    (profile?.metadata?.EN ?? [])
      .filter((f) => f.type !== "relationship" && (f.values?.length || String(f.value ?? "").trim()))
      .filter((f) => !["file-list", "media"].includes(f.type))
      .map((f) => ({
        name: f.id,
        label: f.label,
        type: f.type === "multiline" ? "text" : f.type,
        values: f.values?.length ? f.values : [String(f.value)],
      }));

  const linksBy = new Map();
  const addLink = (a, b, rel) => {
    const l = linksBy.get(a) ?? [];
    if (!l.some((x) => x.id === b && x.rel === rel)) l.push({ id: b, rel });
    linksBy.set(a, l);
  };
  for (const r of references) {
    const rel = String(r.relationType ?? "Related");
    addLink(r.sourceEntityId, r.targetEntityId, rel);
    addLink(r.targetEntityId, r.sourceEntityId, rel);
  }

  const sample = entities.map((e) => {
    let profile;
    try {
      profile = getEntityProfile(e.id);
    } catch {
      profile = null;
    }
    const metadata = fieldsOf(profile);
    const dated = metadata.find((m) => m.type === "date");
    const summary = metadata.find((m) => /summary|description|resumen/i.test(m.label))?.values[0];
    return clean({
      id: e.id,
      title: e.title,
      template: e.typeId,
      date: ms(dated?.values[0]) ?? ms(e.createdAt),
      country: e.country ?? metadata.find((m) => m.type === "country" || m.label === "Country")?.values[0],
      geo: e.geo ? { lat: e.geo.lat, lng: e.geo.lng } : undefined,
      status: getEntityProp(e.id, "status", "EN"),
      summary,
      metadata: metadata.filter((m) => m.label !== "Title"),
      links: linksBy.get(e.id) ?? [],
    });
  });
  write("sample", {
    collection: {
      id: "sample",
      name: "Inter-American Cases",
      description: "A sample human-rights collection: cases, judgments, hearings, the people and states they name.",
      languages: ["en", "es", "fr", "ar"],
    },
    ...describe(sample, entityTypes.map((t) => ({ id: t.id, name: t.name, color: t.color }))),
    entities: sample,
  });

  const { artworkLibraryEntities } = await vite.ssrLoadModule("/src/data/artworks/adapt.ts");
  const { buildArtworkProfile } = await vite.ssrLoadModule("/src/data/artworks/profile.ts");
  const { artworkEntityTypes } = await vite.ssrLoadModule("/src/data/artworks/typesAdapter.ts");
  const art = artworkLibraryEntities().map((e) => {
    const p = buildArtworkProfile(e.id);
    const metadata = fieldsOf(p);
    const born = metadata.find((m) => /born/i.test(m.label));
    return clean({
      id: e.id,
      title: e.title,
      template: e.typeId,
      date: ms(born ? `${born.values[0]}-01-01` : undefined) ?? ms(e.createdAt),
      country: e.country,
      image: e.image
        ? { url: e.image.url.replace(/^.*\/artwork-images\//, "artwork-images/"), width: e.image.width, height: e.image.height, alt: e.image.alt }
        : undefined,
      metadata: metadata.filter((m) => m.label !== "Title"),
      links: [],
    });
  });
  // Artworks link to their artist through the adapter's card field.
  const artistByName = new Map(art.filter((a) => a.template === "artist").map((a) => [a.title, a.id]));
  for (const a of art) {
    const by = a.metadata.find((m) => /artist/i.test(m.label))?.values[0];
    const id = by && artistByName.get(by);
    if (!id) continue;
    a.links.push({ id, rel: "By" });
    art.find((x) => x.id === id).links.push({ id: a.id, rel: "Work" });
  }
  write("artworks", {
    collection: {
      id: "artworks",
      name: "Painting Archive",
      description: "Sixty paintings with their artists: a picture collection.",
      languages: ["en", "es"],
    },
    ...describe(art, artworkEntityTypes.map((t) => ({ id: t.id, name: t.name, color: t.color }))),
    entities: art,
  });
} finally {
  await vite.close();
}

/* ── CEJIL, from the app's JSON dump ────────────────────────────────────── */
{
  const raw = JSON.parse(readFileSync(`${APP}public/cejil-data/entities.json`, "utf8")).filter((e) => e.language === "es");
  const rels = JSON.parse(readFileSync(`${APP}public/cejil-data/relationships.json`, "utf8"));
  const tsrc = readFileSync(`${APP}src/data/cejil/templates.ts`, "utf8");
  const templates = JSON.parse(tsrc.slice(tsrc.indexOf("= [") + 2, tsrc.lastIndexOf("]") + 1));
  const tById = new Map(templates.map((t) => [t._id, t]));
  const PALETTE = ["#1D4ED8", "#BE123C", "#047857", "#B45309", "#7C3AED", "#0369A1", "#9D174D", "#4D7C0F", "#C2410C", "#0F766E", "#6D28D9", "#A16207"];

  // Only the templates a public site is built from carry their full record; the
  // rest keep title, template, country and date (enough for counts and lists).
  const FULL = new Set(["Causa", "Medida Provisional", "Sentencia de la CorteIDH", "País", "Juez y/o Comisionado", "Informe de Fondo"]);
  const DATE_PROP = {
    "Causa": "presentaci_n_ante_la_corteidh",
    "Medida Provisional": "solicitud_ante_la_corteidh",
  };
  const rights = (v) =>
    [...new Set(v.flatMap((x) => Object.values(x.value ?? {}).flat()).map((a) => `Art. ${String(a).split(".")[0]}`))].sort(
      (a, b) => parseInt(a.slice(5)) - parseInt(b.slice(5)),
    );

  const byId = new Map(raw.map((e) => [e.sharedId, e]));
  const linksBy = new Map();
  for (const r of rels) {
    if (!byId.has(r.from) || !byId.has(r.to)) continue;
    for (const [a, b] of [[r.from, r.to], [r.to, r.from]]) {
      const ta = byId.get(a).templateName;
      if (!FULL.has(ta)) continue;
      const l = linksBy.get(a) ?? [];
      if (l.length < 60 && !l.some((x) => x.id === b)) l.push({ id: b, rel: r.typeName });
      linksBy.set(a, l);
    }
  }

  const out = raw.map((e) => {
    const t = tById.get(e.template);
    const full = FULL.has(e.templateName);
    const md = e.metadata ?? {};
    const labelOf = (name) => t?.properties.find((p) => p.name === name)?.label ?? name;
    const typeOf = (name) => t?.properties.find((p) => p.name === name)?.type;
    const country = md.pa_s?.[0]?.label;
    const firstDate = t?.properties.find((p) => p.type === "date" && md[p.name]?.[0]?.value)?.name;
    const date = ms(md[DATE_PROP[e.templateName] ?? firstDate]?.[0]?.value) ?? ms(md.fecha?.[0]?.value);
    const metadata = [];
    if (full) {
      for (const [name, vals] of Object.entries(md)) {
        if (!vals?.length || name === "preview" || name === "resumen" || name.startsWith("geolocalizaci")) continue;
        const type = typeOf(name);
        if (name.endsWith("_nested")) {
          const r = rights(vals);
          if (r.length) metadata.push({ name, label: labelOf(name).replace(/ ?\(nested\)/i, ""), type: "multiselect", values: r });
          continue;
        }
        if (type === "date" || type === "daterange" || type === "multidate") {
          const d = vals.map((v) => ms(v.value)).filter(Boolean);
          if (d.length) metadata.push({ name, label: labelOf(name), type: "date", values: d.map((x) => new Date(x).toISOString().slice(0, 10)) });
          continue;
        }
        if (type === "relationship") {
          metadata.push({ name, label: labelOf(name), type: "relationship", values: vals.slice(0, 12).map((v) => v.label), ids: vals.slice(0, 12).map((v) => v.value) });
          continue;
        }
        const values = vals.map((v) => v.label ?? String(v.value ?? "")).filter(Boolean);
        if (values.length) metadata.push({ name, label: labelOf(name), type: type === "multiselect" || type === "select" ? type : "text", values });
      }
    }
    // Monitoring needs a status and a dated history. CEJIL's provisional
    // measures carry both, as four dates: requested → granted → lifted, or
    // rejected. The status is the latest step reached — derived, not stored,
    // and named in the corpus's language.
    let status = md.estado?.[0]?.label;
    let history;
    if (e.templateName === "Medida Provisional") {
      const steps = [
        ["Solicitada", md.solicitud_ante_la_corteidh],
        ["Otorgada", md.otorgamiento_de_las_mp],
        ["Levantada", md.levantamiento_de_las_mp],
        ["Rechazada", md.rechazo_de_la_solicitud_de_mp],
      ]
        .map(([state, v]) => ({ state, date: ms(v?.[0]?.value) }))
        .filter((s) => s.date)
        .sort((a, b) => a.date - b.date);
      if (steps.length) {
        history = steps;
        status = steps[steps.length - 1].state;
      }
    }
    const geo = md.localizaci_n_geolocation?.[0]?.value;
    return clean({
      id: e.sharedId,
      title: e.title,
      template: e.template,
      date,
      country,
      geo: geo && typeof geo.lat === "number" ? { lat: geo.lat, lng: geo.lon ?? geo.lng } : undefined,
      status,
      history,
      summary: full ? md.resumen?.[0]?.value?.trim() : undefined,
      metadata,
      links: linksBy.get(e.sharedId) ?? [],
    });
  });

  // Country entities carry the geolocation; give every entity its country's point.
  const countryGeo = new Map(out.filter((e) => e.geo && tById.get(e.template)?.name === "País").map((e) => [e.title, e.geo]));
  for (const e of out) if (!e.geo && e.country && countryGeo.has(e.country)) e.geo = countryGeo.get(e.country);

  const tmeta = templates.map((t, i) => ({ id: t._id, name: t.name.trim(), color: t.color ?? PALETTE[i % PALETTE.length] }));
  write("cejil", {
    collection: {
      id: "cejil",
      name: "CEJIL · Summa",
      description: "The Inter-American human-rights system: cases, judgments, provisional measures and the judges who signed them.",
      languages: ["es", "en"],
    },
    ...describe(out, tmeta),
    entities: out,
  });
}
