// Mock plain-text and HTML renditions of the default primary document
// (Velásquez-Rodríguez v. Honduras — Judgment). Uwazi derives a plain-text
// extraction and an HTML version from the uploaded PDF; the prototype carries
// a representative excerpt so the format picker has real content to show.

export type HtmlBlock =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "num"; n: string; text: string };

export interface DocRendition {
  /** Monospace/serif extracted text — what the PDF text layer yields. */
  plainText: string;
  /** Structured blocks rendered as a styled article. */
  html: HtmlBlock[];
}

const judgmentText = `INTER-AMERICAN COURT OF HUMAN RIGHTS

CASE OF VELÁSQUEZ-RODRÍGUEZ v. HONDURAS

JUDGMENT OF JULY 29, 1988
(Merits)

In the Velásquez Rodríguez case, the Inter-American Court of Human
Rights, composed of the following judges:

    Rafael Nieto-Navia, President
    Héctor Gros Espiell, Vice President
    Rodolfo E. Piza E., Judge
    Thomas Buergenthal, Judge
    Pedro Nikken, Judge
    Héctor Fix-Zamudio, Judge
    Rigoberto Espinal Irías, Judge ad hoc

also present,

    Charles Moyer, Secretary, and
    Manuel Ventura, Deputy Secretary,

delivers the following judgment pursuant to Article 44(1) of the Rules
of Procedure of the Court (hereinafter "the Rules of Procedure") in the
instant case submitted by the Inter-American Commission on Human Rights
against the State of Honduras.

I. INTRODUCTION OF THE CASE

1. The Inter-American Commission on Human Rights (hereinafter "the
Commission") submitted the instant case to the Inter-American Court of
Human Rights (hereinafter "the Court") on April 24, 1986. It originated
in a petition (No. 7920) against the State of Honduras (hereinafter
"Honduras" or "the Government"), which the Secretariat of the Commission
received on October 7, 1981.

2. In submitting the case, the Commission invoked Articles 50 and 51 of
the American Convention on Human Rights (hereinafter "the Convention" or
"the American Convention") and requested that the Court determine whether
the State had violated Articles 4 (Right to Life), 5 (Right to Humane
Treatment) and 7 (Right to Personal Liberty) of the Convention.`;

export const defaultDocRendition: DocRendition = {
  plainText: judgmentText,
  html: [
    { type: "h1", text: "Inter-American Court of Human Rights" },
    { type: "h2", text: "Case of Velásquez-Rodríguez v. Honduras" },
    { type: "p", text: "Judgment of July 29, 1988 (Merits)" },
    {
      type: "p",
      text: "In the Velásquez Rodríguez case, the Inter-American Court of Human Rights, composed of the following judges: Rafael Nieto-Navia, President; Héctor Gros Espiell, Vice President; Rodolfo E. Piza E.; Thomas Buergenthal; Pedro Nikken; Héctor Fix-Zamudio; and Rigoberto Espinal Irías, Judge ad hoc; also present Charles Moyer, Secretary, and Manuel Ventura, Deputy Secretary, delivers the following judgment pursuant to Article 44(1) of the Rules of Procedure of the Court.",
    },
    { type: "h2", text: "I. Introduction of the Case" },
    {
      type: "num",
      n: "1.",
      text: "The Inter-American Commission on Human Rights submitted the instant case to the Inter-American Court of Human Rights on April 24, 1986. It originated in a petition (No. 7920) against the State of Honduras, which the Secretariat of the Commission received on October 7, 1981.",
    },
    {
      type: "num",
      n: "2.",
      text: "In submitting the case, the Commission invoked Articles 50 and 51 of the American Convention on Human Rights and requested that the Court determine whether the State had violated Articles 4 (Right to Life), 5 (Right to Humane Treatment) and 7 (Right to Personal Liberty) of the Convention.",
    },
  ],
};
