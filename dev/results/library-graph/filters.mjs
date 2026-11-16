import { fold } from "./load.mjs";
const day = (s) => Date.parse(s + "T00:00:00Z");
const endDay = (s) => Date.parse(s + "T00:00:00Z") + 86400000 - 1;
const tpl = (...t) => (n) => t.includes(n.tpl);
const and = (...f) => (n) => f.every((x) => x(n));
const range = (a, b) => (n) => n.date != null && (n.dateTo ?? n.date) >= day(a) && n.date <= endDay(b);
const search = (q) => { const ts = fold(q).split(/\s+/).filter(Boolean); return (n) => ts.every((t) => n.text.includes(t)); };

export const CEJIL = [
  ["Template: Causa", tpl("Causa")],
  ["Template: Sentencia de la CorteIDH", tpl("Sentencia de la CorteIDH")],
  ["Template: Resolución de la CorteIDH", tpl("Resolución de la CorteIDH")],
  ["Template: Juez y/o Comisionado", tpl("Juez y/o Comisionado")],
  ["Template: Audiencia", tpl("Audiencia")],
  ["Causa + País Colombia", and(tpl("Causa"), (n) => n.country === "Colombia")],
  ["Sentencia + País Guatemala", and(tpl("Sentencia de la CorteIDH"), (n) => n.country === "Guatemala")],
  ["Any template + País Perú", (n) => n.country === "Perú"],
  ["Causa + Sentencia + País Perú", and(tpl("Causa", "Sentencia de la CorteIDH"), (n) => n.country === "Perú")],
  ["Date 2010–2014, any template", range("2010-01-01", "2014-12-31")],
  ["Sentencia + date 2005–2012", and(tpl("Sentencia de la CorteIDH"), range("2005-01-01", "2012-12-31"))],
  ["Descriptor: Desaparición forzada", (n) => n.descriptors.includes("Desaparición forzada")],
  ["Causa + descriptor Ejecución extrajudicial", and(tpl("Causa"), (n) => n.descriptors.includes("Ejecución extrajudicial"))],
  ["Search: \"desaparicion forzada\"", search("desaparicion forzada")],
  ["Search: \"masacre\"", search("masacre")],
  ["Search: \"Mapiripán\"", search("Mapiripán")],
];

export const NEPAL = [
  ["Template: Event", tpl("nepal_event")],
  ["Template: Casualty", tpl("nepal_casualty")],
  ["Template: Claim", tpl("nepal_claim")],
  ["Template: Action", tpl("nepal_action")],
  ["Template: Source", tpl("nepal_source")],
  ["Template: Media item", tpl("nepal_media")],
  ["Event + Verification: Confirmed", and(tpl("nepal_event"), (n) => n.verification === "Confirmed by multiple sources")],
  ["Claim + Verification: Disputed", and(tpl("nepal_claim"), (n) => n.verification === "Disputed")],
  ["Verification: Disputed, any template", (n) => n.verification === "Disputed"],
  ["Casualty + district contains Kathmandu", and(tpl("nepal_casualty"), (n) => n.props.district.some((d) => /kathmandu/i.test(d)))],
  ["Event + type Arson or vandalism", and(tpl("nepal_event"), (n) => n.props.event_type.includes("Arson or vandalism"))],
  ["Event + date 8–9 Sep 2025", and(tpl("nepal_event"), range("2025-09-08", "2025-09-09"))],
  ["Any template + date 8–9 Sep 2025", range("2025-09-08", "2025-09-09")],
  ["Any template + date 10 Sep–31 Dec 2025", range("2025-09-10", "2025-12-31")],
  ["Event + Action + date Sep 2025", and(tpl("nepal_event", "nepal_action"), range("2025-09-01", "2025-09-30"))],
  ["Search: \"curfew\"", search("curfew")],
  ["Search: \"Singha Durbar\"", search("Singha Durbar")],
];

export const SAMPLE = [
  ["Template: Hearing", tpl("hearing")],
  ["Template: Person", tpl("person")],
  ["Template: Court case", tpl("court_case")],
  ["Template: Judgment", tpl("judgment")],
  ["Template: Document", tpl("document")],
  ["Court case + Judgment + Person", tpl("court_case", "judgment", "person")],
  ["Person + Organization", tpl("person", "organization")],
  ["Published only", (n) => n.published],
  ["Restricted only", (n) => !n.published],
  ["Date 2023-06-01 – 2023-08-31", range("2023-06-01", "2023-08-31")],
  ["Search: \"Argentina\"", search("Argentina")],
  ["Search: \"Tablada\"", search("Tablada")],
];
