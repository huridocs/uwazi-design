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
  title: "Report No. 55/97 — Case 11.137 (Juan Carlos Abella v. Argentina)",
  entityTypeId: "court_case",
  language: "English",
  createdAt: "2024-06-15",
  pages: 40,
  filename: "sample.pdf",
};
