// Plain-text and HTML renditions of the default primary document
// (Velásquez-Rodríguez v. Honduras — Judgment). The text is extracted from the
// vendored PDF (app/public/docs/...EN.pdf) so the renditions show the same
// content as the document, the way Uwazi derives a text layer and an HTML
// version from the uploaded file.

export type HtmlBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "section"; text: string }
  | { type: "p"; text: string }
  | { type: "num"; n: string; text: string };

export interface DocRendition {
  /** Monospace extracted text — what the PDF text layer yields. */
  plainText: string;
  /** Structured blocks rendered as a styled article. */
  html: HtmlBlock[];
}

const intro =
  'In the Velásquez Rodríguez case, the Inter-American Court of Human Rights, composed of the following judges: Rafael Nieto-Navia, President; Héctor Gros Espiell, Vice President; Rodolfo E. Piza E.; Thomas Buergenthal; Pedro Nikken; Héctor Fix-Zamudio; and Rigoberto Espinal Irías, Judge ad hoc; also present Charles Moyer, Secretary, and Manuel Ventura, Deputy Secretary, delivers the following judgment pursuant to Article 44(1) of its Rules of Procedure (hereinafter "the Rules of Procedure") in the instant case submitted by the Inter-American Commission on Human Rights against the State of Honduras.';

const paragraphs: { n: string; text: string }[] = [
  {
    n: "1.",
    text: 'The Inter-American Commission on Human Rights (hereinafter "the Commission") submitted the instant case to the Inter-American Court of Human Rights (hereinafter "the Court") on April 24, 1986. It originated in a petition (No. 7920) against the State of Honduras (hereinafter "Honduras" or "the Government"), which the Secretariat of the Commission received on October 7, 1981.',
  },
  {
    n: "2.",
    text: 'In submitting the case, the Commission invoked Articles 50 and 51 of the American Convention on Human Rights (hereinafter "the Convention" or "the American Convention") and requested that the Court determine whether the State in question had violated Articles 4 (Right to Life), 5 (Right to Humane Treatment) and 7 (Right to Personal Liberty) of the Convention in the case of Angel Manfredo Velásquez Rodríguez (also known as Manfredo Velásquez). In addition, the Commission asked the Court to rule that "the consequences of the situation that constituted the breach of such right or freedom be remedied and that fair compensation be paid to the injured party or parties."',
  },
  {
    n: "3.",
    text: 'According to the petition filed with the Commission, and the supplementary information received subsequently, Manfredo Velásquez, a student at the National Autonomous University of Honduras, "was violently detained without a warrant for his arrest by members of the National Office of Investigations (DNI) and G-2 of the Armed Forces of Honduras." The detention took place in Tegucigalpa on the afternoon of September 12, 1981.',
  },
  {
    n: "4.",
    text: 'After transmitting the relevant parts of the petition to the Government, the Commission, on various occasions, requested information on the matter. Since the Commission received no reply, it applied Article 42 (formerly 39) of its Regulations and presumed "as true the allegations contained in the communication of October 7, 1981 concerning the detention and possible disappearance of Angel Manfredo Velásquez Rodríguez in the Republic of Honduras."',
  },
  {
    n: "5.",
    text: 'On November 18, 1983, the Government requested reconsideration of Resolution 30/83 on the grounds that domestic remedies had not been exhausted, that the National Office of Investigations had no knowledge of the whereabouts of Manfredo Velásquez, and that the Government was making every effort to find him.',
  },
  {
    n: "6.",
    text: 'On May 30, 1984, the Commission informed the Government that it had decided, "in light of the information submitted by the Honorable Government, to reconsider Resolution 30/83 and to continue its study of the case." The Commission also asked the Government to provide information on the exhaustion of domestic legal remedies.',
  },
  {
    n: "7.",
    text: "On January 29, 1985, the Commission repeated its request of May 30, 1984 and notified the Government that it would render a final decision on the case at its meeting in March 1985. On March 1 of that year, the Government asked for a postponement and reported that it had set up an Investigatory Commission to study the matter.",
  },
  {
    n: "8.",
    text: "On October 17, 1985, the Government presented to the Commission the Report of the Investigatory Commission.",
  },
  {
    n: "9.",
    text: 'On April 7, 1986, the Government provided information about the outcome of the proceeding brought in the First Criminal Court against those persons supposedly responsible for the disappearance of Manfredo Velásquez and others. That Court dismissed the complaints "except as they applied to General Gustavo Alvarez Martínez, because he had left the country and had not given testimony." This decision was later affirmed by the First Court of Appeals.',
  },
  {
    n: "10.",
    text: 'By Resolution 22/86 of April 18, 1986, the Commission deemed the new information presented by the Government insufficient to warrant reconsideration of Resolution 30/83 and found that "all evidence shows that Angel Manfredo Velásquez Rodríguez is still missing." In that same Resolution, the Commission confirmed Resolution 30/83 and referred the matter to the Court.',
  },
  {
    n: "11.",
    text: "The Court has jurisdiction to hear the instant case. Honduras ratified the Convention on September 8, 1977 and recognized the contentious jurisdiction of the Court, as set out in Article 62 of the Convention, on September 9, 1981.",
  },
  {
    n: "12.",
    text: "The instant case was submitted to the Court on April 24, 1986. On May 13, 1986, the Secretariat of the Court transmitted the application to the Government, pursuant to Article 26(1) of the Rules of Procedure.",
  },
];

// Build the plain-text rendition from the same source the HTML uses.
const plainText = [
  "INTER-AMERICAN COURT OF HUMAN RIGHTS",
  "",
  "CASE OF VELÁSQUEZ-RODRÍGUEZ v. HONDURAS",
  "",
  "JUDGMENT OF JULY 29, 1988",
  "(Merits)",
  "",
  intro,
  "",
  "I. INTRODUCTION OF THE CASE",
  "",
  ...paragraphs.slice(0, 10).map((p) => `${p.n} ${p.text}`).flatMap((s) => [s, ""]),
  "II. PROCEEDINGS BEFORE THE COURT",
  "",
  ...paragraphs.slice(10).map((p) => `${p.n} ${p.text}`).flatMap((s) => [s, ""]),
].join("\n");

export const defaultDocRendition: DocRendition = {
  plainText,
  html: [
    { type: "h1", text: "Inter-American Court of Human Rights" },
    { type: "h2", text: "Case of Velásquez-Rodríguez v. Honduras" },
    { type: "p", text: "Judgment of July 29, 1988 (Merits)" },
    { type: "p", text: intro },
    { type: "section", text: "I. Introduction of the Case" },
    ...paragraphs.slice(0, 10).map((p) => ({ type: "num" as const, n: p.n, text: p.text })),
    { type: "section", text: "II. Proceedings Before the Court" },
    ...paragraphs.slice(10).map((p) => ({ type: "num" as const, n: p.n, text: p.text })),
  ],
};
