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
];

export const relationTypes: { id: RelationType; label: string }[] = [
  { id: "mentions", label: "Mentions" },
  { id: "relates_to", label: "Relates to" },
  { id: "cites", label: "Cites" },
  { id: "refers_to", label: "Refers to" },
];
