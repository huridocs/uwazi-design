export interface TocEntry {
  id: string;
  label: string;
  page: number;
  level: number;
  children?: TocEntry[];
}

export const tocEntries: TocEntry[] = [
  {
    id: "toc-1",
    label: "VISTO:",
    page: 1,
    level: 0,
  },
  {
    id: "toc-2",
    label: "CONSIDERANDO QUE:",
    page: 4,
    level: 0,
    children: [
      {
        id: "toc-2-1",
        label: "A) Solicitud presentada por los representantes",
        page: 5,
        level: 1,
        children: [
          {
            id: "toc-2-1-1",
            label: "A.1) Fundamentos de derecho internacional",
            page: 6,
            level: 2,
            children: [
              {
                id: "toc-2-1-1-1",
                label: "A.1.1) Normativa aplicable al caso",
                page: 7,
                level: 3,
              },
            ],
          },
          {
            id: "toc-2-1-2",
            label: "A.2) Análisis de los hechos probados",
            page: 8,
            level: 2,
          },
        ],
      },
      {
        id: "toc-2-2",
        label: "B) Observaciones del Estado sobre competencia",
        page: 9,
        level: 1,
      },
      {
        id: "toc-2-3",
        label: "C) Observaciones de la Comisión Interamericana",
        page: 12,
        level: 1,
      },
      {
        id: "toc-2-4",
        label: "D) Consideraciones del Presidente de la Corte",
        page: 13,
        level: 1,
      },
    ],
  },
  {
    id: "toc-3",
    label: "POR TANTO:",
    page: 16,
    level: 0,
  },
  {
    id: "toc-4",
    label: "RESUELVE QUE:",
    page: 19,
    level: 0,
  },
];
