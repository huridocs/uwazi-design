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
