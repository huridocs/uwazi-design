/* The Sample corpus's showcase additions (relationships redesign v4, §A.2).
 *
 * Before this seed, every Sample reference touched La Tablada (e3): no two other
 * Sample entities were connected, so nothing that needs a second step — a hub a
 * member sits in, a derived multi-hop field, a path with more than one route, a
 * high-degree node, a timeline with bursts — could be shown. This module is the
 * data that fixes that, and ONLY data: it imports nothing from the modules that
 * consume it (entities, references, metadata), so each of them can pull from here
 * without a cycle.
 *
 * Machine-readable twin: dev/results/relationships-redesign/v4/data/sample-seed-v4.json.
 */
import type { Language } from "../atoms/language";

type L10n = Record<Language, string>;

/* ── Templates and entities ─────────────────────────────────────────────── */

export const V4_HEARING_TYPE = { id: "hearing", name: "Hearing", color: "#0D9488" } as const;

export interface SeedEntity {
  id: string;
  title: string;
  typeId: string;
}

/** Five hearing sessions of the Inter-American Commission (e8). Irregular on
 *  purpose — the gaps and the bursts ARE the demo for the When mode. */
const HEARING_SESSIONS: { year: number; month: number; count: number }[] = [
  { year: 2019, month: 3, count: 8 },
  { year: 2019, month: 10, count: 10 },
  { year: 2021, month: 3, count: 6 },
  { year: 2022, month: 10, count: 12 },
  { year: 2024, month: 3, count: 12 },
];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const hearings: (SeedEntity & { date: string })[] = [];
{
  let n = 60;
  for (const s of HEARING_SESSIONS) {
    for (let k = 0; k < s.count; k++) {
      const day = 2 + Math.floor((k * 26) / s.count);
      hearings.push({
        id: `e${n++}`,
        title: `Hearing ${k + 1}, ${MONTHS[s.month - 1]} ${s.year} session`,
        typeId: V4_HEARING_TYPE.id,
        date: `${s.year}-${String(s.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      });
    }
  }
}

/** 51 new entities: two respondent states, one deliberately unconnected record,
 *  and the 48 hearings (e60–e107). */
export const V4_ENTITIES: SeedEntity[] = [
  { id: "e54", title: "Uruguay", typeId: "country" },
  { id: "e55", title: "El Salvador", typeId: "country" },
  // No relationship on either end, ever — the zero-connections state.
  { id: "e56", title: "Unlinked memo (draft)", typeId: "document" },
  ...hearings.map(({ id, title, typeId }) => ({ id, title, typeId })),
];
export const V4_ENTITY_IDS = new Set(V4_ENTITIES.map((e) => e.id));

/* ── Relation types ─────────────────────────────────────────────────────── */

export const V4_RELATION_TYPES: { id: string; label: string }[] = [
  { id: "victim", label: "Victim" },
  { id: "petitioner", label: "Petitioner" },
  { id: "respondent_state", label: "Respondent State" },
  { id: "judgment_of", label: "Judgment" },
  { id: "signed_by", label: "Signed by" },
  { id: "nationality", label: "Nationality" },
  { id: "member_of", label: "Member of" },
  { id: "hearing_of", label: "Hearing" },
];

/* ── Hubs ───────────────────────────────────────────────────────────────── */

/** One Uwazi hub: a centre whose template owns the field, and its members.
 *  `centre: null` + `type: null` is a hub no member owns (a joint statement) —
 *  the "listed together" case; it is stored star-shaped from its first member,
 *  which is what the export does too. `type: null` with a centre is an untyped
 *  pair. */
export interface SeedHub {
  id: string;
  centre: string | null;
  type: string | null;
  members: string[];
}

const hub = (id: string, centre: string | null, type: string | null, members: string[]): SeedHub => ({ id, centre, type, members });

export const V4_HUBS: SeedHub[] = [
  hub("hub-v4-01", "e3", "victim", ["e1", "e11", "e12", "e16"]),
  hub("hub-v4-02", "e3", "petitioner", ["e8", "e43"]),
  hub("hub-v4-03", "e3", "respondent_state", ["e2"]),
  hub("hub-v4-04", "e3", "judgment_of", ["e7"]),
  hub("hub-v4-05", "e7", "signed_by", ["e21", "e22", "e23"]),
  hub("hub-v4-06", "e38", "signed_by", ["e22", "e24", "e25"]),
  hub("hub-v4-07", "e39", "signed_by", ["e22", "e23", "e24"]),
  hub("hub-v4-08", "e40", "signed_by", ["e21", "e25"]),
  hub("hub-v4-09", "e13", "judgment_of", ["e38"]),
  hub("hub-v4-10", "e33", "judgment_of", ["e39"]),
  hub("hub-v4-11", "e32", "judgment_of", ["e40"]),
  hub("hub-v4-12", "e13", "respondent_state", ["e26"]),
  hub("hub-v4-13", "e33", "respondent_state", ["e27"]),
  hub("hub-v4-14", "e32", "respondent_state", ["e54"]),
  hub("hub-v4-15", "e31", "respondent_state", ["e55"]),
  hub("hub-v4-16", "e33", "victim", ["e19", "e20"]),
  hub("hub-v4-17", "e32", "petitioner", ["e8", "e44"]),
  hub("hub-v4-18", "e21", "nationality", ["e2"]),
  hub("hub-v4-19", "e22", "nationality", ["e15"]),
  hub("hub-v4-20", "e23", "nationality", ["e28"]),
  hub("hub-v4-21", "e24", "nationality", ["e29"]),
  hub("hub-v4-22", "e25", "nationality", ["e30"]),
  hub("hub-v4-23", "e1", "nationality", ["e2"]),
  hub("hub-v4-24", "e11", "nationality", ["e2"]),
  hub("hub-v4-25", "e12", "nationality", ["e27"]),
  hub("hub-v4-26", "e16", "nationality", ["e2"]),
  hub("hub-v4-27", "e16", "member_of", ["e43"]),
  hub("hub-v4-28", "e17", "member_of", ["e43"]),
  hub("hub-v4-29", "e19", "member_of", ["e44"]),
  hub("hub-v4-30", "e20", "member_of", ["e8"]),
  // A joint statement: no relation type, no member owns it.
  hub("hub-v4-31", null, null, ["e8", "e41", "e42"]),
  // An untyped pair.
  hub("hub-v4-32", "e3", null, ["e52"]),
  // The Commission's hearings — the high-degree node.
  hub("hub-v4-33", "e8", "hearing_of", hearings.map((h) => h.id)),
];

/** The hubs as entity-level references (no text anchor), in the shape
 *  `data/references.ts` stores. The untyped ones carry the canonical `no_label`
 *  type, the same id an orphaned reference is given. */
export function v4References(noLabel: string): {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationType: string;
  hubId: string;
  createdAt: string;
}[] {
  const out = [];
  for (const h of V4_HUBS) {
    const centre = h.centre ?? h.members[0];
    const members = h.centre ? h.members : h.members.slice(1);
    for (const m of members) {
      out.push({
        id: `ref-${h.id}-${m}`,
        sourceEntityId: centre,
        targetEntityId: m,
        relationType: h.type ?? noLabel,
        hubId: h.id,
        createdAt: "2024-07-02",
      });
    }
  }
  return out;
}

/* ── Relationship fields on the templates ───────────────────────────────── */

export interface SeedField {
  id: string;
  label: L10n;
  relationType: string;
  targetTypeId: string;
}

export const V4_FIELDS: Record<string, SeedField[]> = {
  court_case: [
    { id: "rel-victims", label: { EN: "Victims", ES: "Víctimas", FR: "Victimes", AR: "الضحايا" }, relationType: "victim", targetTypeId: "person" },
    { id: "rel-petitioners", label: { EN: "Petitioners", ES: "Peticionarios", FR: "Pétitionnaires", AR: "مقدمو الالتماس" }, relationType: "petitioner", targetTypeId: "organization" },
    { id: "rel-respondent-state", label: { EN: "Respondent State", ES: "Estado demandado", FR: "État défendeur", AR: "الدولة المدعى عليها" }, relationType: "respondent_state", targetTypeId: "country" },
    { id: "rel-judgments", label: { EN: "Judgments", ES: "Sentencias", FR: "Arrêts", AR: "الأحكام" }, relationType: "judgment_of", targetTypeId: "judgment" },
  ],
  judgment: [
    { id: "rel-signed-by", label: { EN: "Signed by", ES: "Firmantes", FR: "Signataires", AR: "الموقعون" }, relationType: "signed_by", targetTypeId: "person" },
  ],
  person: [
    { id: "rel-nationality", label: { EN: "Nationality", ES: "Nacionalidad", FR: "Nationalité", AR: "الجنسية" }, relationType: "nationality", targetTypeId: "country" },
    { id: "rel-member-of", label: { EN: "Member of", ES: "Miembro de", FR: "Membre de", AR: "عضو في" }, relationType: "member_of", targetTypeId: "organization" },
  ],
  organization: [
    { id: "rel-hearings", label: { EN: "Hearings", ES: "Audiencias", FR: "Audiences", AR: "الجلسات" }, relationType: "hearing_of", targetTypeId: V4_HEARING_TYPE.id },
  ],
};

/** Derived (multi-hop) fields on Court case: Judgments → Signed by, and one hop
 *  further to the judge's Nationality. Read-only, like every chain field. */
export const V4_DERIVED = {
  judges: {
    id: "rel-judges",
    label: { EN: "Judges", ES: "Jueces", FR: "Juges", AR: "القضاة" } as L10n,
    nationalityLabel: { EN: "Judges' nationality", ES: "Nacionalidad de los jueces", FR: "Nationalité des juges", AR: "جنسية القضاة" } as L10n,
    entityLabel: { EN: "Judge", ES: "Juez", FR: "Juge", AR: "القاضي" } as L10n,
    path: ["judgment_of", "signed_by"] as const,
  },
};

/** Members of `centre`'s hub(s) of `type`, in seed order. */
export function hubMembers(centre: string, type: string): string[] {
  const out: string[] = [];
  for (const h of V4_HUBS) if (h.centre === centre && h.type === type) for (const m of h.members) if (!out.includes(m)) out.push(m);
  return out;
}

/* ── Dates ──────────────────────────────────────────────────────────────── */

/** A dated property. `end` makes it a range (a judge's mandate). */
export interface SeedDate {
  prop: string;
  label: L10n;
  value: string;
  end?: string;
}

const D = (prop: string, label: L10n, value: string, end?: string): SeedDate => ({ prop, label, value, ...(end ? { end } : {}) });
const L_DATE: L10n = { EN: "Date", ES: "Fecha", FR: "Date", AR: "التاريخ" };
const L_ATTACK: L10n = { EN: "Date of the attack", ES: "Fecha del ataque", FR: "Date de l'attaque", AR: "تاريخ الهجوم" };
const L_PETITION: L10n = { EN: "Petition filed", ES: "Petición presentada", FR: "Pétition déposée", AR: "تقديم الالتماس" };
const L_ADMISSIBILITY: L10n = { EN: "Admissibility", ES: "Admisibilidad", FR: "Recevabilité", AR: "المقبولية" };
const L_REPORT: L10n = { EN: "Report adopted", ES: "Informe adoptado", FR: "Rapport adopté", AR: "اعتماد التقرير" };
const L_SUBMITTED: L10n = { EN: "Submitted to the Court", ES: "Presentación ante la Corte", FR: "Saisine de la Cour", AR: "الإحالة إلى المحكمة" };
const L_MANDATE: L10n = { EN: "Mandate", ES: "Mandato", FR: "Mandat", AR: "الولاية" };
const L_ADOPTED: L10n = { EN: "Adopted", ES: "Adopción", FR: "Adoption", AR: "الاعتماد" };

export const V4_DATES: Record<string, SeedDate[]> = {
  e3: [
    D("dateOfAttack", L_ATTACK, "1989-01-23"),
    D("petitionFiled", L_PETITION, "1989-03-15"),
    D("admissibility", L_ADMISSIBILITY, "1995-10-12"),
    D("reportAdopted", L_REPORT, "1997-11-18"),
  ],
  e13: [D("petitionFiled", L_PETITION, "1981-10-07"), D("submittedToCourt", L_SUBMITTED, "1986-04-24")],
  e31: [D("petitionFiled", L_PETITION, "1990-01-17")],
  e32: [D("petitionFiled", L_PETITION, "2006-05-08"), D("submittedToCourt", L_SUBMITTED, "2010-01-21")],
  e33: [D("petitionFiled", L_PETITION, "1993-03-05"), D("submittedToCourt", L_SUBMITTED, "1996-08-30")],
  e7: [D("date", L_DATE, "1997-11-18")],
  e38: [D("date", L_DATE, "1988-07-29")],
  e39: [D("date", L_DATE, "2000-11-25")],
  e40: [D("date", L_DATE, "2011-02-24")],
  e48: [D("adopted", L_ADOPTED, "1969-11-22")],
  e49: [D("adopted", L_ADOPTED, "1991-03-04")],
  e50: [D("adopted", L_ADOPTED, "1994-06-09")],
  e51: [D("adopted", L_ADOPTED, "1977-06-08")],
  e52: [D("adopted", L_ADOPTED, "1948-12-10")],
  e53: [D("adopted", L_ADOPTED, "2003-05-10")],
  e21: [D("mandate", L_MANDATE, "1995-01-01", "2003-12-31")],
  e22: [D("mandate", L_MANDATE, "1986-01-01", "1997-12-31")],
  e23: [D("mandate", L_MANDATE, "1998-01-01", "2009-12-31")],
  e24: [D("mandate", L_MANDATE, "1989-01-01", "2000-12-31")],
  e25: [D("mandate", L_MANDATE, "2004-01-01", "2015-12-31")],
  ...Object.fromEntries(hearings.map((h) => [h.id, [D("date", L_DATE, h.date)]])),
};

/** The dates as native props (`prop` → `yyyy-mm-dd`, a range as `from/to`), so
 *  the record shows them and they can be inherited like any other value. */
export const V4_DATE_PROPS: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(V4_DATES).map(([id, ds]) => [id, Object.fromEntries(ds.map((d) => [d.prop, d.end ? `${d.value}/${d.end}` : d.value]))]),
);
