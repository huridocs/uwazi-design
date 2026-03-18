import type { Language } from "../atoms/language";

export interface DocumentMeta {
  id: string;
  title: string;
  entityTypeId: string;
  language: string;
  createdAt: string;
  pages: number;
  filename: string;
}

export const currentDocument: DocumentMeta = {
  id: "doc-1",
  title: "Inter-American Court of Human Rights — Case of Velásquez-Rodríguez v. Honduras — Judgment of June 26, 1987",
  entityTypeId: "court_case",
  language: "English",
  createdAt: "2024-06-15",
  pages: 14,
  filename: "sample.pdf",
};

export const documentsByLanguage: Record<Language, DocumentMeta> = {
  EN: currentDocument,
  ES: {
    id: "doc-1-es",
    title: "Corte Interamericana de Derechos Humanos — Caso Velásquez Rodríguez vs. Honduras — Sentencia de 26 de junio de 1987",
    entityTypeId: "court_case",
    language: "Español",
    createdAt: "2024-06-15",
    pages: 14,
    filename: "sample.pdf",
  },
  FR: {
    id: "doc-1-fr",
    title: "Cour interaméricaine des droits de l'homme — Affaire Velásquez Rodríguez c. Honduras — Arrêt du 26 juin 1987",
    entityTypeId: "court_case",
    language: "Français",
    createdAt: "2024-06-15",
    pages: 14,
    filename: "sample.pdf",
  },
};
