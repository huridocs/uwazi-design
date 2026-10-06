/** Paragraph extraction (Uwazi's PX): an extractor splits each entity of a
 *  source template into paragraph entities of a target template, linked by
 *  two relationship types. Copy and rules are Uwazi's (`ParagraphExtraction`,
 *  `CreateDialog`, `PXEntities`, `PXParagraphs`; uwazi-settings-inventory.md ›
 *  Part 5 § 2). */

export interface PxExtractor {
  id: string;
  sourceTemplateId: string;
  targetTemplateId: string;
  /** Target template properties, by `name`: rich text and numeric. */
  paragraphProperty: string;
  numberProperty: string;
  /** Relationship type registry ids. */
  targetRelationType: string;
  sourceRelationType: string;
  /** epoch ms; a new extractor starts every entity at New. */
  created: number;
  /** Seeded extractors carry a history (some entities processed). */
  seeded?: boolean;
}

/** Uwazi's client statuses (`processing_obsolete` reads as processing). */
export type PxStatus = "new" | "processing" | "obsolete" | "error" | "processed";
export const PX_STATUSES: PxStatus[] = ["new", "processing", "obsolete", "error", "processed"];
export const PX_STATUS_LABEL: Record<PxStatus, string> = {
  new: "New",
  processing: "Processing",
  obsolete: "Obsolete",
  error: "Error",
  processed: "Processed",
};

/* No extractors are seeded on main: playground's two ran on Red Travesía,
 * which main does not carry. The Sample has no template with both a rich text
 * and a numeric property, so every collection starts empty and the wizard says
 * what a target template needs. */

/** Sentences the mock's paragraphs are built from, per language. */
export const PARAGRAPH_SENTENCES: Record<"en" | "es", string[]> = {
  es: [
    "La persona relató que el grupo fue detenido en un punto de revisión al norte de la ciudad.",
    "Según el testimonio, las autoridades retuvieron sus documentos durante varias horas sin explicación.",
    "El albergue registró la llegada de la familia dos días después de los hechos.",
    "Se observaron lesiones leves que fueron atendidas por el equipo de salud del albergue.",
    "La familia decidió continuar su trayecto pese a las advertencias recibidas.",
    "El equipo jurídico documentó la queja y la canalizó a la comisión estatal de derechos humanos.",
    "No se identificó a la autoridad responsable, aunque se describieron uniformes y vehículos oficiales.",
    "La persona refirió temor de regresar a su lugar de origen por amenazas previas.",
  ],
  en: [
    "The person said the group was stopped at a checkpoint north of the city.",
    "According to the testimony, the authorities held their documents for several hours without explanation.",
    "The shelter recorded the family's arrival two days after the events.",
    "Minor injuries were observed and treated by the shelter's health team.",
    "The family decided to continue their journey despite the warnings they had received.",
    "The legal team documented the complaint and referred it to the state human rights commission.",
    "The responsible authority was not identified, although uniforms and official vehicles were described.",
    "The person said they feared returning home because of earlier threats.",
  ],
};
