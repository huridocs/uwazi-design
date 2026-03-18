import type { Language } from "../atoms/language";

export interface MetadataField {
  id: string;
  label: string;
  type: "text" | "date" | "link" | "country" | "multiline" | "file-list";
  value: string;
  flag?: string;
  items?: { label?: string; value: string }[];
  columns?: { label: string; value: string }[];
}

export const metadataFields: MetadataField[] = [
  {
    id: "description",
    label: "Description",
    type: "multiline",
    value: `The Inter-American Commission on Human Rights submitted the instant case to the Court on April 24, 1986. It originated in a petition against Honduras (No. 7920) which the Secretariat of the Commission received on October 7, 1981. The Commission alleged that Angel Manfredo Velásquez Rodríguez, a student at the National Autonomous University of Honduras, was detained without a warrant on September 12, 1981, by members of the National Office of Investigations and an unidentified individual, who were reportedly carrying out their duties in the name and under the protection of the Armed Forces of Honduras.`,
  },
  {
    id: "country",
    label: "Country",
    type: "country",
    value: "Honduras",
    flag: "🇭🇳",
  },
  {
    id: "date",
    label: "Date",
    type: "date",
    value: "June 26, 1987",
  },
  {
    id: "date-incident",
    label: "Date of the incident",
    type: "date",
    value: "September 12, 1981",
  },
  {
    id: "type",
    label: "Type",
    type: "text",
    value: "Preliminary Objections — Judgment",
  },
  {
    id: "mechanism",
    label: "Mechanism",
    type: "link",
    value: "Corte Interamericana de Derechos Humanos",
  },
  {
    id: "signatories",
    label: "Signatories",
    type: "link",
    value: "Thomas Buergenthal",
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

export const metadataFieldsByLanguage: Record<Language, MetadataField[]> = {
  EN: metadataFields,
  ES: [
    {
      id: "description",
      label: "Descripción",
      type: "multiline",
      value: `La Comisión Interamericana de Derechos Humanos sometió el presente caso a la Corte el 24 de abril de 1986. Tuvo su origen en una denuncia contra Honduras (No. 7920) que la Secretaría de la Comisión recibió el 7 de octubre de 1981. La Comisión alegó que Ángel Manfredo Velásquez Rodríguez, estudiante de la Universidad Nacional Autónoma de Honduras, fue detenido sin orden judicial el 12 de septiembre de 1981, por miembros de la Dirección Nacional de Investigación y un individuo no identificado, quienes presuntamente cumplían funciones en nombre y bajo la protección de las Fuerzas Armadas de Honduras.`,
    },
    {
      id: "country",
      label: "País",
      type: "country",
      value: "Honduras",
      flag: "🇭🇳",
    },
    {
      id: "date",
      label: "Fecha",
      type: "date",
      value: "26 de junio de 1987",
    },
    {
      id: "date-incident",
      label: "Fecha del incidente",
      type: "date",
      value: "12 de septiembre de 1981",
    },
    {
      id: "type",
      label: "Tipo",
      type: "text",
      value: "Excepciones Preliminares — Sentencia",
    },
    {
      id: "mechanism",
      label: "Mecanismo",
      type: "link",
      value: "Corte Interamericana de Derechos Humanos",
    },
    {
      id: "signatories",
      label: "Firmantes",
      type: "link",
      value: "Thomas Buergenthal",
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
    {
      id: "country",
      label: "Pays",
      type: "country",
      value: "Honduras",
      flag: "🇭🇳",
    },
    {
      id: "date",
      label: "Date",
      type: "date",
      value: "26 juin 1987",
    },
    {
      id: "date-incident",
      label: "Date de l'incident",
      type: "date",
      value: "12 septembre 1981",
    },
    {
      id: "type",
      label: "Type",
      type: "text",
      value: "Exceptions préliminaires — Arrêt",
    },
    {
      id: "mechanism",
      label: "Mécanisme",
      type: "link",
      value: "Cour interaméricaine des droits de l'homme",
    },
    {
      id: "signatories",
      label: "Signataires",
      type: "link",
      value: "Thomas Buergenthal",
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
};

export const pdfMetadata = {
  name: "Velasquez-Rodriguez_v_Honduras_1987.pdf",
  type: "PDF",
  size: "114 KB",
  lastEdited: "26-06-1987",
  added: "15-03-2024",
};

export const pdfMetadataByLanguage: Record<Language, typeof pdfMetadata> = {
  EN: pdfMetadata,
  ES: {
    name: "Velasquez-Rodriguez_c_Honduras_1987_ES.pdf",
    type: "PDF",
    size: "122 KB",
    lastEdited: "26-06-1987",
    added: "15-03-2024",
  },
  FR: {
    name: "Velasquez-Rodriguez_c_Honduras_1987_FR.pdf",
    type: "PDF",
    size: "118 KB",
    lastEdited: "26-06-1987",
    added: "15-03-2024",
  },
};
