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
  title:
    "Inter-American Court of Human Rights — Case of Velásquez-Rodríguez v. Honduras — Judgment of July 29, 1988",
  entityTypeId: "court_case",
  language: "English",
  createdAt: "2024-06-15",
  pages: 17,
  filename: "Velasquez-Rodriguez_v_Honduras_Judgment_1988.pdf",
};

export const documentsByLanguage: Record<Language, DocumentMeta> = {
  EN: currentDocument,
  ES: {
    id: "doc-1-es",
    title:
      "Corte Interamericana de Derechos Humanos — Caso Velásquez Rodríguez vs. Honduras — Sentencia de 29 de julio de 1988",
    entityTypeId: "court_case",
    language: "Español",
    createdAt: "2024-06-15",
    pages: 47,
    filename: "Velasquez-Rodriguez_c_Honduras_Sentencia_1988.pdf",
  },
  FR: {
    id: "doc-1-fr",
    title:
      "Cour interaméricaine des droits de l'homme — Affaire Bámaca Velásquez c. Guatemala — Arrêt du 25 novembre 2000",
    entityTypeId: "court_case",
    language: "Français",
    createdAt: "2024-06-15",
    pages: 116,
    filename: "Bamaca-Velasquez_c_Guatemala_Sentencia_2000.pdf",
  },
  AR: {
    id: "doc-1-ar",
    title:
      "محكمة البلدان الأمريكية لحقوق الإنسان — قضية باماكا فيلاسكيز ضد غواتيمالا — حكم 25 نوفمبر 2000",
    entityTypeId: "court_case",
    language: "العربية",
    createdAt: "2024-06-15",
    pages: 112,
    filename: "Bamaca-Velasquez_v_Guatemala_Judgment_2000.pdf",
  },
};
