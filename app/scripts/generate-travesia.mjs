// Generate the "Red Travesía" corpus: FICTIONAL records over a real schema.
//
//   node scripts/generate-travesia.mjs
//
// Reads the committed schema (src/data/travesia/{templates,relationTypes}.json
// and public/travesia-data/thesauri.json, see import-travesia-schema.mjs) and
// writes public/travesia-data/{entities,relationships}.json, which the app
// fetches on demand when the source is picked (as it does CEJIL's).
//
// Deterministic: one seeded RNG, stable iteration order, a fixed "today". Run it
// twice and the output is byte-identical; change SEED to get another corpus.
//
// Everything is invented. Names are drawn from common first-name and surname
// pools and combined at random; every shelter is a "Travesía" shelter; phone
// numbers use the 555-01xx range reserved for fiction; e-mails and links are
// on example.org; document and case numbers follow no real registry. Places are
// real geography (the migration route through Mexico) because the schema's own
// vocabularies are — the municipalities, states and countries are the
// thesauri's. The forensic templates (DESCRIPCIÓN FÍSICA, DESAPARICIÓN) carry
// neutral, plausible values and no graphic detail. Portraits are not stored:
// the app paints a synthetic one per person (src/data/travesia/portrait.ts).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = join(here, "../src/data/travesia");
const templates = JSON.parse(readFileSync(join(dataDir, "templates.json"), "utf8"));
const relationTypes = JSON.parse(readFileSync(join(dataDir, "relationTypes.json"), "utf8"));
const publicDir = join(here, "../public/travesia-data");
const thesauri = JSON.parse(readFileSync(join(publicDir, "thesauri.json"), "utf8"));

/* ── RNG ─────────────────────────────────────────────────────────────── */
const SEED = 20260924;
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(SEED);
const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;
function weighted(pairs) {
  const total = pairs.reduce((a, [, w]) => a + w, 0);
  let r = rand() * total;
  for (const [v, w] of pairs) if ((r -= w) < 0) return v;
  return pairs[pairs.length - 1][0];
}
function sample(arr, n) {
  const copy = [...arr];
  const out = [];
  while (copy.length && out.length < n) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
}

/* ── Schema lookups ──────────────────────────────────────────────────── */
const fold = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
const tplByName = new Map(templates.map((t) => [t.name, t]));
const T = (name) => {
  const t = tplByName.get(name);
  if (!t) throw new Error(`no template ${name}`);
  return t;
};
const relTypeName = new Map(relationTypes.map((r) => [r._id, r.name]));
const thesaurusById = new Map(thesauri.map((t) => [t._id, t]));
/** A thesaurus's selectable values: groups contribute their children. */
function flat(thesaurus) {
  const out = [];
  for (const v of thesaurus?.values ?? []) {
    if (v.values?.length) for (const c of v.values) out.push(c);
    else out.push(v);
  }
  return out;
}
const flatCache = new Map();
const valuesOf = (prop) => {
  if (!prop.content) return [];
  if (!flatCache.has(prop.content)) flatCache.set(prop.content, flat(thesaurusById.get(prop.content)));
  return flatCache.get(prop.content);
};
/** The value of `prop`'s thesaurus whose label matches (accent- and case-blind). */
function valueByLabel(prop, label) {
  const want = fold(label);
  return valuesOf(prop).find((v) => fold(v.label) === want) ?? valuesOf(prop).find((v) => fold(v.label).startsWith(want));
}
const byLabelMatch = (prop, re) => valuesOf(prop).filter((v) => re.test(v.label));
const propByLabel = (tpl, re) => tpl.properties.find((p) => re.test(p.label));

/* ── Time ────────────────────────────────────────────────────────────── */
const TODAY = Date.UTC(2026, 8, 1) / 1000; // epoch seconds, fixed
const DAY = 86400;
const utc = (y, m, d) => Date.UTC(y, m - 1, d) / 1000;
const between = (a, b) => a + Math.floor(rand() * Math.max(1, b - a));
const WINDOW_FROM = utc(2022, 1, 10);

/* ── Places: the route north, real coordinates ───────────────────────── */
// [city, municipio label as the thesaurus writes it, entidad, zona, lat, lon]
const CITIES = [
  ["Tapachula", "Tapachula - Chiapas", "Chiapas", "Zona Sur", 14.9077, -92.2654],
  ["Tuxtla Gutiérrez", "Tuxtla Gutiérrez - Chiapas", "Chiapas", "Zona Sur", 16.7528, -93.1167],
  ["Palenque", "Palenque - Chiapas", "Chiapas", "Zona Sur", 17.5092, -91.9818],
  ["Tenosique", "Tenosique - Tabasco", "Tabasco", "Zona Sur", 17.473, -91.4232],
  ["Ciudad Ixtepec", "Ciudad Ixtepec - Oaxaca", "Oaxaca", "Zona Sur", 16.5613, -95.1009],
  ["Oaxaca de Juárez", "Oaxaca de Juárez - Oaxaca", "Oaxaca", "Zona Sur", 17.0732, -96.7266],
  ["Coatzacoalcos", "Coatzacoalcos - Veracruz", "Veracruz", "Zona Sur", 18.1345, -94.459],
  ["Puebla", "Puebla - Puebla", "Puebla", "Zona Centro", 19.0414, -98.2063],
  ["Apizaco", "Apizaco - Tlaxcala", "Tlaxcala", "Zona Centro", 19.4167, -98.14],
  ["Ciudad de México", "Cuauhtémoc - Ciudad de México", "Ciudad de México", "Zona Centro", 19.4326, -99.1332],
  ["Querétaro", "Querétaro - Querétaro", "Querétaro", "Zona Bajío", 20.5888, -100.3899],
  ["Celaya", "Celaya - Guanajuato", "Guanajuato", "Zona Bajío", 20.5235, -100.8157],
  ["Irapuato", "Irapuato - Guanajuato", "Guanajuato", "Zona Bajío", 20.671, -101.347],
  ["San Luis Potosí", "San Luis Potosí - San Luis Potosí", "San Luis Potosí", "Zona Bajío", 22.1565, -100.9855],
  ["Guadalajara", "Guadalajara - Jalisco", "Jalisco", "Zona Occidente", 20.6597, -103.3496],
  ["Saltillo", "Saltillo - Coahuila", "Coahuila", "Zona Norte", 25.4232, -101.0053],
  ["Monterrey", "Monterrey - Nuevo León", "Nuevo León", "Zona Norte", 25.6866, -100.3161],
  ["Reynosa", "Reynosa - Tamaulipas", "Tamaulipas", "Zona Norte", 26.0923, -98.2775],
  ["Nuevo Laredo", "Nuevo Laredo - Tamaulipas", "Tamaulipas", "Zona Norte", 27.4779, -99.5496],
  ["Hermosillo", "Hermosillo - Sonora", "Sonora", "Zona Norte", 29.0729, -110.9559],
  ["Ciudad Juárez", "Juárez - Chihuahua", "Chihuahua", "Zona Norte", 31.6904, -106.4245],
  ["Tijuana", "Tijuana - Baja California", "Baja California", "Zona Norte", 32.5149, -117.0382],
].map(([city, municipio, entidad, zona, lat, lon]) => ({ city, municipio, entidad, zona, lat, lon }));

const jitter = (v, d) => Math.round((v + (rand() - 0.5) * d) * 1e5) / 1e5;

/* ── Names (combined at random; no real individual) ──────────────────── */
const FIRST = {
  F: ["María", "Ana", "Rosa", "Carmen", "Gabriela", "Daniela", "Karla", "Yesenia", "Wendy", "Dayana", "Sofía", "Lucía", "Andrea", "Paola", "Fernanda", "Jazmín", "Marisol", "Glenda", "Iris", "Keila", "Yohana", "Norma", "Esther", "Alejandra", "Rocío", "Brenda", "Nancy", "Elena", "Sandra", "Julia"],
  M: ["José", "Carlos", "Luis", "Juan", "Jorge", "Miguel", "Kevin", "Brayan", "Óscar", "Mario", "Wilmer", "Élmer", "Josué", "Edwin", "Ángel", "David", "Daniel", "Cristian", "Fernando", "Andrés", "Marvin", "Nelson", "Rafael", "Hugo", "Samuel", "Érick", "Walter", "Rubén", "Héctor", "Alexis"],
};
const HAITIAN_FIRST = { F: ["Marie", "Nadège", "Fabiola", "Rose-Marie", "Guerline", "Stéphanie"], M: ["Jean", "Pierre", "Wilner", "Jacques", "Ricardo", "Emmanuel"] };
const SURNAMES = ["López", "Hernández", "García", "Martínez", "Pérez", "Rodríguez", "Reyes", "Mejía", "Cruz", "Flores", "Ramírez", "Castillo", "Morales", "Ortiz", "Vásquez", "Aguilar", "Chávez", "Santos", "Mendoza", "Rivera", "Orellana", "Portillo", "Ávila", "Zelaya", "Maldonado", "Escobar", "Galdámez", "Pineda", "Velásquez", "Paz", "Barrios", "Cano", "Figueroa", "Méndez", "Solís", "Carranza", "Guzmán", "Rosales", "Molina", "Salazar"];
const HAITIAN_SURNAMES = ["Joseph", "Louis", "Pierre", "Jean-Baptiste", "Charles", "Célestin", "Désir", "Augustin"];

/* ── Countries of birth, their departments, languages ────────────────── */
const ORIGINS = [
  // [thesaurus label, weight, nationality label, departments (thesaurus labels)]
  ["HONDURAS", 32, ["Cortés", "Francisco Morazán", "Atlántida", "Yoro", "Olancho", "Colón", "Choluteca", "Copán"]],
  ["GUATEMALA", 18, ["Huehuetenango", "San Marcos", "Quetzaltenango", "Alta Verapaz", "Guatemala", "Petén", "Quiché"]],
  ["EL SALVADOR", 14, ["San Salvador", "San Miguel", "La Libertad", "Usulután", "Sonsonate", "Chalatenango", "Morazán"]],
  ["VENEZUELA", 11, []],
  ["NICARAGUA", 6, ["Managua", "León", "Chinandega", "Matagalpa"]],
  ["HAITÍ", 6, []],
  ["CUBA", 4, []],
  ["COLOMBIA", 3, []],
  ["ECUADOR", 3, []],
  ["MÉXICO", 3, ["Guerrero", "Michoacán", "Chiapas"]],
];
/** Each origin department's seat, for a birth municipality. */
const DEPT_SEAT = {
  Cortés: "San Pedro Sula", "Francisco Morazán": "Distrito Central", Atlántida: "La Ceiba", Yoro: "El Progreso",
  Olancho: "Juticalpa", Colón: "Trujillo", Choluteca: "Choluteca", Copán: "Santa Rosa de Copán",
  Huehuetenango: "Huehuetenango", "San Marcos": "San Marcos", Quetzaltenango: "Quetzaltenango", "Alta Verapaz": "Cobán",
  Guatemala: "Ciudad de Guatemala", Petén: "Flores", Quiché: "Santa Cruz del Quiché",
  "San Salvador": "San Salvador", "San Miguel": "San Miguel", "La Libertad": "Santa Tecla", Usulután: "Usulután",
  Sonsonate: "Sonsonate", Chalatenango: "Chalatenango", Morazán: "San Francisco Gotera",
  Managua: "Managua", León: "León", Chinandega: "Chinandega", Matagalpa: "Matagalpa",
  Guerrero: "Chilpancingo", Michoacán: "Morelia", Chiapas: "Tuxtla Gutiérrez",
};
const INDIGENOUS_LANG = ["K'iche'", "Q'eqchi", "Mam", "Kaqchikel", "Q'anjob'al", "Garífuna", "Lenca", "Miskito"];

/* ── Output ──────────────────────────────────────────────────────────── */
const entities = [];
const relationships = [];
let seq = 0;
const newId = (prefix) => `${prefix}${(++seq).toString(36).padStart(5, "0")}`;
const byTemplate = new Map();
const add = (tpl, e) => {
  entities.push(e);
  if (!byTemplate.has(tpl.name)) byTemplate.set(tpl.name, []);
  byTemplate.get(tpl.name).push(e);
  return e;
};

/* Metadata writers — Uwazi's own shape: a property name → [{value, label?}]. */
function setSelect(md, prop, v) {
  if (prop && v) md[prop.name] = [{ value: v.id, label: v.label }];
}
function setMulti(md, prop, vs) {
  if (prop && vs?.length) md[prop.name] = vs.filter(Boolean).map((v) => ({ value: v.id, label: v.label }));
}
const setText = (md, prop, s) => prop && s != null && s !== "" && (md[prop.name] = [{ value: String(s) }]);
const setNum = (md, prop, n) => prop && n != null && (md[prop.name] = [{ value: n }]);
const setDate = (md, prop, t) => prop && t && (md[prop.name] = [{ value: t }]);
const setGeo = (md, prop, lat, lon, label) => prop && (md[prop.name] = [{ value: { lat, lon, label } }]);

/** A relationship property's value, plus the edge. Inherited properties are
 *  written like Uwazi writes them: the connected entity, and the value read off
 *  it (`inheritedValue`), so the record can show both. */
function link(md, prop, from, targets) {
  if (!prop || !targets?.length) return;
  md[prop.name] = targets.map((t) => {
    const entry = { value: t.sharedId, label: t.title };
    if (prop.inherit) {
      const targetTpl = templates.find((x) => x._id === t.template);
      const src = targetTpl?.properties.find((p) => p._id === prop.inherit.property);
      const vals = src ? t.metadata[src.name] : undefined;
      if (vals?.length) entry.inheritedValue = vals.map((v) => ({ value: v.value, ...(v.label ? { label: v.label } : {}) }));
      entry.inheritedType = prop.inherit.type;
    }
    return entry;
  });
  if (!prop.inherit)
    for (const t of targets)
      relationships.push({ from: from.sharedId, to: t.sharedId, relationType: prop.relationType, typeName: relTypeName.get(prop.relationType) ?? "" });
}

/* The generic filler: a plausible value for any property the per-template
   code below leaves unset, by type and, for text, by what its label asks. */
const NEUTRAL_NOTES = [
  "Sin observaciones adicionales.",
  "La persona refiere haber recibido orientación en el albergue.",
  "Se brindó información sobre sus derechos y los servicios disponibles.",
  "Se acordó dar seguimiento en la siguiente visita.",
  "Información proporcionada durante la entrevista inicial.",
  "La persona prefirió no ampliar su respuesta.",
];
/* A country the generic filler picks comes from the route this corpus
   describes — its origins, the transit countries and the destinations — not
   from the whole world list (which carries "JERSEY"). */
const REGION = new Set(
  [...ORIGINS.map((o) => o[0]), "ESTADOS UNIDOS", "CANADÁ", "BELICE", "COSTA RICA", "PANAMÁ"].map((l) => fold(l)),
);
function regional(p) {
  const vs = valuesOf(p);
  if (!/^pa.ses$/i.test(thesaurusById.get(p.content)?.name ?? "")) return vs;
  return vs.filter((v) => REGION.has(fold(v.label)));
}

/** The state/municipality pair `p` belongs to, if it is one of a pair: a
 *  Municipios select and the Entidades Federativas select whose label names the
 *  same place ("… - Estado" / "… - Municipio(s)", "Entidad de …" / "Municipio de …"). */
const thName = (p) => thesaurusById.get(p?.content)?.name ?? "";
const placeKey = (p) =>
  fold(p.label)
    .replace(/ - (estado|municipio\(s\))$/, "")
    .replace(/^(entidad|municipio) /, "");
function placePair(tpl, p) {
  const kind = thName(p) === "Municipios" ? "municipio" : thName(p) === "Entidades Federativas" ? "estado" : null;
  if (p.type !== "select" || !kind) return null;
  const other = tpl.properties.find(
    (q) => q !== p && q.type === "select" && thName(q) === (kind === "municipio" ? "Entidades Federativas" : "Municipios") && placeKey(q) === placeKey(p),
  );
  if (!other) return null;
  return kind === "municipio" ? { municipio: p, estado: other } : { municipio: other, estado: p };
}

function fillGeneric(tpl, e, { fillRate = 0.72, window = [WINDOW_FROM, TODAY], skip = [] } = {}) {
  const md = e.metadata;
  const skipped = new Set(skip.filter(Boolean).map((p) => p.name));
  for (const p of tpl.properties) {
    if (md[p.name] || p.type === "relationship" || p.type === "image" || skipped.has(p.name)) continue;
    const label = fold(p.label);
    const required = /^(fecha)$/.test(label);
    // A follow-up question ("En caso de…", "Si la persona…", "(Otra)", a
    // description of something) only has an answer when the question before
    // it did — which is the minority of records, not most.
    const followUp = /^(en caso|si la persona|describir|descripci)|\(otra\)|especificar/.test(label);
    if (!required && !chance(followUp ? 0.18 : fillRate)) continue;
    // A state and a municipality asked about the same place are picked
    // together, from one city on the route — whichever comes first sets both.
    const pair = placePair(tpl, p);
    if (pair) {
      const c = pick(CITIES);
      setSelect(md, pair.estado, valueByLabel(pair.estado, c.entidad));
      setSelect(md, pair.municipio, valueByLabel(pair.municipio, c.municipio));
      continue;
    }
    switch (p.type) {
      case "select": {
        const vs = regional(p);
        if (!vs.length) break;
        // "No respondió / Sin información / No aplica" are real answers; they
        // come up, but not as often as an answer does.
        const answered = vs.filter((v) => !/no respondi|sin informaci|no aplica|desconoc/i.test(v.label));
        setSelect(md, p, chance(0.15) || !answered.length ? pick(vs) : pick(answered));
        break;
      }
      case "multiselect": {
        const vs = regional(p).filter((v) => !/no respondi|sin informaci|no aplica/i.test(v.label));
        if (!vs.length) break;
        setMulti(md, p, sample(vs, weighted([[1, 5], [2, 3], [3, 1]])));
        break;
      }
      case "date":
        setDate(md, p, between(window[0], window[1]));
        break;
      case "daterange": {
        const from = between(window[0], window[1] - 20 * DAY);
        md[p.name] = [{ value: { from, to: from + int(1, 40) * DAY } }];
        break;
      }
      case "multidaterange": {
        const from = between(window[0], window[1] - 60 * DAY);
        md[p.name] = [
          { value: { from, to: from + int(1, 10) * DAY } },
          ...(chance(0.4) ? [{ value: { from: from + 20 * DAY, to: from + int(21, 45) * DAY } }] : []),
        ];
        break;
      }
      case "numeric":
        setNum(md, p, /veces|cu.ntas/.test(label) ? int(1, 4) : /personas/.test(label) ? int(2, 6) : int(1, 10));
        break;
      case "markdown":
        if (chance(0.55)) setText(md, p, pick(NEUTRAL_NOTES));
        break;
      case "text":
        setText(md, p, fakeText(label));
        break;
      case "link":
        md[p.name] = [{ value: { label: "Sitio", url: `https://travesia.example.org/${e.sharedId}` } }];
        break;
      case "generatedid":
        setText(md, p, `TRV-${new Date(e.creationDate).getUTCFullYear()}-${e.sharedId.toUpperCase()}`);
        break;
      case "geolocation": {
        const c = pick(CITIES);
        setGeo(md, p, jitter(c.lat, 0.08), jitter(c.lon, 0.08), c.city);
        break;
      }
      default:
        break;
    }
  }
}
function fakeText(label) {
  if (/tel.fono|n.mero telef/.test(label)) return `555-01${int(10, 99)}`;
  if (/correo|email/.test(label)) return `contacto${int(1, 99)}@travesia.example.org`;
  if (/documento/.test(label)) return `DOC-${int(100000, 999999)}`;
  if (/municipio/.test(label)) return pick(CITIES).city;
  if (/punto/.test(label)) return pick(["Punto de revisión carretero", "Central de autobuses", "Cruce ferroviario", "Terminal de pasajeros"]);
  if (/organizaci|instituci/.test(label)) return pick(["Organización local de apoyo", "Institución de asistencia social", "Clínica comunitaria"]);
  if (/nombre/.test(label)) return `${pick(FIRST.F.concat(FIRST.M))} ${pick(SURNAMES)}`;
  if (/posici/.test(label)) return pick(["Coordinación", "Trabajo social", "Asesoría legal", "Atención psicosocial", "Voluntariado", "Enfermería"]);
  return pick(["Sin datos", "Pendiente de confirmar", "Referido en entrevista"]);
}
const personName = (sex, origin) => {
  const haitian = origin === "HAITÍ";
  const f = pick(haitian ? HAITIAN_FIRST[sex] : FIRST[sex]);
  const s1 = pick(haitian ? HAITIAN_SURNAMES : SURNAMES);
  const s2 = haitian ? "" : ` ${pick(SURNAMES)}`;
  return `${f} ${s1}${s2}`;
};
const created = (t) => t * 1000;

/* ══ ALBERGUE (20) ══════════════════════════════════════════════════════ */
const ALB = T("ALBERGUE");
const albProps = {
  tipo: propByLabel(ALB, /tipo de organizaci/i),
  contacto: propByLabel(ALB, /contacto/i),
  web: propByLabel(ALB, /^web/i),
  region: propByLabel(ALB, /regi.n/i),
  entidad: propByLabel(ALB, /entidad/i),
  ubicacion: propByLabel(ALB, /ubicaci/i),
};
const SHELTER_KIND = ["Casa Travesía", "Albergue Travesía", "Centro de Día Travesía", "Casa de Acogida Travesía"];
const shelterCities = [...CITIES].sort((a, b) => a.lat - b.lat).filter((_, i) => i < 20);
const shelters = shelterCities.map((c, i) => {
  const e = add(ALB, {
    sharedId: newId("alb"),
    template: ALB._id,
    title: `${SHELTER_KIND[i % SHELTER_KIND.length]} ${c.city}`,
    creationDate: created(utc(2021, int(1, 12), int(1, 28))),
    metadata: {},
    route: i,
    city: c,
  });
  const md = e.metadata;
  setMulti(md, albProps.tipo, [pick(valuesOf(albProps.tipo))]);
  setText(md, albProps.contacto, `Coordinación · 555-01${int(10, 99)}`);
  md[albProps.web.name] = [{ value: { label: "Sitio", url: `https://travesia.example.org/${e.sharedId}` } }];
  setSelect(md, albProps.region, valueByLabel(albProps.region, c.zona));
  setSelect(md, albProps.entidad, valueByLabel(albProps.entidad, c.entidad));
  setGeo(md, albProps.ubicacion, jitter(c.lat, 0.02), jitter(c.lon, 0.02), c.city);
  return e;
});

/* ══ EQUIPOS (30) ═══════════════════════════════════════════════════════ */
const EQ = T("EQUIPOS");
const staff = [];
for (let i = 0; i < 30; i++) {
  const sex = chance(0.6) ? "F" : "M";
  const shelter = shelters[i % shelters.length];
  const e = add(EQ, { sharedId: newId("eq"), template: EQ._id, title: personName(sex, "MÉXICO"), creationDate: created(between(utc(2021, 6, 1), utc(2024, 6, 1))), metadata: {} });
  link(e.metadata, propByLabel(EQ, /organizaci/i), e, [shelter]);
  e.shelter = shelter;
  fillGeneric(EQ, e, { fillRate: 1 });
  staff.push(e);
}

/* ══ ACTORES (12) ═══════════════════════════════════════════════════════ */
const ACT = T("ACTORES");
const ACTOR_TITLES = [
  "Grupo delictivo no identificado — tramo Chiapas–Oaxaca",
  "Grupo delictivo no identificado — zona del Golfo",
  "Personas armadas no identificadas — carretera costera",
  "Operativo migratorio en carretera — sur del país",
  "Operativo migratorio en central de autobuses — centro",
  "Agentes de seguridad municipal — zona norte",
  "Transportista particular que cobra por el traslado",
  "Personas que ofrecen trabajo en el trayecto",
  "Grupo que controla el paso por el tren — Bajío",
  "Personas no identificadas en vehículo sin placas",
  "Guías de cruce (coyotes) — frontera norte",
  "Particulares no identificados — zona urbana",
];
const actors = ACTOR_TITLES.map((title) => {
  const e = add(ACT, { sharedId: newId("act"), template: ACT._id, title, creationDate: created(between(utc(2022, 1, 1), utc(2025, 1, 1))), metadata: {} });
  fillGeneric(ACT, e, { fillRate: 1 });
  return e;
});

/* ══ FAMILIA (40) + DATOS GENERALES (150) ═══════════════════════════════ */
const FAM = T("FAMILIA");
const DG = T("DATOS GENERALES");
const P = (re) => propByLabel(DG, re);
const dg = {
  docType: P(/tipo de documento de identificaci/i),
  docNum: P(/n.mero de documento/i),
  foto: DG.properties.find((p) => p.type === "image"),
  circunstancias: P(/circunstancias ingresa/i),
  orgs: [P(/^1a organizaci/i), P(/^2a organizaci/i), P(/^3a organizaci/i), P(/^4a organizaci/i), P(/^5a organizaci/i)],
  orgDates: [P(/ingreso a la 1ra/i), P(/ingreso a la 2da/i), P(/ingreso a la 3ra/i), P(/ingreso a la 4a/i), P(/ingreso a la 5a/i)],
  privacidad: P(/aviso de privacidad/i),
  alias: P(/nombre social/i),
  nacimiento: P(/fecha de nacimiento/i),
  edad: P(/edad en el momento/i),
  pais: P(/pa.s de nacimiento/i),
  depto: P(/estado\/departamento de nacimiento/i),
  municipio: P(/^municipio/i),
  nacionalidad: P(/^nacionalidad/i),
  genero: P(/^g.nero/i),
  idioma: P(/idioma materno/i),
  etnico: P(/grupo .tnico/i),
  familia: P(/n.mero .nico de familia/i),
  rol: P(/rol en la familia/i),
  embarazo: P(/esta embarazada/i),
  gestacion: P(/per.odo de gestaci/i),
  lactancia: P(/lactancia/i),
  detencion: P(/estuvo en detenci/i),
  situacion: P(/situaci.n migratoria/i),
};
const famProps = { apellidos: propByLabel(FAM, /apellidos/i), desc: propByLabel(FAM, /descripci/i), num: propByLabel(FAM, /n.mero de personas/i), alb: propByLabel(FAM, /albergue/i), fecha: propByLabel(FAM, /^fecha/i) };

const people = [];
const families = [];
function routeFor() {
  // 1–4 shelters, south to north, starting in the south most of the time.
  const n = weighted([[1, 3], [2, 4], [3, 3], [4, 1]]);
  const start = weighted([[0, 5], [2, 3], [5, 2], [8, 1]]);
  const stops = [];
  let at = start;
  for (let i = 0; i < n && at < shelters.length; i++) {
    stops.push(shelters[at]);
    at += int(2, 6);
  }
  return stops;
}
function makePerson({ sex, age, origin, family, route, arrival, surname }) {
  const [country, , depts] = origin;
  const name = surname ? `${personName(sex, country).split(" ")[0]} ${surname}` : personName(sex, country);
  const e = add(DG, { sharedId: newId("p"), template: DG._id, title: name, creationDate: created(arrival), metadata: {}, sex, age, origin: country, route });
  const md = e.metadata;
  const docTypes = valuesOf(dg.docType);
  setSelect(md, dg.docType, chance(0.8) ? pick(docTypes) : undefined);
  if (md[dg.docType?.name]) setText(md, dg.docNum, `DOC-${int(100000, 999999)}`);
  md[dg.foto.name] = [{ value: `portrait:${e.sharedId}` }];
  const circ = pick(valuesOf(dg.circunstancias));
  setSelect(md, dg.circunstancias, circ);
  if (/canalizaci/i.test(circ.label)) setText(md, P(/ingrese por canalizaci/i), "Organización local de apoyo");
  // The shelters along the way, each later than the last.
  let t = arrival;
  route.forEach((s, i) => {
    if (!dg.orgs[i]) return;
    link(md, dg.orgs[i], e, [s]);
    setDate(md, dg.orgDates[i], t);
    t += int(6, 45) * DAY;
  });
  setSelect(md, dg.privacidad, valueByLabel(dg.privacidad, "Sí"));
  if (chance(0.12)) setText(md, dg.alias, pick(["Güera", "Chino", "Flaca", "Negro", "Gordo", "Nena", "Chele"]));
  setText(md, P(/^nurmah$/i), `TRV-${new Date(arrival * 1000).getUTCFullYear()}-${e.sharedId.toUpperCase()}`);
  if (chance(0.06)) setSelect(md, P(/lgbt/i), pick(valuesOf(P(/lgbt/i))));
  setDate(md, dg.nacimiento, arrival - Math.round((age + rand()) * 365.25) * DAY);
  setNum(md, dg.edad, age);
  setSelect(md, dg.pais, valueByLabel(dg.pais, country));
  if (depts.length) {
    // The birth municipality is the department's seat.
    const dept = pick(depts);
    setSelect(md, dg.depto, valueByLabel(dg.depto, dept));
    setText(md, dg.municipio, DEPT_SEAT[dept] ?? dept);
  }
  setMulti(md, dg.nacionalidad, [valueByLabel(dg.nacionalidad, country)]);
  setSelect(md, dg.genero, valueByLabel(dg.genero, sex === "F" ? "Mujer" : "Hombre"));
  const lang =
    country === "HAITÍ"
      ? ["Creole haitiano", "Francés"]
      : country === "GUATEMALA" && chance(0.35)
        ? [pick(INDIGENOUS_LANG.slice(0, 5)), "Español"]
        : country === "HONDURAS" && chance(0.08)
          ? ["Garífuna", "Español"]
          : ["Español"];
  setMulti(md, dg.idioma, lang.map((l) => valueByLabel(dg.idioma, l)).filter(Boolean));
  if (lang.length > 1 && country !== "HAITÍ") setSelect(md, dg.etnico, valueByLabel(dg.etnico, lang[0]) ?? pick(valuesOf(dg.etnico)));
  if (family) link(md, dg.familia, e, [family]);
  setSelect(md, dg.rol, family ? pick(valuesOf(dg.rol).filter((v) => !/sola|solo/i.test(v.label))) : valueByLabel(dg.rol, "Viaja sola") ?? pick(valuesOf(dg.rol)));
  if (sex === "M" || age < 16) {
    delete md[dg.embarazo?.name];
  } else if (dg.embarazo) {
    const preg = chance(0.08);
    setSelect(md, dg.embarazo, valueByLabel(dg.embarazo, preg ? "Sí" : "No"));
    if (preg) setSelect(md, dg.gestacion, pick(valuesOf(dg.gestacion)));
  }
  const detained = chance(0.3);
  setSelect(md, dg.detencion, valueByLabel(dg.detencion, detained ? "Sí" : "No"));
  if (detained) setNum(md, P(/cu.ntas veces ha pasado/i), int(1, 3));
  e.detained = detained;
  setMulti(md, dg.situacion, sample(valuesOf(dg.situacion), 1));
  fillGeneric(DG, e, {
    fillRate: 0.65,
    window: [arrival, Math.min(TODAY, arrival + 120 * DAY)],
    // Written above, or left empty on purpose: the later shelters' dates exist
    // only with the shelter, and alias, ethnic group, LGBT+ and the detention
    // count only for the people they apply to.
    skip: [...dg.orgDates, dg.municipio, dg.alias, dg.etnico, P(/lgbt/i), P(/cu.ntas veces ha pasado/i), P(/ingrese por canalizaci/i), P(/^nurmah$/i), dg.embarazo, dg.gestacion, dg.lactancia],
  });
  // A field that only applies to someone pregnant, or to a woman, stays empty
  // otherwise — the generic filler must not have put it back.
  if (sex === "M" || age < 16) for (const p of [dg.embarazo, dg.gestacion, dg.lactancia]) if (p) delete md[p.name];
  people.push(e);
  return e;
}

for (let f = 0; f < 40; f++) {
  const origin = weighted(ORIGINS.map((o) => [o, o[1]]));
  const surname = origin[0] === "HAITÍ" ? pick(HAITIAN_SURNAMES) : `${pick(SURNAMES)} ${pick(SURNAMES)}`;
  const route = routeFor();
  const arrival = between(WINDOW_FROM, TODAY - 90 * DAY);
  const size = weighted([[2, 3], [3, 4], [4, 3], [5, 1]]);
  const fam = add(FAM, { sharedId: newId("fam"), template: FAM._id, title: `Familia ${surname}`, creationDate: created(arrival), metadata: {} });
  setText(fam.metadata, famProps.apellidos, surname);
  setText(fam.metadata, famProps.desc, `Familia de ${size} integrantes originaria de ${origin[0].charAt(0) + origin[0].slice(1).toLowerCase()}, registrada a su llegada al albergue.`);
  setNum(fam.metadata, famProps.num, size);
  link(fam.metadata, famProps.alb, fam, [route[0]]);
  setDate(fam.metadata, famProps.fecha, arrival);
  families.push(fam);
  // Two adults at most, then children.
  const adults = size >= 3 && chance(0.6) ? 2 : 1;
  // Not every member is registered on their own: the adults, and at most one
  // child, get a person record; the family record counts them all.
  const registered = Math.min(size, adults + (chance(0.35) ? 1 : 0));
  for (let k = 0; k < registered && people.length < 150; k++) {
    const adult = k < adults;
    const sex = adult ? (k === 0 ? (chance(0.65) ? "F" : "M") : "M") : chance(0.5) ? "F" : "M";
    const age = adult ? int(19, 48) : int(1, 16);
    makePerson({ sex, age, origin, family: fam, route, arrival, surname: origin[0] === "HAITÍ" ? surname : surname });
  }
}
while (people.length < 150) {
  const origin = weighted(ORIGINS.map((o) => [o, o[1]]));
  const sex = chance(0.58) ? "M" : "F";
  const age = weighted([[int(16, 17), 1], [int(18, 25), 4], [int(26, 35), 4], [int(36, 50), 2], [int(51, 66), 1]]);
  makePerson({ sex, age, origin, route: routeFor(), arrival: between(WINDOW_FROM, TODAY - 30 * DAY) });
}

/* ══ Records about a person ════════════════════════════════════════════ */
/** A record of template `tpl` about `person`: its person link (and the
 *  inherited columns riding the same connection), the shelter that documents
 *  it, its date, and the generic filler for the rest. */
function personRecord(tpl, person, prefix, titleWord, extra, skip = []) {
  const lastShelter = person.route[person.route.length - 1] ?? shelters[0];
  const when = Math.min(TODAY, person.creationDate / 1000 + int(1, 60) * DAY);
  const e = add(tpl, { sharedId: newId(prefix), template: tpl._id, title: `${titleWord} — ${person.title}`, creationDate: created(when), metadata: {} });
  const md = e.metadata;
  const personProps = tpl.properties.filter((p) => p.type === "relationship" && p.content === DG._id && !/agresora|reporta/i.test(p.label));
  for (const p of personProps) link(md, p, e, [person]);
  const albergue = tpl.properties.find((p) => p.type === "relationship" && /albergue que documenta|organizaci.n/i.test(p.label) && p.content === ALB._id);
  if (albergue) link(md, albergue, e, [lastShelter]);
  setDate(md, propByLabel(tpl, /^fecha$/i), when);
  extra?.(md, e, when);
  fillGeneric(tpl, e, { fillRate: 0.7, window: [person.creationDate / 1000 - 180 * DAY, when], skip });
  return e;
}

const adults = people.filter((p) => p.age >= 16);

/* MOVILIDAD (110): destination mostly the United States. */
const MOV = T("MOVILIDAD");
const movDestino = propByLabel(MOV, /pa.s tiene como destino/i);
const movTransito = propByLabel(MOV, /pa.ses por los que ha transitado/i);
const mv = {
  vivio: propByLabel(MOV, /vivi. m.s de seis meses/i),
  primera: propByLabel(MOV, /primera vez en m.xico/i),
  veces: propByLabel(MOV, /cu.ntas veces ha ingresado/i),
  deportado: propByLabel(MOV, /fue deportado/i),
  puntoDeport: propByLabel(MOV, /en qu. punto de m.xico le dejaron/i),
  estadoDestino: propByLabel(MOV, /a qu. estado\/departamento planea/i),
};
const DEPORT_POINTS = ["Chiapas", "Tabasco", "Tamaulipas", "Chihuahua", "Sonora", "Baja California", "Coahuila"];
const movilidad = new Map();
for (const person of sample(people, 110)) {
  const e = personRecord(MOV, person, "mov", "Movilidad", (md) => {
    const destino = weighted([["ESTADOS UNIDOS", 7], ["MÉXICO", 2], ["CANADÁ", 1]]);
    setSelect(md, movDestino, valueByLabel(movDestino, destino));
    // The state is one of the DESTINATION's: the thesaurus groups them by country.
    const group = thesaurusById.get(mv.estadoDestino?.content)?.values.find((g) => fold(g.label).startsWith(fold(destino)));
    if (group?.values?.length) setSelect(md, mv.estadoDestino, pick(group.values));
    const via = person.origin === "GUATEMALA" ? ["GUATEMALA"] : ["GUATEMALA", ...(chance(0.6) ? ["HONDURAS"] : [])];
    setMulti(md, movTransito, via.map((c) => valueByLabel(movTransito, c)).filter(Boolean));
    // Where they lived before Mexico: home, mostly; for some, a country on the way.
    setSelect(md, mv.vivio, valueByLabel(mv.vivio, chance(0.8) ? person.origin : pick(via)));
    // First entry, count and deportation answer one another.
    const first = chance(0.55);
    setSelect(md, mv.primera, valueByLabel(mv.primera, first ? "Sí" : "No"));
    setNum(md, mv.veces, first ? 1 : int(2, 4));
    const deported = !first && chance(0.45);
    setSelect(md, mv.deportado, valueByLabel(mv.deportado, first ? "No aplica" : deported ? "Sí" : "No"));
    if (deported) setMulti(md, mv.puntoDeport, sample(DEPORT_POINTS, int(1, 2)).map((l) => valueByLabel(mv.puntoDeport, l)).filter(Boolean));
  }, [mv.puntoDeport, mv.estadoDestino]);
  movilidad.set(person.sharedId, e);
}

/* REGULARIZACIÓN MIGRATORIA (50): the person, and their MOVILIDAD record. */
const REG = T("REGULARIZACIÓN MIGRATORIA");
const regMov = REG.properties.filter((p) => p.type === "relationship" && p.content === MOV._id);
for (const person of sample([...movilidad.keys()].map((id) => people.find((p) => p.sharedId === id)), 50)) {
  personRecord(REG, person, "reg", "Regularización", (md, e) => {
    for (const p of regMov) link(md, p, e, [movilidad.get(person.sharedId)]);
  });
}

/* DESCRIPCIÓN FÍSICA (40): neutral, identification-only values. */
const DF = T("DESCRIPCIÓN FÍSICA");
for (const person of sample(adults, 40)) {
  personRecord(DF, person, "df", "Descripción física", (md) => {
    setNum(md, propByLabel(DF, /^estatura$/i), person.sex === "F" ? int(148, 168) : int(156, 184));
    setNum(md, propByLabel(DF, /^peso$/i), person.sex === "F" ? int(48, 80) : int(55, 92));
    for (const p of DF.properties.filter((x) => x.type === "markdown")) md[p.name] = [{ value: "Sin observaciones." }];
    for (const p of DF.properties.filter((x) => x.type === "multiselect")) {
      const none = valuesOf(p).find((v) => /sin informaci|ninguno|no aplica/i.test(v.label));
      if (none && chance(0.6)) setMulti(md, p, [none]);
    }
  });
}

/* DETENCIÓN MIGRATORIA (35): only people who said they were detained. */
const DET = T("DETENCIÓN MIGRATORIA");
for (const person of sample(people.filter((p) => p.detained && p.age >= 16), 35)) {
  personRecord(DET, person, "det", "Detención migratoria", (md) => {
    const c = pick(CITIES.slice(0, 14));
    setText(md, propByLabel(DET, /en qu. punto le detuvieron/i), `Punto de revisión en carretera cerca de ${c.city}`);
    const ent = propByLabel(DET, /entidad federativa o pa.s/i);
    setSelect(md, ent, valueByLabel(ent, c.entidad));
    for (const p of DET.properties.filter((x) => x.type === "markdown")) if (chance(0.4)) md[p.name] = [{ value: pick(NEUTRAL_NOTES) }];
  });
}

/* VIOLENCIAS (40): the category and a neutral line, never a narrative. */
const VIO = T("VIOLENCIAS");
const vioGeo = VIO.properties.find((p) => p.type === "geolocation");
for (const person of sample(adults, 40)) {
  personRecord(VIO, person, "vio", "Violencias", (md) => {
    const c = pick(CITIES.slice(0, 12));
    setGeo(md, vioGeo, jitter(c.lat, 0.3), jitter(c.lon, 0.3), c.city);
    for (const p of VIO.properties.filter((x) => x.type === "markdown")) md[p.name] = [{ value: chance(0.5) ? "La persona refiere el hecho durante la entrevista; se canaliza a atención psicosocial." : "Sin observaciones." }];
  });
}

/* DESAPARICIÓN (12): a report made by someone in the records; neutral values,
   most people later located. */
const DES = T("DESAPARICIÓN");
const desReporta = DES.properties.find((p) => p.type === "relationship" && p.content === DG._id);
const desEstatus = DES.properties.find((p) => p.content && /estatus/i.test(thesaurusById.get(p.content)?.name ?? ""));
for (const reporter of sample(adults, 12)) {
  const missingSex = chance(0.5) ? "F" : "M";
  const missing = personName(missingSex, reporter.origin);
  const when = Math.min(TODAY, reporter.creationDate / 1000 + int(5, 90) * DAY);
  const e = add(DES, { sharedId: newId("des"), template: DES._id, title: `Reporte de búsqueda — ${missing}`, creationDate: created(when), metadata: {} });
  link(e.metadata, desReporta, e, [reporter]);
  const alb = DES.properties.find((p) => p.type === "relationship" && p.content === ALB._id);
  link(e.metadata, alb, e, [reporter.route[0] ?? shelters[0]]);
  if (desEstatus) setSelect(e.metadata, desEstatus, weighted(valuesOf(desEstatus).map((v) => [v, /sin vida/i.test(v.label) ? 0 : /continúa/i.test(v.label) ? 3 : 4])));
  for (const p of DES.properties.filter((x) => x.type === "markdown")) e.metadata[p.name] = [{ value: "Información proporcionada por la persona que reporta." }];
  // The missing person is a relative travelling with the reporter: their name,
  // sex and country are the reporter's story, not a fresh draw. The reporter's
  // own typed-name field stays empty — they have a record, linked above.
  const dp = (re) => propByLabel(DES, re);
  setText(e.metadata, dp(/reportada como desaparecida/i), missing);
  setSelect(e.metadata, dp(/^g.nero/i), valueByLabel(dp(/^g.nero/i), missingSex === "F" ? "Mujer" : "Hombre"));
  setSelect(e.metadata, dp(/pa.s de nacimiento/i), valueByLabel(dp(/pa.s de nacimiento/i), reporter.origin));
  if (chance(0.06)) setSelect(e.metadata, dp(/lgbt/i), pick(valuesOf(dp(/lgbt/i))));
  fillGeneric(DES, e, {
    fillRate: 0.6,
    window: [when - 120 * DAY, when],
    skip: [dp(/escribir el nombre/i), dp(/lgbt/i)],
  });
}

/* INCIDENTES DE SEGURIDAD (15): at a shelter, reported by its staff. */
const INC = T("INCIDENTES DE SEGURIDAD");
const incRel = (re) => INC.properties.find((p) => p.type === "relationship" && re.test(relTypeName.get(p.relationType) ?? ""));
for (let i = 0; i < 15; i++) {
  const member = pick(staff);
  const shelter = member.shelter;
  const when = between(utc(2022, 6, 1), TODAY);
  const e = add(INC, { sharedId: newId("inc"), template: INC._id, title: `Incidente de seguridad — ${shelter.title} (${new Date(when * 1000).toISOString().slice(0, 7)})`, creationDate: created(when), metadata: {} });
  const md = e.metadata;
  link(md, incRel(/^organizaci/i), e, [shelter]);
  link(md, incRel(/^equipo/i), e, [member]);
  link(md, incRel(/perpetrador directo/i), e, [pick(actors)]);
  if (chance(0.4)) link(md, incRel(/perpetrador indirecto/i), e, [pick(actors)]);
  setGeo(md, INC.properties.find((p) => p.type === "geolocation"), jitter(shelter.city.lat, 0.02), jitter(shelter.city.lon, 0.02), shelter.city.city);
  setDate(md, propByLabel(INC, /^fecha$/i), when);
  for (const p of INC.properties.filter((x) => x.type === "markdown")) if (chance(0.5)) md[p.name] = [{ value: pick(["Se activó el protocolo de seguridad del albergue.", "Se informó a la coordinación de la Red.", "Sin personas lesionadas.", "Se documentó el hecho y se dio seguimiento."]) }];
  fillGeneric(INC, e, { fillRate: 0.7, window: [when - 10 * DAY, when] });
}

/* ALERTAS (15): about a person, raised at their shelter by its staff. */
const ALE = T("ALERTAS");
const aleRel = (re) => ALE.properties.find((p) => p.type === "relationship" && re.test(relTypeName.get(p.relationType) ?? ""));
for (const person of sample(adults, 15)) {
  const shelter = person.route[person.route.length - 1] ?? shelters[0];
  const member = staff.find((s) => s.shelter === shelter) ?? pick(staff);
  personRecord(ALE, person, "ale", "Alerta", (md, e) => {
    link(md, aleRel(/^alerta/i), e, [shelter]);
    link(md, aleRel(/^equipo/i), e, [member]);
  });
}

/* CANALIZACIÓN (20): a referral from one shelter to one further north. */
const CAN = T("CANALIZACIÓN");
const canRel = (re) => CAN.properties.find((p) => p.type === "relationship" && re.test(relTypeName.get(p.relationType) ?? ""));
for (const person of sample(people.filter((p) => p.route.length >= 1), 20)) {
  const from = person.route[0];
  const to = shelters[Math.min(shelters.length - 1, from.route + int(2, 8))];
  const member = staff.find((s) => s.shelter === from) ?? pick(staff);
  personRecord(CAN, person, "can", "Canalización", (md, e) => {
    link(md, canRel(/origen/i), e, [from]);
    link(md, canRel(/destino/i), e, [to]);
    link(md, canRel(/^equipo/i), e, [member]);
  });
}

/* ── Write ───────────────────────────────────────────────────────────── */
const strip = ({ sharedId, template, title, creationDate, metadata }) => ({ sharedId, template, title, creationDate, metadata });
const outDir = publicDir;
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "entities.json"), JSON.stringify(entities.map(strip)));
writeFileSync(join(outDir, "relationships.json"), JSON.stringify(relationships));
const counts = templates.map((t) => `${t.name}: ${byTemplate.get(t.name)?.length ?? 0}`).join("\n  ");
console.log(`entities ${entities.length}, relationships ${relationships.length}\n  ${counts}`);
