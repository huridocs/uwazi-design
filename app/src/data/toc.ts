export interface TocEntry {
  id: string;
  label: string;
  page: number;
  level: number;
  children?: TocEntry[];
}

/** Realistic ToC for Velásquez-Rodríguez v. Honduras (1987) — structured to
 *  match the actual Inter-American Court judgment outline (introduction →
 *  proceedings → facts → evidence → state responsibility → violations →
 *  reparations → operative paragraphs), distributed across the 14 pages of
 *  the seed document. Labels track the language used in the judgment text. */
export const tocEntries: TocEntry[] = [
  {
    id: "toc-intro",
    label: "I. Introduction",
    page: 1,
    level: 0,
  },
  {
    id: "toc-proceedings",
    label: "II. Proceedings before the Court",
    page: 2,
    level: 0,
    children: [
      {
        id: "toc-proceedings-petition",
        label: "A. Petition and admissibility",
        page: 2,
        level: 1,
      },
      {
        id: "toc-proceedings-objections",
        label: "B. Preliminary objections raised by Honduras",
        page: 3,
        level: 1,
      },
    ],
  },
  {
    id: "toc-facts",
    label: "III. Facts proven",
    page: 4,
    level: 0,
    children: [
      {
        id: "toc-facts-detention",
        label: "A. Detention of Manfredo Velásquez",
        page: 4,
        level: 1,
      },
      {
        id: "toc-facts-witnesses",
        label: "B. Eyewitness accounts and disappearance",
        page: 5,
        level: 1,
      },
    ],
  },
  {
    id: "toc-evidence",
    label: "IV. Assessment of evidence",
    page: 6,
    level: 0,
    children: [
      {
        id: "toc-evidence-standard",
        label: "A. Standard of proof in human-rights cases",
        page: 6,
        level: 1,
      },
      {
        id: "toc-evidence-testimony",
        label: "B. Witness testimony and documentary evidence",
        page: 6,
        level: 1,
        children: [
          {
            id: "toc-evidence-testimony-direct",
            label: "i. Direct witnesses to the detention",
            page: 7,
            level: 2,
          },
          {
            id: "toc-evidence-testimony-expert",
            label: "ii. Expert testimony on systematic practice",
            page: 7,
            level: 2,
          },
        ],
      },
    ],
  },
  {
    id: "toc-practice",
    label: "V. The practice of forced disappearance in Honduras",
    page: 8,
    level: 0,
  },
  {
    id: "toc-responsibility",
    label: "VI. State responsibility",
    page: 9,
    level: 0,
    children: [
      {
        id: "toc-responsibility-imputability",
        label: "A. Imputability under Article 1.1",
        page: 9,
        level: 1,
      },
      {
        id: "toc-responsibility-diligence",
        label: "B. Duty of due diligence in investigation",
        page: 10,
        level: 1,
      },
    ],
  },
  {
    id: "toc-violations",
    label: "VII. Violations of the American Convention",
    page: 11,
    level: 0,
    children: [
      {
        id: "toc-violations-art4",
        label: "A. Article 4 — Right to life",
        page: 11,
        level: 1,
      },
      {
        id: "toc-violations-art5",
        label: "B. Article 5 — Right to humane treatment",
        page: 12,
        level: 1,
      },
      {
        id: "toc-violations-art7",
        label: "C. Article 7 — Right to personal liberty",
        page: 12,
        level: 1,
      },
    ],
  },
  {
    id: "toc-reparations",
    label: "VIII. Reparations and costs",
    page: 13,
    level: 0,
  },
  {
    id: "toc-operative",
    label: "IX. Operative paragraphs",
    page: 14,
    level: 0,
  },
];
