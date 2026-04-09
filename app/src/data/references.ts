export type RelationType = "mentions" | "relates_to" | "cites" | "refers_to";

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
  /** Selected text in source document */
  sourceSelection: TextSelection;
  /** Optional: selected text in target document */
  targetSelection?: TextSelection;
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
      text: "Pedro Sánchez testified before the Commission regarding the conditions of detention.",
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
      text: "Sánchez described conditions in the detention facility as inhumane and degrading.",
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
      text: "Sánchez was held incommunicado for seventy-two hours before being allowed to contact his family.",
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
  const relationTypes: RelationType[] = ["mentions", "relates_to", "cites", "refers_to"];
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
  ];

  const refs: Reference[] = [];
  const totalPages = 14;
  let id = 38;

  // Generate ~200 refs spread across all pages with natural clustering
  for (let page = 1; page <= totalPages; page++) {
    // Each page gets 10-20 refs, with some clustering
    const refsPerPage = 10 + Math.floor(seededRandom(page * 7) * 10);

    for (let j = 0; j < refsPerPage; j++) {
      const seed = id * 31 + page * 13 + j * 7;
      // Create clusters by snapping some refs to nearby positions
      const clusterBase = Math.floor(seededRandom(seed) * 5) / 5; // 0, 0.2, 0.4, 0.6, 0.8
      const jitter = seededRandom(seed + 1) * 0.08;
      const top = Math.min(0.92, Math.max(0.05, clusterBase + jitter));

      refs.push({
        id: `ref-${id}`,
        sourceEntityId: "e3",
        targetEntityId: entityIds[Math.floor(seededRandom(seed + 2) * entityIds.length)],
        relationType: relationTypes[Math.floor(seededRandom(seed + 3) * relationTypes.length)],
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
];
