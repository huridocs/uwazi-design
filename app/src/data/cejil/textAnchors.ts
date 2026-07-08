import type { Reference, TextSelection } from "../references";

/** Curated text↔text references for the CEJIL corpus.
 *
 *  The published summa relationships are entity-level (`from`/`to`/`type`, no
 *  anchors), so quote-to-quote links can't be derived — these few are curated
 *  by hand between documents whose extracted full text ships with the corpus,
 *  with both selections quoting REAL sentences from the pages the viewer
 *  renders (fullText.json pages for 10958.pdf / 11267.pdf). Appended to the
 *  derived refs by {@link curatedCejilRefsFor}; read-only like the rest of the
 *  CEJIL layer. */
interface CuratedTextRef {
  id: string;
  from: string;
  to: string;
  relationType: string;
  /** Anchor on the FROM entity's document. */
  fromSelection: TextSelection;
  /** Anchor on the TO entity's document. */
  toSelection: TextSelection;
}

// Tagaeri y Taromenane cluster: the Carta de envío a la CorteIDH
// (8ybq2bsfh7x · 10958.pdf) and the Informe de Admisibilidad
// (njrccw5085a · 11267.pdf) — the referral letter cites the report.
const CARTA = "8ybq2bsfh7x";
const INFORME = "njrccw5085a";

const curated: CuratedTextRef[] = [
  {
    id: "cejil-tt-1",
    from: CARTA,
    to: INFORME,
    relationType: "Cita",
    fromSelection: {
      text: "El 2 de junio de 2011 el Estado presentó una demanda de interpretación de la Sentencia, de conformidad con los artículos 67 de la Convención y 68 del Reglamento.",
      page: 2,
      top: 0.22,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    toSelection: {
      text: "Es una facultad inherente a las funciones jurisdiccionales de la Corte el supervisar el cumplimiento de sus decisiones.",
      page: 3,
      top: 0.14,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
  },
  {
    id: "cejil-tt-2",
    from: INFORME,
    to: CARTA,
    relationType: "Cita",
    fromSelection: {
      text: "El Estado debe emprender con seriedad, en un plazo razonable, todas las acciones necesarias para identificar, juzgar, y en su caso, sancionar a todos los autores.",
      page: 1,
      top: 0.55,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
    toSelection: {
      text: "El 3 de marzo de 2011 la Corte emitió la Sentencia de reparaciones y costas, la cual fue notificada a las partes el 23 de marzo de 2011.",
      page: 2,
      top: 0.18,
      left: 0.08,
      width: 0.84,
      height: 0.04,
    },
  },
];

/** The curated refs touching `sharedId`, expressed from ITS perspective:
 *  `sourceSelection` is always the anchor on the focused entity's own
 *  document, `targetSelection` the anchor on the other end. */
export function curatedCejilRefsFor(sharedId: string): Reference[] {
  const out: Reference[] = [];
  for (const c of curated) {
    if (c.from === sharedId) {
      out.push({
        id: c.id,
        sourceEntityId: c.from,
        targetEntityId: c.to,
        relationType: c.relationType,
        direction: "outgoing",
        sourceSelection: c.fromSelection,
        targetSelection: c.toSelection,
        createdAt: "",
      });
    } else if (c.to === sharedId) {
      out.push({
        id: c.id,
        sourceEntityId: c.to,
        targetEntityId: c.from,
        relationType: c.relationType,
        direction: "incoming",
        sourceSelection: c.toSelection,
        targetSelection: c.fromSelection,
        createdAt: "",
      });
    }
  }
  return out;
}
