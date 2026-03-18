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

export const pdfMetadata = {
  name: "Velasquez-Rodriguez_v_Honduras_1987.pdf",
  type: "PDF",
  size: "114 KB",
  lastEdited: "26-06-1987",
  added: "15-03-2024",
};
