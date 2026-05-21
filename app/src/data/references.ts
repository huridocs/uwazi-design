/** Free-form relation-type id. The seed set ships with mentions / relates_to /
 *  cites / refers_to / no_label, but `relationTypesAtom` is writable at runtime
 *  so the Manage Types modal can append more. `no_label` is the canonical
 *  fallback for orphaned references (assigned when their type gets deleted). */
export type RelationType = string;

/** Canonical fallback type id. Orphans from a deleted type are reassigned here. */
export const NO_LABEL_RELATION_TYPE = "no_label";

export type Direction = "outgoing" | "incoming";

export interface TextSelection {
  text: string;
  page: number;
  /** Relative positions (0-1) within the page for highlight overlay */
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface Reference {
  id: string;
  /** Source document entity ID */
  sourceEntityId: string;
  /** Target entity ID */
  targetEntityId: string;
  /** Relation type label */
  relationType: RelationType;
  /** Whether the relationship points out from the source ("outgoing") or
   *  into the source from the target ("incoming"). Defaults to "outgoing". */
  direction?: Direction;
  /** Selected text in source document. Absent when the relationship is a
   *  pure entity-level link with no text anchor — e.g. a manual connection
   *  between two entities that doesn't point to a specific passage. */
  sourceSelection?: TextSelection;
  /** Optional: selected text in target document */
  targetSelection?: TextSelection;
  /** If set, this reference is a member of a multi-party hub. All refs
   *  sharing a hubId belong to the same hub (Uwazi's n-ary relationship
   *  container — see deriveHubs). */
  hubId?: string;
  createdAt: string;
}

export const references: Reference[] = [
  {
    id: "ref-1",
    sourceEntityId: "e3",
    targetEntityId: "e1",
    relationType: "mentions",
    sourceSelection: {
      text: "Juan Carlos Abella and other persons were detained on January 23, 1989, during the events at the La Tablada military barracks.",
      page: 3,
      top: 0.25,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-20",
  },
  {
    id: "ref-2",
    sourceEntityId: "e3",
    targetEntityId: "e2",
    relationType: "relates_to",
    sourceSelection: {
      text: "The Argentine State has an obligation to investigate, prosecute, and punish all human rights violations.",
      page: 5,
      top: 0.45,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-20",
  },
  {
    id: "ref-3",
    sourceEntityId: "e3",
    targetEntityId: "e4",
    relationType: "relates_to",
    direction: "incoming",
    sourceSelection: {
      text: "The Commission finds that the right to life, enshrined in Article 4 of the American Convention, was violated in this case.",
      page: 8,
      top: 0.15,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-21",
  },
  {
    id: "ref-4",
    sourceEntityId: "e3",
    targetEntityId: "e5",
    relationType: "relates_to",
    sourceSelection: {
      text: "Article 5 of the Convention guarantees the right to humane treatment and prohibits torture.",
      page: 8,
      top: 0.35,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-21",
  },
  {
    id: "ref-5",
    sourceEntityId: "e3",
    targetEntityId: "e6",
    relationType: "relates_to",
    sourceSelection: {
      text: "The right to a fair trial, as set forth in Article 8, requires that every person has the right to a hearing.",
      page: 10,
      top: 0.55,
      left: 0.08,
      width: 0.84,
      height: 0.06,
    },
    createdAt: "2024-06-22",
  },
  {
    id: "ref-6",
    sourceEntityId: "e3",
    targetEntityId: "e7",
    relationType: "cites",
    sourceSelection: {
      text: "The attack on the La Tablada military barracks on January 23, 1989, resulted in casualties on both sides.",
      page: 2,
      top: 0.6,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-20",
  },
  {
    id: "ref-7",
    sourceEntityId: "e3",
    targetEntityId: "e9",
    relationType: "relates_to",
    sourceSelection: {
      text: "Several persons were subjected to enforced disappearance following their detention by military forces.",
      page: 6,
      top: 0.3,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-22",
  },
  {
    id: "ref-8",
    sourceEntityId: "e3",
    targetEntityId: "e10",
    relationType: "relates_to",
    sourceSelection: {
      text: "The evidence indicates that at least four individuals were victims of extrajudicial execution.",
      page: 7,
      top: 0.7,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-22",
  },
  {
    id: "ref-9",
    sourceEntityId: "e3",
    targetEntityId: "e8",
    relationType: "refers_to",
    direction: "incoming",
    sourceSelection: {
      text: "The Inter-American Commission on Human Rights received the petition on February 15, 1993.",
      page: 1,
      top: 0.8,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-20",
  },
  {
    id: "ref-10",
    sourceEntityId: "e3",
    targetEntityId: "e11",
    relationType: "mentions",
    sourceSelection: {
      text: "María Elena Almeida was among the detained individuals who were not afforded due process guarantees.",
      page: 4,
      top: 0.5,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-21",
  },
  {
    id: "ref-11",
    sourceEntityId: "e3",
    targetEntityId: "e12",
    relationType: "mentions",
    sourceSelection: {
      text: "Pedro Cabrera testified before the Commission regarding the conditions of detention.",
      page: 5,
      top: 0.15,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-23",
  },
  {
    id: "ref-12",
    sourceEntityId: "e3",
    targetEntityId: "e14",
    relationType: "relates_to",
    sourceSelection: {
      text: "The detainees reported being subjected to torture and other forms of cruel and inhumane treatment during their incarceration.",
      page: 6,
      top: 0.55,
      left: 0.08,
      width: 0.84,
      height: 0.06,
    },
    createdAt: "2024-06-23",
  },
  // Dense cluster on page 3 — test overlapping dots
  {
    id: "ref-13",
    sourceEntityId: "e3",
    targetEntityId: "e4",
    relationType: "cites",
    sourceSelection: {
      text: "The right to life is a fundamental and non-derogable human right.",
      page: 3,
      top: 0.28,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-24",
  },
  {
    id: "ref-14",
    sourceEntityId: "e3",
    targetEntityId: "e5",
    relationType: "relates_to",
    sourceSelection: {
      text: "Article 5 protections extend to conditions of detention and treatment of prisoners.",
      page: 3,
      top: 0.30,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-24",
  },
  {
    id: "ref-15",
    sourceEntityId: "e3",
    targetEntityId: "e9",
    relationType: "mentions",
    sourceSelection: {
      text: "Witnesses confirmed the disappearance of three individuals following the military operation.",
      page: 3,
      top: 0.32,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-24",
  },
  {
    id: "ref-16",
    sourceEntityId: "e3",
    targetEntityId: "e10",
    relationType: "relates_to",
    sourceSelection: {
      text: "Forensic evidence pointed to extrajudicial killings carried out during the assault.",
      page: 3,
      top: 0.34,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-24",
  },
  {
    id: "ref-17",
    sourceEntityId: "e3",
    targetEntityId: "e1",
    relationType: "mentions",
    sourceSelection: {
      text: "Abella was identified among those detained without access to legal counsel.",
      page: 3,
      top: 0.36,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-24",
  },
  {
    id: "ref-18",
    sourceEntityId: "e3",
    targetEntityId: "e11",
    relationType: "mentions",
    sourceSelection: {
      text: "Almeida's testimony corroborated the allegations of systematic abuse.",
      page: 3,
      top: 0.38,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-24",
  },
  // Dense cluster on page 5
  {
    id: "ref-19",
    sourceEntityId: "e3",
    targetEntityId: "e6",
    relationType: "cites",
    sourceSelection: {
      text: "Due process guarantees under Article 8 were systematically violated.",
      page: 5,
      top: 0.18,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-24",
  },
  {
    id: "ref-20",
    sourceEntityId: "e3",
    targetEntityId: "e2",
    relationType: "relates_to",
    sourceSelection: {
      text: "The State failed to provide adequate judicial remedies to the victims.",
      page: 5,
      top: 0.20,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-24",
  },
  {
    id: "ref-21",
    sourceEntityId: "e3",
    targetEntityId: "e14",
    relationType: "refers_to",
    sourceSelection: {
      text: "Multiple accounts describe the use of electric shocks and beatings during interrogation.",
      page: 5,
      top: 0.22,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-24",
  },
  {
    id: "ref-22",
    sourceEntityId: "e3",
    targetEntityId: "e7",
    relationType: "cites",
    direction: "incoming",
    sourceSelection: {
      text: "The La Tablada incident remains one of the most significant cases before the Commission.",
      page: 5,
      top: 0.48,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-24",
  },
  {
    id: "ref-23",
    sourceEntityId: "e3",
    targetEntityId: "e12",
    relationType: "mentions",
    sourceSelection: {
      text: "Cabrera described conditions in the detention facility as inhumane and degrading.",
      page: 5,
      top: 0.50,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-24",
  },
  // Cluster on page 1
  {
    id: "ref-24",
    sourceEntityId: "e3",
    targetEntityId: "e8",
    relationType: "cites",
    sourceSelection: {
      text: "The Commission declared the petition admissible on October 9, 1997.",
      page: 1,
      top: 0.35,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-25",
  },
  {
    id: "ref-25",
    sourceEntityId: "e3",
    targetEntityId: "e2",
    relationType: "relates_to",
    sourceSelection: {
      text: "The Argentine government contested the jurisdiction of the Commission in its initial response.",
      page: 1,
      top: 0.37,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-25",
  },
  {
    id: "ref-26",
    sourceEntityId: "e3",
    targetEntityId: "e1",
    relationType: "mentions",
    sourceSelection: {
      text: "Abella filed a supplementary brief on March 12, 1994, providing additional evidence.",
      page: 1,
      top: 0.39,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-25",
  },
  // Scattered refs on pages 9, 11, 12, 13
  {
    id: "ref-27",
    sourceEntityId: "e3",
    targetEntityId: "e4",
    relationType: "cites",
    sourceSelection: {
      text: "The Commission concluded that the State had violated Article 4 in conjunction with Article 1.1 of the Convention.",
      page: 9,
      top: 0.40,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-25",
  },
  {
    id: "ref-28",
    sourceEntityId: "e3",
    targetEntityId: "e6",
    relationType: "relates_to",
    sourceSelection: {
      text: "The military tribunals lacked the independence and impartiality required by the American Convention.",
      page: 11,
      top: 0.25,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-25",
  },
  {
    id: "ref-29",
    sourceEntityId: "e3",
    targetEntityId: "e5",
    relationType: "relates_to",
    sourceSelection: {
      text: "Medical reports documented injuries consistent with the use of excessive force during the operation.",
      page: 11,
      top: 0.27,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-25",
  },
  {
    id: "ref-30",
    sourceEntityId: "e3",
    targetEntityId: "e12",
    relationType: "mentions",
    sourceSelection: {
      text: "Cabrera was held incommunicado for seventy-two hours before being allowed to contact his family.",
      page: 12,
      top: 0.60,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-25",
  },
  {
    id: "ref-31",
    sourceEntityId: "e3",
    targetEntityId: "e11",
    relationType: "mentions",
    sourceSelection: {
      text: "Almeida identified three officers responsible for the mistreatment she suffered.",
      page: 12,
      top: 0.62,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-25",
  },
  {
    id: "ref-32",
    sourceEntityId: "e3",
    targetEntityId: "e7",
    relationType: "refers_to",
    sourceSelection: {
      text: "The assault resulted in the deaths of twenty-nine attackers and several members of the armed forces.",
      page: 13,
      top: 0.20,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-25",
  },
  {
    id: "ref-33",
    sourceEntityId: "e3",
    targetEntityId: "e9",
    relationType: "relates_to",
    sourceSelection: {
      text: "The whereabouts of at least two individuals remain unknown to this day.",
      page: 13,
      top: 0.22,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-25",
  },
  {
    id: "ref-34",
    sourceEntityId: "e3",
    targetEntityId: "e10",
    relationType: "cites",
    sourceSelection: {
      text: "Autopsy reports revealed gunshot wounds inflicted at close range, inconsistent with combat injuries.",
      page: 13,
      top: 0.24,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-25",
  },
  {
    id: "ref-35",
    sourceEntityId: "e3",
    targetEntityId: "e14",
    relationType: "relates_to",
    sourceSelection: {
      text: "The Commission found a pattern of systematic torture in the detention facilities used after the incident.",
      page: 13,
      top: 0.26,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-25",
  },
  // Cluster on page 4
  {
    id: "ref-36",
    sourceEntityId: "e3",
    targetEntityId: "e8",
    relationType: "refers_to",
    sourceSelection: {
      text: "The Commission held hearings in Washington D.C. on July 15, 1996.",
      page: 4,
      top: 0.52,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-25",
  },
  {
    id: "ref-37",
    sourceEntityId: "e3",
    targetEntityId: "e2",
    relationType: "relates_to",
    sourceSelection: {
      text: "Argentina requested an extension to submit its observations, which was granted.",
      page: 4,
      top: 0.54,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-06-25",
  },
  // Entity-level connections — no source text anchor. These represent manual
  // entity-to-entity links the user adds without quoting a passage (e.g. a
  // catalog cross-reference, an editorial note). The UI hides page tags and
  // snippets for these; the document viewer skips them entirely.
  {
    id: "ref-el-1",
    sourceEntityId: "e3",
    targetEntityId: "e13",
    relationType: "relates_to",
    createdAt: "2024-07-05",
  },
  {
    id: "ref-el-2",
    sourceEntityId: "e3",
    targetEntityId: "e31",
    relationType: "cites",
    createdAt: "2024-07-05",
  },
  {
    id: "ref-el-3",
    sourceEntityId: "e3",
    targetEntityId: "e32",
    relationType: "cites",
    direction: "incoming",
    createdAt: "2024-07-05",
  },
  {
    id: "ref-el-4",
    sourceEntityId: "e3",
    targetEntityId: "e15",
    relationType: "mentions",
    createdAt: "2024-07-05",
  },
  {
    id: "ref-el-5",
    sourceEntityId: "e3",
    targetEntityId: "e8",
    relationType: "refers_to",
    createdAt: "2024-07-05",
  },
  {
    id: "ref-el-6",
    sourceEntityId: "e3",
    targetEntityId: "e22",
    relationType: "relates_to",
    createdAt: "2024-07-12",
  },
  {
    id: "ref-el-7",
    sourceEntityId: "e3",
    targetEntityId: "e9",
    relationType: "mentions",
    direction: "incoming",
    createdAt: "2024-07-12",
  },
  {
    id: "ref-el-8",
    sourceEntityId: "e3",
    targetEntityId: "e27",
    relationType: "cites",
    createdAt: "2024-07-13",
  },
  {
    id: "ref-el-9",
    sourceEntityId: "e3",
    targetEntityId: "e35",
    relationType: "refers_to",
    direction: "incoming",
    createdAt: "2024-07-13",
  },
  {
    id: "ref-el-10",
    sourceEntityId: "e3",
    targetEntityId: "e41",
    relationType: "relates_to",
    createdAt: "2024-07-14",
  },
  {
    id: "ref-el-11",
    sourceEntityId: "e3",
    targetEntityId: "e6",
    relationType: "mentions",
    createdAt: "2024-07-14",
  },
  {
    id: "ref-el-12",
    sourceEntityId: "e3",
    targetEntityId: "e48",
    relationType: "cites",
    createdAt: "2024-07-15",
  },
  // Cross-source refs — source is NOT the current document. Carried over
  // from other entities' own connection records, so the user sees something
  // when grouping by source-entity / source-template. These are entity-level
  // (no sourceSelection) since the source's text anchor isn't relevant when
  // we're not viewing that document.
  {
    id: "ref-xs-1",
    sourceEntityId: "e1", // Juan Carlos Abella (person)
    targetEntityId: "e3", // → this doc
    relationType: "mentions",
    createdAt: "2024-07-18",
  },
  {
    id: "ref-xs-2",
    sourceEntityId: "e2", // Argentina (country)
    targetEntityId: "e3",
    relationType: "relates_to",
    createdAt: "2024-07-18",
  },
  {
    id: "ref-xs-3",
    sourceEntityId: "e9", // Inter-American Commission (organization)
    targetEntityId: "e3",
    relationType: "cites",
    createdAt: "2024-07-19",
  },
  {
    id: "ref-xs-4",
    sourceEntityId: "e14", // Bámaca Velásquez Judgment (court_case)
    targetEntityId: "e3",
    relationType: "cites",
    createdAt: "2024-07-19",
  },
  {
    id: "ref-xs-5",
    sourceEntityId: "e31", // Truth Commission Report 1991 (document)
    targetEntityId: "e3",
    relationType: "refers_to",
    createdAt: "2024-07-20",
  },
  {
    id: "ref-xs-6",
    sourceEntityId: "e22", // Amnesty International (organization)
    targetEntityId: "e3",
    relationType: "mentions",
    createdAt: "2024-07-20",
  },
  // Hubs (n-ary relationships) — refs sharing a hubId form one hub.
  // Hub "hub-hearing-1": Inter-American Court hearing parties.
  {
    id: "ref-hub-1-a",
    sourceEntityId: "e3",
    targetEntityId: "e1",
    relationType: "relates_to",
    hubId: "hub-hearing-1",
    sourceSelection: {
      text: "the petitioner Juan Carlos Abella appeared before the Commission alongside representatives of the State and the Inter-American Court.",
      page: 4,
      top: 0.42,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-07-10",
  },
  {
    id: "ref-hub-1-b",
    sourceEntityId: "e3",
    targetEntityId: "e2",
    relationType: "relates_to",
    hubId: "hub-hearing-1",
    sourceSelection: {
      text: "the State of Argentina, represented by its Agent, submitted preliminary objections at the same hearing.",
      page: 4,
      top: 0.48,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-07-10",
  },
  {
    id: "ref-hub-1-c",
    sourceEntityId: "e3",
    targetEntityId: "e8",
    relationType: "relates_to",
    hubId: "hub-hearing-1",
    createdAt: "2024-07-10",
  },
  // Hub "hub-violations-1": violations cited together in the state-responsibility section.
  {
    id: "ref-hub-2-a",
    sourceEntityId: "e3",
    targetEntityId: "e9",
    relationType: "cites",
    hubId: "hub-violations-1",
    sourceSelection: {
      text: "The Court found that the State was responsible for enforced disappearance, extrajudicial execution, and torture inflicted on the victims.",
      page: 9,
      top: 0.32,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    createdAt: "2024-07-11",
  },
  {
    id: "ref-hub-2-b",
    sourceEntityId: "e3",
    targetEntityId: "e10",
    relationType: "cites",
    hubId: "hub-violations-1",
    createdAt: "2024-07-11",
  },
  {
    id: "ref-hub-2-c",
    sourceEntityId: "e3",
    targetEntityId: "e14",
    relationType: "cites",
    hubId: "hub-violations-1",
    createdAt: "2024-07-11",
  },
  // Generated bulk references for stress testing
  ...generateBulkReferences(),
];

function generateBulkReferences(): Reference[] {
  // All entity IDs except the source document itself (e3)
  const entityIds = [
    "e1", "e2", "e4", "e5", "e6", "e7", "e8", "e9", "e10", "e11", "e12", "e13", "e14", "e15",
    "e16", "e17", "e18", "e19", "e20", "e21", "e22", "e23", "e24", "e25",
    "e26", "e27", "e28", "e29", "e30",
    "e31", "e32", "e33",
    "e34", "e35", "e36", "e37",
    "e38", "e39", "e40",
    "e41", "e42", "e43", "e44",
    "e45", "e46", "e47",
    "e48", "e49", "e50", "e51", "e52", "e53",
  ];
  // "no_label" is included so the bulk seed exercises the no-label rel facet.
  const relationTypes: RelationType[] = [
    "mentions",
    "relates_to",
    "cites",
    "refers_to",
    "mentions",
    "relates_to",
    "cites",
    "refers_to",
    "no_label",
  ];
  const snippets = [
    "The witness testified that the events occurred without prior warning to the civilian population.",
    "International humanitarian law requires the protection of non-combatants during armed conflict.",
    "The forensic evidence was submitted to the Commission as an annex to the petition.",
    "Survivors reported being blindfolded and transported to an unknown location.",
    "The government failed to conduct a prompt and impartial investigation into the allegations.",
    "Article 25 of the Convention guarantees the right to judicial protection.",
    "The victims were denied access to legal representation for the duration of their detention.",
    "Photographic evidence documented the conditions of the detention facility.",
    "The Commission received testimony from twelve witnesses during the oral hearings.",
    "The State argued that the actions were justified under the doctrine of national security.",
    "Medical examinations revealed injuries consistent with the application of electric current.",
    "The petitioners requested precautionary measures on behalf of the detained individuals.",
    "Several bodies were found in a mass grave discovered in the outskirts of the military compound.",
    "The right to personal liberty under Article 7 was violated in each of the documented cases.",
    "Witnesses described hearing screams and gunfire throughout the night of the incident.",
    "The Commission noted the State's failure to comply with repeated requests for information.",
    "Family members were not informed of the whereabouts of their detained relatives.",
    "The use of military courts to try civilians constitutes a violation of due process.",
    "Amnesty laws enacted after the events effectively denied justice to the victims.",
    "The Inter-American Court has consistently held that enforced disappearance is a continuing violation.",
    "Documentary evidence included official military communications intercepted by journalists.",
    "The psychological impact on surviving family members was documented by expert witnesses.",
    "Reparations were recommended including compensation, rehabilitation, and guarantees of non-repetition.",
    "The Commission emphasized the obligation of States to investigate human rights violations ex officio.",
    "The principle of proportionality was not observed during the military response to the incident.",
    "Habeas corpus petitions filed on behalf of the detainees were systematically denied.",
    "The testimony of military personnel contradicted the official version of events.",
    "International observers were denied access to the detention facilities for over six months.",
    "The remains of several victims were identified through DNA analysis conducted years later.",
    "The Commission determined that the State bore international responsibility for the violations.",
    "Carlos Mendoza was last seen entering the military compound on the morning of the incident.",
    "Rosa Quintero filed a complaint with the local prosecutor's office on behalf of her brother.",
    "The Bámaca Velásquez judgment established a key precedent for cases of forced disappearance.",
    "The Truth Commission Report 1991 documented over three hundred cases of arbitrary detention.",
    "Expert witness Luis Hernández presented findings from his analysis of ballistic evidence.",
    "The Geneva Conventions Protocol II applies to non-international armed conflicts.",
    "Ana Velázquez identified her son's body at the morgue forty-eight hours after the operation.",
    "The Gelman v. Uruguay Ruling reinforced the obligation to investigate past atrocities.",
    "Amnesty International published a comprehensive report on the patterns observed in the region.",
    "Jorge Fuentes was held in incommunicado detention for over two weeks without charge.",
    "Human Rights Watch corroborated the findings through interviews with surviving witnesses.",
    "The American Convention on Human Rights establishes binding obligations on State Parties.",
    "Beatriz Morales testified about the conditions she witnessed during her four months in detention.",
    "The Inter-American Court found Honduras responsible for the disappearance documented in the case.",
    "Roberto Cárdenas described being subjected to mock executions by his captors.",
    "The case of Ellacuría and others illustrates the systematic nature of the violations.",
    "Elena Ríos provided crucial testimony about the chain of command involved in the operation.",
    "Manuel Ortega's family received no official notification of his death until weeks later.",
    "The UN Universal Declaration of Human Rights serves as a foundational reference document.",
    "Sofía Reyes survived the assault but suffered permanent injuries documented in medical reports.",
    "The Final Report La Tablada Investigation contained classified annexes obtained through litigation.",
    "Guatemala has been the subject of numerous cases involving violations during the internal conflict.",
    "Peru's truth and reconciliation process informed the Commission's recommendations in this case.",
    "Chile's transition to democracy did not initially include accountability for past abuses.",
    "Mexico's response to the Commission's request for information was deemed insufficient.",
    "The Universal Periodic Review highlighted ongoing concerns about judicial independence.",
    "Freedom of expression was effectively curtailed during the period under examination.",
    "The right to privacy was violated through unauthorized surveillance of victims and their families.",
    "Military intelligence files declassified in 2009 confirmed key elements of the petitioners' claims.",
    "The Inter-American Convention on Disappearance defines the elements of this continuing violation.",
    "Sexual violence was used as a tool of repression against detainees of both genders.",
    "Forced displacement affected entire communities in the region surrounding the military operations.",
    "Arbitrary detention of suspected sympathizers continued for years after the initial incident.",
    "The State acknowledged its responsibility through a public ceremony held in 2015.",
    "Reparations included a memorial constructed at the site of the former detention facility.",
    // Multi-sentence paragraphs — these create rows with longer body text so
    // the panel exercises FadeTruncate's "expand" affordance and line clamping.
    "The Commission proceeded to hear witnesses over the course of three consecutive sessions. Each witness was examined first by the petitioners' counsel, then cross-examined by the State's agents. The transcripts were sealed by order of the rapporteur and only later released, in redacted form, following a public-interest petition filed in 2007.",
    "Forensic experts working under the Commission's mandate exhumed the site over a period of fourteen weeks. The remains recovered showed patterns consistent with summary execution: hands bound, gunshot wounds at close range, and clothing intact. DNA analysis later confirmed the identities of nine of the eleven sets of remains, returning each to a surviving family member.",
    "Reports from international observers describe a marked deterioration in detention conditions during the second year of the operation. Cells originally designed for four held as many as twelve detainees, with no provision for outdoor exercise, no formal medical attention, and inadequate sanitation. Detainees who survived later described an atmosphere of constant fear punctuated by night-time transfers whose destinations were never disclosed.",
    "The doctrine invoked by the State — that situations of internal disturbance lift ordinary procedural guarantees — was rejected by the Court in unambiguous terms. The judgment quotes prior jurisprudence at length, particularly the Velásquez Rodríguez ruling, and reiterates that the obligation to investigate is independent of the willingness of family members to file a formal complaint. The State's argument was characterised as 'an attempt to construct legal justification after the fact.'",
    "Following the Commission's recommendations, a special prosecutor was appointed in 2003 with a mandate to reopen the file. The prosecutor's office, working with archival records that had been catalogued by a parallel civil-society initiative, identified twenty-three individuals against whom credible evidence existed. Of these, six were ultimately prosecuted; the remaining files were closed on grounds of statutory limitation, a closure later challenged in the Inter-American Court.",
    "The report places the events within a broader regional pattern. Across at least four neighbouring states during the same period, similar operations were carried out against suspected sympathisers, drawing on shared doctrine, shared training programmes, and in some documented instances shared personnel. The Truth Commission's chapter on transnational coordination relies extensively on declassified diplomatic cables released between 2005 and 2012.",
    "Surviving family members organised a sustained campaign for accountability that lasted more than two decades. Their work included the meticulous documentation of every known detention, every reported sighting, and every official denial; the assembly of an archive that became the principal evidentiary basis for the Commission's eventual finding; and the maintenance, through legal and political channels, of a public memory of the events.",
    "The applicable framework draws on three overlapping sources: the American Convention on Human Rights, the Inter-American Convention on Forced Disappearance of Persons, and customary international humanitarian law as codified in the Geneva Conventions and their Additional Protocols. Each of these instruments imposes obligations whose breach the Commission was asked to assess. The State acknowledged its ratification of the first two; its position on the third was that the events did not rise to the threshold of armed conflict.",
    "Detainees released after extended periods of incommunicado holding described a consistent pattern in the conditions of their initial interrogation. They were transported, hooded, to a facility they were unable to identify; held in cells of approximately two metres by one; deprived of sleep for the first seventy-two hours; and subjected to questioning by individuals who never identified themselves and whose voices were the only means by which one detainee could be distinguished from another in subsequent identification efforts.",
    "Expert testimony addressed the ballistic evidence in considerable detail. Three of the recovered cartridges bore markings consistent with the standard-issue rifles assigned to the military unit operating in the area at the relevant time. The expert was careful to note that this established a probability, not a certainty; nonetheless, in conjunction with the testimonial record and the documentary evidence, the Commission found the inference of state-actor involvement to be compelling.",
    "The Commission's recommendations encompass measures of restitution, compensation, rehabilitation, satisfaction, and guarantees of non-repetition. Restitution was found to be impossible in the case of the deceased; compensation was calculated according to the formula established in prior Court rulings; rehabilitation included a programme of psychological support extending to second-degree relatives; and the guarantees of non-repetition required structural reform of the military justice system, a reform the State has only partially implemented.",
    "Habeas corpus petitions filed during the period in question were systematically dismissed on grounds that varied from one judicial district to another but produced, in every instance, the same outcome. In some districts, petitions were rejected for failure to specify the precise place of detention — a piece of information the petitioners could not have possessed. In others, petitions were referred to military jurisdiction, where they remained pending for periods of months or years without action.",
    "The international press coverage of the events shifted markedly over time. Initial reporting, reliant on official sources, emphasised the State's account of an armed insurrection swiftly suppressed. As independent journalists gained access, and as the testimonies of survivors began to circulate, the framing shifted toward the human-rights dimensions of the response. By the time the case was filed with the Commission, the events had become a reference point in the regional discourse on transitional justice.",
    "The petitioners' submission identifies three distinct categories of victims: those killed during the initial operation, those subsequently detained and released, and those whose fate remains unknown. For each category, the submission documents the specific violations alleged and the evidentiary basis on which those allegations rest. The Commission's report adopts this tripartite structure and finds, for each category, that the State bears international responsibility.",
    "Witnesses examined under oath corroborated one another on points of detail that had not been previously published. The convergence was striking: the timing of the initial assault, the colour and markings of the vehicles involved, the names of officers heard in the corridors of the facility. The Commission's report notes that such convergence among witnesses who had not been in contact with one another for years constitutes 'strong indicia of credibility,' citing the criteria established in prior jurisprudence.",
  ];

  const refs: Reference[] = [];
  // Cover up to 120 pages so refs distribute across the FULL minimap track
  // for every primary document, not just the shortest one. Page counts in
  // the vendored set: Velásquez EN 17pp, ES 47pp; Bámaca EN 112pp, ES 116pp;
  // Gelman EN 90pp, ES 92pp. For docs shorter than 120, RefMinimap drops
  // refs with page > numPages so the track tail isn't padded with off-doc
  // refs — but the seeded distribution still reaches the bottom for any
  // primary the user switches to.
  const totalPages = 120;
  let id = 38;

  // Per-page count tuned for the longest primary (Bámaca ES, 116pp). At
  // ~3 refs per page that's ~350 refs for Bámaca and ~50 for Velásquez —
  // both feel populated without overwhelming the panel. Each yPercent-merged
  // cluster (~3-5 pages worth at 3.5% threshold) holds ~10 refs, which
  // expands to ≤200px — safely inside the minimap track.
  for (let page = 1; page <= totalPages; page++) {
    // Each page gets 2-5 refs
    const refsPerPage = 2 + Math.floor(seededRandom(page * 7) * 4);

    for (let j = 0; j < refsPerPage; j++) {
      const seed = id * 31 + page * 13 + j * 7;
      // Create clusters by snapping some refs to nearby positions
      const clusterBase = Math.floor(seededRandom(seed) * 5) / 5; // 0, 0.2, 0.4, 0.6, 0.8
      const jitter = seededRandom(seed + 1) * 0.08;
      const top = Math.min(0.92, Math.max(0.05, clusterBase + jitter));

      // ~6% of refs target a non-existent entity so getEntity() falls back to
      // "unknown" — surfaces the "(No label)" facet in the entity-type filter.
      const targetRoll = seededRandom(seed + 5);
      const targetId =
        targetRoll < 0.06
          ? `e-missing-${(seed % 9) + 1}`
          : entityIds[Math.floor(seededRandom(seed + 2) * entityIds.length)];
      // ~25% of refs flow into the source rather than out of it.
      const direction: Direction =
        seededRandom(seed + 6) < 0.25 ? "incoming" : "outgoing";
      refs.push({
        id: `ref-${id}`,
        sourceEntityId: "e3",
        targetEntityId: targetId,
        relationType: relationTypes[Math.floor(seededRandom(seed + 3) * relationTypes.length)],
        direction,
        sourceSelection: {
          text: snippets[Math.floor(seededRandom(seed + 4) * snippets.length)],
          page,
          top,
          left: 0.08,
          width: 0.84,
          height: 0.04,
        },
        createdAt: "2024-07-01",
      });
      id++;
    }
  }

  return refs;
}

// Simple seeded pseudo-random for deterministic test data
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export const relationTypes: { id: RelationType; label: string }[] = [
  { id: "mentions", label: "Mentions" },
  { id: "relates_to", label: "Relates to" },
  { id: "cites", label: "Cites" },
  { id: "refers_to", label: "Refers to" },
  { id: "no_label", label: "No label" },
];
