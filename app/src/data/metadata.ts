import type { Language } from "../atoms/language";
import type { RelationType } from "./references";
import type { ChainSegment, ProvenanceStep } from "../utils/chainTraversal";

export interface MetadataField {
  id: string;
  label: string;
  type: "text" | "date" | "link" | "country" | "multiline" | "file-list";
  value: string;
  flag?: string;
  items?: { label?: string; value: string }[];
  columns?: { label: string; value: string }[];
}

/**
 * A metadata field whose value comes from a RELATIONSHIP: it connects this
 * entity to entities of `targetTypeId` via `relationType`, and optionally
 * INHERITS a value from each connected entity. Inheritance is ONE spec, two
 * shapes (the second generalises the first):
 *   - `inheritProperty` — a native scalar prop on the connected entity, resolved
 *     against `data/entityMetadata` (the single-hop lookup; Uwazi's model).
 *   - `inheritPath` + `inheritLeaf` — a multi-hop projection: traverse the graph
 *     FROM each connected entity along `inheritPath`, project the leaf's
 *     `inheritLeaf` property. `inheritProperty` is the degenerate zero-segment
 *     case of this; both flow through the same resolver (utils/inheritance.ts).
 *
 * `connectionKey` ties sibling fields that share one connection (same relation
 * + target) together → multi-inheritance: one set of connected entities feeding
 * several inherited columns, edited (and kept in sync) as a single connection.
 * Omit all inherit fields for a link-only relationship (connected entities, no
 * inherited value).
 */
/** How a column of inherited values rolls up into a single summary (the Notion /
 *  Airtable "rollup calculation"). `list` = no summary (the values are the
 *  presentation); `distinct`/`count` summarise the set; `min`/`max`/`first` pick
 *  one. Omitted → no rollup chip (unchanged). */
export type InheritReduce = "list" | "distinct" | "count" | "min" | "max" | "first";

export interface RelationshipMetadataField {
  id: string;
  label: string;
  type: "relationship";
  relationType: RelationType;
  targetTypeId: string;
  inheritProperty?: string;
  inheritLabel?: string;
  /** Roll the inherited values up into a summary chip (see `InheritReduce`). */
  reduce?: InheritReduce;
  /** Column header for the connected-entity column when rendered as a table
   *  (e.g. "Juez"). Falls back to the entity type's name, else "Entity". */
  entityLabel?: string;
  /** Multi-hop inheritance: graph path FROM each connected entity. Resolved live
   *  against the registered inheritance graph — never pre-baked. */
  inheritPath?: ChainSegment[];
  /** Leaf property projected at the end of `inheritPath` (default `"title"`). */
  inheritLeaf?: string;
  /** Per connected-entity provenance: the intermediary nodes between the root
   *  entity and that connected entity (the connection's hidden middlemen, e.g. the
   *  Sentencia a signing judge reached this Causa through). Surfaced as a "via …"
   *  trail. Keyed by connected entity id. */
  connectionProvenance?: Record<string, ProvenanceStep[]>;
  connectedEntityIds: string[];
  connectionKey?: string;
  /** When `connectedEntityIds` is a capped slice of a larger set (hub entities
   *  fan out to thousands), the true total — so the card can say "showing N of
   *  M" instead of silently truncating. Omit when nothing was dropped. */
  totalConnected?: number;
  /** A derived/graph projection (e.g. CEJIL connections, a chain-traversed
   *  inherited field) — not editable inline. The edit view shows it read-only
   *  rather than as an entity-picker (design doc Q6: chain fields are edited via
   *  a relationship tree, not inline). */
  readOnly?: boolean;
}

export type AnyMetadataField = MetadataField | RelationshipMetadataField;

// Metadata for the default primary entity: Velásquez-Rodríguez v. Honduras —
// Merits Judgment of the Inter-American Court of Human Rights, July 29, 1988
// (Series C No. 4). Field values are drawn from the actual judgment so the
// drawer reflects the document.
export const metadataFields: MetadataField[] = [
  {
    id: "description",
    label: "Description",
    type: "multiline",
    value: `The Inter-American Commission on Human Rights submitted the instant case to the Court on April 24, 1986. It originated in a petition against Honduras (No. 7920) which the Secretariat of the Commission received on October 7, 1981. The Commission alleged that Angel Manfredo Velásquez Rodríguez, a student at the National Autonomous University of Honduras, was detained without a warrant on September 12, 1981, by members of the National Office of Investigations and an unidentified individual, who were reportedly carrying out their duties in the name and under the protection of the Armed Forces of Honduras.`,
  },
  {
    id: "victim",
    label: "Victim",
    type: "link",
    value: "Angel Manfredo Velásquez Rodríguez",
  },
  {
    id: "country",
    label: "Country",
    type: "country",
    value: "Honduras",
    flag: "🇭🇳",
  },
  {
    id: "place-incident",
    label: "Place of the incident",
    type: "text",
    value: "Tegucigalpa, Honduras",
  },
  {
    id: "date-incident",
    label: "Date of the incident",
    type: "date",
    value: "September 12, 1981",
  },
  {
    id: "date",
    label: "Date of judgment",
    type: "date",
    value: "July 29, 1988",
  },
  {
    id: "type",
    label: "Type",
    type: "text",
    value: "Merits — Judgment",
  },
  {
    id: "series",
    label: "Series",
    type: "text",
    value: "Series C No. 4",
  },
  {
    id: "petitioner",
    label: "Petitioner",
    type: "link",
    value: "Inter-American Commission on Human Rights",
  },
  {
    id: "respondent",
    label: "Respondent",
    type: "link",
    value: "State of Honduras",
  },
  {
    id: "articles-invoked",
    label: "Articles invoked",
    type: "multiline",
    value:
      "Articles 4 (Right to Life), 5 (Right to Humane Treatment), and 7 (Right to Personal Liberty) of the American Convention on Human Rights, alleged and found violated in conjunction with the general obligation under Article 1(1).",
  },
  {
    id: "mechanism",
    label: "Issuing body",
    type: "link",
    value: "Inter-American Court of Human Rights",
  },
  {
    id: "bench",
    label: "Bench",
    type: "file-list",
    value: "",
    items: [
      { label: "President", value: "Rafael Nieto-Navia" },
      { label: "Vice President", value: "Héctor Gros Espiell" },
      { label: "Judge", value: "Rodolfo E. Piza E." },
      { label: "Judge", value: "Thomas Buergenthal" },
      { label: "Judge", value: "Pedro Nikken" },
      { label: "Judge", value: "Héctor Fix-Zamudio" },
      { label: "Judge ad hoc", value: "Rigoberto Espinal Irías" },
    ],
  },
  {
    id: "other-files",
    label: "Other Files",
    type: "file-list",
    value: "",
    items: [
      { label: "Document", value: "Velasquez-Rodriguez — Sentencia de Fondo (29 julio 1988).docx" },
      { label: "Document", value: "Velasquez-Rodriguez — Reparaciones y Costas (21 julio 1989).docx" },
      { label: "Video", value: "Audiencia pública — Velásquez Rodríguez c. Honduras (1987).mpeg" },
    ],
  },
];

const scalarFieldsByLanguage: Record<Language, MetadataField[]> = {
  EN: metadataFields,
  ES: [
    {
      id: "description",
      label: "Descripción",
      type: "multiline",
      value: `La Comisión Interamericana de Derechos Humanos sometió el presente caso a la Corte el 24 de abril de 1986. Tuvo su origen en una denuncia contra Honduras (No. 7920) que la Secretaría de la Comisión recibió el 7 de octubre de 1981. La Comisión alegó que Ángel Manfredo Velásquez Rodríguez, estudiante de la Universidad Nacional Autónoma de Honduras, fue detenido sin orden judicial el 12 de septiembre de 1981, por miembros de la Dirección Nacional de Investigación y un individuo no identificado, quienes presuntamente cumplían funciones en nombre y bajo la protección de las Fuerzas Armadas de Honduras.`,
    },
    { id: "victim", label: "Víctima", type: "link", value: "Ángel Manfredo Velásquez Rodríguez" },
    { id: "country", label: "País", type: "country", value: "Honduras", flag: "🇭🇳" },
    { id: "place-incident", label: "Lugar del hecho", type: "text", value: "Tegucigalpa, Honduras" },
    { id: "date-incident", label: "Fecha del hecho", type: "date", value: "12 de septiembre de 1981" },
    { id: "date", label: "Fecha de la sentencia", type: "date", value: "29 de julio de 1988" },
    { id: "type", label: "Tipo", type: "text", value: "Fondo — Sentencia" },
    { id: "series", label: "Serie", type: "text", value: "Serie C No. 4" },
    {
      id: "petitioner",
      label: "Peticionario",
      type: "link",
      value: "Comisión Interamericana de Derechos Humanos",
    },
    { id: "respondent", label: "Estado demandado", type: "link", value: "Estado de Honduras" },
    {
      id: "articles-invoked",
      label: "Artículos invocados",
      type: "multiline",
      value:
        "Artículos 4 (Derecho a la Vida), 5 (Derecho a la Integridad Personal) y 7 (Derecho a la Libertad Personal) de la Convención Americana sobre Derechos Humanos, alegados y declarados violados en relación con la obligación general del artículo 1.1.",
    },
    {
      id: "mechanism",
      label: "Órgano emisor",
      type: "link",
      value: "Corte Interamericana de Derechos Humanos",
    },
    {
      id: "bench",
      label: "Tribunal",
      type: "file-list",
      value: "",
      items: [
        { label: "Presidente", value: "Rafael Nieto Navia" },
        { label: "Vicepresidente", value: "Héctor Gros Espiell" },
        { label: "Juez", value: "Rodolfo E. Piza E." },
        { label: "Juez", value: "Thomas Buergenthal" },
        { label: "Juez", value: "Pedro Nikken" },
        { label: "Juez", value: "Héctor Fix-Zamudio" },
        { label: "Juez ad hoc", value: "Rigoberto Espinal Irías" },
      ],
    },
    {
      id: "other-files",
      label: "Otros archivos",
      type: "file-list",
      value: "",
      items: [
        { label: "Documento", value: "Velasquez-Rodriguez — Sentencia de Fondo (29 julio 1988).docx" },
        { label: "Documento", value: "Velasquez-Rodriguez — Reparaciones y Costas (21 julio 1989).docx" },
        { label: "Video", value: "Audiencia pública — Velásquez Rodríguez c. Honduras (1987).mpeg" },
      ],
    },
  ],
  FR: [
    {
      id: "description",
      label: "Description",
      type: "multiline",
      value: `La Commission interaméricaine des droits de l'homme a soumis la présente affaire à la Cour le 24 avril 1986. Elle tire son origine d'une plainte contre le Honduras (n° 7920) que le Secrétariat de la Commission a reçue le 7 octobre 1981. La Commission a allégué qu'Ángel Manfredo Velásquez Rodríguez, étudiant à l'Université nationale autonome du Honduras, a été arrêté sans mandat le 12 septembre 1981, par des membres de la Direction nationale d'enquête et un individu non identifié, qui auraient exercé leurs fonctions au nom et sous la protection des Forces armées du Honduras.`,
    },
    { id: "victim", label: "Victime", type: "link", value: "Ángel Manfredo Velásquez Rodríguez" },
    { id: "country", label: "Pays", type: "country", value: "Honduras", flag: "🇭🇳" },
    { id: "place-incident", label: "Lieu des faits", type: "text", value: "Tegucigalpa, Honduras" },
    { id: "date-incident", label: "Date des faits", type: "date", value: "12 septembre 1981" },
    { id: "date", label: "Date de l'arrêt", type: "date", value: "29 juillet 1988" },
    { id: "type", label: "Type", type: "text", value: "Fond — Arrêt" },
    { id: "series", label: "Série", type: "text", value: "Série C n° 4" },
    {
      id: "petitioner",
      label: "Requérante",
      type: "link",
      value: "Commission interaméricaine des droits de l'homme",
    },
    { id: "respondent", label: "État défendeur", type: "link", value: "État du Honduras" },
    {
      id: "articles-invoked",
      label: "Articles invoqués",
      type: "multiline",
      value:
        "Articles 4 (droit à la vie), 5 (droit à l'intégrité de la personne) et 7 (droit à la liberté personnelle) de la Convention américaine relative aux droits de l'homme, allégués et déclarés violés en lien avec l'obligation générale de l'article 1(1).",
    },
    {
      id: "mechanism",
      label: "Organe émetteur",
      type: "link",
      value: "Cour interaméricaine des droits de l'homme",
    },
    {
      id: "bench",
      label: "Composition",
      type: "file-list",
      value: "",
      items: [
        { label: "Président", value: "Rafael Nieto-Navia" },
        { label: "Vice-Président", value: "Héctor Gros Espiell" },
        { label: "Juge", value: "Rodolfo E. Piza E." },
        { label: "Juge", value: "Thomas Buergenthal" },
        { label: "Juge", value: "Pedro Nikken" },
        { label: "Juge", value: "Héctor Fix-Zamudio" },
        { label: "Juge ad hoc", value: "Rigoberto Espinal Irías" },
      ],
    },
    {
      id: "other-files",
      label: "Autres fichiers",
      type: "file-list",
      value: "",
      items: [
        { label: "Document", value: "Velasquez-Rodriguez — Sentencia de Fondo (29 julio 1988).docx" },
        { label: "Document", value: "Velasquez-Rodriguez — Reparaciones y Costas (21 julio 1989).docx" },
        { label: "Vidéo", value: "Audiencia pública — Velásquez Rodríguez c. Honduras (1987).mpeg" },
      ],
    },
  ],
  AR: [
    {
      id: "description",
      label: "الوصف",
      type: "multiline",
      value: `قدمت لجنة البلدان الأمريكية لحقوق الإنسان هذه القضية إلى المحكمة في 24 أبريل 1986. نشأت القضية من شكوى ضد هندوراس (رقم 7920) تلقتها أمانة اللجنة في 7 أكتوبر 1981. ادعت اللجنة أن أنخيل مانفريدو فيلاسكيز رودريغيز، طالب في الجامعة الوطنية المستقلة في هندوراس، احتُجز دون أمر قضائي في 12 سبتمبر 1981، من قبل أعضاء مكتب التحقيقات الوطني وفرد مجهول الهوية، كانوا يؤدون واجباتهم باسم القوات المسلحة الهندوراسية وتحت حمايتها.`,
    },
    { id: "victim", label: "الضحية", type: "link", value: "أنخيل مانفريدو فيلاسكيز رودريغيز" },
    { id: "country", label: "البلد", type: "country", value: "هندوراس", flag: "🇭🇳" },
    { id: "place-incident", label: "مكان الحادثة", type: "text", value: "تيغوسيغالبا، هندوراس" },
    { id: "date-incident", label: "تاريخ الحادثة", type: "date", value: "12 سبتمبر 1981" },
    { id: "date", label: "تاريخ الحكم", type: "date", value: "29 يوليو 1988" },
    { id: "type", label: "النوع", type: "text", value: "الموضوع — حكم" },
    { id: "series", label: "السلسلة", type: "text", value: "السلسلة C رقم 4" },
    {
      id: "petitioner",
      label: "المُدّعي",
      type: "link",
      value: "لجنة البلدان الأمريكية لحقوق الإنسان",
    },
    { id: "respondent", label: "الدولة المُدّعى عليها", type: "link", value: "دولة هندوراس" },
    {
      id: "articles-invoked",
      label: "المواد المُحتجّ بها",
      type: "multiline",
      value:
        "المواد 4 (الحق في الحياة) و5 (الحق في المعاملة الإنسانية) و7 (الحق في الحرية الشخصية) من الاتفاقية الأمريكية لحقوق الإنسان، التي ادُّعي ووُجد أنها انتُهكت بالاقتران مع الالتزام العام الوارد في المادة 1(1).",
    },
    {
      id: "mechanism",
      label: "الجهة المُصدِرة",
      type: "link",
      value: "محكمة البلدان الأمريكية لحقوق الإنسان",
    },
    {
      id: "bench",
      label: "هيئة المحكمة",
      type: "file-list",
      value: "",
      items: [
        { label: "الرئيس", value: "رافاييل نييتو-نافيا" },
        { label: "نائب الرئيس", value: "هيكتور غروس إسبيل" },
        { label: "قاضٍ", value: "رودولفو إ. بيزا إ." },
        { label: "قاضٍ", value: "توماس بورغنتال" },
        { label: "قاضٍ", value: "بيدرو نيكين" },
        { label: "قاضٍ", value: "هيكتور فيكس-زاموديو" },
        { label: "قاضٍ خاص", value: "ريغوبيرتو إسبينال إرياس" },
      ],
    },
    {
      id: "other-files",
      label: "ملفات أخرى",
      type: "file-list",
      value: "",
      items: [
        { label: "مستند", value: "Velasquez-Rodriguez — Sentencia de Fondo (29 julio 1988).docx" },
        { label: "مستند", value: "Velasquez-Rodriguez — Reparaciones y Costas (21 julio 1989).docx" },
        { label: "فيديو", value: "Audiencia pública — Velásquez Rodríguez c. Honduras (1987).mpeg" },
      ],
    },
  ],
};

/**
 * Relationship/inherited fields appended after the scalar fields. Three tiers,
 * all exercised:
 *  - multi-inheritance: "People involved" + "Role" share `connectionKey:
 *    "people"` (one connection, two inherited columns: country + role). `e19`
 *    has no `entityMetadata` entry, so its row shows the missing-value state.
 *  - single-inheritance: "Related cases" inherits one property (`region`) from
 *    each connected case. `e32` (Gelman) has no `region`, so it shows the
 *    missing-value state outside the table.
 *  - link-only: "Rights invoked" connects to Right entities with no inherited
 *    value.
 * Connection sets are identical across languages; only labels differ.
 */
const people = ["e1", "e16", "e17", "e18", "e19"];
const cases = ["e13", "e31", "e32"];
const rights = ["e4", "e5", "e34"];

/** An inherited relationship property surfaced as a dynamic filter: the value
 *  inherited from each connected target of `targetTypeId`. Country is excluded —
 *  it has a dedicated Target-country facet. */
export interface InheritedFilterProp {
  propId: string;
  label: string;
  targetTypeId: string;
}

export function inheritedFilterProps(lang: Language): InheritedFilterProp[] {
  const seen = new Map<string, InheritedFilterProp>();
  for (const f of relationshipFieldsByLanguage[lang] ?? []) {
    if (
      f.inheritProperty &&
      f.inheritProperty !== "country" &&
      !seen.has(f.inheritProperty)
    ) {
      seen.set(f.inheritProperty, {
        propId: f.inheritProperty,
        label: f.inheritLabel ?? f.inheritProperty,
        targetTypeId: f.targetTypeId,
      });
    }
  }
  return [...seen.values()];
}

export const relationshipFieldsByLanguage: Record<Language, RelationshipMetadataField[]> = {
  EN: [
    { id: "rel-people", label: "People involved", type: "relationship", relationType: "relates_to", targetTypeId: "person", inheritProperty: "country", inheritLabel: "Country", reduce: "distinct", connectedEntityIds: people, connectionKey: "people" },
    { id: "rel-role", label: "Role", type: "relationship", relationType: "relates_to", targetTypeId: "person", inheritProperty: "role", inheritLabel: "Role", reduce: "distinct", connectedEntityIds: people, connectionKey: "people" },
    { id: "rel-cases", label: "Related cases", type: "relationship", relationType: "cites", targetTypeId: "court_case", inheritProperty: "region", inheritLabel: "Region", reduce: "distinct", connectedEntityIds: cases },
    { id: "rel-rights", label: "Rights invoked", type: "relationship", relationType: "cites", targetTypeId: "right", connectedEntityIds: rights },
  ],
  ES: [
    { id: "rel-people", label: "Personas involucradas", type: "relationship", relationType: "relates_to", targetTypeId: "person", inheritProperty: "country", inheritLabel: "País", reduce: "distinct", connectedEntityIds: people, connectionKey: "people" },
    { id: "rel-role", label: "Rol", type: "relationship", relationType: "relates_to", targetTypeId: "person", inheritProperty: "role", inheritLabel: "Rol", reduce: "distinct", connectedEntityIds: people, connectionKey: "people" },
    { id: "rel-cases", label: "Casos relacionados", type: "relationship", relationType: "cites", targetTypeId: "court_case", inheritProperty: "region", inheritLabel: "Región", reduce: "distinct", connectedEntityIds: cases },
    { id: "rel-rights", label: "Derechos invocados", type: "relationship", relationType: "cites", targetTypeId: "right", connectedEntityIds: rights },
  ],
  FR: [
    { id: "rel-people", label: "Personnes impliquées", type: "relationship", relationType: "relates_to", targetTypeId: "person", inheritProperty: "country", inheritLabel: "Pays", reduce: "distinct", connectedEntityIds: people, connectionKey: "people" },
    { id: "rel-role", label: "Rôle", type: "relationship", relationType: "relates_to", targetTypeId: "person", inheritProperty: "role", inheritLabel: "Rôle", reduce: "distinct", connectedEntityIds: people, connectionKey: "people" },
    { id: "rel-cases", label: "Affaires liées", type: "relationship", relationType: "cites", targetTypeId: "court_case", inheritProperty: "region", inheritLabel: "Région", reduce: "distinct", connectedEntityIds: cases },
    { id: "rel-rights", label: "Droits invoqués", type: "relationship", relationType: "cites", targetTypeId: "right", connectedEntityIds: rights },
  ],
  AR: [
    { id: "rel-people", label: "الأشخاص المعنيون", type: "relationship", relationType: "relates_to", targetTypeId: "person", inheritProperty: "country", inheritLabel: "البلد", reduce: "distinct", connectedEntityIds: people, connectionKey: "people" },
    { id: "rel-role", label: "الدور", type: "relationship", relationType: "relates_to", targetTypeId: "person", inheritProperty: "role", inheritLabel: "الدور", reduce: "distinct", connectedEntityIds: people, connectionKey: "people" },
    { id: "rel-cases", label: "القضايا ذات الصلة", type: "relationship", relationType: "cites", targetTypeId: "court_case", inheritProperty: "region", inheritLabel: "المنطقة", reduce: "distinct", connectedEntityIds: cases },
    { id: "rel-rights", label: "الحقوق المُحتجّ بها", type: "relationship", relationType: "cites", targetTypeId: "right", connectedEntityIds: rights },
  ],
};

export const metadataFieldsByLanguage: Record<Language, AnyMetadataField[]> = {
  EN: [...scalarFieldsByLanguage.EN, ...relationshipFieldsByLanguage.EN],
  ES: [...scalarFieldsByLanguage.ES, ...relationshipFieldsByLanguage.ES],
  FR: [...scalarFieldsByLanguage.FR, ...relationshipFieldsByLanguage.FR],
  AR: [...scalarFieldsByLanguage.AR, ...relationshipFieldsByLanguage.AR],
};

export const pdfMetadata = {
  name: "Velasquez-Rodriguez_v_Honduras_Judgment_1988.pdf",
  type: "PDF",
  size: "213 KB",
  lastEdited: "29-07-1988",
  added: "15-03-2024",
};

export const pdfMetadataByLanguage: Record<Language, typeof pdfMetadata> = {
  EN: pdfMetadata,
  ES: {
    name: "Velasquez-Rodriguez_c_Honduras_Sentencia_1988.pdf",
    type: "PDF",
    size: "191 KB",
    lastEdited: "29-07-1988",
    added: "15-03-2024",
  },
  FR: {
    name: "Velasquez-Rodriguez_c_Honduras_Arret_1988.pdf",
    type: "PDF",
    size: "213 KB",
    lastEdited: "29-07-1988",
    added: "15-03-2024",
  },
  AR: {
    name: "Velasquez-Rodriguez_Honduras_Hukm_1988.pdf",
    type: "PDF",
    size: "213 KB",
    lastEdited: "29-07-1988",
    added: "15-03-2024",
  },
};
