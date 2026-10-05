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

/** Red Travesía's extractors. The Sample has no template with both a rich
 *  text and a numeric property, so it starts with none and the wizard says
 *  what a target template needs. */
export const seedPxExtractors: PxExtractor[] = [
  {
    id: "px1",
    sourceTemplateId: "62ac929fc144a97641a278c1", // VIOLENCIAS
    targetTemplateId: "6234be4075bb7f668761eb42", // FAMILIA
    paragraphProperty: "descripción_de_la_familia",
    numberProperty: "número_de_personas_que_integran_la_familia",
    targetRelationType: "63506902fe830c2e11d7f198", // Importación
    sourceRelationType: "623889caec21fe7c0670badb", // Datos Generales
    created: new Date("2026-09-12T10:20:00").getTime(),
    seeded: true,
  },
  {
    id: "px2",
    sourceTemplateId: "62ac93f45347172681bd51e2", // INCIDENTES DE SEGURIDAD
    targetTemplateId: "62ab7a3e4f54f526e021f5e3", // DESAPARICIÓN
    paragraphProperty: "descripción_del_suceso_que_motivó_la_pérdida_de_contacto_con_la_persona_no_localizada",
    numberProperty: "edad_de_la_persona_en_el_momento_que_desapareció",
    targetRelationType: "6297786b77f54909b18f1dea", // Alerta
    sourceRelationType: "629778417603d82f239be44a", // Perpetrador Directo
    created: new Date("2026-09-20T16:05:00").getTime(),
    seeded: true,
  },
];

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
